const express = require('express');
const router = express.Router();
const  AccountController  = require('../controllers/account.controller');
const Authmiddleware = require('../middleware/account.middleware');


router.post('/create', Authmiddleware.Accountmiddleware, AccountController.createAccount);

router.get('/getaccounts',Authmiddleware.Accountmiddleware,AccountController.getAccounts)

router.get('/getbalance/:accountId',Authmiddleware.Accountmiddleware,AccountController.getBalance)

module.exports = router;