const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const validateRequest = require('../middleware/validation.middleware');

const registrationValidation = [
    body('name').trim().notEmpty().isLength({ max: 120 }).withMessage('Name is required and must be 120 characters or fewer'),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

const loginValidation = [
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required')
];

const emailValidation = [
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail()
];

router.post("/register", registrationValidation, validateRequest, authController.registerUser);
router.post("/login", loginValidation, validateRequest, authController.loginUser);
router.post("/google", authController.googleAuth);
router.get("/verify-email", authController.verifyEmail);
router.post("/resend-verification", emailValidation, validateRequest, authController.resendVerification);
router.post("/logout", authController.logoutUser);

module.exports = router;