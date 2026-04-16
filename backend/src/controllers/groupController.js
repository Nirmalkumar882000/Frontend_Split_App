const { mysqlPool } = require('../config/db');
const { logActivity } = require('../utils/logger');
const Message = require('../models/Message');
const { success, error } = require('../utils/response');


//createGroup
// /api/groups/create
// body: { name }
// response: { groupId }
// status: 201

const createGroup = async (req, res) => {
    const { name } = req.body;
    const userId = req.user.id;
    const conn = await mysqlPool.getConnection();
    try {
        await conn.beginTransaction();

        const [groupResult] = await conn.query(
            'INSERT INTO `splits_groups` (name, created_by) VALUES (?, ?)',
            [name, userId]
        );
        const groupId = groupResult.insertId;

        await conn.query(
            'INSERT INTO splits_group_members (group_id, user_id) VALUES (?, ?)',
            [groupId, userId]
        );

        await conn.commit();

        await logActivity(userId, 'CREATED_GROUP', `Created group: ${name} (ID: ${groupId})`);

        return success(res, { groupId }, 'Group created', 201);
    } catch (err) {
        await conn.rollback();
        return error(res, 'Internal server error', 500);
    } finally {
        conn.release();
    }
};

//addMember
// /api/groups/add-member
// body: { groupId, email }
// response: { userId }
// status: 200

