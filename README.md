# 💳 Backend Ledger System

A secure backend application for managing users, accounts, and transactions. Built using Node.js, Express, and MongoDB.

---

## 🚀 Features

* User Registration & Login
* Account Management
* Money Transfer System
* Transaction History
* Secure Password Hashing (bcrypt)
* Email Notifications

---

## 🛠️ Tech Stack

* Node.js
* Express.js
* MongoDB (Mongoose)
* bcrypt
* dotenv
* cookie-parser

---

## 📁 Project Structure

src/
├── controllers/
├── routes/
├── models/
├── services/
├── middleware/
└── app.js

---

## ⚙️ Setup & Installation

1. Clone repo:

```
git clone https://github.com/your-username/your-repo-name.git
```

2. Install dependencies:

```
npm install
```

3. Create `.env` file:

```
PORT=5000
MONGO_URI=your_mongodb_url
JWT_SECRET=your_secret
EMAIL_USER=your_email
EMAIL_PASS=your_password
```

4. Run project:

```
npm run dev
```

---

## 🔌 API Routes

### Auth

* POST /api/auth/register
* POST /api/auth/login

### Account

* GET /api/account
* POST /api/account/create

### Transaction

* POST /api/transaction/transfer
* GET /api/transaction/history

---

## 🔒 Security

* Password hashing using bcrypt
* JWT authentication
* Environment variables for sensitive data

---

## 👨‍💻 Author

Ravi Yadav

---

## ⭐ Note

This project is for learning and backend practice.
