const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    group_id: { type: Number, required: true },
    sender_id: { type: Number, required: true },
    sender_name: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
