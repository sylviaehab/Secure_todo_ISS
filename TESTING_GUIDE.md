# 🔧 COMPLETE TESTING & TROUBLESHOOTING GUIDE

## 🐛 FIX: Edit and Delete Not Working

### **Issue**: Buttons may not be wired correctly to event handlers

### **Quick Fix Steps:**

1. **Open Developer Tools** in your browser (F12)
2. **Check Console** for any JavaScript errors
3. **Most common issue**: Event handlers not attaching properly

### **To Fix Manually:**

Open `public\js\app.js` and verify the `renderTodos` function properly attaches event handlers. The issue is likely that the buttons are created with `innerHTML` but the event handlers are set with `.onclick` which doesn't survive innerHTML assignment.

**Look for this pattern around line 300-400:**
```javascript
toggleBtn.onclick = () => toggleTodo(todo.id);
editBtn.onclick = () => openEditModal(todo.id);
deleteBtn.onclick = () => deleteTodo(todo.id);
```

**If using innerHTML, the fix is to use event delegation instead:**

After the todos are rendered with innerHTML, add event listeners to the container:
```javascript
document.getElementById('todoList').addEventListener('click', (e) => {
  const todoItem = e.target.closest('.todo-item');
  if (!todoItem) return;
  
  const todoId = todoItem.dataset.todoId;
  
  if (e.target.closest('.icon-btn[title="Mark as complete"]') || 
      e.target.closest('.icon-btn[title="Mark as incomplete"]')) {
    toggleTodo(todoId);
  } else if (e.target.closest('.icon-btn[title="Edit"]')) {
    openEditModal(todoId);
  } else if (e.target.closest('.icon-btn[title="Delete"]')) {
    deleteTodo(todoId);
  }
});
```

---

## 🧪 COMPLETE SECURITY TESTING GUIDE

### **Test 1: bcrypt Password Hashing (12 Rounds)**

#### **Steps:**
1. **Create a user account** in the app
2. **Open MongoDB Shell:**
   ```bash
   mongosh secure-todo-iss
   ```

3. **Check password hash:**
   ```javascript
   db.users.findOne()
   ```

#### **Expected Result:**
```javascript
{
  _id: ObjectId("..."),
  email: "test@example.com",
  password: "$2b$12$abcdef123456..." // <-- Must start with $2b$12$
  //              ^^
  //              12 rounds confirmed!
}
```

✅ **PASS**: If password starts with `$2b$12$`
❌ **FAIL**: If it starts with different number

---

### **Test 2: AES-256-GCM Encryption**

#### **Steps:**
1. **Create a todo** with description: `"My secret todo description"`
2. **Open MongoDB Shell:**
   ```bash
   mongosh secure-todo-iss
   ```

3. **View encrypted data:**
   ```javascript
   db.todos.findOne()
   ```

#### **Expected Result:**
```javascript
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  title: "My Todo", // Plaintext (not sensitive)
  encryptedContent: "xK9vR2mN8pL2wY5tH7jF4gD6sA1zX3cV8b...", // Base64 gibberish
  iv: "dGhpc2lzYTEyYnl0ZQ==", // 12 bytes base64
  authTag: "mQ4wE2rT7yU4iO6pA3sD5f==", // 16 bytes base64
  integrityHash: "b8f2d5e3c1a9...", // 64 hex characters
  completed: false
}
```

✅ **PASS**: 
- encryptedContent is base64 gibberish (not readable)
- iv field present (12 bytes = ~16 base64 chars)
- authTag present (16 bytes = ~24 base64 chars)
- integrityHash is 64 hex characters

❌ **FAIL**: If you can read the description in plain text

---

### **Test 3: SHA-256 Integrity Verification**

#### **Steps:**
1. **Run the test script:**
   ```bash
   cd c:\Users\dell\OneDrive\Pictures\Desktop\Todo_app_v2
   node tests\testIntegrity.js
   ```

#### **Expected Output:**
```
======================================================================
SHA-256 INTEGRITY VERIFICATION TEST
======================================================================

TEST 1: Normal Integrity Verification
----------------------------------------------------------------------
Plaintext: This is my secret todo description
SHA-256 Hash: 8efeba0e70ec57c6e9a4e4f428eb260154f1e6154f1d8e6489f99e84775f5669
Hash Length: 64 characters (64 hex = 256 bits)

Integrity Check: ✅ PASS

TEST 2: Tampering Detection
----------------------------------------------------------------------
Original Plaintext: Buy groceries
Original Hash: 4b9f1d83c1dd9e123fe58883040fa837a06a728112e1f76284c1e715e9969be4

Tampered Plaintext: Buy groceries and steal credit card numbers

Integrity Check: ❌ FAIL (Expected)

[... more tests ...]

SUMMARY
✅ SHA-256 generates consistent 64-character hex hashes
✅ Integrity verification detects any content modifications
✅ Works seamlessly with AES-256-GCM encryption
```

