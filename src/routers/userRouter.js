const express = require('express');
const User = require('../db/models/users');
const Admin = require('../db/models/admin');
const auth = require('../middleware/auth');
const multer = require('multer');
const sharp = require('sharp');

const router = express.Router();

//Create Users End-point
router.post('/users', async (req, res) => {
    try {
        var createdUser;
        if (Object.keys(req.body).length === 0) {
            throw new Error('No data are inserted')
        }
        if (req.query.type === 'admin') {
            createdUser = await Admin.create(req.body)
        } else {
            await User.checkEmailValidity(req.body.email)
            createdUser = await User.create(req.body)
        }
        const token = await createdUser.generateAuthToken()
        res.status(201).send({ createdUser, token })
    } catch (error) {
        res.status(400).send({ error: error.message })
    }
})

//User upload profile pic End-Point.
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
router.post('/users/pp', auth, upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send({ error: 'No image selected' })
    }
    const imgbuffer = req.file.buffer
    const output = await sharp(imgbuffer).png().resize(200, 200).toBuffer()
    req.user.profilepic = output
    await req.user.save()
    res.set('Content-Type', 'image/png')
    res.send(req.user.profilepic)
}, (error, req, res, next) => {
    res.status(400).send({ error: error.message })
})

//User Login End-Point
router.post('/users/login', async (req, res) => {
    var user;
    try {
        if (req.query.type === 'admin') {
            user = await Admin.findByCredentials(req.body.userName, req.body.password)
        } else {
            if (!req.body.email || !req.body.password) {
                return res.status(400).send({ error: 'Email & Password are required' })
            }
            user = await User.findByCredentials(req.body.email, req.body.password)
        }
        const token = await user.generateAuthToken()
        res.send({ user, token })
    } catch (error) {
        res.status(404).send({ error: error.message })
    }
})

//User logout End-Point.
router.post('/users/logout', auth, async (req, res) => {
    try {
        let tokenIndex = req.user.tokens.indexOf(req.token)
        req.user.tokens.splice(tokenIndex, 1)
        await req.user.save()
        res.send({ message: 'Logged out successfuly. Auth token is now expired' })
    } catch (error) {
        res.status(500).send({ error: error.message })
    }
})

//User Logout form all devices End-Point.
router.post('/users/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = []
        await req.user.save()
        res.send({ message: 'Logged out successfuly. All auth tokens are now expired' })
    } catch (error) {
        res.status(500).send({ error: error.message })
    }
})

//Read User Profile End-Point.
router.get('/users/profile', auth, (req, res) => {
    try {
        res.send(req.user)
    } catch (error) {
        res.status(400).send(error.message)
    }
})

//Read multiple users End-Point.
router.get('/users/all', async (req, res) => {
    var sortBy = req.query.sortBy
    try {
        var sort = {};
        if (sortBy && sortBy.includes('createdAt:')) {
            var sortOrder = sortBy.split(':')[1]
            sort.createdAt = (sortOrder === 'asc') ? 1 : -1
        }
        if (sortBy.includes('age:')) {
            console.log(sortBy);
            sort.age = (sortOrder === 'asc') ? 1 : -1
        }
        const users = await User.find({}, [], {
            sort,
            limit: parseInt(req.query.limit),
            skip: parseInt(req.query.skip)
        })
        res.send(users)
    } catch (error) {
        res.status(500).send({ error: error.message })
        console.log(error);
    }
})

//Reading user profile pic.
router.get('/users/pp', auth, async (req, res) => {
    try {
        if (!req.user.profilepic || req.user.profilepic === null) {
            throw new Error('No profilepic found')
        }
        res.set('Content-Type', 'image/png')
        res.send(req.user.profilepic)
    } catch (error) {
        res.status(404).send({ error: error.message })
    }
})

//Update user End-Point.
router.patch('/users/update', auth, async (req, res) => {
    let allowedUpdates = ['userName', 'age', 'email', 'password', 'phone']
    let userUpdates = Object.keys(req.body)
    try {
        if (userUpdates.length === 0) {
            return res.status(400).send({ error: 'No update(s) are provided' })
        }
        let isAllowedUpdate = userUpdates.every((update) => allowedUpdates.includes(update))
        if (isAllowedUpdate === false) {
            throw new Error('one or more fields are not existed to update')
        } else if (req.body.email) {
            await User.checkEmailValidity(req.body.email)
        }
        userUpdates.forEach((update) => {
            req.user[update] = req.body[update]
        })
        await req.user.save()
        res.send({ message: 'Updated successfuly', updatedUser: req.user })
    } catch (error) {
        res.status(406).send({ error: error.message })
    }
})

//Deleting user End-Point.
router.delete('/users', async (req, res) => {
    try {
        if (!req.query.id) {
            throw new Error('No id provided in qs')
        }
        var _id = req.query.id
        const user = await User.findByIdAndDelete(_id)
        if (!user) {
            return res.status(404).send({ message: 'No user found by this ID' })
        }
        await Task.deleteMany({ userID: user._id })
        await List.deleteMany({ userID: user._id })
        res.send({ message: 'deleted successfuly', deletedUser: user })
    } catch (error) {
        res.status(400).send({ error: error.message })
    }
})

//Deleting User profile pic.
router.delete('/users/pp', auth, async (req, res) => {
    if (req.user.profilepic === null || undefined) {
        return res.status(404).send({ error: 'No profilepic to be deleted' })
    }
    try {
        req.user.profilepic = null
        await req.user.save()
        res.send({ message: 'Profile Pic has been successfuly deleted' })
    } catch (error) {
        res.status(500).send({ error: error.message })
    }
})

module.exports = router;