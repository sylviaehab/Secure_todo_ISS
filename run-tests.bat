@echo off
echo ========================================
echo   SECURITY TESTING - Quick Start
echo ========================================
echo.

echo [1/5] Testing Integrity Verification...
node tests\testIntegrity.js
echo.

echo [2/5] Checking MongoDB Connection...
mongosh secure-todo-iss --eval "print('MongoDB Connected: ' + db.getName())"
echo.

echo [3/5] Checking if users exist...
mongosh secure-todo-iss --eval "print('Total users: ' + db.users.countDocuments())"
echo.

echo [4/5] Checking if todos exist...
mongosh secure-todo-iss --eval "print('Total todos: ' + db.todos.countDocuments())"
echo.

echo [5/5] If you have created a user, checking bcrypt rounds...
mongosh secure-todo-iss --eval "const user = db.users.findOne(); if(user && user.password) { const rounds = user.password.substring(4,6); print('bcrypt rounds: ' + rounds + (rounds === '12' ? ' ✅ CORRECT' : ' ❌ WRONG')); } else { print('No users with password found yet'); }"
echo.

echo ========================================
echo   MANUAL TESTS TO PERFORM:
echo ========================================
echo.
echo 1. Open http://localhost:4000 in browser
echo 2. Create an account (test security)
echo 3. Add a todo with description
echo 4. Check encrypted data in MongoDB:
echo    mongosh secure-todo-iss
echo    db.todos.findOne()
echo.
echo 5. Try XSS: Create todo with title:
echo    ^<script^>alert('test')^</script^>
echo    Should display as text, not execute!
echo.
echo 6. Test rate limiting: Try logging in
echo    with wrong password 11 times
echo    11th attempt should be blocked
echo.
echo ========================================

pause
