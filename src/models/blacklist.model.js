const mongoose = require('mongoose')

const tokenBlacklistSchema = new mongoose.Schema({
    token:{
        type: String,
        required:[true,"Token is required"],
        unique:[true,"Token already exist"]
    }
},{timeStamp:true})

tokenBlacklistSchema.index({created:1},{
    expireAfterSeconds: 60*60*24*3
})

const tokenBlackListModel = mongoose.model("tokenBlacklist",tokenBlacklistSchema)

module.exports = tokenBlackListModel