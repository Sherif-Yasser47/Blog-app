const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

var Schema = mongoose.Schema;
const adminSchema = new Schema({
    userName: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 20
    },    
    password: {
        type: String,
        required: true,
        trim: true,
        minlength: 8
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
    }   
},{
    timestamps: true
})

adminSchema.methods.toJSON = function () {
    const user = this.toObject()
    delete user.password
    delete user.tokens
    delete user.profilepic

    return user;
}

//Generating Authentication tokens for users.
adminSchema.methods.generateAuthToken = async function () {
    const token = jwt.sign({_id: this._id.toString(), exp: Math.floor(Date.now() / 1000) + (86400 * 90)}, process.env.JWT_SECRET_KEY)
    this.tokens.push({ token })
    await this.save()
    return token
}

//Finding User by Credentials.
adminSchema.statics.findByCredentials = async function (userName, password) {
    const adminUser = await this.findOne({ userName })
    if (!adminUser) {
        throw new Error('Unable to login')
    }
    let isMatch = await bcrypt.compare(password, adminUser.password)
    if (isMatch === false) {
        throw new Error('Unable to login')
    }
    return adminUser;
}

//Hashing user password before saving.
adminSchema.pre('save', async function (next) {
    const user = this
    if (user.isModified('password') || user.isNew) {
        user.password = await bcrypt.hash(user.password, 9)
    }
    next()
})

const Admin = mongoose.model('Admin', adminSchema)

module.exports = Admin;