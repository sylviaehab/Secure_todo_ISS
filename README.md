# 🔒 Secure Todo Application - ISS Final Project

A full-stack encrypted todo application implementing all required security primitives for the Information Systems Security course.

## 🎯 Project Overview

This application demonstrates end-to-end security implementation including:
- **AES-256-GCM encryption** with unique initialization vectors per document
- **SHA-256 integrity hashing** for tamper detection
- **bcrypt password hashing** with exactly 12 rounds
- **JWT authentication** with HttpOnly cookies
- **Google OAuth 2.0** integration
- **Rate limiting** and **security headers**
- **Winston logging** for security events
- **Input validation and sanitization**

## 🛡️ Security Primitives Implemented

### 1. Password Hashing (bcrypt - 12 rounds)
- **Implementation**: `models/User.js`
- **Rounds**: Exactly 12 (as per ISS requirements)
- **Usage**: Pre-save hook automatically hashes passwords before storing
- **Verification**: `comparePassword()` method uses constant-time comparison

```javascript
const BCRYPT_ROUNDS = 12;
const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
```

### 2. AES-256-GCM Encryption
- **Implementation**: `utils/crypto.js`
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 96 bits (12 bytes) - unique per encryption
- **Auth Tag**: 128 bits (16 bytes) for authenticated encryption
- **Storage**: All values base64 encoded

```javascript
// Generate unique IV for each encryption
const iv = crypto.randomBytes(12);
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
```

### 3. SHA-256 Integrity Hashing
- **Implementation**: `utils/hash.js`
- **Algorithm**: SHA-256 cryptographic hash
- **Purpose**: Detect unauthorized modifications to encrypted data
- **Storage**: Hex string (64 characters)
- **Verification**: Constant-time comparison to prevent timing attacks

```javascript
const hash = crypto.createHash('sha256').update(plaintext, 'utf8').digest('hex');
```

### 4. JWT Authentication
- **Implementation**: `middleware/authMiddleware.js`, `routes/auth.js`
- **Token Types**: Access token (7 days), Refresh token (30 days)
- **Storage**: HttpOnly cookies (preferred) + localStorage (fallback)
- **Headers**: `Authorization: Bearer <token>`

### 5. Google OAuth 2.0
- **Implementation**: `config/passport.js`, `routes/oauth.js`
- **Strategy**: passport-google-oauth20
- **Scopes**: profile, email
- **Flow**: Authorization code flow with PKCE

### 6. Rate Limiting
- **Implementation**: `middleware/rateLimiter.js`
- **General API**: 60 requests per minute
- **Authentication**: 10 requests per 15 minutes (brute force protection)
- **Todo Operations**: 30 requests per minute

### 7. Security Headers (Helmet)
- **Implementation**: `server.js`
- **Headers**: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, etc.
- **CSP**: Restricts resource loading to trusted sources

### 8. Winston Logging
- **Implementation**: `utils/logger.js`
- **Log Files**: `logs/combined.log`, `logs/error.log`, `logs/security.log`
- **Events Logged**: Auth success/failure, integrity failures, rate limits, security violations

### 9. Input Validation
- **Implementation**: `middleware/validator.js`
- **Library**: express-validator
- **Validations**: Email format, password strength, input length limits
- **XSS Prevention**: textContent usage in frontend (not innerHTML)

## 📁 Project Structure

```
Todo_app_v2/
├── server.js                 # Main Express server
├── package.json              # Dependencies and scripts
├── .env.example              # Environment variables template
├── config/
│   ├── database.js          # MongoDB connection
│   └── passport.js          # Google OAuth configuration
├── models/
│   ├── User.js              # User model with bcrypt (12 rounds)
│   └── Todo.js              # Todo model with encryption fields
├── routes/
│   ├── auth.js              # Local authentication routes
│   ├── oauth.js             # Google OAuth routes
│   └── todos.js             # Todo CRUD with encryption
├── middleware/
│   ├── authMiddleware.js    # JWT verification
│   ├── rateLimiter.js       # Rate limiting configuration
│   └── validator.js         # Input validation rules
├── utils/
│   ├── crypto.js            # AES-256-GCM encryption
│   ├── hash.js              # SHA-256 integrity hashing
│   └── logger.js            # Winston logging configuration
├── public/
│   ├── index.html           # Frontend HTML (plain, no frameworks)
│   ├── css/
│   │   └── style.css        # Application styles
│   └── js/
│       └── app.js           # Frontend logic (vanilla JS)
└── logs/                    # Winston log files (auto-created)
```

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- Google Cloud Console account (for OAuth)