const addMember = async (req, res) => {
    const { groupId } = req.params;
    const { email } = req.body;
    try {
        const [users] = await mysqlPool.query('SELECT id FROM splits_users WHERE email = ?', [email]);
        if (users.length === 0) return error(res, 'User not found', 404);

        const userIdToAdd = users[0].id;

        await mysqlPool.query(
            'INSERT IGNORE INTO splits_group_members (group_id, user_id) VALUES (?, ?)',
            [groupId, userIdToAdd]
        );

        if (req.io) {
            req.io.to(`group_${groupId}`).emit('memberAdded', { userId: userIdToAdd });
            req.io.to(`user_${userIdToAdd}`).emit('refreshGroups');
        }

        return success(res, { userId: userIdToAdd }, 'Member added successfully');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};


//getGroups
// /api/groups
// query: { search, page, limit }
// response: { groups, total, page, limit, totalPages }
// status: 200

const getGroups = async (req, res) => {
    const userId = req.user.id;
    const { search = '', page = 1, limit = 6 } = req.query;
    const offset = (page - 1) * limit;

    try {
        let query = `
            SELECT g.* FROM \`splits_groups\` g 
            JOIN splits_group_members gm ON g.id = gm.group_id 
            WHERE gm.user_id = ?
        `;
        let countQuery = `
            SELECT COUNT(*) as total FROM \`splits_groups\` g 
            JOIN splits_group_members gm ON g.id = gm.group_id 
            WHERE gm.user_id = ?
        `;

        const queryParams = [userId];
        const countParams = [userId];

        if (search) {
            const searchPattern = `%${search.toLowerCase()}%`;
            query += ` AND LOWER(g.name) LIKE LOWER(?)`;
            countQuery += ` AND LOWER(g.name) LIKE LOWER(?)`;
            queryParams.push(searchPattern);
            countParams.push(searchPattern);
        }

        query += ` ORDER BY g.created_at DESC LIMIT ? OFFSET ?`;
        queryParams.push(parseInt(limit), parseInt(offset));

        const [[{ total }]] = await mysqlPool.query(countQuery, countParams);
        const [groups] = await mysqlPool.query(query, queryParams);

        for (let group of groups) {
            const [members] = await mysqlPool.query(
                `SELECT u.id, u.name, u.image FROM splits_users u 
                 JOIN splits_group_members gm ON u.id = gm.user_id 
                 WHERE gm.group_id = ? LIMIT 5`,
                [group.id]
            );
            group.members = members;

            const [[paidResult]] = await mysqlPool.query(
                'SELECT SUM(amount) as paid FROM splits_expenses WHERE group_id = ? AND paid_by = ?',
                [group.id, userId]
            );
            const [[owedResult]] = await mysqlPool.query(
                'SELECT SUM(s.amount) as owed FROM splits_expense_splits s JOIN splits_expenses e ON s.expense_id = e.id WHERE e.group_id = ? AND s.user_id = ?',
                [group.id, userId]
            );

            const totalPaid = parseFloat(paidResult.paid || 0);
            const totalOwed = parseFloat(owedResult.owed || 0);
            group.balance = totalPaid - totalOwed;
            const [[lastSeenResult]] = await mysqlPool.query(
                'SELECT last_seen_message_id FROM splits_group_members WHERE group_id = ? AND user_id = ?',
                [group.id, userId]
            );
            const lastId = lastSeenResult ? lastSeenResult.last_seen_message_id : null;

            group.unreadCount = await Message.countDocuments({
                group_id: group.id,
                ...(lastId && { _id: { $gt: lastId } })
            });
        }

        return success(res, {
            groups,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        }, 'Groups fetched successfully');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};


//getGroupDetails
// /api/groups/:groupId
// response: { group, members, unreadCount, balances, settlements }
// status: 200

const getGroupDetails = async (req, res) => {
    const { groupId } = req.params;
    try {
        const userId = req.user.id;
        const [groups] = await mysqlPool.query('SELECT * FROM `splits_groups` WHERE id = ?', [groupId]);
        if (groups.length === 0) return error(res, 'Group not found', 404);

        const [members] = await mysqlPool.query(
            `SELECT u.id, u.name, u.email, u.image FROM splits_users u 
             JOIN splits_group_members gm ON u.id = gm.user_id 
             WHERE gm.group_id = ?`,
            [groupId]
        );

        const [[lastSeenResult]] = await mysqlPool.query(
            'SELECT last_seen_message_id FROM splits_group_members WHERE group_id = ? AND user_id = ?',
            [parseInt(groupId), userId]
        );
        const lastId = lastSeenResult ? lastSeenResult.last_seen_message_id : null;

        const unreadCount = await Message.countDocuments({
            group_id: parseInt(groupId),
            ...(lastId && { _id: { $gt: lastId } })
        });

        const balances = [];
        for (const member of members) {
            const [paidResult] = await mysqlPool.query(
                'SELECT SUM(amount) as total_paid FROM splits_expenses WHERE group_id = ? AND paid_by = ?',
                [groupId, member.id]
            );
            const [owedResult] = await mysqlPool.query(
                `SELECT SUM(es.amount) as total_owed 
                 FROM splits_expense_splits es 
                 JOIN splits_expenses e ON es.expense_id = e.id 
                 WHERE e.group_id = ? AND es.user_id = ?`,
                [groupId, member.id]
            );
            balances.push({
                user_id: member.id,
                name: member.name,
                balance: parseFloat(paidResult[0].total_paid || 0) - parseFloat(owedResult[0].total_owed || 0)
            });
        }

        const settlements = [];
        let netBalances = balances.filter(b => Math.abs(b.balance) > 0.01).map(b => ({ ...b, id: b.user_id, amount: b.balance }));
        let creditors = netBalances.filter(b => b.amount > 0).sort((a, b) => b.amount - a.amount);
        let debtors = netBalances.filter(b => b.amount < 0).map(b => ({ ...b, amount: Math.abs(b.amount) })).sort((a, b) => b.amount - a.amount);

        let i = 0, j = 0;
        while (i < creditors.length && j < debtors.length) {
            let amount = Math.min(creditors[i].amount, debtors[j].amount);
            settlements.push({
                from: debtors[j].name,
                from_id: debtors[j].id,
                to: creditors[i].name,
                to_id: creditors[i].id,
                amount: amount.toFixed(2)
            });
            creditors[i].amount -= amount;
            debtors[j].amount -= amount;
            if (creditors[i].amount < 0.01) i++;
            if (debtors[j].amount < 0.01) j++;
        }

        const [recentExpenses] = await mysqlPool.query(
            `SELECT e.*, u.name as paid_by_name FROM splits_expenses e 
             JOIN splits_users u ON e.paid_by = u.id 
             WHERE e.group_id = ? ORDER BY e.created_at DESC LIMIT 5`,
            [groupId]
        );

        const [statsResult] = await mysqlPool.query(
            `SELECT 
                SUM(CASE WHEN created_at >= DATE(NOW()) THEN amount ELSE 0 END) as today,
                SUM(CASE WHEN created_at >= DATE(NOW()) - INTERVAL 7 DAY THEN amount ELSE 0 END) as week,
                SUM(CASE WHEN created_at >= DATE_FORMAT(NOW() ,'%Y-%m-01') THEN amount ELSE 0 END) as month
             FROM splits_expenses WHERE group_id = ?`,
            [groupId]
        );

        return success(res, {
            group: groups[0],
            members,
            expenses: recentExpenses,
            balances,
            settlements,
            unreadCount,
            stats: {
                today: parseFloat(statsResult[0].today || 0),
                week: parseFloat(statsResult[0].week || 0),
                month: parseFloat(statsResult[0].month || 0)
            }
        }, 'Group details fetched successfully');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};


//getGroupExpenses
// /api/groups/:groupId/expenses
// query: { search, page, limit }
// response: { expenses, total, page, limit, totalPages }
// status: 200

const getGroupExpenses = async (req, res) => {
    const { groupId } = req.params;
    const { search = '', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    try {
        let query = `
            SELECT e.*, u.name as paid_by_name FROM splits_expenses e 
            JOIN splits_users u ON e.paid_by = u.id 
            WHERE e.group_id = ?
        `;
        let countQuery = `SELECT COUNT(*) as total FROM splits_expenses e WHERE e.group_id = ?`;

        const queryParams = [groupId];
        const countParams = [groupId];

        if (search) {
            const searchPattern = `%${search.toLowerCase()}%`;
            query += ` AND (LOWER(e.description) LIKE LOWER(?) OR LOWER(u.name) LIKE LOWER(?))`;
            countQuery += ` AND (LOWER(e.description) LIKE LOWER(?) OR (SELECT LOWER(name) FROM splits_users WHERE id = e.paid_by) LIKE LOWER(?))`;
            queryParams.push(searchPattern, searchPattern);
            countParams.push(searchPattern, searchPattern);
        }

        query += ` ORDER BY e.created_at DESC LIMIT ? OFFSET ?`;
        queryParams.push(parseInt(limit), parseInt(offset));

        const [[{ total }]] = await mysqlPool.query(countQuery, countParams);
        const [expenses] = await mysqlPool.query(query, queryParams);

        return success(res, {
            expenses,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        }, 'Expenses fetched successfully');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};

//getDashboardStats
// /api/groups/dashboard-stats
// response: { areaChart, pieChart }
// status: 200

const getDashboardStats = async (req, res) => {
    const userId = req.user.id;
    try {
        const [groups] = await mysqlPool.query(
            'SELECT group_id FROM splits_group_members WHERE user_id = ?',
            [userId]
        );
        const groupIds = groups.map(g => g.group_id);

        if (groupIds.length === 0) {
            return success(res, { areaChart: [], pieChart: [] }, 'No groups found');
        }

        const [expenses] = await mysqlPool.query(
            `SELECT e.amount, e.created_at, g.name as group_name 
             FROM splits_expenses e 
             JOIN splits_groups g ON e.group_id = g.id 
             WHERE e.group_id IN (?) AND e.created_at >= DATE(NOW()) - INTERVAL 7 DAY`,
            [groupIds]
        );

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const areaMap = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
        const pieMap = {};

        expenses.forEach(exp => {
            const date = new Date(exp.created_at);
            const dayName = days[date.getDay()];
            areaMap[dayName] += parseFloat(exp.amount) || 0;

            const gName = exp.group_name;
            if (!pieMap[gName]) pieMap[gName] = 0;
            pieMap[gName] += parseFloat(exp.amount) || 0;
        });

        const areaChart = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayName = days[d.getDay()];
            areaChart.push({ name: dayName, expenses: areaMap[dayName] });
        }

        const pieChart = Object.keys(pieMap).map(name => ({ name, value: pieMap[name] }));

        return success(res, { areaChart, pieChart }, 'Dashboard stats fetched');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};

//markAsSeen
// /api/groups/:groupId/mark-seen
// response: { unreadCount }
// status: 200

const markAsSeen = async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user.id;
    try {
        const lastMsg = await Message.findOne({ group_id: parseInt(groupId) }).sort({ timestamp: -1 });
        const lastId = lastMsg ? lastMsg._id.toString() : null;

        await mysqlPool.query(
            'UPDATE splits_group_members SET last_seen_message_id = ? WHERE group_id = ? AND user_id = ?',
            [lastId, parseInt(groupId), userId]
        );

        return success(res, { unreadCount: 0 }, 'Messages marked as seen');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};


module.exports = { createGroup, addMember, getGroups, getGroupDetails, getGroupExpenses, getDashboardStats, markAsSeen };
