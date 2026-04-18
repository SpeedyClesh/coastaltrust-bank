const { getDb } = require('../config/database');
const { generateTicketNumber, createNotification } = require('../utils/helpers');
const { sendEmail, sendAdminEmail } = require('../services/emailService');

exports.createTicket = async (req, res) => {
  try {
    const db = getDb();
    const { name, email, subject, message, category, priority } = req.body;
    const userId = req.user?.id || null;
    const ticketNumber = generateTicketNumber();

    db.prepare(`
      INSERT INTO support_tickets (ticket_number, user_id, name, email, subject, message, category, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(ticketNumber, userId, name, email, subject, message, category || 'general', priority || 'medium');

    const ticket = db.prepare('SELECT * FROM support_tickets WHERE ticket_number = ?').get(ticketNumber);

    if (userId) {
      createNotification(userId, 'Support Ticket Created', `Your ticket #${ticketNumber} has been received. We'll respond within 24 hours.`, 'info');
    }

    // Notify admin
    await sendAdminEmail(
      `[New Ticket #${ticketNumber}] ${subject}`,
      `<h2>New Support Ticket</h2><p><b>From:</b> ${name} (${email})</p><p><b>Subject:</b> ${subject}</p><p><b>Category:</b> ${category}</p><p><b>Priority:</b> ${priority}</p><p><b>Message:</b></p><p>${message}</p>`
    );

    res.status(201).json({ message: 'Ticket submitted. We will respond within 24 hours.', ticketNumber });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getUserTickets = async (req, res) => {
  try {
    const db = getDb();
    const tickets = db.prepare('SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getTicket = async (req, res) => {
  try {
    const db = getDb();
    const ticket = db.prepare('SELECT * FROM support_tickets WHERE ticket_number = ?').get(req.params.ticketNumber);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (ticket.user_id && ticket.user_id !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const messages = db.prepare('SELECT * FROM support_messages WHERE ticket_id = ? ORDER BY created_at ASC').all(ticket.id);
    res.json({ ...ticket, messages });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.replyToTicket = async (req, res) => {
  try {
    const db = getDb();
    const { message } = req.body;
    const ticket = db.prepare('SELECT * FROM support_tickets WHERE ticket_number = ?').get(req.params.ticketNumber);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    db.prepare('INSERT INTO support_messages (ticket_id, sender_id, sender_type, message) VALUES (?, ?, "user", ?)').run(ticket.id, req.user.id, message);
    db.prepare("UPDATE support_tickets SET updated_at = datetime('now') WHERE id = ?").run(ticket.id);

    res.json({ message: 'Reply sent' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
