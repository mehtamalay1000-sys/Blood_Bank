const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const pool = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy for Vercel (HTTPS behind reverse proxy)
if (isProduction) {
    app.set('trust proxy', 1);
}

// MySQL Session Store
const sessionStoreOptions = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'blood_bank_db',
    clearExpired: true,
    checkExpirationInterval: 900000,
    expiration: 86400000
};

// Add SSL for production (cloud MySQL providers require it)
if (isProduction) {
    sessionStoreOptions.ssl = {
        rejectUnauthorized: false
    };
}

const sessionStore = new MySQLStore(sessionStoreOptions);

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    key: 'blood_bank_session',
    secret: process.env.SESSION_SECRET || 'fallback_secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 86400000, // 24 hours
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax'
    }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/donors', require('./routes/donors'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/camps', require('./routes/camps'));
app.use('/api/user', require('./routes/user'));

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve user portal
app.get('/user', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'user.html'));
});

// Serve main app (catch-all for SPA)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server only when running locally (not on Vercel)
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`\n🩸 Blood Bank Management System`);
        console.log(`   Server running on http://localhost:${PORT}`);
        console.log(`   Login: http://localhost:${PORT}/login\n`);
    });
}

// Export for Vercel serverless function
module.exports = app;
