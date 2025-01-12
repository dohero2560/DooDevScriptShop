const express = require('express');
const router = express.Router();
const generatePayload = require('promptpay-qr');
const QRCode = require('qrcode');
const User = require('../models/User');
const Payment = require('../models/Payment');

// ตรวจสอบและกำหนดค่า PROMPTPAY_ID
const PROMPTPAY_ID = process.env.PROMPTPAY_NUMBER;
if (!PROMPTPAY_ID) {
    console.error('Warning: PROMPTPAY_NUMBER is not set in .env file');
}

// Function to format PromptPay number
function formatPromptPayNumber(number) {
    if (!number) return '';
    // ถ้าเป็นเบอร์มือถือ (10 หลัก)
    if (number.length === 10) {
        return number.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    }
    // ถ้าเป็นเลขบัตรประชาชน (13 หลัก)
    if (number.length === 13) {
        return number.replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5');
    }
    return number;
}

// Middleware ตรวจสอบการล็อกอิน
const isAuthenticated = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนเติมเงิน' });
    }
    next();
};

// Generate QR Code
router.post('/api/payments/generate-qr', async (req, res) => {
    try {
        // ตรวจสอบว่ามีการตั้งค่า PROMPTPAY_ID หรือไม่
        if (!PROMPTPAY_ID) {
            return res.status(500).json({ 
                error: 'PromptPay configuration is missing' 
            });
        }

        const { amount } = req.body;
        
        if (!amount || amount < 1) {
            return res.status(400).json({ 
                error: 'จำนวนเงินต้องมากกว่า 1 บาท' 
            });
        }

        // สร้างข้อมูลการเติมเงิน
        const payment = await Payment.create({
            userId: req.user._id,
            amount: amount,
            reference: Date.now().toString(),
            points: Math.floor(amount), // 1 บาท = 1 point
            expiresAt: new Date(Date.now() + 15 * 60000) // 15 minutes
        });

        // Generate PromptPay payload
        const payload = generatePayload(PROMPTPAY_ID, { amount });
        
        // Generate QR Code
        const qrCode = await QRCode.toDataURL(payload);
        
        // Format PromptPay ID for display
        const formattedPromptPay = formatPromptPayNumber(PROMPTPAY_ID);

        res.json({
            success: true,
            qrCode,
            amount,
            reference: payment.reference,
            promptpayId: formattedPromptPay,
            expiresAt: payment.expiresAt
        });

    } catch (error) {
        console.error('Error generating QR code:', error);
        res.status(500).json({ 
            error: 'ไม่สามารถสร้าง QR Code ได้',
            details: error.message 
        });
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