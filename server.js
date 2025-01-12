require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const cors = require('cors');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const winston = require('winston');
const fetch = require('node-fetch');
const Log = require('./models/Log');
const multer = require('multer');
const Payment = require('./models/Payment');

const app = express();

// Define isAdmin middleware first
const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!req.user.isAdmin) {
        return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }
    
    next();
};

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(cors());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 24 * 60 * 60
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000
    }
}));
app.use(passport.initialize());
app.use(passport.session());

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Payment routes
app.post('/api/payments/upload-slip', upload.single('slip'), async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });

    const payment = new Payment({
        userId: req.user._id,
        slipUrl: `/uploads/${req.file.filename}`
    });

    await payment.save();
    res.json({ message: 'Slip uploaded successfully' });
});

app.post('/api/admin/payments/:id/confirm', isAdmin, async (req, res) => {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    payment.status = 'confirmed';
    await payment.save();
    res.json({ message: 'Payment confirmed' });
});

// ... rest of your code ...