### 1. Clone and Install

```bash
cd Todo_app_v2
npm install
```

### 2. Generate Encryption Keys

```bash
# Generate AES-256 key (32 bytes base64 encoded)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate JWT secret (64 bytes base64 encoded)
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Generate JWT refresh secret (64 bytes base64 encoded)
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Alternative: Use openssl
openssl rand -base64 32  # AES key
openssl rand -base64 64  # JWT secrets
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and update:

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=4000
NODE_ENV=development

# MongoDB (choose one)
MONGODB_URI=mongodb://localhost:27017/secure-todo-iss
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/secure-todo-iss

# JWT Secrets (use generated keys)
JWT_SECRET=<your-generated-jwt-secret>
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=<your-generated-refresh-secret>
JWT_REFRESH_EXPIRES_IN=30d

# AES-256 Key (MUST be exactly 32 bytes when decoded)
AES_KEY=<your-generated-aes-key>

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<your-client-secret>
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

# Frontend URL
FRONTEND_URL=http://localhost:4000

# Cookie Secret
COOKIE_SECRET=<your-cookie-secret>
```

### 4. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized redirect URIs:
   - `http://localhost:4000/api/auth/google/callback`
7. Copy Client ID and Client Secret to `.env`

### 5. Start MongoDB

**Local MongoDB:**
```bash
mongod --dbpath ./data/db
```

**MongoDB Atlas:**
- Use connection string in `.env`

### 6. Run the Application

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server runs on: `http://localhost:4000`

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (bcrypt 12 rounds)
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout and clear cookies
- `GET /api/auth/me` - Get current user
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback

### Todos (Requires Authentication)
- `GET /api/todos` - Get all todos (decrypted, with integrity check)
- `GET /api/todos/:id` - Get specific todo
- `POST /api/todos` - Create todo (encrypts description with AES-256-GCM, generates SHA-256 hash)
- `PUT /api/todos/:id` - Update todo (re-encrypts, regenerates hash)
- `DELETE /api/todos/:id` - Delete todo
- `PATCH /api/todos/:id/toggle` - Toggle completion status

### Health Check
- `GET /api/health` - Server health status

## 🔐 Security Features Demonstration

### 1. Encryption Flow

**Creating a Todo:**
1. User enters plaintext description: `"Buy groceries"`
2. SHA-256 hash generated: `b8f2d5e...` (integrity hash)
3. AES-256-GCM encryption with unique 12-byte IV
4. Stored in database:
   ```javascript
   {
     encryptedContent: "xK9vR2mN8pL..." (base64),
     iv: "dG9kb3Nrb..." (base64),
     authTag: "mQ4wE2rT7..." (base64),
     integrityHash: "b8f2d5e3c1a..." (hex)
   }
   ```

**Retrieving a Todo:**
1. Fetch encrypted data from database
2. Decrypt using AES-256-GCM with IV and auth tag
3. Verify integrity: `SHA-256(decrypted) === storedHash`
4. Return plaintext if integrity check passes
5. Log security event if integrity check fails

### 2. Integrity Verification Test

**Detecting Tampering:**

```javascript
// Manually tamper with database
db.todos.updateOne(
  { _id: ObjectId("...") },
  { $set: { encryptedContent: "tampered_data" } }
);

// On next retrieval:
// 1. Decryption may fail (auth tag mismatch)
// 2. If decryption succeeds, integrity hash will NOT match
// 3. Frontend shows integrity warning
// 4. Winston logs: "Integrity check failed - possible data tampering"
```

### 3. Rate Limiting Test

```bash
# Test authentication rate limit (10 requests per 15 minutes)
for i in {1..11}; do
  curl -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done

# 11th request returns: 429 Too Many Requests
```

### 4. bcrypt Verification

```javascript
// Verify bcrypt rounds in MongoDB
db.users.findOne({ email: "test@example.com" })
// Password field: $2b$12$... 
//                     ^^
//                     12 rounds confirmed
```

## 📊 Security Logging

Winston logs all security events to `logs/` directory:

