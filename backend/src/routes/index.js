const express = require('express');
const multer = require('multer');
const path = require('path');
const { auth, adminAuth, optionalAuth } = require('../middleware/auth');
const authController = require('../controllers/authController');
const transactionController = require('../controllers/transactionController');
const loanController = require('../controllers/loanController');
const adminController = require('../controllers/adminController');
const supportController = require('../controllers/supportController');

const router = express.Router();

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  const allowed = /jpeg|jpg|png|pdf/;
  cb(null, allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype));
}});

// =========== AUTH ROUTES ===========
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/refresh', authController.refreshToken);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);
router.get('/auth/profile', auth, authController.getProfile);
router.put('/auth/profile', auth, authController.updateProfile);
router.put('/auth/change-password', auth, authController.changePassword);
router.post('/auth/upload-avatar', auth, upload.single('avatar'), authController.uploadProfileImage);
router.post('/auth/upload-document', auth, upload.single('document'), authController.uploadIdDocument);

// =========== TRANSACTION ROUTES ===========
router.get('/transactions', auth, transactionController.getTransactions);
router.post('/transactions/transfer', auth, transactionController.transfer);
router.post('/transactions/deposit', auth, transactionController.deposit);
router.post('/transactions/withdrawal', auth, transactionController.withdrawal);
router.get('/accounts', auth, transactionController.getAccounts);
router.get('/beneficiaries', auth, transactionController.getBeneficiaries);
router.post('/beneficiaries', auth, transactionController.addBeneficiary);
router.delete('/beneficiaries/:id', auth, transactionController.deleteBeneficiary);

// =========== NOTIFICATION ROUTES ===========
router.get('/notifications', auth, transactionController.getNotifications);
router.put('/notifications/:id/read', auth, transactionController.markNotificationRead);
router.put('/notifications/read-all', auth, transactionController.markAllNotificationsRead);

// =========== LOAN ROUTES ===========
router.post('/loans/apply', auth, loanController.applyLoan);
router.get('/loans', auth, loanController.getLoans);
router.get('/loans/:id', auth, loanController.getLoan);
router.post('/loans/:id/payment', auth, loanController.makeLoanPayment);

// =========== SUPPORT ROUTES ===========
router.post('/support/tickets', optionalAuth, supportController.createTicket);
router.get('/support/tickets', auth, supportController.getUserTickets);
router.get('/support/tickets/:ticketNumber', optionalAuth, supportController.getTicket);
router.post('/support/tickets/:ticketNumber/reply', auth, supportController.replyToTicket);

// =========== ADMIN ROUTES ===========
router.get('/admin/dashboard', adminAuth, adminController.getDashboard);
router.get('/admin/users', adminAuth, adminController.getUsers);
router.get('/admin/users/:id', adminAuth, adminController.getUser);
router.put('/admin/users/:id/status', adminAuth, adminController.updateUserStatus);
router.post('/admin/deposit', adminAuth, adminController.adminDeposit);
router.get('/admin/loans', adminAuth, adminController.getLoans);
router.put('/admin/loans/:id', adminAuth, adminController.updateLoan);
router.get('/admin/tickets', adminAuth, adminController.getTickets);
router.get('/admin/tickets/:id', adminAuth, adminController.getTicket);
router.put('/admin/tickets/:id', adminAuth, adminController.updateTicket);
router.get('/admin/transactions', adminAuth, adminController.getAllTransactions);
router.get('/admin/audit-logs', adminAuth, adminController.getAuditLogs);

module.exports = router;
