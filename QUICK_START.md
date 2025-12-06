# 🚀 Quick Start Guide - Secure Todo Application

## ⚡ Fast Setup (5 minutes)

### 1. Install Dependencies
```bash
cd Todo_app_v2
npm install
```

### 2. Configure Environment
The `.env` file has been created with secure keys. **Only update these:**

```bash
# If using MongoDB Atlas (recommended):
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/secure-todo-iss

# For Google OAuth (optional):
GOOGLE_CLIENT_ID=your-actual-client-id
GOOGLE_CLIENT_SECRET=your-actual-client-secret
```

**All encryption keys are already generated securely!** ✅

### 3. Start MongoDB

**Option A - Local MongoDB:**
```bash
mongod
```

**Option B - MongoDB Atlas:**
1. Create free cluster at https://cloud.mongodb.com
2. Get connection string
3. Update `MONGODB_URI` in `.env`

### 4. Run the Application
```bash
npm run dev
```

Visit: **http://localhost:4000** 🎉

---

## 🧪 Test Security Features

### 1. Test Integrity Verification
```bash
node tests/testIntegrity.js
```

Expected output:
- ✅ All integrity checks pass
- ✅ Tampering detection works
- ✅ Encryption + hashing integration verified

### 2. Test bcrypt Rounds
After creating a user, check MongoDB:
```bash
mongosh secure-todo-iss
db.users.findOne()
```

Look for: `password: "$2b$12$..."` (12 rounds confirmed) ✅

### 3. Test Rate Limiting
Try logging in with wrong password 11 times:
```bash
# Should block after 10 attempts
for /L %i in (1,1,11) do curl -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"wrong\"}"
```

### 4. Test XSS Prevention
1. Create todo with: `<script>alert('XSS')</script>`
2. Should display as plain text (not execute) ✅

---

## 📋 Usage Guide

### Create Account
1. Go to http://localhost:4000
2. Click "Sign up"
3. Enter name, email, password (8+ chars, mixed case, number)
4. Click "Sign Up"

### Add Encrypted Todo
1. Enter title: `Grocery Shopping`
2. Enter description: `Buy milk, eggs, bread` (will be encrypted)
3. Click "Add Todo"
4. Check MongoDB - description is encrypted! 🔐

### Verify Encryption in Database
```bash
mongosh secure-todo-iss
db.todos.findOne()
```

You'll see:
- `encryptedContent`: Base64 gibberish ✅
- `iv`: Unique initialization vector ✅
- `authTag`: GCM authentication tag ✅
- `integrityHash`: 64-char SHA-256 hash ✅

---

## 🔐 Security Checklist

After setup, verify all security primitives:

- ✅ **bcrypt (12 rounds)**: Check user password in DB starts with `$2b$12$`
- ✅ **AES-256-GCM**: Todo descriptions encrypted in DB
- ✅ **SHA-256 integrity**: integrityHash field present (64 hex chars)
- ✅ **JWT auth**: Cookies set on login (check DevTools → Application)
- ✅ **Rate limiting**: 11th login attempt blocked
- ✅ **Security headers**: Check Network tab for Helmet headers
- ✅ **Winston logging**: Check `logs/` folder for security events
- ✅ **XSS prevention**: HTML in todos displayed as text
- ✅ **Input validation**: Try invalid email/short password (should reject)

---

## 🎯 Quick Commands

```bash
# Development mode (auto-restart)
npm run dev

# Production mode
npm start

# Test integrity verification
npm test

# View logs
type logs\combined.log
type logs\security.log
type logs\error.log

# Clean start (delete todos, keep users)
mongosh secure-todo-iss --eval "db.todos.deleteMany({})"

# Complete reset (delete everything)
mongosh secure-todo-iss --eval "db.dropDatabase()"
```

---

## 🐛 Troubleshooting

### MongoDB Connection Failed
```bash
# Check MongoDB is running
mongod --version

# Or use MongoDB Atlas connection string in .env
```

### Port 4000 Already in Use
```bash
# Change port in .env
PORT=5000

# Or kill existing process
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

### Google OAuth Not Working
- It's optional! You can use email/password authentication
- To enable: Get credentials from Google Cloud Console
- Update `.env` with real `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

### Encryption Errors
```bash
# Verify AES key is 32 bytes
node -e "console.log(Buffer.from(process.env.AES_KEY, 'base64').length)"
# Should output: 32
```

---

## 📚 Project Structure

```
Todo_app_v2/
├── server.js              ← Start here (main server)
├── .env                   ← Your configuration (already created!)
├── package.json           ← Dependencies
│
├── config/                ← Database & OAuth setup
│   ├── database.js
│   └── passport.js
│
├── models/                ← MongoDB schemas
│   ├── User.js           ← bcrypt 12 rounds
│   └── Todo.js           ← Encryption fields
│
├── routes/                ← API endpoints
│   ├── auth.js           ← Login/signup
│   ├── oauth.js          ← Google OAuth
│   └── todos.js          ← CRUD + encryption
│
├── middleware/            ← Security layers
│   ├── authMiddleware.js ← JWT verification
│   ├── rateLimiter.js    ← 60 req/min
│   └── validator.js      ← Input validation
│
├── utils/                 ← Security primitives
│   ├── crypto.js         ← AES-256-GCM
│   ├── hash.js           ← SHA-256
│   └── logger.js         ← Winston
│
├── public/                ← Frontend (plain JS)
│   ├── index.html        ← Single page app
│   ├── css/style.css     ← Styling
│   └── js/app.js         ← Vanilla JavaScript
│
├── tests/                 ← Test scripts
│   └── testIntegrity.js  ← SHA-256 tests
│
└── logs/                  ← Auto-created log files
    ├── combined.log
    ├── security.log
    └── error.log
```

---

## 🎓 ISS Project Features

All requirements implemented:

1. ✅ **bcrypt** - Exactly 12 rounds for password hashing
2. ✅ **AES-256-GCM** - Unique IV per document, auth tags
3. ✅ **SHA-256** - Integrity verification, tamper detection
4. ✅ **JWT** - Access + refresh tokens, HttpOnly cookies
5. ✅ **OAuth 2.0** - Google authentication via Passport.js
6. ✅ **Rate Limiting** - 60 req/min general, 10/15min auth
7. ✅ **Helmet** - Security headers (CSP, XSS protection)
8. ✅ **Winston** - Comprehensive security logging
9. ✅ **Validation** - express-validator on all inputs
10. ✅ **Plain JavaScript** - No TypeScript, no frameworks

---

## 📖 Documentation

- **README.md** - Complete technical documentation
- **questions.md** - Team member Q&A (demonstrating understanding)
- **QUICK_START.md** - This file (fast setup)
- **.env.example** - Environment template

---

## 🎉 You're Ready!

**Current Status:**
- ✅ Dependencies installed
- ✅ .env configured with secure keys
- ✅ All code files created
- ✅ Test scripts ready

**Next Step:**
```bash
npm run dev
```

Then visit: **http://localhost:4000** and create your first encrypted todo! 🔒

---

**Need help?** Check README.md for detailed explanations of each security primitive.

**For grading:** Run `node tests/testIntegrity.js` to demonstrate SHA-256 integrity verification.
