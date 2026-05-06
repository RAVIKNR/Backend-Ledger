const userModel = require('../models/user.model')
const jwt = require('jsonwebtoken')
const emailServices = require('../services/email.services')
const tokenBlacklistModel = require('../models/blacklist.model')

async function registerUser(req, res) {

    const { name, email, password } = req.body;

    const existingUser = await userModel.findOne({
        email
    })
    

    if (existingUser) {
        return res.status(422).json("User already exists")
    }
    const user = await userModel.create({
        name,email,password
    })

  const token = jwt.sign({id:user._id},process.env.JWT_SECRET,{expiresIn:"3d"})
  
  res.cookie("token",token)


    res.status(201).json("user registered successfully")

    await emailServices.RegistrationEmail(user.email, user.name)

}

async function loginUser(req,res) {
    
    const {email , password} = req.body

    const user = await userModel.findOne({
        email
    }).select("+password")

    if(!user){
        return res.status(404).json({
            message:"User not found"
        })
    }

    
   const isPasswordValid = await user.comparePassword(password)


   if(!isPasswordValid){
    return res.status(401).json({
        message:"Password is invalid"
    })
   }

   const token = jwt.sign({id:user._id},process.env.JWT_SECRET)

   res.cookie("token",token)

  res.status(200).json({
    message:"user successfully login"
  })

  await emailServices.loginDetected(user.email, user.name)


}

async function logoutUser(req,res) {
    const token = req.cookies.token

    if(!token){
        return res.status(200).json({
            message:"User Successfully Logged Out"
        })
    }

    await tokenBlacklistModel.create({
        token:token
    })

    res.clearCookie("token")

    res.status(200).json({
        message: "User logged out successfully"
    })
}

module.exports = {registerUser , loginUser,logoutUser}