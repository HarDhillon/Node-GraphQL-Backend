const { validationResult } = require('express-validator')
const bcrypt = require('bcryptjs')
const User = require('../models/user')

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