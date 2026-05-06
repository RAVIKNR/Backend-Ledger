const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken');
const blackListModel = require('../models/blacklist.model')
const blackListedToken = require('../controllers/auth.controller')


async function Accountmiddleware(req, res, next) {

   const token = req.cookies.token

    if(!token){
        return res.status(401).json({message: 'Unauthorized Token not found'})
    }

    const isBlacklisted = await blackListModel.findOne({
        token
    })
    
    if(isBlacklisted){
        return res.status(400).json({
            message:"Unauthorized access, token is invalid"
        })
    }
    
    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const user = await userModel.findById(decoded.id);
      
        req.user = user;
       return next();

    }
    catch(err){
        return res.status(401).json({message: 'Unauthorized Invalid token'})
    }
    
}

async function systemUserMiddleware(req,res,next){

    const token = req.cookies.token

    if(!token){
       return res.status(400).json({
            message:"token not present"
        })
    }

       const isBlacklisted = await blackListModel.findOne({ token })

    if (isBlacklisted) {
        return res.status(401).json({
            message: "Unauthorized access, token is invalid"
        })
    }

   try{
    const decoded = jwt.verify(token,process.env.JWT_SECRET)
         
    const user = await userModel.findById(decoded.id).select("+systemUser")
    if(!user.systemUser){
        return res.status(400).json({
            message:"user did not found"
        })
    }
    req.user = user
    next()
   }
   catch(error){
    return res.status(400).json({
        message:"Invalid token"
    })
   }
}



module.exports = {Accountmiddleware , systemUserMiddleware};