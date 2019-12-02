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

const replySchema = new Schema({ 
    replyText: {
        type: String,
        trim: true,
        required: true,
        maxlength: 100,
        validate: (value) => {
            if (validator.isInt(value) || validator.isDecimal(value)) {
                throw new Error('Reply must be string')
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
    }
}, {
    timestamps: true
});

const commentSchema = new Schema({
    comment: {
        type: String,
        required: true,
        maxlength: 100,
        validate: (value) => {
            if (validator.isInt(value) || validator.isDecimal(value)) {
                throw new Error('Comment must be string')
            }
        }
    },
    blogID:{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Blog'
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
    replies: [replySchema],
    likes: [likeSchema]
}, {
    timestamps: true
})

commentSchema.methods.getLikeStatusByUser = async function (userID) {
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

const Comment = mongoose.model('Comment', commentSchema)

module.exports = Comment;