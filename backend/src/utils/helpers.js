const { getDb } = require('../config/database');

function generateAccountNumber() {
  const prefix = 'CT';
  const random = Math.floor(Math.random() * 9000000000) + 1000000000;
  return `${prefix}${random}`;
}

function generateLoanNumber() {
  const prefix = 'LN';
  const random = Math.floor(Math.random() * 900000) + 100000;
  return `${prefix}${Date.now().toString().slice(-6)}${random}`;
}

function generateTransactionRef() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let ref = 'TXN';
  for (let i = 0; i < 12; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  return ref;
}

function generateTicketNumber() {
  return `TKT${Date.now().toString().slice(-8)}`;
}

function generateCardNumber() {
  const prefix = '4532';
  let num = prefix;
  for (let i = 0; i < 12; i++) num += Math.floor(Math.random() * 10);
  return num;
}

function maskCardNumber(cardNumber) {
  return `**** **** **** ${cardNumber.slice(-4)}`;
}

function calculateLoanPayment(principal, annualRate, termMonths) {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / termMonths;
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
  return Math.round(payment * 100) / 100;
}

function createNotification(userId, title, message, type = 'info', actionUrl = null) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, action_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, title, message, type, actionUrl);
  } catch (error) {
    console.error('Notification error:', error.message);
  }
}

function createAuditLog(userId, action, resource, resourceId, details, req) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, action, resource, resourceId,
      typeof details === 'object' ? JSON.stringify(details) : details,
      req?.ip || 'unknown',
      req?.headers?.['user-agent'] || 'unknown'
    );
  } catch (error) {
    console.error('Audit log error:', error.message);
  }
}

module.exports = {
  generateAccountNumber,
  generateLoanNumber,
  generateTransactionRef,
  generateTicketNumber,
  generateCardNumber,
  maskCardNumber,
  calculateLoanPayment,
  createNotification,
  createAuditLog,
};
