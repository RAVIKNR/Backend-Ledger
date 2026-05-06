const accountModel = require('../models/account.model');
const emailServices = require('../services/email.services');


async function createAccount(req, res) {

    const user = req.user;

    const existingAccount = await accountModel.findOne({
        user
    });

    if(existingAccount){
        return res.status(400).json({message: 'Account already exists for this user'})
    }

    const account = await accountModel.create({
     user
    })
   res.status(201).json({message: 'Account created successfully', account: account})

  await emailServices.accountCreated(user.email, user.name);

}
async function getAccounts(req,res){
    const accounts = await accountModel.find({
      user:req.user._id,
    })

    return res.status(200).json({
        message:"accounts you have",
        accounts
    })

}
    async function getBalance(req,res){

      const{accountId}=req.params;

        const account = await accountModel.findOne({
          _id:accountId,
          user:req.user._id
        })

        const balance = await account.getBalance()

        return res.status(200).json({
            message:"Your balance is",
            balance
        })

    }

module.exports = {createAccount, getAccounts,getBalance};