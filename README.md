# ⚓ CoastalTrust Bank — Setup & Run Guide

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- Node.js v18+ installed
- VS Code
- A Gmail account (for email notifications)

---

## Step 1 — Backend Setup

```bash
cd coastaltrust/backend
npm install
cp .env.example .env
```

Open `.env` and fill in your Gmail credentials:

```env
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16_char_app_password   # See instructions below
ADMIN_EMAIL=your_gmail@gmail.com
```

### Getting a Gmail App Password
1. Go to https://myaccount.google.com/security
2. Enable **2-Step Verification** if not already on
3. Search for **"App passwords"**
4. Create a new app password → Select "Mail" → "Other (Custom)" → Name it "CoastalTrust"
5. Copy the 16-character password into `.env` as `EMAIL_PASS`

> **Note:** If you don't want emails, the app still works — emails will just fail silently.

### Start the backend:
```bash
npm run dev
```

You should see:
```
🏦 ================================================
   CoastalTrust Bank API Server Started
🏦 ================================================
✅ Server running on http://localhost:5000
🔑 Admin: admin@coastaltrust.com / Admin@CoastalTrust2024
```

---

## Step 2 — Frontend Setup

Open a **new terminal**:

```bash
cd coastaltrust/frontend
npm install
npm start
```

The browser opens at **http://localhost:3000**

---

## 🔑 Login Credentials

### Admin Account
- **Email:** admin@coastaltrust.com
- **Password:** Admin@CoastalTrust2024

### Test User (create via Register, then approve in admin panel)
1. Go to http://localhost:3000/register
2. Fill in registration form
3. Login as admin → Users → Click Approve (✓)
4. Login as the new user

---

## 📱 Application Pages

### User Features
| Page | URL | Description |
|------|-----|-------------|
| Login | /login | Secure login with rate limiting |
| Register | /register | 3-step KYC registration |
| Dashboard | /dashboard | Balance overview, charts, recent transactions |
| Transfer | /transfer | Internal & wire transfers |
| Deposit | /deposit | Fund your account |
| Withdraw | /withdraw | Withdraw funds |
| Transactions | /transactions | Full history with filters & CSV export |
| Loans | /loans | Apply for loans, make repayments |
| Cards | /cards | View virtual debit cards |
| Beneficiaries | /beneficiaries | Save frequent transfer recipients |
| Profile | /profile | Edit info, change password, KYC upload |
| Support | /support | Submit tickets, live chat widget |

### Admin Features
| Page | URL | Description |
|------|-----|-------------|
| Dashboard | /admin/dashboard | Analytics, charts, overview |
| Users | /admin/users | Verify accounts, add funds, suspend |
| Loans | /admin/loans | Approve/reject loan applications |
| Tickets | /admin/tickets | Respond to customer support tickets |
| Transactions | /admin/transactions | Monitor all bank transactions |
| Audit Logs | /admin/audit | Security audit trail |
| Settings | /admin/settings | Bank configuration |

---

## 🗄️ Database

SQLite database is created automatically at `backend/coastaltrust.db` on first run.

To reset the database:
```bash
rm backend/coastaltrust.db
npm run dev   # recreates automatically
```

---

## 🔒 Security Features

- JWT access tokens (15min) + refresh tokens (7 days)
- bcrypt password hashing (12 rounds)
- Rate limiting (200 req/15min general, 20/15min for auth)
- Helmet.js security headers
- CORS protection
- Input validation
- Audit logging for all sensitive actions

---

## 📧 Email Notifications Sent For

- New account registration (welcome email)
- Account approval/suspension
- Every transaction (deposit, withdrawal, transfer)
- Loan application updates
- Support ticket submissions (to admin)
- Password reset requests

---

## 🏗️ Project Structure

```
coastaltrust/
├── backend/
│   ├── src/
│   │   ├── config/database.js      # SQLite schema + seeder
│   │   ├── controllers/            # Business logic
│   │   │   ├── authController.js
│   │   │   ├── transactionController.js
│   │   │   ├── loanController.js
│   │   │   ├── adminController.js
│   │   │   └── supportController.js
│   │   ├── middleware/auth.js       # JWT guards
│   │   ├── routes/index.js         # All API routes
│   │   ├── services/emailService.js # HTML email templates
│   │   ├── utils/helpers.js         # Account generators, etc.
│   │   └── server.js               # Express app
│   ├── uploads/                    # User uploaded files
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── public/index.html
    └── src/
        ├── App.js                  # Router + auth guards
        ├── context/AuthContext.js  # Global state
        ├── utils/api.js            # Axios instance
        ├── styles/global.css       # Design system
        ├── components/shared/      # Sidebar, Layout
        └── pages/                  # All page components
            ├── Login.js
            ├── Register.js
            ├── Dashboard.js
            ├── TransactionPages.js  (Transfer, Deposit, Withdraw)
            ├── Transactions.js
            ├── Loans.js
            ├── Profile.js
            ├── Support.js
            ├── BeneficiariesAndCards.js
            ├── PasswordPages.js
            ├── AdminDashboard.js
            ├── AdminUsers.js
            ├── AdminLoans.js
            ├── AdminTickets.js
            └── AdminTransactions.js
```

---

## 🎓 Project Notes (For Grading)

This application demonstrates:

1. **Full-Stack Architecture** — React SPA + Node.js REST API
2. **Secure Authentication** — JWT with refresh token rotation
3. **Database Design** — Normalized relational schema (10 tables)
4. **Role-Based Access Control** — User vs Admin permissions
5. **Email Integration** — Nodemailer with HTML templates
6. **Real-Time Notifications** — In-app + email alerts
7. **File Uploads** — Profile photos and KYC documents
8. **Data Visualization** — Recharts for analytics
9. **Security Best Practices** — bcrypt, helmet, CORS, rate limiting
10. **Responsive Design** — Mobile-friendly layout

---

*CoastalTrust Bank, N.A. | 100 Brickell Ave, Miami, FL 33131 | Member FDIC*
