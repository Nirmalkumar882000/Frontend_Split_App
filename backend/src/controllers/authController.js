const { mysqlPool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { success, error } = require('../utils/response');
const { logActivity } = require('../utils/logger');
require('dotenv').config();

//register
// /api/auth/register
// body: { name, email, password }
// response: { userId }
// status: 201
const register = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const [existing] = await mysqlPool.query('SELECT id FROM splits_users WHERE email = ?', [email]);
        if (existing.length > 0) return error(res, 'User already exists', 409);

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await mysqlPool.query(
            'INSERT INTO splits_users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, 'user']
        );

        const userId = result.insertId;
        await logActivity(userId, 'JOINED_PLATFORM', `New user registered: ${name} (${email})`);

        return success(res, { userId }, 'User registered successfully', 201);
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};

//login
// /api/auth/login
// body: { email, password }
// response: { token, user }
// status: 200

const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await mysqlPool.query('SELECT * FROM splits_users WHERE email = ?', [email]);
        if (users.length === 0) return error(res, 'Invalid credentials', 401);

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return error(res, 'Invalid credentials', 401);

        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your_super_secret_key',
            { expiresIn: '24h' }
        );

        return success(res, {
            token,
            user: { id: user.id, name: user.name, email: user.email, image: user.image, role: user.role }
        }, 'Login successful');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};

//updateProfile
// /api/auth/profile
// body: { name, email, image }
// response: { id, name, email, image }
// status: 200

const updateProfile = async (req, res) => {
    const { name, email, image } = req.body;
    const userId = req.user.id;
    try {
        await mysqlPool.query(
            'UPDATE splits_users SET name = ?, email = ?, image = ? WHERE id = ?',
            [name, email, image, userId]
        );

        return success(res, { id: userId, name, email, image, role: req.user.role }, 'Profile updated successfully');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};

const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    try {
        const [users] = await mysqlPool.query('SELECT password FROM splits_users WHERE id = ?', [userId]);
        if (users.length === 0) return error(res, 'User not found', 404);

        const isMatch = await bcrypt.compare(currentPassword, users[0].password);
        if (!isMatch) return error(res, 'Current password incorrect', 401);

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await mysqlPool.query('UPDATE splits_users SET password = ? WHERE id = ?', [hashedNewPassword, userId]);

        return success(res, null, 'Password changed successfully');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};

module.exports = { register, login, updateProfile, changePassword };