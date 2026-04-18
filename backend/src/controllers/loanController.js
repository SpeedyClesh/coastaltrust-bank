const { getDb } = require('../config/database');
const { generateLoanNumber, generateTransactionRef, calculateLoanPayment, createNotification, createAuditLog } = require('../utils/helpers');
const { sendEmail } = require('../services/emailService');

exports.applyLoan = async (req, res) => {
  try {
    const db = getDb();
    const { loanType, amount, termMonths, purpose, collateral } = req.body;

    if (amount <= 0 || amount > 500000) return res.status(400).json({ message: 'Loan amount must be between $1 and $500,000' });
    if (termMonths < 6 || termMonths > 360) return res.status(400).json({ message: 'Term must be between 6 and 360 months' });

    const existingPending = db.prepare('SELECT id FROM loans WHERE user_id = ? AND status = "pending"').get(req.user.id);
    if (existingPending) return res.status(400).json({ message: 'You already have a pending loan application' });

    const interestRates = { personal: 8.5, auto: 6.5, home: 4.5, business: 9.5, student: 5.5 };
    const rate = interestRates[loanType] || 8.5;
    const monthlyPayment = calculateLoanPayment(amount, rate, termMonths);
    const totalPayable = monthlyPayment * termMonths;
    const loanNumber = generateLoanNumber();

    db.prepare(`
      INSERT INTO loans (user_id, loan_number, loan_type, amount, interest_rate, term_months, monthly_payment, total_payable, outstanding_balance, purpose, collateral)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, loanNumber, loanType, amount, rate, termMonths, monthlyPayment, totalPayable, totalPayable, purpose, collateral);

    createNotification(req.user.id, 'Loan Application Received', `Your ${loanType} loan application for $${parseFloat(amount).toFixed(2)} is under review.`, 'info');
    createAuditLog(req.user.id, 'LOAN_APPLY', 'loans', loanNumber, { amount, loanType }, req);

    res.status(201).json({
      message: 'Loan application submitted successfully',
      loanNumber,
      monthlyPayment: monthlyPayment.toFixed(2),
      totalPayable: totalPayable.toFixed(2),
      interestRate: rate,
    });
  } catch (error) {
    console.error('Loan apply error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getLoans = async (req, res) => {
  try {
    const db = getDb();
    const loans = db.prepare('SELECT * FROM loans WHERE user_id = ? ORDER BY applied_at DESC').all(req.user.id);
    res.json(loans);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getLoan = async (req, res) => {
  try {
    const db = getDb();
    const loan = db.prepare('SELECT * FROM loans WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    const payments = db.prepare('SELECT * FROM loan_payments WHERE loan_id = ? ORDER BY payment_date DESC').all(loan.id);
    res.json({ ...loan, payments });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.makeLoanPayment = async (req, res) => {
  try {
    const db = getDb();
    const { accountId, amount } = req.body;
    const loan = db.prepare('SELECT * FROM loans WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);

    if (!loan) return res.status(404).json({ message: 'Loan not found' });
    if (loan.status !== 'active') return res.status(400).json({ message: 'Loan is not active' });

    const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(accountId, req.user.id);
    if (!account) return res.status(404).json({ message: 'Account not found' });
    if (account.available_balance < amount) return res.status(400).json({ message: 'Insufficient funds' });

    const paymentAmount = Math.min(parseFloat(amount), loan.outstanding_balance);
    const ref = generateTransactionRef();

    db.transaction(() => {
      db.prepare('UPDATE accounts SET balance = balance - ?, available_balance = available_balance - ? WHERE id = ?').run(paymentAmount, paymentAmount, accountId);

      const newBalance = Math.max(0, loan.outstanding_balance - paymentAmount);
      const newStatus = newBalance <= 0 ? 'paid_off' : 'active';
      const totalPaid = loan.amount_paid + paymentAmount;

      db.prepare('UPDATE loans SET outstanding_balance = ?, amount_paid = ?, status = ?, updated_at = datetime("now") WHERE id = ?')
        .run(newBalance, totalPaid, newStatus, loan.id);

      db.prepare('INSERT INTO loan_payments (loan_id, user_id, amount, transaction_ref) VALUES (?, ?, ?, ?)').run(loan.id, req.user.id, paymentAmount, ref);

      db.prepare(`INSERT INTO transactions (transaction_ref, from_account_id, user_id, type, amount, description, status, category) VALUES (?, ?, ?, 'loan_payment', ?, ?, 'completed', 'loan')`)
        .run(ref, accountId, req.user.id, paymentAmount, `Loan payment - ${loan.loan_number}`);
    })();

    createNotification(req.user.id, 'Loan Payment Processed', `Payment of $${paymentAmount.toFixed(2)} applied to loan ${loan.loan_number}.`, 'success');

    res.json({ message: 'Payment successful', ref, amountPaid: paymentAmount });
  } catch (error) {
    console.error('Loan payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
