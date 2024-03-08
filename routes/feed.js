const express = require('express')
const { body } = require('express-validator')
const router = express.Router()

const feedController = require('../controllers/feed')

// ===========================================

//* Only for /feed/ paths

router.get('/posts', feedController.getPosts);

router.post('/post', [
    body('title')
        .trim()
        .isLength({ min: 5 }),
    body('content')
        .trim()
        .isLength({ min: 5 })
], feedController.createPost)

module.exports = router