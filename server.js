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

const app = express();

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
        ttl: 24 * 60 * 60 // เก็บ session 1 วัน
    }),
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1 วัน
    }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use('/components', express.static('public/components'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

[... rest of the file remains exactly the same ...]