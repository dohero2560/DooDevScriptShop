const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
// const Topup = require('../models/Topup');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer configuration for slip uploads
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const dir = 'public/uploads/slips';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function(req, file, cb) {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
    }
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    next();
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (!req.user?.isAdmin) {
        return res.status(403).json({ error: 'Not authorized' });
    }
    next();
};

// Submit topup request
router.post('/request', isAuthenticated, upload.single('slip'), async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || !req.file) {
            return res.status(400).json({ error: 'Amount and slip are required' });
        }

        const slipUrl = `/uploads/slips/${req.file.filename}`;
        
        const topup = new Topup({
            userId: req.user._id,
            amount: parseFloat(amount),
            slipUrl
        });

        await topup.save();
        res.status(201).json(topup);
    } catch (err) {
        console.error('Error creating topup request:', err);
        res.status(500).json({ error: 'Error creating topup request' });
    }
});

// Get user's topup history
router.get('/history', isAuthenticated, async (req, res) => {
    try {
        const topups = await Topup.find({ userId: req.user._id })
            .sort({ createdAt: -1 });
        res.json(topups);
    } catch (err) {
        console.error('Error fetching topup history:', err);
        res.status(500).json({ error: 'Error fetching topup history' });
    }
});

// Admin: Get all topup requests
router.get('/admin/requests', isAdmin, async (req, res) => {
    try {
        const topups = await Topup.find()
            .populate('userId', 'username discordId')
            .populate('approvedBy', 'username')
            .sort({ createdAt: -1 });
        res.json(topups);
    } catch (err) {
        console.error('Error fetching topup requests:', err);
        res.status(500).json({ error: 'Error fetching topup requests' });
    }
});

// Admin: Approve topup request
router.post('/admin/:id/approve', isAdmin, async (req, res) => {
    try {
        const topup = await Topup.findById(req.params.id);
        if (!topup) {
            return res.status(404).json({ error: 'Topup request not found' });
        }

        if (topup.status !== 'pending') {
            return res.status(400).json({ error: 'Topup request already processed' });
        }

        // Start transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Update topup status
            topup.status = 'approved';
            topup.approvedBy = req.user._id;
            topup.approvedAt = new Date();
            await topup.save({ session });

            // Add points to user
            const user = await User.findById(topup.userId);
            user.points += topup.amount;
            await user.save({ session });

            await session.commitTransaction();
            res.json({ message: 'Topup approved successfully' });
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }
    } catch (err) {
        console.error('Error approving topup:', err);
        res.status(500).json({ error: 'Error approving topup' });
    }
});

// Admin: Reject topup request
router.post('/admin/:id/reject', isAdmin, async (req, res) => {
    try {
        const topup = await Topup.findById(req.params.id);
        if (!topup) {
            return res.status(404).json({ error: 'Topup request not found' });
        }

        if (topup.status !== 'pending') {
            return res.status(400).json({ error: 'Topup request already processed' });
        }

        topup.status = 'rejected';
        topup.approvedBy = req.user._id;
        topup.approvedAt = new Date();
        await topup.save();

        res.json({ message: 'Topup rejected successfully' });
    } catch (err) {
        console.error('Error rejecting topup:', err);
        res.status(500).json({ error: 'Error rejecting topup' });
    }
});

module.exports = router; 