const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/user')

require('dotenv').config();

const validator = require('validator')

module.exports = {
    // In our schema the userInput object will store all our user input data, which we also define how that comes through
    createUser: async function ({ userInput }, req) {
        const email = userInput.email

        // Check validation
        const errors = []
        if (!validator.isEmail(email)) {
            errors.push({ message: 'Email is invalid' })
        }
        if (validator.isEmpty(userInput.password) || !validator.isLength(userInput.password, { min: 5 })) {
            errors.push({ message: 'Password too short!' })
        }

        // If we have errors
        if (errors.length > 0) {
            const error = new Error('Invalid input')
            error.data = errors
            error.code = 422
            throw error
        }

        const existingUser = await User.findOne({ email: email })
        if (existingUser) {
            const error = new Error('User exists already')
            throw error
        }

        const hashedPw = await bcrypt.hash(userInput.password, 12)
        const user = new User({
            email: email,
            name: userInput.name,
            password: hashedPw
        })

        const createdUser = await user.save()
        return { ...createdUser._doc, _id: createdUser._id.toString() }
    },

    login: async function ({ email, password }) {
        const user = await User.findOne({ email: email })
        // Check user exists
        if (!user) {
            const error = new Error('Email or Password is incorrect')
            error.code = 401
            throw error
        }

        // check if submitted password is equal to DB password
        const isEqual = await bcrypt.compare(password, user.password)

        if (!isEqual) {
            const error = new Error('Email or Password is incorrect')
            error.code = 401
            throw error
        }

        // Generate our auth token
        const token = jwt.sign(
            {
                userId: user._id.toString(),
                email: user.email
            },
            process.env.JWT_TOKEN,
            { expiresIn: '1h' }
        )

        return { token: token, userId: user._id.toString() }

    }
}