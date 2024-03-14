const bcrypt = require('bcryptjs')
const User = require('../models/user')

module.exports = {
    // In our schema the userInput object will store all our user input data, which we also define how that comes through
    createUser: async function ({ userInput }, req) {
        const email = userInput.email

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
    }
}