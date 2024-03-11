const { validationResult } = require('express-validator')
const Post = require('../models/post')
const post = require('../models/post')

exports.getPosts = (req, res, next) => {
    Post.find()
        .then(posts => {
            res.status(200).json({
                posts
            })
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err)
        })
}

exports.createPost = (req, res, next) => {

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
        creator: { name: "Har" }
    })

    post.save()
        .then(result => {
            res.status(201).json({
                message: 'Post created successfully',
                post: result
            })
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err)
        })
}

exports.getPost = (req, res, next) => {
    const postId = req.params.postId

    Post.findById(postId)
        .then(post => {
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
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err)
        })
}