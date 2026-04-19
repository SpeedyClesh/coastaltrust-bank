const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './coastaltrust.db';

function initializeDatabase() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    -- Users Table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      account_number TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      date_of_birth TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip_code TEXT,
      country TEXT DEFAULT 'United States',
      ssn_last4 TEXT,
      profile_image TEXT,
      id_document TEXT,
      role TEXT DEFAULT 'user',
      status TEXT DEFAULT 'pending',
      kyc_status TEXT DEFAULT 'pending',
      email_verified INTEGER DEFAULT 0,
      email_verify_token TEXT,
      reset_password_token TEXT,
      reset_password_expires TEXT,
      two_factor_enabled INTEGER DEFAULT 0,
      last_login TEXT,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    );

    -- Accounts Table
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL,
      account_type TEXT NOT NULL,
      account_number TEXT UNIQUE NOT NULL,
      routing_number TEXT DEFAULT '067000000',
      balance REAL DEFAULT 0.00,
      available_balance REAL DEFAULT 0.00,
      currency TEXT DEFAULT 'USD',
      status TEXT DEFAULT 'active',
      interest_rate REAL DEFAULT 0.045,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Transactions Table
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      transaction_ref TEXT UNIQUE NOT NULL,
      from_account_id TEXT,
      to_account_id TEXT,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      fee REAL DEFAULT 0.00,
      currency TEXT DEFAULT 'USD',
      description TEXT,
      status TEXT DEFAULT 'completed',
      category TEXT,
      recipient_name TEXT,
      recipient_account TEXT,
      recipient_bank TEXT,
      recipient_routing TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Loans Table
    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL,
      loan_number TEXT UNIQUE NOT NULL,
      loan_type TEXT NOT NULL,
      amount REAL NOT NULL,
      approved_amount REAL,
      interest_rate REAL DEFAULT 8.5,
      term_months INTEGER NOT NULL,
      monthly_payment REAL,
      total_payable REAL,
      amount_paid REAL DEFAULT 0.00,
      outstanding_balance REAL,
      purpose TEXT,
      status TEXT DEFAULT 'pending',
      applied_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      approved_at TEXT,
      due_date TEXT,
      next_payment_date TEXT,
      collateral TEXT,
      notes TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Loan Payments Table
    CREATE TABLE IF NOT EXISTS loan_payments (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      loan_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_date TEXT DEFAULT (CURRENT_TIMESTAMP),
      status TEXT DEFAULT 'completed',
      transaction_ref TEXT,
      FOREIGN KEY (loan_id) REFERENCES loans(id)
    );

    -- Cards Table
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      card_number TEXT UNIQUE NOT NULL,
      card_holder TEXT NOT NULL,
      card_type TEXT DEFAULT 'visa',
      card_variant TEXT DEFAULT 'debit',
      expiry_month INTEGER NOT NULL,
      expiry_year INTEGER NOT NULL,
      cvv_hash TEXT NOT NULL,
      daily_limit REAL DEFAULT 2500.00,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );

    -- Beneficiaries Table
    CREATE TABLE IF NOT EXISTS beneficiaries (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      account_number TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      routing_number TEXT,
      email TEXT,
      phone TEXT,
      is_internal INTEGER DEFAULT 0,
      nickname TEXT,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Notifications Table
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      action_url TEXT,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Support Tickets Table
    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      ticket_number TEXT UNIQUE NOT NULL,
      user_id TEXT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'open',
      assigned_to TEXT,
      resolution TEXT,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Support Messages Table
    CREATE TABLE IF NOT EXISTS support_messages (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      ticket_id TEXT NOT NULL,
      sender_id TEXT,
      sender_type TEXT DEFAULT 'user',
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (ticket_id) REFERENCES support_tickets(id)
    );

    -- Audit Logs Table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT,
      admin_id TEXT,
      action TEXT NOT NULL,
      resource TEXT,
      resource_id TEXT,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    );

    -- Exchange Rates (mock)
    CREATE TABLE IF NOT EXISTS exchange_rates (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      from_currency TEXT NOT NULL,
      to_currency TEXT NOT NULL,
      rate REAL NOT NULL,
      updated_at TEXT DEFAULT (CURRENT_TIMESTAMP)
    );
  `);

  // Insert default exchange rates
  const rateCheck = db.prepare('SELECT COUNT(*) as count FROM exchange_rates').get();
  if (rateCheck.count === 0) {
    db.exec(`
      INSERT INTO exchange_rates (from_currency, to_currency, rate) VALUES
      ('USD', 'EUR', 0.92), ('USD', 'GBP', 0.79), ('USD', 'NGN', 1580.00),
      ('USD', 'CAD', 1.36), ('USD', 'AUD', 1.53), ('USD', 'JPY', 149.50),
      ('EUR', 'USD', 1.09), ('GBP', 'USD', 1.27);
    `);
  }

  console.log('✅ Database schema initialized');
  return db;
}

// Create and seed admin account
async function seedAdmin(db) {
  const admin = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
  if (!admin) {
    const hash = await bcrypt.hash('Admin@CoastalTrust2024', 12);
    const adminId = uuidv4().replace(/-/g, '');
    const accountNum = 'CT' + Date.now().toString().slice(-8);

    db.prepare(`
      INSERT INTO users (id, account_number, first_name, last_name, email, phone, password_hash,
        role, status, kyc_status, email_verified)
      VALUES (?, ?, 'System', 'Administrator', ?, '+1-850-555-0100', ?, 'admin', 'active', 'approved', 1)
    `).run(adminId, accountNum, 'admin@coastaltrust.com', hash);

    db.prepare(`
      INSERT INTO accounts (user_id, account_type, account_number, balance, available_balance)
      VALUES (?, 'admin', ?, 999999999.00, 999999999.00)
    `).run(adminId, 'CT-ADMIN-001');

    console.log('✅ Admin account created');
    console.log('   Email: admin@coastaltrust.com');
    console.log('   Password: Admin@CoastalTrust2024');
  }
}

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = initializeDatabase();
    seedAdmin(dbInstance).catch(console.error);
  }
  return dbInstance;
}

module.exports = { getDb, initializeDatabase };
