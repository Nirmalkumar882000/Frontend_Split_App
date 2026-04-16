const { mysqlPool } = require('../config/db');


const logActivity = async (userId, action, details) => {
    try {
        await mysqlPool.query(
            'INSERT INTO splits_activity_logs (user_id, action, details) VALUES (?, ?, ?)',
            [userId, action, details]
        );
    } catch (err) {
        console.error('Activity Logging Error:', err.message);
    }
};

module.exports = { logActivity };