✅ **PASS**: All 6 tests pass
❌ **FAIL**: Any test fails

---

### **Test 4: JWT Authentication**

#### **Steps:**
1. **Login to the app**
2. **Open Developer Tools** (F12)
3. **Go to Application tab → Cookies**
4. **Look for `authToken` cookie**

#### **Expected Result:**
- Cookie name: `authToken`
- HttpOnly: ✅ (checked)
- Secure: ✅ (in production)
- SameSite: Lax
- Value: Long JWT string (eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....)

✅ **PASS**: Cookie exists with HttpOnly flag
❌ **FAIL**: No cookie or not HttpOnly

**Alternative Check - localStorage:**
Open Console and type:
```javascript
localStorage.getItem('authToken')
```

Should return a JWT token.

---

### **Test 5: Rate Limiting**

#### **Test 5a: Authentication Rate Limit (10 requests / 15 minutes)**

**Steps:**
1. Open a **new terminal**
2. Run this command **11 times** rapidly:

```bash
curl -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"wrongpassword\"}"
```

**Or use this loop:**
```bash
for /L %i in (1,1,11) do @curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"test@test.com\",\"password\":\"wrong\"}" && timeout /t 1 /nobreak >nul
```

#### **Expected Result:**
- **Requests 1-10**: Return `401 Unauthorized` (invalid credentials)
- **Request 11**: Returns `429 Too Many Requests`

```json
{
  "success": false,
  "message": "Too many authentication attempts, please try again after 15 minutes"
}
```

✅ **PASS**: 11th request blocked with 429 status
❌ **FAIL**: All 11 requests go through

#### **Test 5b: General API Rate Limit (60 requests / minute)**

Try making 61 requests rapidly to any endpoint.

---

### **Test 6: Helmet Security Headers**

#### **Steps:**
1. Open Developer Tools (F12)
2. Go to **Network** tab
3. Refresh the page
4. Click on the main document request
5. Check **Response Headers**

