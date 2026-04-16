const { body, param, query } = require('express-validator');



exports.register = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 60 }).withMessage('Name must be 2–60 characters')
        .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name contains invalid characters'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email address')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
        .isLength({ max: 100 }).withMessage('Password too long'),
];

exports.login = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email address')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required'),
];

exports.updateProfile = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 60 }).withMessage('Name must be 2–60 characters')
        .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name contains invalid characters'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email address')
        .normalizeEmail(),
];


exports.createGroup = [
    body('name')
        .trim()
        .notEmpty().withMessage('Group name is required')
        .isLength({ min: 2, max: 80 }).withMessage('Group name must be 2–80 characters')
        .escape(),
];

exports.addMember = [
    param('groupId')
        .isInt({ min: 1 }).withMessage('Invalid group ID'),

    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email address')
        .normalizeEmail(),
];

exports.getGroups = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

    query('search')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Search term too long')
        .escape(),
];

exports.groupId = [
    param('groupId')
        .isInt({ min: 1 }).withMessage('Invalid group ID'),
];

exports.getGroupExpenses = [
    param('groupId')
        .isInt({ min: 1 }).withMessage('Invalid group ID'),

    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 200 }).withMessage('Limit must be between 1 and 200'),

    query('search')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('Search term too long')
        .escape(),
];



exports.addExpense = [
    body('groupId')
        .notEmpty().withMessage('Group ID is required')
        .isInt({ min: 1 }).withMessage('Invalid group ID'),

    body('amount')
        .notEmpty().withMessage('Amount is required')
        .isFloat({ min: 0.01, max: 9999999 }).withMessage('Amount must be a positive number (max 9,999,999)'),

    body('description')
        .trim()
        .notEmpty().withMessage('Description is required')
        .isLength({ min: 2, max: 200 }).withMessage('Description must be 2–200 characters')
        .escape(),

    body('paidBy')
        .notEmpty().withMessage('PaidBy is required')
        .isInt({ min: 1 }).withMessage('Invalid paidBy user ID'),
];

exports.recordPayment = [
    body('groupId')
        .notEmpty().withMessage('Group ID is required')
        .isInt({ min: 1 }).withMessage('Invalid group ID'),

    body('payerId')
        .notEmpty().withMessage('Payer ID is required')
        .isInt({ min: 1 }).withMessage('Invalid payer ID'),

    body('receiverId')
        .notEmpty().withMessage('Receiver ID is required')
        .isInt({ min: 1 }).withMessage('Invalid receiver ID'),

    body('amount')
        .notEmpty().withMessage('Amount is required')
        .isFloat({ min: 0.01, max: 9999999 }).withMessage('Amount must be a positive number'),
];
