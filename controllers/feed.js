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
        return res.status(422).json({
            message: 'Validation failed, entered data is incorrect',
            errors: errors.array()
        })
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
        .catch(err => console.log(err))
}