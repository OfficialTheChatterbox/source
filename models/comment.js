const mongoose = require('mongoose');
const commentSchema = new mongoose.Schema({
    mainBox: {
        type: String,
        required: true
    },
    user: {
        type: String,
        required: true
    },
    userPFP: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true,
        trim: true,
        max: 200
    },
    date: {
        type: Number,
        default: () => new Date().getTime()
    }
});
module.exports = mongoose.model('comment', commentSchema);