**Authentication Events:**
```json
{
  "level": "info",
  "message": "Authentication successful",
  "userId": "507f1f77bcf86cd799439011",
  "method": "local",
  "ip": "::1",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Integrity Failures:**
```json
{
  "level": "error",
  "message": "Integrity check failed - possible data tampering",
  "todoId": "507f1f77bcf86cd799439012",
  "userId": "507f1f77bcf86cd799439011",
  "type": "INTEGRITY_FAILURE"
}
```

**Rate Limit Violations:**
```json
{
  "level": "warn",
  "message": "Rate limit exceeded",
  "ip": "::1",
  "endpoint": "/api/auth/login",
  "type": "RATE_LIMIT"
}
```

## 🧪 Testing the Application

### Manual Testing Checklist

1. ✅ **Registration**
   - Create account with valid password (8+ chars, mixed case, number)
   - Verify bcrypt rounds in database: `$2b$12$...`

2. ✅ **Login**
   - Login with correct credentials
   - Verify JWT token in cookies or localStorage
   - Test invalid credentials (should fail after 10 attempts in 15 min)

3. ✅ **Google OAuth**
   - Click "Continue with Google"
   - Complete OAuth flow
   - Verify automatic account creation

4. ✅ **Todo Operations**
   - Create todo with description
   - Verify encryption in database (base64 gibberish)
   - Verify SHA-256 hash stored (64 hex characters)
   - Edit todo (re-encryption should occur)
   - Toggle completion status
   - Delete todo

5. ✅ **Integrity Verification**
   - Create a todo
   - Manually tamper with `encryptedContent` in MongoDB
   - Refresh page - should show integrity warning

6. ✅ **Rate Limiting**
   - Make 61+ requests rapidly to general API (should block at 61)
   - Make 11+ login attempts (should block at 11)

7. ✅ **Security Headers**
   - Open DevTools → Network
   - Check response headers for Helmet security headers

8. ✅ **XSS Prevention**
   - Try creating todo with HTML: `<script>alert('XSS')</script>`
   - Should display as plain text (not execute)

9. ✅ **Logging**
   - Check `logs/combined.log` for all events
   - Check `logs/security.log` for auth failures
   - Check `logs/error.log` for errors

## 🎓 ISS Project Requirements Checklist

- ✅ **bcrypt password hashing** - Exactly 12 rounds
- ✅ **AES-256-GCM encryption** - Unique IV per document, auth tags
- ✅ **SHA-256 integrity hashing** - Tamper detection
- ✅ **JWT authentication** - Access + refresh tokens
- ✅ **Google OAuth 2.0** - Passport.js integration
- ✅ **Rate limiting** - 60 req/min general, 10/15min auth
- ✅ **Helmet security headers** - CSP, XSS protection
- ✅ **Winston logging** - Security events tracked
- ✅ **Input validation** - express-validator
- ✅ **HttpOnly cookies** - CSRF protection
- ✅ **Plain JavaScript frontend** - No TypeScript, no frameworks
- ✅ **XSS prevention** - textContent usage
- ✅ **Documentation** - Comprehensive README

## 🐛 Troubleshooting

### MongoDB Connection Issues
```bash
# Check MongoDB is running
mongod --version

# Check connection string
echo $MONGODB_URI

# Test connection
mongosh "mongodb://localhost:27017/secure-todo-iss"
```

### Google OAuth Not Working
- Verify redirect URI matches exactly in Google Console
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
- Ensure `GOOGLE_CALLBACK_URL` is correct

### Encryption Errors
```bash
# Verify AES key is exactly 32 bytes when base64 decoded
node -e "console.log(Buffer.from(process.env.AES_KEY, 'base64').length)"
# Should output: 32
```

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Change port in .env
PORT=5000
```

## 📚 Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MongoDB, Mongoose
- **Authentication**: JWT, Passport.js
- **Encryption**: Node.js crypto module
- **Logging**: Winston
- **Security**: Helmet, express-rate-limit, express-validator
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Development**: nodemon, dotenv

## 👥 Team Member Contributions

See `questions.md` for individual team member questions and contributions.

## 📄 License

This project is for educational purposes as part of the ISS final project.

## 🔗 Additional Resources

- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
- [bcrypt Documentation](https://www.npmjs.com/package/bcrypt)
- [JWT Best Practices](https://auth0.com/docs/secure/tokens/json-web-tokens/json-web-token-best-practices)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

**Note**: This is an educational project demonstrating security concepts. In a production environment, additional security measures would be required including but not limited to: certificate pinning, additional monitoring, penetration testing, and regular security audits.
