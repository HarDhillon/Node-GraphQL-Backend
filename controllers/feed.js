const { validationResult } = require('express-validator')
const Post = require('../models/post')

exports.getPosts = (req, res, next) => {
    Post.find()
        .then(posts => {
            res.status(200).json({
                posts
            })
        })
        .catch(err => console.log(err))
}

exports.createPost = (req, res, next) => {

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect')
        error.statusCode = 422
        throw error

    }

    const title = req.body.title
    const content = req.body.content

    const post = new Post({
        title,
        content,
        imageUrl: 'images/dog.jpg',
        creator: { name: "Har" }
    })

    post.save()
        .then(result => {
            console.log(result)
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