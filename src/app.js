const express = require('express');
require('dotenv').config();
const helmet = require('helmet');
const morgan = require('morgan');
const app = express();

const cookieparser = require('cookie-parser');
const { notFound, errorHandler } = require('./middleware/error.middleware');
const { requestContext } = require('./middleware/observability.middleware');
const { createCorsMiddleware } = require('./middleware/cors.middleware');

app.use(cookieparser());
app.use(helmet());
morgan.token('safe-path', req => req.path);
app.use(morgan(':method :remote-addr :safe-path :status :res[content-length] - :response-time ms'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(requestContext);
app.use(createCorsMiddleware(process.env.FRONTEND_URL));

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const accountRoutes = require('./routes/account.routes')
const TransactionRoutes =  require('./routes/transaction.routes')
const fundingRoutes = require('./routes/funding.routes');
const reconciliationRoutes = require('./routes/reconciliation.routes');
const reversalRoutes = require('./routes/reversal.routes');
const adminRoutes = require('./routes/admin.routes');
const systemRoutes = require('./routes/system.routes');

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});
app.use(systemRoutes);

app.get("/", (req, res) => {
  res.json({ message: 'Backend API is running' });
});

app.use("/auth", authRoutes);
app.use("/api/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/api/users", userRoutes);
app.use("/accounts", accountRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/transfers', TransactionRoutes);
app.use('/admin/funding', fundingRoutes);
app.use('/api/admin/funding', fundingRoutes);
app.use('/funding', fundingRoutes.demoRouter);
app.use('/api/funding', fundingRoutes.demoRouter);
app.use('/admin/reconciliation', reconciliationRoutes);
app.use('/transfers', reversalRoutes);
app.use('/admin', adminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/transaction',TransactionRoutes)

app.use(notFound);
app.use(errorHandler);

module.exports = app;