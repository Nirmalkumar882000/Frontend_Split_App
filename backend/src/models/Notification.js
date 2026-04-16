const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user_id: { type: Number, required: true },
    message: { type: String, required: true },
    read_status: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
