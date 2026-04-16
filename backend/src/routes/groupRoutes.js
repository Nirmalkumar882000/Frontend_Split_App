const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const authenticateToken = require('../middleware/auth');
const validate = require('../middleware/validate');
const validators = require('../middleware/validators');

router.use(authenticateToken);

router.post(
    '/',
    validators.createGroup,
    validate,
    groupController.createGroup
);
router.get(
    '/',
    validators.getGroups,
    validate,
    groupController.getGroups
);
router.get(
    '/dashboard/stats',
    groupController.getDashboardStats
);
router.get(
    '/:groupId',
    validators.groupId,
    validate,
    groupController.getGroupDetails
);
router.get(
    '/:groupId/expenses',
    validators.getGroupExpenses,
    validate,
    groupController.getGroupExpenses
);
router.post(
    '/:groupId/members',
    validators.addMember,
    validate,
    groupController.addMember
);
router.post(
    '/:groupId/seen',
    validators.groupId,
    validate,
    groupController.markAsSeen
);

module.exports = router;
