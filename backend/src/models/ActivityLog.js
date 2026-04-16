const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    user_id: { type: Number, required: true },
    action: { type: String, required: true },
    data: { type: Object },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
