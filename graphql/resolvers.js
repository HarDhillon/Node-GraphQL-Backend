const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/user')
const Post = require('../models/post')

const { clearImage } = require('../util/file')

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

    },

    createPost: async function ({ postInput }, req) {

        // Auth check
        if (!req.isAuth) {
            const error = new Error('Not authenticated')
            error.code = 401
            throw error
        }
        // Validation handling
        const errors = []
        if (validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, { min: 5 })) {
            errors.push({ message: 'Title invalid' })
        }
        if (validator.isEmpty(postInput.content) || !validator.isLength(postInput.content, { min: 5 })) {
            errors.push({ message: 'Content invalid' })
        }
        if (errors.length > 0) {
            const error = new Error('Invalid input')
            error.data = errors
            error.code = 422
            throw error
        }

        const user = await User.findById(req.userId)
        if (!user) {
            const error = new Error('No User Found')
            error.code = 401
            throw error
        }

        const post = new Post({
            title: postInput.title,
            content: postInput.content,
            imageUrl: postInput.imageUrl,
            creator: user
        })

        const createdPost = await post.save()
        user.posts.push(createdPost)
        await user.save()

        // Remember to return non strings as a string. Like _id and dates
        return { ...createdPost._doc, _id: createdPost._id.toString(), createdAt: createdPost.createdAt.toISOString(), updatedAt: createdPost.updatedAt.toISOString() }
    },

    posts: async function ({ page }, req) {

        // if (!req.isAuth) {
        //     const error = new Error('Not authenticated')
        //     error.code = 401
        //     throw error
        // }
        if (!page) {
            page = 1
        }
        const perPage = 2
        const totalPosts = await Post.find().countDocuments()
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * perPage)
            .limit(perPage)
            .populate('creator')

        return {
            posts: posts.map(post => {
                return {
                    ...post._doc,
                    _id: post._id.toString(),
                    createdAt: post.createdAt.toISOString(),
                    updatedAt: post.updatedAt.toISOString()
                }
            }), totalPosts: totalPosts
        }
    },

    post: async function ({ id }, req) {
        // Auth check
        if (!req.isAuth) {
            const error = new Error('Not authenticated')
            error.code = 401
            throw error
        }

        const post = await Post.findById(id).populate('creator')
        if (!post) {
            const error = new Error('No post found')
            error.code = 404
            throw error
        }
        return {
            ...post._doc,
            _id: post._id.toString(),
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString()
        }

    },

    updatePost: async function ({ id, postInput }, req) {
        // Auth check
        if (!req.isAuth) {
            const error = new Error('Not authenticated')
            error.code = 401
            throw error
        }

        const post = await Post.findById(id).populate('creator')
        if (!post) {
            const error = new Error('No post found')
            error.code = 404
            throw error
        }
        if (post.creator._id.toString() !== req.userId.toString()) {
            const error = new Error('Not authorised')
            error.code = 403
            throw error
        }

        // Validation handling
        const errors = []
        if (validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, { min: 5 })) {
            errors.push({ message: 'Title invalid' })
        }
        if (validator.isEmpty(postInput.content) || !validator.isLength(postInput.content, { min: 5 })) {
            errors.push({ message: 'Content invalid' })
        }
        if (errors.length > 0) {
            const error = new Error('Invalid input')
            error.data = errors
            error.code = 422
            throw error
        }

        post.title = postInput.title
        post.content = postInput.content
        // imageUrl not undefined if new url given
        if (postInput.imageUrl !== 'undefined') {
            post.imageUrl = postInput.imageUrl
        }

        const updatedPost = await post.save()

        return {
            ...updatedPost._doc,
            _id: updatedPost._id.toString(),
            createdAt: updatedPost.createdAt.toISOString(),
            updatedAt: updatedPost.updatedAt.toISOString()
        }

    },
    deletePost: async function ({ id }, req) {
        // Auth check
        if (!req.isAuth) {
            const error = new Error('Not authenticated')
            error.code = 401
            throw error
        }

        const post = await Post.findById(id)
        // Check if post exists
        if (!post) {
            const error = new Error('No post found')
            error.code = 404
            throw error
        }
        // Check if post user is same as request user
        if (post.creator.toString() !== req.userId.toString()) {
            const error = new Error('Not authorised')
            error.code = 403
            throw error
        }

        // delete image
        clearImage(post.imageUrl)

        await Post.findByIdAndDelete(id)
        const user = await User.findById(req.userId)
        user.posts.pull(id)
        await user.save()

        return true

    },

    user: async function (args, req) {

        // Auth check
        if (!req.isAuth) {
            const error = new Error('Not authenticated')
            error.code = 401
            throw error
        }
        const user = await User.findById(req.userId)

        if (!user) {
            const error = new Error('Not user found')
            error.code = 404
            throw error
        }

        return { ...user._doc, _id: user._id.toString() }
    },

    updateStatus: async function ({ newStatus }, req) {
        // Auth check
        if (!req.isAuth) {
            const error = new Error('Not authenticated')
            error.code = 401
            throw error
        }
        const user = await User.findById(req.userId)

        if (!user) {
            const error = new Error('Not user found')
            error.code = 404
            throw error
        }

        user.status = newStatus
        await user.save()

        return { ...user._doc, _id: user._id.toString() }
    }
}