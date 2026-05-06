const express = require('express');
require('dotenv').config();
const app = express();

const cookieparser = require('cookie-parser') 
app.use(cookieparser());
app.use(express.json());


//Routes Importing
const authRoutes = require('./routes/auth.routes');
const accountRoutes = require('./routes/account.routes')
const TransactionRoutes =  require('./routes/transaction.routes')


//Routes Using
app.use("/api/auth", authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transaction',TransactionRoutes)

module.exports = app;