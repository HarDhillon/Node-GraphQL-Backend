const { validationResult } = require('express-validator')

const Post = require('../models/post')
const User = require('../models/user')

const fs = require('fs')
const path = require('path')

exports.getPosts = (req, res, next) => {
    const currentPage = req.query.page || 1
    const perPage = 2
    let totalItems;

    // Find how many posts in DB
    Post.find().countDocuments()
        .then(count => {
            totalItems = count

            return Post.find()
                .skip((currentPage - 1) * perPage)
                .limit(perPage)
        })
        .then(posts => {
            res.status(200).json({
                message: 'Fetched post successfully',
                posts: posts,
                totalItems: totalItems
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
    let creator

    const post = new Post({
        title,
        content,
        imageUrl: imageUrl,
        creator: req.userId
    })

    post.save()
        .then(result => {
            return User.findById(req.userId)
        })
        .then(user => {
            creator = user
            user.posts.push(post)
            return user.save()
        })
        .then(result => {
            res.status(201).json({
                message: 'Post created successfully',
                post: post,
                creator: { _id: creator._id, name: creator.name }
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

exports.updatePost = (req, res, next) => {

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

    Post.findById(postId)
        .then(post => {
            // If no post
            if (!post) {
                const error = new Error('Could not locate post')
                error.statusCode = 404
                throw (error)
            }
            // If imageUrl is changed, new file is uploaded
            if (imageUrl !== post.imageUrl) {
                clearImage(post.imageUrl)
            }

            post.title = title
            post.imageUrl = imageUrl
            post.content = content

            return post.save()
        })
        // Update success
        .then(result => {
            res.status(200).json({ message: 'Post updated', post: result })
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err)
        })
}

exports.deletePost = (req, res, next) => {
    const postId = req.params.postId
    Post.findById(postId)
        .then(post => {
            if (!post) {
                const error = new Error('Could not locate post')
                error.statusCode = 404
                throw (error)
            }

            // TODO Check logged in user

            clearImage(post.imageUrl)
            return Post.findOneAndDelete(postId)
        })
        .then(result => {
            res.status(200).json({ nessage: 'Deleted post' })
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500
            }
            next(err)
        })
}

const clearImage = filepath => {
    filePath = path.join(__dirname, '..', filepath)
    fs.unlink(filepath, err => {
        if (err !== null) {
            console.log(err)
        }
    })
}