const express = require('express');
const Blog = require('../db/models/blogs');
const Comment = require('../db/models/comments');
const auth = require('../middleware/auth');
const multer = require('multer');
const sharp = require('sharp');

const router = express.Router();

//Creating blogs End-Point.
router.post('/blogs', auth, async (req, res) => {
    try {
        if (Object.keys(req.body).length === 0) {
            throw new Error('No data are inserted')
        }
        const createdBlog = new Blog({
            ...req.body,
            userID: req.user._id,
            userName: req.user.userName
        })
        await createdBlog.save()
        res.status(201).send(createdBlog)
    }
    catch (error) {
        res.status(400).send({ error: error.message })
    }
})

//Blog upload image End-Point.
const upload = multer({
    limits: {
        fileSize: 5000000
    },
    fileFilter(req, file, cb) {
        if (!file.originalname.match(/\.(jpg|jpeg|png)$/i)) {
            cb(new Error('Invalid file type'))
        }
        cb(undefined, true)
    }
})
router.post('/blogs/img/:id', auth, upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send({ error: 'No image selected' })
    }
    const blog = await Blog.findOne({ _id: req.params.id, userID: req.user._id })
    if (!blog) {
        return res.status(404).send({ error: 'No task found' })
    }
    const imgbuffer = req.file.buffer
    const output = await sharp(imgbuffer).png().resize(200, 200).toBuffer()
    blog.img = output
    await blog.save()
    res.set('Content-Type', 'image/png')
    res.send(blog.img)
}, (error, req, res, next) => {
    res.status(400).send({ error: error.message })
})

//Adding likes to blog.
router.post('/blogs/likes/:id', auth, async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id)
        if (!blog) {
            throw new Error('No blog found by this ID')
        }
        var createdLike = {
            likeStatus: true,
            userID: req.user._id,
            userName: req.user.userName
        }
        blog.likes.push(createdLike)
        await blog.save()
        res.status(201).send({ createdLike, blogLikes: blog.likes })
    } catch (error) {
        res.status(404).send({ error: error.message })
        console.log(error);
    }
})

//Get all blogs.
router.get('/blogs', auth, async (req, res) => {
    var sort = {};
    try {
        if (req.query.sortBy) {
            var sortOrder = req.query.sortBy.split(':')[1]
            sort.createdAt = (sortOrder === 'asc') ? 1 : -1
        }
        const blogs = await Blog.find({}, null, {
            limit: parseInt(req.query.limit),
            skip: parseInt(req.query.skip),
            sort
        })
        if (!blogs) {
            throw new Error('No blogs found')
        }
        for (let i = 0; i < blogs.length; i++) {
            const blog = blogs[i];
            var likedByUser = false;
            const userIndex = await blog.getLikeStatusByUser(req.user._id)
            if (userIndex !== -1) {
                likedByUser = true
            }
            blog._doc.likesCount = blog.likes.length
            blog._doc.likedByUser = likedByUser
            delete blog._doc.likes
        }
        res.send({allBlogs: blogs})
    } catch (error) {
        res.status(404).send({ error: error.message })
    }
})

//Get all user blogs.
router.get('/blogs/user', auth, async (req, res) => {
    var sort = {};

    try {
        if (req.query.sortBy) {
            var sortOrder = req.query.sortBy.split(':')[1]
            sort.createdAt = (sortOrder === 'asc') ? 1 : -1
        }
        await req.user.populate({
            path: 'blogs',
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        }).execPopulate()
        if (!req.user.blogs.length) {
            return res.status(404).send({ error: 'No blogs found' })
        }
        for (let i = 0; i < req.user.blogs.length; i++) {
            const blog = req.user.blogs[i];
            var likedByUser = false;
            const userIndex = await blog.getLikeStatusByUser(req.user._id)
            if (userIndex !== -1) {
                likedByUser = true
            }
            blog._doc.likesCount = blog.likes.length
            blog._doc.likedByUser = likedByUser
            delete blog._doc.likes
        }
        res.send({ userBlogs: req.user.blogs })
    } catch (error) {
        res.status(400).send({ error: error.message })
    }
})

//Reading individual blog by ID.
router.get('/blogs/:id', auth, async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id)
        if (!blog) {
            return res.status(404).send({ error: 'No blog found' })
        }
        var likedByUser = false;
        const userIndex = await blog.getLikeStatusByUser(req.user._id)
        if (userIndex !== -1) {
            likedByUser = true
        }
        blog._doc.likesCount = blog.likes.length
        blog._doc.likedByUser = likedByUser
        res.send({ blog })
    } catch (error) {
        res.status(500).send({ error: error.message })
    }
})

//Getting blog uploaded img.
router.get('/blogs/img/:id', auth, async (req, res) => {
    try {
        const blog = await Blog.findById(req.params.id)
        if (!blog) {
            throw new Error('No blog found')
        } else if (blog.img === undefined || null) {
            throw new Error('No image found for this blog')
        }
        res.set('Content-Type', 'image/png')
        res.send(blog.img)
    } catch (error) {
        res.status(404).send({ error: error.message })
    }
})

//Update blog End-Point.
router.patch('/blogs/:id', auth, async (req, res) => {
    var userUpdates = Object.keys(req.body)
    if (userUpdates.length === 0) {
        return res.status(400).send({ error: 'No update is provided' })
    }
    let isAllowedUpdate = userUpdates.every((update) => update === 'content')
    if (isAllowedUpdate === false) {
        return res.status(400).send({ error: 'one or more fields are not existed to update' })
    }
    try {
        const blog = await Blog.findOne({ _id: req.params.id, userID: req.user._id })
        if (!blog) {
            throw new Error('No blog Found')
        }
        blog.content = req.body.content
        await blog.save()
        res.send(blog)
    } catch (error) {
        res.status(404).send({ error: error.message })
    }
})

//Deleting Blog End-Point.
router.delete('/blogs/:id', auth, async (req, res) => {
    try {
        var _id = req.params.id
        const blog = await Blog.findOneAndDelete({ _id, userID: req.user._id })
        if (!blog) {
            return res.status(404).send({ message: 'No blog found by this ID' })
        }
        await Comment.deleteMany({ blogID: blog._id })
        await blog.save()
        res.send({ message: 'deleted successfuly', deletedBlog: blog })
    } catch (error) {
        res.status(400).send({ error: error.message })
    }
})

//delete Blog img End-Point.
router.delete('/blogs/img/:id', auth, async (req, res) => {
    try {
        const blog = await Blog.findOne({ _id: req.params.id, userID: req.user._id })
        if (!blog) {
            throw new Error('No blog found')
        } else if (blog.img === null || undefined) {
            throw new Error('No image to be deleted')
        }
        blog.img = null
        await blog.save()
        res.send({ message: 'Blog image is deleted successfuly' })
    } catch (error) {
        res.status(404).send({ error: error.message })
    }
})

module.exports = router;