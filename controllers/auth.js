const { validationResult } = require('express-validator')
const bcrypt = require('bcryptjs')
const User = require('../models/user')

const jwt = require('jsonwebtoken')
require('dotenv').config();

exports.signup = async (req, res, next) => {
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

    try {
        const hashedPassword = await bcrypt.hash(password, 12)

        // Create new user
        const user = new User({
            email: email,
            name: name,
            password: hashedPassword
        })

        const newUser = await user.save()
        res.status(200).json({ message: 'User created', usedId: newUser._id })

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500
        }
        next(err)
    }
}

exports.login = async (req, res, next) => {
    const email = req.body.email
    const password = req.body.password
    let loadedUser

    try {
        const user = await User.findOne({ email: email })

        // No user found
        if (!user) {
            const error = new Error('Username or password incorrect')
            error.statusCode = 401
            throw error
        }
        loadedUser = user
        const isEqual = await bcrypt.compare(password, user.password)


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


    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500
        }
        next(err)
    }
}

exports.getUserStatus = async (req, res, next) => {
    try {
        const user = await User.findById(req.userId)

        if (!user) {
            const error = new Error('No user found')
            error.statusCode = 404
            throw error
        }

        res.status(200).json({ message: 'Status found', status: user.status })

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500
        }
        next(err)
    }

}

exports.updateUserStatus = async (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        const error = new Error('Validation Failed')
        error.statusCode = 422
        throw error
    }

    try {
        const user = await User.findById(req.userId)

        if (!user) {
            const error = new Error('No user found')
            error.statusCode = 404
            throw error
        }

        user.status = req.body.status

        const result = await user.save()
        res.status(200).json({ message: 'Status Updated', status: result.status })

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500
        }
        next(err)
    }
}