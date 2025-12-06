require('dotenv').config();

console.log('--- Environment Verification ---');

// Check AES_KEY
if (!process.env.AES_KEY) {
    console.log('❌ AES_KEY: Missing');
} else {
    try {
        const key = Buffer.from(process.env.AES_KEY, 'base64');
        if (key.length === 32) {
            console.log('✅ AES_KEY: Valid (32 bytes decoded)');
        } else {
            console.log(`❌ AES_KEY: Invalid length (${key.length} bytes decoded, expected 32)`);
        }
    } catch (err) {
        console.log('❌ AES_KEY: Invalid base64 format');
    }
}

// Check GOOGLE credentials (since we're here)
console.log(`Google Client ID: ${process.env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
console.log(`Google Client Secret: ${process.env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
console.log(`Google Callback URL: ${process.env.GOOGLE_CALLBACK_URL || 'Using default http://localhost:4000/api/auth/google/callback'}`);
