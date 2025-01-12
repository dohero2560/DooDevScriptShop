const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Topup = require('../models/Topup');
const { isAuthenticated } = require('../middleware/auth');

// Multer configuration
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        const dir = 'public/uploads/slips';
        // Create directory if it doesn't exist
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function(req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept images only
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    }
});

// Route for uploading slip
router.post('/', isAuthenticated, upload.single('slip'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { amount } = req.body;
        if (!amount || isNaN(amount)) {
            return res.status(400).json({ error: 'Invalid amount' });
        }

        const topup = new Topup({
            userId: req.user._id,
            amount: parseFloat(amount),
            slipUrl: `/uploads/slips/${req.file.filename}`,
            status: 'pending'
        });

        await topup.save();

        console.log('Topup created:', {
            userId: topup.userId,
            amount: topup.amount,
            slipUrl: topup.slipUrl
        });

        res.status(201).json({
            success: true,
            topup: {
                id: topup._id,
                amount: topup.amount,
                slipUrl: topup.slipUrl,
                status: topup.status,
                createdAt: topup.createdAt
            }
        });

    } catch (err) {
        console.error('Error in topup upload:', err);
        res.status(500).json({ 
            error: 'Error creating topup request',
            details: err.message 
        });
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

module.exports = router; 