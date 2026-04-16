const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const authenticateToken = require('../middleware/auth');
const validate = require('../middleware/validate');
const validators = require('../middleware/validators');

router.use(authenticateToken);

router.post(
    '/',
    validators.addExpense,
    validate,
    expenseController.addExpense
);
router.get(
    '/balances/:groupId',
    validators.groupId,
    validate,
    expenseController.getBalances
);
router.get(
    '/settlements/:groupId',
    validators.groupId,
    validate,
    expenseController.getSettlements
);

router.post(
    '/record-payment',
    validators.recordPayment,
    validate,
    expenseController.recordPayment
);

module.exports = router;