#### **Expected Headers:**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=15552000; includeSubDomains
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; ...
```

✅ **PASS**: All security headers present
❌ **FAIL**: Missing headers

**Quick Check with curl:**
```bash
curl -I http://localhost:4000
```

---

### **Test 7: XSS Prevention**

#### **Steps:**
1. **Create a todo** with this title:
   ```
   <script>alert('XSS Attack!')</script>
   ```

2. **Create another todo** with this description:
   ```
   <img src=x onerror="alert('Hacked!')">
   ```

#### **Expected Result:**
- The HTML tags should display as **plain text**
- **NO alert popup** should appear
- You should see literally: `<script>alert('XSS Attack!')</script>`

✅ **PASS**: HTML displayed as text, no script execution
❌ **FAIL**: Alert popup appears (XSS vulnerability!)

---

### **Test 8: Winston Logging**

#### **Steps:**
1. **Perform some actions:**
   - Login
   - Create a todo
   - Try wrong password
   - Make 11+ login attempts (trigger rate limit)

2. **Check log files:**
   ```bash
   cd c:\Users\dell\OneDrive\Pictures\Desktop\Todo_app_v2
   type logs\combined.log
   type logs\security.log
   type logs\error.log
   ```

#### **Expected in combined.log:**
```json
{"level":"info","message":"Authentication successful","userId":"...","method":"local","ip":"::1","timestamp":"2025-12-06T..."}
{"level":"info","message":"Todo created","todoId":"...","userId":"..."}
```

#### **Expected in security.log:**
```json
{"level":"warn","message":"Authentication failed","email":"test@test.com","reason":"Invalid password","ip":"::1"}
{"level":"warn","message":"Rate limit exceeded","ip":"::1","endpoint":"/api/auth/login"}
```

✅ **PASS**: Events logged with proper structure
❌ **FAIL**: No logs or incomplete data

---

### **Test 9: Input Validation**

#### **Test 9a: Email Validation**

Try registering with invalid emails:
- `notanemail` ❌ Should reject
- `test@` ❌ Should reject
- `@example.com` ❌ Should reject
- `test@example.com` ✅ Should accept

#### **Test 9b: Password Validation**

Try registering with weak passwords:
- `short` ❌ Should reject (< 8 chars)
- `lowercase` ❌ Should reject (no uppercase/number)
- `UPPERCASE` ❌ Should reject (no lowercase/number)
- `NoNumbers` ❌ Should reject (no numbers)
- `Valid1Pass` ✅ Should accept

#### **Test 9c: Todo Validation**

Try creating todos:
- Empty title ❌ Should reject
- Title > 100 chars ❌ Should reject
- Empty description ❌ Should reject
- Description > 1000 chars ❌ Should reject
  
  #### **Test 9d: NoSQL Injection Prevention**
  
  Try to bypass authentication using a common NoSQL injection payload:
  
  **Steps:**
  1. Open Postman or use curl
  2. Send a POST request to `/api/auth/login`
  3. Body (JSON):
     ```json
     {
       "email": {"$gt": ""},
       "password": "randompassword"
     }
     ```
  
  **Expected Result:**
  - The server should validly reject this request (400 Bad Request or 401 Unauthorized)
  - The `$` operator should be stripped or the request blocked
  - **Crucially**: It should NOT log you in as the first user in the database
  
  ✅ **PASS**: Login failed, no crash
  ❌ **FAIL**: Login successful or server crash

---

### **Test 10: Google OAuth (Optional)**

Only if you configured Google credentials:

#### **Steps:**
1. Click **"Continue with Google"**
2. Complete Google authentication
3. Should redirect back with user logged in

#### **Check in MongoDB:**
```javascript
db.users.findOne({ googleId: { $exists: true } })
```

✅ **PASS**: User created with googleId field
❌ **FAIL**: Error during OAuth flow

---

## 🔗 MONGODB CONNECTION GUIDE

### **Option 1: Local MongoDB (Current Setup)**

#### **Check if MongoDB is running:**
```bash
mongod --version
```

#### **Start MongoDB:**
```bash
mongod --dbpath c:\data\db
```

Or in a separate window:
```bash
start "MongoDB" cmd /k "mongod --dbpath c:\data\db"
```

#### **Connect with MongoDB Shell:**
```bash
mongosh
use secure-todo-iss
```

#### **View collections:**
```javascript
show collections
db.users.find().pretty()
db.todos.find().pretty()
```

---

### **Option 2: MongoDB Atlas (Cloud)**

#### **Setup:**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create free cluster (M0)
4. Click **"Connect"** → **"Connect your application"**
5. Copy connection string

#### **Update .env:**
```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/secure-todo-iss?retryWrites=true&w=majority
```

Replace:
- `username` with your database username
- `password` with your database password
- `cluster0.xxxxx` with your cluster address

#### **Restart server:**
```bash
# Press Ctrl+C in terminal running server
npm run dev
```

---

## 📊 COMPLETE TEST CHECKLIST

Run through this checklist for full verification:

- [ ] **bcrypt 12 rounds** - Check MongoDB user password
- [ ] **AES-256-GCM** - Check encrypted todos in DB
- [ ] **SHA-256 integrity** - Run `node tests\testIntegrity.js`
- [ ] **JWT auth** - Check cookies in DevTools
- [ ] **Rate limiting** - Try 11 login attempts
- [ ] **Helmet headers** - Check Network tab headers
- [ ] **XSS prevention** - Try HTML injection in todo
- [ ] **Winston logging** - Check logs folder
- [ ] **Input validation** - Try invalid email/password
- [ ] **Google OAuth** - Optional, if configured

---

## 🛠️ QUICK FIX COMMANDS

### **Restart Everything:**
```bash
# Stop server (Ctrl+C)
# Start MongoDB
mongod --dbpath c:\data\db

# In new terminal, start server
cd c:\Users\dell\OneDrive\Pictures\Desktop\Todo_app_v2
npm run dev
```

### **Reset Database:**
```bash
mongosh secure-todo-iss
db.todos.deleteMany({})  # Delete all todos
db.users.deleteMany({})  # Delete all users
```

### **View Logs in Real-Time:**
```bash
# In new terminal
cd c:\Users\dell\OneDrive\Pictures\Desktop\Todo_app_v2
powershell -Command "Get-Content logs\combined.log -Wait -Tail 10"
```

### **Test API Endpoints Manually:**
```bash
# Health check
curl http://localhost:4000/api/health

# Register user
curl -X POST http://localhost:4000/api/auth/register -H "Content-Type: application/json" -d "{\"name\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"Test1234\"}"

# Login
curl -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d "{\"email\":\"test@example.com\",\"password\":\"Test1234\"}"
```

---

## ✅ VERIFICATION SUMMARY

After running all tests, you should confirm:

1. ✅ Passwords stored with `$2b$12$` prefix
2. ✅ Todo descriptions encrypted in database
3. ✅ Integrity test script passes all 6 tests
4. ✅ JWT tokens in cookies (HttpOnly)
5. ✅ Rate limiting blocks excessive requests
6. ✅ Security headers present in responses
7. ✅ HTML injection displays as text
8. ✅ Security events logged to files
9. ✅ Invalid inputs rejected with errors

---

**Your application has ALL security primitives working if all these tests pass!** 🎉🔐
