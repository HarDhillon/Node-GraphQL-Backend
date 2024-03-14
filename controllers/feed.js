const { validationResult } = require('express-validator')

const Post = require('../models/post')
const User = require('../models/user')

const fs = require('fs')
const path = require('path')

const io = require('../socket')

exports.getPosts = async (req, res, next) => {
    const currentPage = req.query.page || 1
    const perPage = 2

    // Find how many posts in DB
    const totalItems = await Post.find().countDocuments()
    try {
        const posts = await Post.find()
            .populate('creator')
            .sort({ createdAt: -1 })
            .skip((currentPage - 1) * perPage)
            .limit(perPage)


        res.status(200).json({
            message: 'Fetched post successfully',
            posts: posts,
            totalItems: totalItems
        })
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500
        }
        next(err)
    }

}

exports.createPost = async (req, res, next) => {

    // Validate
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect')
        error.statusCode = 422
        throw error
    }

    // Check if file exists
    if (!req.file) {
        const error = new Error('No image provided')
        error.statusCode = 422
        throw error
    }

    const imageUrl = req.file.path
    const title = req.body.title
    const content = req.body.content

    const post = new Post({
        title,
        content,
        imageUrl: imageUrl,
        creator: req.userId
    })
    try {

        await post.save()

        const user = await User.findById(req.userId)

        user.posts.push(post)
        await user.save()

        // our socket is initialized in our app.js
        // * our action is defined as posts
        // * User ._doc to strip out data added in by mongoose and get only object
        io.getIO().emit('posts',
            {
                action: 'create',
                post: { ...post._doc, creator: { _id: user._id, name: user.name } }
            })

        res.status(201).json({
            message: 'Post created successfully',
            post: post,
            creator: { _id: user._id, name: user.name }
        })


    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500
        }
        next(err)
    }


}

exports.getPost = async (req, res, next) => {
    const postId = req.params.postId
    try {
        const post = await Post.findById(postId).populate('creator')
        console.log(post)

        // If cant find post
        if (!post) {
            const error = new Error('Could not locate post')
            error.statusCode = 404
            throw (error)
        }

        res.status(200).json({
            message: 'Post fetched',
            post: post
        })
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500
        }
        next(err)
    }
}

exports.updatePost = async (req, res, next) => {

    // Error check
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect')
        error.statusCode = 422
        throw error
    }

    const { title, content } = req.body
    const postId = req.params.postId
    let imageUrl = req.body.image

    if (req.file) {
        imageUrl = req.file.path
    }
    // If imageUrl still not set
    if (!imageUrl) {
        const error = new Error('No file picked')
        error.statusCode = 422
        throw error
    }

    try {
        const post = await Post.findById(postId).populate('creator')

        // If no post
        if (!post) {
            const error = new Error('Could not locate post')
            error.statusCode = 404
            throw (error)
        }

        // Only allow owner of the post to update
        if (post.creator._id.toString() !== req.userId) {
            const error = new Error('Not authorized')
            error.statusCode = 403
            throw error
        }

        // If imageUrl is changed, new file is uploaded
        if (imageUrl !== post.imageUrl) {
            clearImage(post.imageUrl)
        }

        post.title = title
        post.imageUrl = imageUrl
        post.content = content

        const result = await post.save()

        io.getIO().emit('posts', { action: 'update', post: result })

        // Update success
        res.status(200).json({ message: 'Post updated', post: result })

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500
        }
        next(err)
    }
}

exports.deletePost = async (req, res, next) => {
    const postId = req.params.postId

    try {

        const post = await Post.findById(postId)

        if (!post) {
            const error = new Error('Could not locate post')
            error.statusCode = 404
            throw (error)
        }

        // Only allow owner of the post to update
        if (post.creator.toString() !== req.userId) {
            const error = new Error('Not authorized')
            error.statusCode = 403
            throw error
        }

        clearImage(post.imageUrl)
        await Post.findOneAndDelete(postId)


        const user = await User.findById(req.userId)


        // remove the post that has been deleted from the user as well
        user.posts.pull(postId)
        await user.save()


        res.status(200).json({ message: 'Deleted post' })

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500
        }
        next(err)
    }
}

const clearImage = filepath => {
    filePath = path.join(__dirname, '..', filepath)
    fs.unlink(filepath, err => {
        if (err !== null) {
            console.log(err)
        }
    })
}