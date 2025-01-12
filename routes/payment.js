const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Set up multer for file upload
const storage = multer.diskStorage({
  destination: './public/uploads/slips',
  filename: function(req, file, cb) {
    cb(null, `${Date.now()}-${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: function(req, file, cb) {
    checkFileType(file, cb);
  }
});

// Create new payment request
router.post('/topup', isAuthenticated, upload.single('slip'), async (req, res) => {
  try {
    const { amount } = req.body;
    const points = Math.floor(amount); // 1 บาท = 1 point

    const payment = new Payment({
      userId: req.user._id,
      amount: amount,
      slipImage: `/uploads/slips/${req.file.filename}`,
      points: points
    });

    await payment.save();
    res.json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ error: 'Error creating payment request' });
  }
});

// Admin: Get all pending payments
router.get('/admin/payments', isAdmin, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('userId', 'username discordId')
      .sort('-createdAt');
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching payments' });
  }
});

// Admin: Approve/Reject payment
router.put('/admin/payments/:id', isAdmin, async (req, res) => {
  try {
    const { status, note } = req.body;
    const payment = await Payment.findById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    payment.status = status;
    payment.note = note;
    payment.approvedBy = req.user._id;
    payment.approvedAt = Date.now();

    if (status === 'approved') {
      // Add points to user
      const user = await User.findById(payment.userId);
      user.points += payment.points;
      await user.save();
    }

    await payment.save();
    res.json({ success: true, payment });
  } catch (error) {
    res.status(500).json({ error: 'Error updating payment status' });
  }
});

module.exports = router; 