const { json } = require('express')
const accountModel = require('../models/account.model')
const transactionModel = require('../models/transaction.model')
const mongoose = require('mongoose')
const ledgerModel = require('../models/ledger.model')
const emailServices = require('../services/email.services')
const UserModel = require('../models/user.model')

// - Create a new transaction
// * THE 10-STEP TRANSFER FLOW:
// * 1. Validate request
// * 2. Validate idempotency key
// * 3. Check account status
// * 4. Derive sender balance from ledger
// * 5. Create transaction (PENDING)
// * 6. Create DEBIT ledger entry
// * 7. Create CREDIT ledger entry
// * 8. Mark transaction COMPLETED
// * 9. Commit MongoDB session
// * 10. Send email notification



async function transactionController(req, res) {

    // * 1. Validate request

    const { fromAccount, toAccount, amount, idempotencyKey } = req.body

    if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
        return res.status(400).json("Please fill the credentials")
    }
    

    const fromUserAccount = await accountModel.findOne({
        _id: fromAccount
    }).populate("user", "email name");


    const toUserAccount = await accountModel.findOne({
        _id: toAccount
    }).populate("user", "email name");

    if (!fromUserAccount || !toUserAccount) {
        return res.status(400).json("invalid fromAccount or toAccounr")
    }

    // * 2. Validate idempotency key

    const existingTransaction = await transactionModel.findOne({
        idempotencyKey: idempotencyKey
    })

    if (existingTransaction) {
        if (existingTransaction.status == "pending") {
            return res.status(400).json({
                message: "please wait untill the previous transaction being completed"
            })
        }
        if (existingTransaction.status == "completed") {
            return res.status(500).json({
                message: "your transaction is already completed"
            })
        }
        if (existingTransaction.status == "failed") {
            return res.status(500).json({
                message: "your transaction was failed please retry , again"
            })
        }
        if (existingTransaction.status == "reversed") {
            return res.status(500).json({
                message: "your transaction is being reversed , your debited money will come within a moment"
            })
        }
    }

    // * 3. Check account status

    if (fromUserAccount.status !== "active" || toUserAccount.status !== "active") {
        return res.status(400).json("both accounts must be active")
    }

    // * 4. Derive sender balance from ledger

    const balance = await fromUserAccount.getBalance();

    if (balance < amount) {
        return res.status(401).json({
            message: "Entered amount is more than your current balance"
        })
    }

    // * 5. Create transaction (PENDING)
    let Transaction
    try {

        const session = await mongoose.startSession()
        session.startTransaction()

        Transaction = (await transactionModel.create([{
            toAccount,
            fromAccount,
            idempotencyKey,
            amount,
            status: "pending"
        }], { session }))[0]

        await (() => {
            return new Promise((resolve) => setTimeout(resolve, 15 * 1000));
        })()

        // * 6. Create DEBIT ledger entry

        const debitLedgerEntry = await ledgerModel.create([{
            transaction: Transaction._id,
            account: fromAccount,
            type: "debit",
            amount
        }], { session })

        // * 7. Create CREDIT ledger entry
        await (() => {
            return new Promise((resolve) => setTimeout(resolve, 15 * 1000));
        })()

        const creditLedgerEntry = await ledgerModel.create([{
            transaction: Transaction._id,
            account: toAccount,
            type: "credit",
            amount
        }], { session })

        // * 8. Mark transaction COMPLETED

        await transactionModel.findOneAndUpdate(
            { _id: Transaction._id },
            { status: "completed" },
            { session }
        )

        await session.commitTransaction()
        session.endSession()

    }
    catch (error) {

        return res.status(400).json({
            message: "Transaction is Pending due to some issue, please retry after sometime", error,
        })
    }
    res.status(200).json({
        message: "Transaction successful",
        Transaction
    })


    await emailServices.debittransactionMail({
        email:fromUserAccount.user.email,
        amount,
        type: "debit", // or CREDIT
        balance,
        toAccount
    });
    await emailServices.creditTransactionMail({
        email:toUserAccount.user.email,
        amount,
        type: "credit", // or CREDIT
        balance,
        fromAccount
    });


}

  

    async function createInitialFunding(req, res) {

        const { toAccount, amount, idempotencyKey } = req.body

        if (!amount || !toAccount || !idempotencyKey) {
            return res.status(400).json({
                message: "Please fill the credentials first"
            })
        }

        const toUserAccount = await accountModel.findOne({
            _id: toAccount
        }).populate("user","email name")

        if (!toUserAccount) {
            return res.status(400).json({
                message: "Account did not exist"
            }).populate("user","email name")
        }

        const fromUserAccount = await accountModel.findOne({
            user: req.user._id
        })

        
        if (!fromUserAccount) {
            return res.status(403).json({
                message: "You are not allowed to do this kind of stuff"
            })
        }


        const session = await mongoose.startSession()
        session.startTransaction()

        const transaction = new transactionModel({
            fromAccount: fromUserAccount._id,
            toAccount,
            status: "pending",
            amount,
            idempotencyKey: idempotencyKey
        })

        const debitLedgerEntry = await ledgerModel.create([{
            account: fromUserAccount._id,
            amount,
            transaction: transaction._id,
            type: "debit"

        }], { session })
        const creditLedgerEntry = await ledgerModel.create([{
            account: toAccount,
            amount,
            transaction: transaction._id,
            type: "credit"

        }], { session })

        transaction.status = "completed"

        await transaction.save({ session })
        await session.commitTransaction()
        session.endSession()

   res.status(200).json({
            message: "Payment successful",
            transaction
        })

        await emailServices.initiatefunding(toUserAccount.user.name, amount,toAccount, toUserAccount.user.email, transaction._id)

    }



    module.exports = { transactionController, createInitialFunding }