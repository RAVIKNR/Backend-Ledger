const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true,"Name is required"],

    },

    systemUser:{
       type:Boolean,
       default:false,
       immutable:true,
       select:false
    },

    email: {
        type: String,
        required: [true,"Email is required"],
        unique: [true,"Email must be unique"],
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please use a valid email address.']

    },

    password: {
        type: String,
        required: [true,"Password is required"],
        minlength: [6,"Password must be at least 6 characters long"],
        select: false
    }

},{
    timestamps: true
})


userSchema.pre("save", async function(){   //run before saving the user document to the database
    if(!this.isModified("password")){
    return
    }
const hash = await bcrypt.hash(this.password, 10);
this.password = hash;
})


userSchema.methods.comparePassword = async function(password){    
    return await bcrypt.compare(password, this.password);
}



const UserModel = mongoose.model('User', userSchema);

module.exports = UserModel;