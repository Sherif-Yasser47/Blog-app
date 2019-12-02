const mongoose = require('mongoose');
const validator = require('validator');

const Schema = mongoose.Schema;

const likeSchema = new Schema({
    likeStatus: {
        type: Boolean,
        required: true,
        default: false
    },
    userID: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    userName: {
        type: String,
        required: true,
        ref: 'User'
    }
}, {
    timestamps: true
})

const blogSchema = new Schema({
    content: {
        type: String,
        required: true,
        maxlength: 100,
        validate: (value) => {
            if (validator.isInt(value) || validator.isDecimal(value)) {
                throw new Error('Content must be string')
            }
        }
    },
    userID: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    userName: {
        type: String,
        required: true,
        ref: 'User'
    },
    img: {
        type: Buffer
    },
    likes: [likeSchema]
}, {
    timestamps: true
})

blogSchema.virtual('comments', {
    ref: 'Comment',
    localField: '_id',
    foreignField: 'blogID'
})

blogSchema.methods.getLikeStatusByUser = async function (userID) {
    var userIndex;
    if (this.likes.length === 0) {
        userIndex = -1
    } else {
        userIndex = this.likes.findIndex((like) => {
            return like.userID.toString() === userID.toString()
        })
    }
    return userIndex;
}

const Blog = mongoose.model('Blog', blogSchema)

module.exports = Blog;