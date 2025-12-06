# 🚀 Quick Setup Guide - Secure Todo ISS Project

## Prerequisites
- ✅ Node.js v14+ installed
- ✅ MongoDB installed (local) or MongoDB Atlas account
- ✅ Google Cloud Console account (for OAuth)

## Step-by-Step Setup (5 minutes)

### 1. Install Dependencies
```bash
cd Todo_app_v2
npm install
```

### 2. Generate Security Keys

**Option A: Using npm script**
```bash
npm run generate:keys
```

**Option B: Manual generation**
```bash
# AES-256 key (32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# JWT secret (64 bytes)
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# JWT refresh secret (64 bytes)
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

**Option C: Using openssl**
```bash
openssl rand -base64 32  # AES key
openssl rand -base64 64  # JWT secrets
```

### 3. Create Environment File

Copy `.env.example` to `.env`:
```bash
copy .env.example .env    # Windows
cp .env.example .env      # Linux/Mac
```

Edit `.env` and add your generated keys:
```env
PORT=4000
NODE_ENV=development

# MongoDB - Choose one:
MONGODB_URI=mongodb://localhost:27017/secure-todo-iss
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/secure-todo-iss

# Paste your generated keys here:
JWT_SECRET=<paste-your-jwt-secret>
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=<paste-your-jwt-refresh-secret>
JWT_REFRESH_EXPIRES_IN=30d

AES_KEY=<paste-your-aes-key>

# Google OAuth (optional - configure later)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

FRONTEND_URL=http://localhost:4000
COOKIE_SECRET=your-random-cookie-secret
```

### 4. Setup Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project or select existing
3. **Enable APIs**: Google+ API
4. **Create Credentials**:
   - Type: OAuth 2.0 Client ID
   - Application type: Web application
   - Name: "Secure Todo ISS"
   - Authorized redirect URIs: `http://localhost:4000/api/auth/google/callback`
5. Copy **Client ID** and **Client Secret** to `.env`

### 5. Start MongoDB

**Local MongoDB:**
```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod

# Or manual:
mongod --dbpath ./data/db
```

**MongoDB Atlas:**
- Use your connection string in `.env` → `MONGODB_URI`

### 6. Run the Application

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

**Expected output:**
```
🚀 Server running on port 4000
📝 Environment: development
🔒 Security features enabled: Helmet, CORS, Rate Limiting
🔐 Encryption: AES-256-GCM with SHA-256 integrity
🔑 Authentication: JWT + Google OAuth 2.0
MongoDB connected: localhost
```

### 7. Access the Application

Open browser: **http://localhost:4000**

You should see:
- 🔒 Secure Todo App login page
- Login and Signup forms
- "Continue with Google" button

## Testing the Application

### Test 1: User Registration
1. Click "Sign up"
2. Enter:
   - Name: Test User
   - Email: test@example.com
   - Password: Test1234 (must have uppercase, lowercase, number)
3. Click "Sign Up"
4. Should redirect to todo app

### Test 2: Create Encrypted Todo
1. Enter title: "Buy groceries"
2. Enter description: "Milk, eggs, bread"
3. Click "Add Todo"
4. Todo appears in list

### Test 3: Verify Encryption in Database
```bash
# Connect to MongoDB
mongosh secure-todo-iss

# View encrypted todo
db.todos.findOne()
```

**Should see:**
```javascript
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  title: "Buy groceries",  // Plaintext
  encryptedContent: "xK9vR2mN8pL2wY5tH7jF4gD6sA1zX3cV8bN5mQ9wE2rT7yU4iO6p...",  // Gibberish!
  iv: "dG9kb3Nrb...",
  authTag: "mQ4wE2rT7...",
  integrityHash: "b8f2d5e3c1a7d9f4e6c2b8a5d3f1e9c7b4a2d8f6e3c1b9a7d5f3e1c9b7a5d3f1",
  completed: false,
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

### Test 4: Verify bcrypt Rounds
```bash
mongosh secure-todo-iss
db.users.findOne()
```

**Password field should start with:** `$2b$12$...`
```
     ^^
     12 rounds confirmed!
```

### Test 5: Test Integrity Verification
```bash
npm run test:integrity
```

**Expected output:**
```
======================================================================
SHA-256 INTEGRITY VERIFICATION TEST
======================================================================

TEST 1: Normal Integrity Verification
----------------------------------------------------------------------
Plaintext: This is my secret todo description
SHA-256 Hash: b8f2d5e3c1a...
Integrity Check: ✅ PASS

TEST 2: Tampering Detection
----------------------------------------------------------------------
Original Plaintext: Buy groceries
Tampered Plaintext: Buy groceries and steal credit card numbers
Integrity Check: ❌ FAIL (Expected)

... (more tests)
```

### Test 6: Rate Limiting
Open browser console and run:
```javascript
// Test authentication rate limit (will fail after 10 attempts)
for (let i = 0; i < 15; i++) {
  fetch('/api/auth/login', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({email: 'test@test.com', password: 'wrong'})
  }).then(r => r.json()).then(console.log);
}
```

**Expected:** First 10 succeed (with error), remaining 5 return `429 Too Many Requests`

### Test 7: XSS Prevention
1. Create todo with title: `<script>alert('XSS')</script>`
2. Description: `<img src=x onerror="alert('XSS')">`
3. Click "Add Todo"

**Expected:** Script displayed as plain text, NOT executed

### Test 8: Check Security Logs
```bash
# View logs
type logs\combined.log     # Windows
cat logs/combined.log      # Linux/Mac

