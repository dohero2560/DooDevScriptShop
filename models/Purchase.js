const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    scriptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Script' },
    license: { type: String, required: true },
    serverIP: { type: String, default: '' },
    status: { type: String, enum: ['active', 'revoked'], default: 'active' },
    resourceName: { type: String, default: '' },
    purchaseDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Purchase', purchaseSchema); 