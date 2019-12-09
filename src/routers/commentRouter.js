const express = require('express');
const Comment = require('../db/models/comments');
const Blog = require('../db/models/blogs');
const auth = require('../middleware/auth');

const router = express.Router();

//Creating Comment to blog End-Point.
router.post('/comments/:blogId', auth, async (req, res) => {
    try {
        if (Object.keys(req.body).length === 0) {
            throw new Error('No data are inserted')
        }
        await req.user.checkBlockedUser()
        const createdComment = new Comment({
            ...req.body,
            blogID: req.params.blogId,
            userID: req.user._id,
            userName: req.user.userName
        })
        await createdComment.save()
        res.status(201).send(createdComment)
    }
    catch (error) {
        res.status(400).send({ error: error.message })
    }
})

//Adding Replies to comment End-Point.
router.post('/comments/replies/:id', auth, async (req, res) => {
    try {
        await req.user.checkBlockedUser()
        const comment = await Comment.findById(req.params.id)
        if (!comment) {
            throw new Error('No comment found by this ID')
        }
        var reply = {
            replyText: req.body.reply,
            userID: req.user._id,
            userName: req.user.userName
        }
        comment.replies.push(reply)
        await comment.save()
        res.status(201).send({ reply })
    } catch (error) {
        res.status(404).send({ error: error.message })
    }
})

//Adding likes to comment.
router.post('/comments/likes/:id', auth, async (req, res) => {
    try {
        await req.user.checkBlockedUser()
        const comment = await Comment.findById(req.params.id)
        if (!comment) {
            throw new Error('No comment found by this ID')
        }
        var createdLike = {
            likeStatus: true,
            userID: req.user._id,
            userName: req.user.userName
        }
        comment.likes.push(createdLike)
        await comment.save()
        res.status(201).send({ createdLike, commentLikes: comment.likes })
    } catch (error) {
        res.status(404).send({ error: error.message })
    }
})

//Get all blog's comments.
router.get('/comments', auth, async (req, res) => {
    var sort = {};
    try {
        if (req.query.sortBy) {
            var sortOrder = req.query.sortBy.split(':')[1]
            sort.createdAt = (sortOrder === 'asc') ? 1 : -1
        }
        const blog = await Blog.findById(req.query.blogId)
        if (!blog) {
            throw new Error('No blog found by this ID')
        }
        await blog.populate({
            path: 'comments',
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        }).execPopulate()
        if (!blog.comments.length) {
            return res.status(404).send({ error: 'No comments found' })
        }
        for (let i = 0; i < blog.comments.length; i++) {
            const comment = blog.comments[i];
            var likedByUser = false;
            const userIndex = await comment.getLikeStatusByUser(req.user._id)
            if (userIndex !== -1) {
                likedByUser = true
            }
            comment._doc.repliesCount = comment.replies.length
            comment._doc.likesCount = comment.likes.length
            comment._doc.likedByUser = likedByUser
            delete comment._doc.likes
            delete comment._doc.replies
        }
        res.send({ comments: blog.comments })
    } catch (error) {
        res.status(404).send({ error: error.message })
    }
})

//Reading individual comment by ID.
router.get('/comments/:id', auth, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id)
        if (!comment) {
            return res.status(404).send({ error: 'No comment found' })
        }
        var likedByUser = false;
        const userIndex = await comment.getLikeStatusByUser(req.user._id)
        if (userIndex !== -1) {
            likedByUser = true
        }
        comment._doc.repliesCount = comment.replies.length
        comment._doc.likesCount = comment.likes.length
        comment._doc.likedByUser = likedByUser
        res.send({ comment })
    } catch (error) {
        res.status(500).send({ error: error.message })
        console.log(error);
    }
})

//Get all Comment's Replies.
router.get('/comments/replies/:id', auth, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.id)
        if (!comment) {
            throw new Error('No comment found by this ID')
        }
        res.send({commentReplies:comment.replies})
    } catch (error) {
        res.status(404).send({ error: error.message })
    }
})

//Edit blog comment End-Point.
router.patch('/comments/:id', auth, async (req, res) => {
    var userUpdates = Object.keys(req.body)
    if (userUpdates.length === 0) {
        return res.status(400).send({ error: 'No update is provided' })
    }
    let isAllowedUpdate = userUpdates.every((update) => update === 'comment')
    if (isAllowedUpdate === false) {
        return res.status(400).send({ error: 'one or more fields are not existed to update' })
    }
    try {
        await req.user.checkBlockedUser()
        const comment = await Comment.findOne({ _id: req.params.id, userID: req.user._id })
        if (!comment) {
            throw new Error('No comment Found')
        }
        comment.comment = req.body.comment
        await comment.save()
        res.send(comment)
    } catch (error) {
        res.status(404).send({ error: error.message })
    }
})

//Deleting comment End-Point.
router.delete('/comments/:id', auth, async (req, res) => {
    try {
        var _id = req.params.id
        const comment = await Comment.findOneAndDelete({ _id, userID: req.user._id })
        if (!comment) {
            return res.status(404).send({ message: 'No comment found by this ID' })
        }
        await comment.save()
        res.send({ message: 'deleted successfuly', deletedComment: comment })
    } catch (error) {
        res.status(400).send({ error: error.message })
    }
})

module.exports = router;