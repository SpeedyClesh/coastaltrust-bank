const { getDb } = require('../config/database');
const { generateTransactionRef, createNotification, createAuditLog } = require('../utils/helpers');
const { sendEmail } = require('../services/emailService');

exports.getTransactions = async (req, res) => {
  try {
    const db = getDb();
    const { page = 1, limit = 20, type, startDate, endDate, accountId } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM transactions WHERE user_id = ?';
    let params = [req.user.id];

    if (type) { query += ' AND type = ?'; params.push(type); }
    if (startDate) { query += ' AND created_at >= ?'; params.push(startDate); }
    if (endDate) { query += ' AND created_at <= ?'; params.push(endDate + ' 23:59:59'); }
    if (accountId) { query += ' AND (from_account_id = ? OR to_account_id = ?)'; params.push(accountId, accountId); }

    const total = db.prepare(query.replace('SELECT *', 'SELECT COUNT(*) as count')).get(...params);
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const transactions = db.prepare(query).all(...params);
    res.json({ transactions, total: total.count, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.transfer = async (req, res) => {
  try {
    const db = getDb();
    const { fromAccountId, toAccountNumber, amount, description, transferType, recipientName, recipientBank, recipientRouting } = req.body;

    if (amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

    const fromAccount = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(fromAccountId, req.user.id);
    if (!fromAccount) return res.status(404).json({ message: 'Source account not found' });
    if (fromAccount.status !== 'active') return res.status(400).json({ message: 'Account is not active' });

    const fee = transferType === 'wire' ? 25.00 : 0;
    const totalDeduction = parseFloat(amount) + fee;

    if (fromAccount.available_balance < totalDeduction) {
      return res.status(400).json({ message: `Insufficient funds. Available: $${fromAccount.available_balance.toFixed(2)}` });
    }

    const ref = generateTransactionRef();
    let toAccount = null;

    if (transferType === 'internal') {
      toAccount = db.prepare('SELECT * FROM accounts WHERE account_number = ? AND status = "active"').get(toAccountNumber);
      if (!toAccount) return res.status(404).json({ message: 'Destination account not found' });
      if (toAccount.id === fromAccountId) return res.status(400).json({ message: 'Cannot transfer to the same account' });
    }

    // Execute transfer
    const transfer = db.transaction(() => {
      db.prepare('UPDATE accounts SET balance = balance - ?, available_balance = available_balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(totalDeduction, totalDeduction, fromAccountId);

      if (toAccount) {
        db.prepare('UPDATE accounts SET balance = balance + ?, available_balance = available_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run(parseFloat(amount), parseFloat(amount), toAccount.id);
      }

      db.prepare(`
        INSERT INTO transactions (transaction_ref, from_account_id, to_account_id, user_id, type, amount, fee, description, status, recipient_name, recipient_account, recipient_bank, recipient_routing)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(ref, fromAccountId, toAccount?.id || null, req.user.id, 'transfer', amount, fee, description || 'Transfer', 'completed',
        recipientName || null, toAccountNumber, recipientBank || 'CoastalTrust Bank', recipientRouting || '067000000');

      if (toAccount) {
        const toUser = db.prepare('SELECT user_id FROM accounts WHERE id = ?').get(toAccount.id);
        if (toUser && toUser.user_id !== req.user.id) {
          db.prepare(`
            INSERT INTO transactions (transaction_ref, from_account_id, to_account_id, user_id, type, amount, description, status, recipient_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run('RCV' + ref.slice(3), fromAccountId, toAccount.id, toUser.user_id, 'credit', amount, description || 'Transfer received', 'completed', null);
          createNotification(toUser.user_id, 'Money Received', `You received $${parseFloat(amount).toFixed(2)}`, 'success');
        }
      }
    });

    transfer();

    const updatedAccount = db.prepare('SELECT * FROM accounts WHERE id = ?').get(fromAccountId);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    createNotification(req.user.id, 'Transfer Successful', `$${parseFloat(amount).toFixed(2)} transferred successfully. Ref: ${ref}`, 'success');
    createAuditLog(req.user.id, 'TRANSFER', 'transactions', ref, { amount, type: transferType }, req);

    await sendEmail(user.email, 'transaction', `${user.first_name} ${user.last_name}`, 'Transfer Sent', amount, updatedAccount.balance, ref);

    res.json({ message: 'Transfer successful', ref, newBalance: updatedAccount.available_balance });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ message: 'Server error during transfer' });
  }
};

exports.deposit = async (req, res) => {
  try {
    const db = getDb();
    const { accountId, amount, description, method } = req.body;

    if (amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

    const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(accountId, req.user.id);
    if (!account) return res.status(404).json({ message: 'Account not found' });

    const ref = generateTransactionRef();

    db.prepare('UPDATE accounts SET balance = balance + ?, available_balance = available_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(parseFloat(amount), parseFloat(amount), accountId);

    db.prepare(`
      INSERT INTO transactions (transaction_ref, to_account_id, user_id, type, amount, description, status, category)
      VALUES (?, ?, ?, 'deposit', ?, ?, 'completed', 'deposit')
    `).run(ref, accountId, req.user.id, parseFloat(amount), description || `Deposit via ${method || 'ACH'}`, );

    const updatedAccount = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    createNotification(req.user.id, 'Deposit Successful', `$${parseFloat(amount).toFixed(2)} deposited successfully.`, 'success');
    await sendEmail(user.email, 'transaction', `${user.first_name} ${user.last_name}`, 'Deposit', amount, updatedAccount.balance, ref);

    res.json({ message: 'Deposit successful', ref, newBalance: updatedAccount.available_balance });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.withdrawal = async (req, res) => {
  try {
    const db = getDb();
    const { accountId, amount, description, method } = req.body;

    if (amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

    const account = db.prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?').get(accountId, req.user.id);
    if (!account) return res.status(404).json({ message: 'Account not found' });
    if (account.available_balance < amount) return res.status(400).json({ message: 'Insufficient funds' });

    const ref = generateTransactionRef();

    db.prepare('UPDATE accounts SET balance = balance - ?, available_balance = available_balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(parseFloat(amount), parseFloat(amount), accountId);

    db.prepare(`
      INSERT INTO transactions (transaction_ref, from_account_id, user_id, type, amount, description, status, category)
      VALUES (?, ?, ?, 'withdrawal', ?, ?, 'completed', 'withdrawal')
    `).run(ref, accountId, req.user.id, parseFloat(amount), description || `Withdrawal via ${method || 'ATM'}`);

    const updatedAccount = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    createNotification(req.user.id, 'Withdrawal Processed', `$${parseFloat(amount).toFixed(2)} withdrawn. Ref: ${ref}`, 'warning');
    await sendEmail(user.email, 'transaction', `${user.first_name} ${user.last_name}`, 'Withdrawal', amount, updatedAccount.balance, ref);

    res.json({ message: 'Withdrawal successful', ref, newBalance: updatedAccount.available_balance });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAccounts = async (req, res) => {
  try {
    const db = getDb();
    const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ?').all(req.user.id);
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getBeneficiaries = async (req, res) => {
  try {
    const db = getDb();
    const beneficiaries = db.prepare('SELECT * FROM beneficiaries WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json(beneficiaries);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.addBeneficiary = async (req, res) => {
  try {
    const db = getDb();
    const { name, accountNumber, bankName, routingNumber, email, nickname } = req.body;

    const isInternal = db.prepare('SELECT id FROM accounts WHERE account_number = ?').get(accountNumber);

    db.prepare(`
      INSERT INTO beneficiaries (user_id, name, account_number, bank_name, routing_number, email, nickname, is_internal)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, name, accountNumber, bankName, routingNumber, email, nickname, isInternal ? 1 : 0);

    res.status(201).json({ message: 'Beneficiary added successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteBeneficiary = async (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM beneficiaries WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Beneficiary removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const db = getDb();
    const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const db = getDb();
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.markAllNotificationsRead = async (req, res) => {
  try {
    const db = getDb();
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
