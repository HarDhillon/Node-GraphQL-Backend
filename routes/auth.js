const express = require('express')
const authController = require('../controllers/auth')
const { body } = require('express-validator')

const isAuth = require('../middleware/is-auth')
const User = require('../models/user')

const router = express.Router()

// * for /auth routes

router.put('/signup', [
    body('email')
        .isEmail()
        .withMessage('Please enter valid email')
        .custom((value, { req }) => {
            return User.findOne({ email: value })
                .then(userDoc => {
                    if (userDoc) {
                        return Promise.reject('Email already exists')
                    }
                })
        })
        .normalizeEmail(),
    body('password').trim().isLength({ min: 5 }),
    body('name').trim().not().isEmpty()
], authController.signup)

router.post('/login', authController.login)

// Get user status
router.get('/status', isAuth, authController.getUserStatus)

// Update user status
router.patch('/status', [
    body('status')
        .trim()
        .not()
        .isEmpty()
], isAuth, authController.updateUserStatus)

module.exports = router