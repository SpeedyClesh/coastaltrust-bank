const bcrypt = require('bcryptjs');
const { getDb } = require('../config/database');
const { generateTransactionRef, createNotification, createAuditLog } = require('../utils/helpers');
const { sendEmail } = require('../services/emailService');

exports.getDashboard = async (req, res) => {
  try {
    const db = getDb();
    const stats = {
      totalUsers: db.prepare("SELECT COUNT(*) as c FROM users WHERE role != 'admin'").get().c,
      pendingUsers: db.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'pending'").get().c,
      activeUsers: db.prepare("SELECT COUNT(*) as c FROM users WHERE status = 'active'").get().c,
      totalAccounts: db.prepare("SELECT COUNT(*) as c FROM accounts WHERE account_type != 'admin'").get().c,
      totalDeposits: db.prepare("SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE type = 'deposit'").get().s,
      totalWithdrawals: db.prepare("SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE type = 'withdrawal'").get().s,
      totalTransfers: db.prepare("SELECT COALESCE(SUM(amount), 0) as s FROM transactions WHERE type = 'transfer'").get().s,
      totalTransactions: db.prepare('SELECT COUNT(*) as c FROM transactions').get().c,
      pendingLoans: db.prepare("SELECT COUNT(*) as c FROM loans WHERE status = 'pending'").get().c,
      activeLoans: db.prepare("SELECT COUNT(*) as c FROM loans WHERE status = 'active'").get().c,
      totalLoanAmount: db.prepare("SELECT COALESCE(SUM(approved_amount), 0) as s FROM loans WHERE status IN ('active','paid_off')").get().s,
      openTickets: db.prepare("SELECT COUNT(*) as c FROM support_tickets WHERE status = 'open'").get().c,
      totalAssets: db.prepare("SELECT COALESCE(SUM(balance), 0) as s FROM accounts WHERE account_type != 'admin'").get().s,
    };

    const recentUsers = db.prepare("SELECT id, first_name, last_name, email, status, kyc_status, created_at FROM users WHERE role != 'admin' ORDER BY created_at DESC LIMIT 5").all();
    const recentTransactions = db.prepare('SELECT t.*, u.first_name, u.last_name FROM transactions t JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC LIMIT 10').all();
    const recentTickets = db.prepare("SELECT * FROM support_tickets WHERE status = 'open' ORDER BY created_at DESC LIMIT 5").all();

    const monthlyData = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month,
             SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as deposits,
             SUM(CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END) as withdrawals,
             SUM(CASE WHEN type = 'transfer' THEN amount ELSE 0 END) as transfers,
             COUNT(*) as count
      FROM transactions
      GROUP BY month ORDER BY month DESC LIMIT 6
    `).all();

    res.json({ stats, recentUsers, recentTransactions, recentTickets, monthlyData });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const db = getDb();
    const { page = 1, limit = 20, search, status, kycStatus } = req.query;
    const offset = (page - 1) * limit;

    let query = "SELECT id, account_number, first_name, last_name, email, phone, status, kyc_status, role, email_verified, last_login, created_at FROM users WHERE role != 'admin'";
    let params = [];

    if (search) { query += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR account_number LIKE ?)'; const s = `%${search}%`; params.push(s, s, s, s); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (kycStatus) { query += ' AND kyc_status = ?'; params.push(kycStatus); }

    const total = db.prepare(query.replace('SELECT id, account_number, first_name, last_name, email, phone, status, kyc_status, role, email_verified, last_login, created_at', 'SELECT COUNT(*) as count')).get(...params);
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const users = db.prepare(query).all(...params);
    res.json({ users, total: total.count });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUser = async (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, account_number, first_name, last_name, email, phone, date_of_birth, address, city, state, zip_code, country, ssn_last4, profile_image, id_document, role, status, kyc_status, email_verified, last_login, created_at FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ?').all(user.id);
    const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(user.id);
    const loans = db.prepare('SELECT * FROM loans WHERE user_id = ? ORDER BY applied_at DESC').all(user.id);
    res.json({ ...user, accounts, transactions, loans });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const db = getDb();
    const { status, kycStatus } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (status) db.prepare("UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, user.id);
    if (kycStatus) db.prepare("UPDATE users SET kyc_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(kycStatus, user.id);

    if (status === 'active') {
      createNotification(user.id, 'Account Approved', 'Your CoastalTrust Bank account has been verified and activated!', 'success');
      await sendEmail(user.email, 'accountApproved', `${user.first_name} ${user.last_name}`);
    } else if (status === 'suspended') {
      createNotification(user.id, 'Account Suspended', 'Your account has been suspended. Please contact support.', 'error');
    }

    createAuditLog(req.user.id, 'UPDATE_USER_STATUS', 'users', user.id, { status, kycStatus }, req);
    res.json({ message: 'User status updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.adminDeposit = async (req, res) => {
  try {
    const db = getDb();
    const { userId, accountId, amount, description } = req.body;

    if (amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

    const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(accountId, userId);
    if (!account) return res.status(404).json({ message: 'Account not found' });

    const ref = generateTransactionRef();

    db.prepare('UPDATE accounts SET balance = balance + ?, available_balance = available_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(parseFloat(amount), parseFloat(amount), accountId);

    db.prepare(`INSERT INTO transactions (transaction_ref, to_account_id, user_id, type, amount, description, status, category) VALUES (?, ?, ?, 'deposit', ?, ?, 'completed', 'admin_deposit')`)
      .run(ref, accountId, userId, parseFloat(amount), description || 'Admin Credit');

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    const updatedAccount = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId);

    createNotification(userId, 'Funds Added', `$${parseFloat(amount).toFixed(2)} has been credited to your account.`, 'success');
    createAuditLog(req.user.id, 'ADMIN_DEPOSIT', 'accounts', accountId, { amount, userId }, req);
    await sendEmail(user.email, 'transaction', `${user.first_name} ${user.last_name}`, 'Admin Deposit', amount, updatedAccount.balance, ref);

    res.json({ message: 'Funds added successfully', ref, newBalance: updatedAccount.available_balance });
  } catch (error) {
    console.error('Admin deposit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getLoans = async (req, res) => {
  try {
    const db = getDb();
    const { status } = req.query;
    let query = 'SELECT l.*, u.first_name, u.last_name, u.email FROM loans l JOIN users u ON l.user_id = u.id';
    let params = [];
    if (status) { query += ' WHERE l.status = ?'; params.push(status); }
    query += ' ORDER BY l.applied_at DESC';
    const loans = db.prepare(query).all(...params);
    res.json(loans);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateLoan = async (req, res) => {
  try {
    const db = getDb();
    const { status, approvedAmount, notes } = req.body;
    const loan = db.prepare('SELECT l.*, u.first_name, u.last_name, u.email FROM loans l JOIN users u ON l.user_id = u.id WHERE l.id = ?').get(req.params.id);
    if (!loan) return res.status(404).json({ message: 'Loan not found' });

    if (status === 'active') {
      const amount = approvedAmount || loan.amount;
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + loan.term_months);
      const nextPayment = new Date();
      nextPayment.setMonth(nextPayment.getMonth() + 1);

      db.prepare(`UPDATE loans SET status = 'active', approved_amount = ?, outstanding_balance = ?, approved_at = CURRENT_TIMESTAMP, due_date = ?, next_payment_date = ?, notes = ? WHERE id = ?`)
        .run(amount, amount, dueDate.toISOString(), nextPayment.toISOString(), notes, loan.id);

      // Credit funds to user's checking account
      const checkingAccount = db.prepare("SELECT * FROM accounts WHERE user_id = ? AND account_type = 'checking'").get(loan.user_id);
      if (checkingAccount) {
        const ref = generateTransactionRef();
        db.prepare('UPDATE accounts SET balance = balance + ?, available_balance = available_balance + ? WHERE id = ?').run(amount, amount, checkingAccount.id);
        db.prepare(`INSERT INTO transactions (transaction_ref, to_account_id, user_id, type, amount, description, status, category) VALUES (?, ?, ?, 'loan_disbursement', ?, ?, 'completed', 'loan')`)
          .run(ref, checkingAccount.id, loan.user_id, amount, `Loan disbursement - ${loan.loan_number}`);
      }

      createNotification(loan.user_id, 'Loan Approved!', `Your ${loan.loan_type} loan of $${parseFloat(amount).toFixed(2)} has been approved and credited to your account.`, 'success');
      await sendEmail(loan.email, 'loanUpdate', `${loan.first_name} ${loan.last_name}`, loan.loan_number, 'Approved', amount);
    } else if (status === 'rejected') {
      db.prepare('UPDATE loans SET status = "rejected", notes = ? WHERE id = ?').run(notes, loan.id);
      createNotification(loan.user_id, 'Loan Application Update', `Your loan application has been reviewed. Please contact support for details.`, 'warning');
      await sendEmail(loan.email, 'loanUpdate', `${loan.first_name} ${loan.last_name}`, loan.loan_number, 'Rejected', loan.amount);
    }

    createAuditLog(req.user.id, 'UPDATE_LOAN', 'loans', loan.id, { status }, req);
    res.json({ message: 'Loan updated successfully' });
  } catch (error) {
    console.error('Loan update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTickets = async (req, res) => {
  try {
    const db = getDb();
    const { status } = req.query;
    let query = 'SELECT * FROM support_tickets';
    let params = [];
    if (status) { query += ' WHERE status = ?'; params.push(status); }
    query += ' ORDER BY created_at DESC';
    const tickets = db.prepare(query).all(...params);
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTicket = async (req, res) => {
  try {
    const db = getDb();
    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    const messages = db.prepare('SELECT * FROM support_messages WHERE ticket_id = ? ORDER BY created_at ASC').all(ticket.id);
    res.json({ ...ticket, messages });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateTicket = async (req, res) => {
  try {
    const db = getDb();
    const { status, resolution, replyMessage } = req.body;
    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    db.prepare("UPDATE support_tickets SET status = ?, resolution = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status || ticket.status, resolution || ticket.resolution, ticket.id);

    if (replyMessage) {
      db.prepare('INSERT INTO support_messages (ticket_id, sender_id, sender_type, message) VALUES (?, ?, "admin", ?)').run(ticket.id, req.user.id, replyMessage);
    }

    if (ticket.user_id) {
      createNotification(ticket.user_id, 'Support Ticket Update', `Your ticket #${ticket.ticket_number} has been updated.`, 'info');
    }

    res.json({ message: 'Ticket updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const db = getDb();
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const logs = db.prepare('SELECT a.*, u.first_name, u.last_name, u.email FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT ? OFFSET ?').all(parseInt(limit), offset);
    const total = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get();
    res.json({ logs, total: total.count });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllTransactions = async (req, res) => {
  try {
    const db = getDb();
    const { page = 1, limit = 30, type } = req.query;
    const offset = (page - 1) * limit;
    let query = 'SELECT t.*, u.first_name, u.last_name FROM transactions t JOIN users u ON t.user_id = u.id';
    let params = [];
    if (type) { query += ' WHERE t.type = ?'; params.push(type); }
    const total = db.prepare(query.replace('SELECT t.*, u.first_name, u.last_name', 'SELECT COUNT(*) as count')).get(...params);
    query += ` ORDER BY t.created_at DESC LIMIT ? OFFSET ?`; params.push(parseInt(limit), offset);
    const transactions = db.prepare(query).all(...params);
    res.json({ transactions, total: total.count });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
