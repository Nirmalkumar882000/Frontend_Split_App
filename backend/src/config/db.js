const mysql = require('mysql2/promise');
const mongoose = require('mongoose');
require('dotenv').config();

// Terminal Colors
const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    cyan: "\x1b[36m",
    yellow: "\x1b[33m"
};

// MySQL Connection Pool
const mysqlPool = mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'splitwise_db',
    port: process.env.MYSQL_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Proactive MySQL Heartbeat
const checkMySQLConnection = async () => {
    try {
        const connection = await mysqlPool.getConnection();
        console.log(`${colors.green}✔ MySQL Connection Status: ACTIVE (Host: ${process.env.MYSQL_HOST || '127.0.0.1'})${colors.reset}`);
        connection.release();
    } catch (err) {
        console.error(`${colors.red}✘ MySQL Connection Error: ${err.message}${colors.reset}`);
        console.log(`${colors.yellow}👉 Ensure MySQL is running and the database "${process.env.MYSQL_DATABASE || 'splitwise_db'}" exists.${colors.reset}`);
    }
};

// MongoDB Connection
const connectMongoDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/splitwise_logs');
        console.log(`${colors.cyan}✔ MongoDB Connection Status: ACTIVE${colors.reset}`);
    } catch (err) {
        console.error(`${colors.red}✘ MongoDB Connection Error: ${err.message}${colors.reset}`);
    }
};

// Run Heartbeat
checkMySQLConnection();

module.exports = {
    mysqlPool,
    connectMongoDB
};
