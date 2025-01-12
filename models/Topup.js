const mongoose = require('mongoose');

const topupSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    discordId: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true 
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    slipUrl: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Topup', topupSchema);