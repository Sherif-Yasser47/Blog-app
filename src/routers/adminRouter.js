const express = require('express');
const User = require('../db/models/users');
const Admin = require('../db/models/admin');
const Blog = require('../db/models/blogs');
const Comment = require('../db/models/comments');
const auth = require('../middleware/auth');

const router = express.Router();

//Admin Blocking user End-Point.
router.post('/users/block', auth, async (req, res) => {
    const authorizedUser = await Admin.findOne({ _id: req.user._id })
    if (!authorizedUser) {
        return res.status(400).send({ error: 'User must be an admin' })
    }
    try {
        const blockedUser = await User.findById(req.query.userId)
        if (!blockedUser) {
            throw new Error('No user found by this ID')
        }
        if (req.query.unblock === 'true') {
            blockedUser.blocked = false
        } else {
            blockedUser.blocked = true
        }
        await blockedUser.save()
        res.send({ blockedUser })
    } catch (error) {
        res.status(404).send({ error: error.message })
        console.log(error);
    }
})

//Admin deleting blog End-Point.
router.delete('/users/deleteBlog', auth, async (req, res) => {
    const authorizedUser = await Admin.findOne({ _id: req.user._id })
    if (!authorizedUser) {
        return res.status(400).send({ error: 'User must be an admin' })
    }
    try {
        const blog = await Blog.findOneAndDelete({ _id: req.query.blogId })
        if (!blog) {
            throw new Error('No blog found by this ID')
        }
        await Comment.deleteMany({ blogID: blog._id })
        await blog.save()
        res.send({ message: 'deleted successfuly', deletedBlog: blog })
    } catch (error) {
        res.status(404).send({ error: error.message })
    }
})
module.exports = router;