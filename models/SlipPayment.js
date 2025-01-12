const mongoose = require('mongoose');

const slipPaymentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    imageUrl: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
    },
    points: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date,
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adminNote: String
});

module.exports = mongoose.model('SlipPayment', slipPaymentSchema); 