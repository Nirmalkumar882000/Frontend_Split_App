const { mysqlPool } = require('../config/db');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const { success, error } = require('../utils/response');


//addExpense
// /api/expenses/add
// body: { groupId, amount, description, paidBy }
// response: { expenseId }
// status: 201

const addExpense = async (req, res) => {
    const { groupId, amount, description, paidBy } = req.body;
    const conn = await mysqlPool.getConnection();
    try {
        await conn.beginTransaction();

        const [expenseResult] = await conn.query(
            'INSERT INTO splits_expenses (group_id, paid_by, amount, description) VALUES (?, ?, ?, ?)',
            [groupId, paidBy, amount, description]
        );
        const expenseId = expenseResult.insertId;

        const [members] = await conn.query(
            'SELECT user_id FROM splits_group_members WHERE group_id = ?',
            [groupId]
        );

        if (members.length === 0) throw new Error('No members in group');

        const splitAmount = amount / members.length;

        for (const member of members) {
            await conn.query(
                'INSERT INTO splits_expense_splits (expense_id, user_id, amount) VALUES (?, ?, ?)',
                [expenseId, member.user_id, splitAmount]
            );
        }

        await conn.commit();

        await ActivityLog.create({
            user_id: paidBy,
            action: 'ADD_EXPENSE',
            data: { expenseId, groupId, amount, description }
        });

        for (const member of members) {
            if (member.user_id !== paidBy) {
                await Notification.create({
                    user_id: member.user_id,
                    message: `A new expense "${description}" of ${amount} was added in your group.`
                });
            }
        }

        if (req.io) {
            req.io.to(`group_${groupId}`).emit('expenseAdded', { expenseId, description, amount });
        }

        return success(res, { expenseId }, 'Expense added successfully', 201);
    } catch (err) {
        await conn.rollback();
        return error(res, err.message || 'Internal server error', 500);
    } finally {
        conn.release();
    }
};


//recordPayment
// /api/expenses/record-payment
// body: { groupId, payerId, receiverId, amount }
// response: { expenseId }
// status: 201

const recordPayment = async (req, res) => {
    const { groupId, payerId, receiverId, amount } = req.body;
    const conn = await mysqlPool.getConnection();
    try {
        await conn.beginTransaction();

        const [[payer]] = await conn.query('SELECT name FROM splits_users WHERE id = ?', [payerId]);
        const [[receiver]] = await conn.query('SELECT name FROM splits_users WHERE id = ?', [receiverId]);

        if (!payer || !receiver) throw new Error('Invalid payer or receiver');


        const description = `Settlement: ${payer.name} paid ${receiver.name}`;
        const [expenseResult] = await conn.query(
            'INSERT INTO splits_expenses (group_id, paid_by, amount, description) VALUES (?, ?, ?, ?)',
            [groupId, payerId, amount, description]
        );
        const expenseId = expenseResult.insertId;

        await conn.query(
            'INSERT INTO splits_expense_splits (expense_id, user_id, amount) VALUES (?, ?, ?)',
            [expenseId, receiverId, amount]
        );

        await conn.commit();

        await ActivityLog.create({
            user_id: payerId,
            action: 'RECORD_PAYMENT',
            data: { expenseId, groupId, amount, payerId, receiverId }
        });

        await Notification.create({
            user_id: receiverId,
            message: `${payer.name} recorded a payment of ${amount} to you.`
        });

        if (req.io) {
            req.io.to(`group_${groupId}`).emit('expenseAdded', { expenseId, description, amount, isSettlement: true });
        }

        return success(res, { expenseId }, 'Payment recorded successfully', 201);
    } catch (err) {
        await conn.rollback();
        return error(res, err.message || 'Error recording payment', 500);
    } finally {
        conn.release();
    }
};


//getBalances
// /api/expenses/balances/:groupId
// response: { balances }
// status: 200

const getBalances = async (req, res) => {
    const { groupId } = req.params;
    try {
        const [members] = await mysqlPool.query(
            `SELECT u.id, u.name FROM splits_users u 
             JOIN splits_group_members gm ON u.id = gm.user_id 
             WHERE gm.group_id = ?`,
            [groupId]
        );

        const balances = [];

        for (const member of members) {
            const [paidResult] = await mysqlPool.query(
                'SELECT SUM(amount) as total_paid FROM splits_expenses WHERE group_id = ? AND paid_by = ?',
                [groupId, member.id]
            );
            const totalPaid = parseFloat(paidResult[0].total_paid || 0);

            const [owedResult] = await mysqlPool.query(
                `SELECT SUM(es.amount) as total_owed 
                 FROM splits_expense_splits es 
                 JOIN splits_expenses e ON es.expense_id = e.id 
                 WHERE e.group_id = ? AND es.user_id = ?`,
                [groupId, member.id]
            );
            const totalOwed = parseFloat(owedResult[0].total_owed || 0);

            balances.push({
                user_id: member.id,
                name: member.name,
                balance: totalPaid - totalOwed
            });
        }

        return success(res, balances, 'Balances fetched successfully');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};


//getSettlements
// /api/expenses/settlements/:groupId
// response: { settlements }
// status: 200

const getSettlements = async (req, res) => {
    const { groupId } = req.params;
    try {
        const [members] = await mysqlPool.query(
            `SELECT u.id, u.name FROM splits_users u 
             JOIN splits_group_members gm ON u.id = gm.user_id 
             WHERE gm.group_id = ?`,
            [groupId]
        );

        let netBalances = [];

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
            const balance = parseFloat(paidResult[0].total_paid || 0) - parseFloat(owedResult[0].total_owed || 0);
            if (Math.abs(balance) > 0.01) {
                netBalances.push({ id: member.id, name: member.name, amount: balance });
            }
        }

        const settlements = [];
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

        return success(res, settlements, 'Settlements calculated successfully');
    } catch (err) {
        return error(res, 'Internal server error', 500);
    }
};

module.exports = { addExpense, recordPayment, getBalances, getSettlements };
