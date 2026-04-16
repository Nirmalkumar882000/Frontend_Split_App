const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');
const validate = require('../middleware/validate');
const validators = require('../middleware/validators');

router.post(
    '/register',
    validators.register,
    validate,
    authController.register
);
router.post(
    '/login',
    validators.login,
    validate,
    authController.login
);
router.put(
    '/profile',
    authenticateToken,
    validators.updateProfile,
    validate,
    authController.updateProfile
);
router.post(
    '/change-password',
    authenticateToken,
    validate,
    authController.changePassword
);

module.exports = router;
