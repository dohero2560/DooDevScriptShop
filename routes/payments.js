const express = require('express');
const router = express.Router();
const generatePayload = require('promptpay-qr');
const QRCode = require('qrcode');
const User = require('../models/User');
const Payment = require('../models/Payment');

const PROMPTPAY_ID = process.env.PROMPTPAY_NUMBER;
const PAYMENT_EXPIRY_MINUTES = 15; // QR Code หมดอายุใน 15 นาที

// Middleware ตรวจสอบการล็อกอิน
const isAuthenticated = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนเติมเงิน' });
    }
    next();
};

// Generate QR Code
router.post('/api/payments/generate-qr', isAuthenticated, async (req, res) => {
    try {
        const { amount } = req.body;
        
        if (!amount || amount < 1) {
            return res.status(400).json({ error: 'จำนวนเงินต้องมากกว่า 1 บาท' });
        }

        // สร้างข้อมูลการเติมเงิน
        const payment = await Payment.create({
            userId: req.user._id,
            amount: amount,
            reference: Date.now().toString(),
            points: Math.floor(amount), // 1 บาท = 1 point
            expiresAt: new Date(Date.now() + PAYMENT_EXPIRY_MINUTES * 60000)
        });

        // สร้าง QR Code
        const payload = generatePayload(PROMPTPAY_ID, { amount });
        const qrCode = await QRCode.toDataURL(payload);
        
        res.json({
            success: true,
            qrCode,
            amount,
            reference: payment.reference,
            promptpayId: PROMPTPAY_ID.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'),
            expiresAt: payment.expiresAt
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'ไม่สามารถสร้าง QR Code ได้' });
    }
});

// ตรวจสอบสถานะการเติมเงิน
router.get('/api/payments/:reference/status', isAuthenticated, async (req, res) => {
    try {
        const payment = await Payment.findOne({ reference: req.params.reference });
        
        if (!payment) {
            return res.status(404).json({ error: 'ไม่พบรายการเติมเงิน' });
        }

        res.json({
            status: payment.status,
            expiresAt: payment.expiresAt
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'ไม่สามารถตรวจสอบสถานะได้' });
    }
});

// Webhook สำหรับการยืนยันการชำระเงิน (จะต้องเชื่อมต่อกับระบบธนาคารจริง)
router.post('/api/payments/verify', async (req, res) => {
    try {
        const { reference, amount } = req.body;

        const payment = await Payment.findOne({ reference });
        if (!payment) {
            return res.status(404).json({ error: 'ไม่พบรายการเติมเงิน' });
        }

        if (payment.status !== 'pending') {
            return res.status(400).json({ error: 'รายการนี้ถูกดำเนินการไปแล้ว' });
        }

        if (new Date() > payment.expiresAt) {
            payment.status = 'expired';
            await payment.save();
            return res.status(400).json({ error: 'QR Code หมดอายุแล้ว' });
        }

        // อัพเดทสถานะการชำระเงิน
        payment.status = 'completed';
        payment.completedAt = new Date();
        await payment.save();

        // เพิ่ม points ให้ user
        const user = await User.findById(payment.userId);
        user.points += payment.points;
        await user.save();

        res.json({
            success: true,
            points: payment.points,
            newBalance: user.points
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'ไม่สามารถยืนยันการชำระเงินได้' });
    }
});

module.exports = router; 