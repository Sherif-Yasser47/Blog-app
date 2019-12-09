const mongoose = require('mongoose');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

var Schema = mongoose.Schema;
const userSchema = new Schema({
    userName: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 20
    },
    age: {
        type: Number,
        default: null,
        validate: (value) => {
            if (value <= 0) {
                throw new Error('Age must be positive')
            }
        }
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        validate: (value) => {
            if (!validator.isEmail(value)) {
                throw new Error('E-mail is not valid')
            }
        }
    },
    password: {
        type: String,
        required: true,
        trim: true,
        minlength: 8
    },
    phone: {
        type: String,
        default: null
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }],
    profilepic: {
        type: Buffer,
        default: null
    },
    blocked: {
        type: Boolean,
        default: false
    }   
},{
    timestamps: true
})

userSchema.virtual('blogs', {
    ref: 'Blog',
    localField: '_id',
    foreignField: 'userID'
})

userSchema.virtual('comments', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'userID'
})

userSchema.methods.toJSON = function () {
    const user = this.toObject()
    delete user.password
    delete user.tokens
    delete user.profilepic

    return user;
}

//Checking email validity.
userSchema.statics.checkEmailValidity = async function (email) {
    const existingUser = await this.findOne({ email })
    if (existingUser) {
        throw new Error('Email is already registered')
    }
    return;
}

//Generating Authentication tokens for users.
userSchema.methods.generateAuthToken = async function () {
    const token = jwt.sign({_id: this._id.toString(), exp: Math.floor(Date.now() / 1000) + (86400 * 90)}, process.env.JWT_SECRET_KEY)
    this.tokens.push({ token })
    await this.save()
    return token
}

//Finding User by Credentials.
userSchema.statics.findByCredentials = async function (email, password) {
    const user = await this.findOne({ email })
    if (!user) {
        throw new Error('Unable to login')
    }
    let isMatch = await bcrypt.compare(password, user.password)
    if (isMatch === false) {
        throw new Error('Unable to login')
    }
    return user;
}

userSchema.methods.checkBlockedUser = function () {
    if (this.blocked === true) {
        throw new Error('user is blocked')
    }
    return;
}

//Hashing user password before saving.
userSchema.pre('save', async function (next) {
    const user = this
    if (user.isModified('password') || user.isNew) {
        user.password = await bcrypt.hash(user.password, 9)
    }
    next()
})

const User = mongoose.model('User', userSchema)

module.exports = User;