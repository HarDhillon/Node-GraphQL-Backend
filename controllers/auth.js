const { validationResult } = require('express-validator')
const bcrypt = require('bcryptjs')
const User = require('../models/user')

const jwt = require('jsonwebtoken')
require('dotenv').config();

exports.signup = (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed')
        error.statusCode = 422
        error.data = errors.array();
        throw error
    }
    const email = req.body.email
    const name = req.body.name
    const password = req.body.password
    bcrypt.hash(password, 12)
        .then(hashedPassword => {

            // Create new user
            const user = new User({
                email: email,
                name: name,
                password: hashedPassword
            })

            return user.save()
        })
        .then(newUser => {
            res.status(200).json({ message: 'User created', usedId: newUser._id })
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err)
        })
}

exports.login = (req, res, next) => {
    const email = req.body.email
    const password = req.body.password
    let loadedUser

    User.findOne({ email: email })
        .then(user => {
            // No user found
            if (!user) {
                const error = new Error('Username or password incorrect')
                error.statusCode = 401
                throw error
            }
            loadedUser = user
            return bcrypt.compare(password, user.password)
        })
        .then(isEqual => {
            // Passwords DONT match
            if (!isEqual) {
                const error = new Error('Username or password incorrect')
                error.statusCode = 401
                throw error
            }

            // Generate our JWT token
            const token = jwt.sign(
                {
                    email: loadedUser.email,
                    userId: loadedUser._id.toString()
                },
                process.env.JWT_TOKEN,
                {
                    expiresIn: '1h'
                }
            )
            // Pass JWT token to front
            res.status(200).json({ token: token, userId: loadedUser._id.toString() })

        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err)
        })
}