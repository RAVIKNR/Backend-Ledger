const express = require('express')
const router = express.Router()
const Transaction = require('../controllers/transaction.controller')
const authMiddleware = require('../middleware/account.middleware')


router.post("/transaction",authMiddleware.Accountmiddleware,Transaction.transactionController)
router.post("/initial-funding",authMiddleware.systemUserMiddleware,Transaction.createInitialFunding)

module.exports = router