# View security events only
type logs\security.log
```

**Should contain:**
- Authentication events
- Rate limit violations
- Integrity check results

## Troubleshooting

### ❌ "MongoServerError: connection refused"
**Solution:**
```bash
# Check MongoDB is running
mongod --version

# Start MongoDB
net start MongoDB    # Windows
sudo systemctl start mongod    # Linux
```

### ❌ "AES key must be exactly 32 bytes"
**Solution:**
```bash
# Regenerate correct key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Copy to .env → AES_KEY
```

### ❌ "Google OAuth not configured"
**Solution:** Either:
1. Configure Google OAuth (see step 4)
2. Or just use email/password login (OAuth is optional)

### ❌ Port 4000 already in use
**Solution:**
```bash
# Windows - find and kill process
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Or change port in .env
PORT=5000
```

### ❌ "Cannot find module 'bcrypt'"
**Solution:**
```bash
# Reinstall dependencies
del node_modules     # Windows
rm -rf node_modules  # Linux/Mac
npm install
```

## Project Structure
```
Todo_app_v2/
├── server.js                 # ⚙️  Main server (START HERE)
├── package.json              # 📦 Dependencies
├── .env                      # 🔐 Configuration (CREATE THIS)
├── config/
│   ├── database.js          # 🗄️  MongoDB connection
│   └── passport.js          # 🔑 Google OAuth setup
├── models/
│   ├── User.js              # 👤 User model (bcrypt 12 rounds)
│   └── Todo.js              # ✅ Todo model (encryption fields)
├── routes/
│   ├── auth.js              # 🔐 Login/Register endpoints
│   ├── oauth.js             # 🌐 Google OAuth endpoints
│   └── todos.js             # ✅ Todo CRUD endpoints
├── middleware/
│   ├── authMiddleware.js    # 🛡️  JWT verification
│   ├── rateLimiter.js       # ⏱️  Rate limiting
│   └── validator.js         # ✔️  Input validation
├── utils/
│   ├── crypto.js            # 🔒 AES-256-GCM encryption
│   ├── hash.js              # #️⃣  SHA-256 integrity
│   └── logger.js            # 📝 Winston logging
├── public/
│   ├── index.html           # 🌐 Frontend HTML
│   ├── css/style.css        # 🎨 Styling
│   └── js/app.js            # ⚡ Frontend logic
├── tests/
│   └── testIntegrity.js     # 🧪 Integrity tests
└── logs/                    # 📊 Auto-generated logs
```

## Quick Reference

### NPM Scripts
```bash
npm start              # Production mode
npm run dev            # Development mode (auto-reload)
npm run test:integrity # Test SHA-256 integrity
npm run generate:keys  # Generate new encryption keys
```

### API Endpoints
```
POST   /api/auth/register          # Create account
POST   /api/auth/login             # Login
POST   /api/auth/logout            # Logout
GET    /api/auth/me                # Current user
GET    /api/auth/google            # Google OAuth
GET    /api/todos                  # Get todos (encrypted)
POST   /api/todos                  # Create todo
PUT    /api/todos/:id              # Update todo
DELETE /api/todos/:id              # Delete todo
```

### Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| PORT | No | Server port (default: 4000) |
| MONGODB_URI | Yes | MongoDB connection string |
| JWT_SECRET | Yes | JWT signing secret (64 bytes) |
| JWT_REFRESH_SECRET | Yes | Refresh token secret (64 bytes) |
| AES_KEY | Yes | AES-256 key (32 bytes) |
| GOOGLE_CLIENT_ID | No | Google OAuth client ID |
| GOOGLE_CLIENT_SECRET | No | Google OAuth secret |

## Security Checklist

- ✅ bcrypt with 12 rounds
- ✅ AES-256-GCM encryption
- ✅ SHA-256 integrity hashing
- ✅ JWT authentication
- ✅ Google OAuth 2.0
- ✅ Rate limiting (60/min general, 10/15min auth)
- ✅ Helmet security headers
- ✅ Winston logging
- ✅ Input validation
- ✅ XSS prevention (textContent)
- ✅ HttpOnly cookies
- ✅ Plain JavaScript (no frameworks)

## Need Help?

### Check Logs
```bash
# All logs
type logs\combined.log

# Errors only
type logs\error.log

# Security events
type logs\security.log
```

### Common Issues
1. **MongoDB not connecting**: Check MONGODB_URI in `.env`
2. **Keys not working**: Regenerate with `npm run generate:keys`
3. **OAuth failing**: Google credentials or redirect URI mismatch
4. **Port in use**: Change PORT in `.env`

### Resources
- [Node.js Crypto Docs](https://nodejs.org/api/crypto.html)
- [MongoDB Atlas Setup](https://www.mongodb.com/cloud/atlas)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Express Security](https://expressjs.com/en/advanced/best-practice-security.html)

---

**Ready to start!** Run `npm run dev` and open http://localhost:4000
