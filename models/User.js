const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    discordId: String,
    username: String,
    discriminator: String,
    email: String,
    avatar: String,
    points: { type: Number, default: 0 },
    cart: [{
        scriptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Script' },
        quantity: Number
    }],
    purchases: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Purchase' }],
    isAdmin: { type: Boolean, default: false },
    role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
    permissions: [{
        type: String,
        enum: ['manage_users', 'manage_scripts', 'manage_purchases', 'manage_points']
    }]
});

module.exports = mongoose.model('User', userSchema); 