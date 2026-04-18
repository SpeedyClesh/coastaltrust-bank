const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/database');
const { sendEmail } = require('../services/emailService');
const { generateAccountNumber, createNotification, createAuditLog } = require('../utils/helpers');

function generateTokens(userId, role) {
  const accessToken = jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { accessToken, refreshToken };
}

exports.register = async (req, res) => {
  try {
    const db = getDb();
    const { firstName, lastName, email, phone, password, dateOfBirth, address, city, state, zipCode, country, ssnLast4 } = req.body;

    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = uuidv4().replace(/-/g, '');
    const accountNumber = generateAccountNumber();
    const verifyToken = uuidv4().replace(/-/g, '');

    db.prepare(`
      INSERT INTO users (id, account_number, first_name, last_name, email, phone, password_hash,
        date_of_birth, address, city, state, zip_code, country, ssn_last4, email_verify_token)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, accountNumber, firstName, lastName, email, phone, passwordHash,
      dateOfBirth, address, city, state, zipCode, country || 'United States', ssnLast4, verifyToken);

    // Create checking account
    const checkingNum = accountNumber + '-CHK';
    db.prepare(`
      INSERT INTO accounts (user_id, account_type, account_number, balance, available_balance)
      VALUES (?, 'checking', ?, 0.00, 0.00)
    `).run(userId, checkingNum);

    // Create savings account
    const savingsNum = accountNumber + '-SAV';
    db.prepare(`
      INSERT INTO accounts (user_id, account_type, account_number, balance, available_balance, interest_rate)
      VALUES (?, 'savings', ?, 0.00, 0.00, 0.045)
    `).run(userId, savingsNum);

    createNotification(userId, 'Account Created', 'Welcome to CoastalTrust Bank! Your account is pending verification.', 'info');
    createAuditLog(userId, 'USER_REGISTER', 'users', userId, { email }, req);

    await sendEmail(email, 'welcome', `${firstName} ${lastName}`, accountNumber);

    res.status(201).json({ message: 'Account created successfully. Pending admin verification.', accountNumber });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

exports.login = async (req, res) => {
  try {
    const db = getDb();
    const { email, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ message: 'Invalid email or password' });

    if (user.status === 'suspended') return res.status(403).json({ message: 'Your account has been suspended. Contact support.' });
    if (user.status === 'pending') return res.status(403).json({ message: 'Your account is pending verification by our team.' });

    const { accessToken, refreshToken } = generateTokens(user.id, user.role);

    db.prepare('UPDATE users SET last_login = datetime("now") WHERE id = ?').run(user.id);
    createAuditLog(user.id, 'USER_LOGIN', 'users', user.id, { email }, req);

    const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ?').all(user.id);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        accountNumber: user.account_number,
        role: user.role,
        status: user.status,
        kycStatus: user.kyc_status,
        profileImage: user.profile_image,
        accounts,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const db = getDb();
    const user = db.prepare('SELECT id, role, status FROM users WHERE id = ?').get(decoded.userId);
    if (!user || user.status === 'suspended') return res.status(401).json({ message: 'Invalid token' });

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id, user.role);
    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare('SELECT id, account_number, first_name, last_name, email, phone, date_of_birth, address, city, state, zip_code, country, profile_image, role, status, kyc_status, email_verified, last_login, created_at FROM users WHERE id = ?').get(req.user.id);
    const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ?').all(req.user.id);
    const unreadCount = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0').get(req.user.id);
    res.json({ ...user, accounts, unreadNotifications: unreadCount.count });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const db = getDb();
    const { firstName, lastName, phone, address, city, state, zipCode, country } = req.body;
    db.prepare(`
      UPDATE users SET first_name=?, last_name=?, phone=?, address=?, city=?, state=?, zip_code=?, country=?, updated_at=datetime('now')
      WHERE id=?
    `).run(firstName, lastName, phone, address, city, state, zipCode, country, req.user.id);
    createAuditLog(req.user.id, 'PROFILE_UPDATE', 'users', req.user.id, {}, req);
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const db = getDb();
    const { currentPassword, newPassword } = req.body;
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) return res.status(400).json({ message: 'Current password is incorrect' });
    const newHash = await bcrypt.hash(newPassword, 12);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?').run(newHash, req.user.id);
    createAuditLog(req.user.id, 'PASSWORD_CHANGE', 'users', req.user.id, {}, req);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const db = getDb();
    const { email } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.json({ message: 'If this email exists, a reset link has been sent.' });

    const token = uuidv4().replace(/-/g, '');
    const expires = new Date(Date.now() + 3600000).toISOString();
    db.prepare('UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?').run(token, expires, user.id);
    await sendEmail(email, 'passwordReset', user.first_name, token);
    res.json({ message: 'Password reset email sent.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const db = getDb();
    const { token, newPassword } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE reset_password_token = ?').get(token);
    if (!user || new Date(user.reset_password_expires) < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    const hash = await bcrypt.hash(newPassword, 12);
    db.prepare('UPDATE users SET password_hash = ?, reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?').run(hash, user.id);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const db = getDb();
    const imagePath = `/uploads/${req.file.filename}`;
    db.prepare('UPDATE users SET profile_image = ? WHERE id = ?').run(imagePath, req.user.id);
    res.json({ message: 'Profile image updated', imagePath });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.uploadIdDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const db = getDb();
    const docPath = `/uploads/${req.file.filename}`;
    db.prepare('UPDATE users SET id_document = ?, kyc_status = "submitted", updated_at = datetime("now") WHERE id = ?').run(docPath, req.user.id);
    createNotification(req.user.id, 'KYC Document Submitted', 'Your ID document has been submitted for review.', 'info');
    res.json({ message: 'ID document submitted for review', docPath });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
