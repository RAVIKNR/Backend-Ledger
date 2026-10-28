const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = require('./src/app');
const connectDB = require('./src/config/db');

const port = Number(process.env.PORT) || 3000;

async function startServer() {
    await connectDB();
    app.listen(port, () => {
        console.log(`LedgerGuard API listening on port ${port}`);
    });
}

startServer().catch((error) => {
    console.error('Unable to start LedgerGuard API:', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
        code: typeof error?.code === 'string' && /^[A-Z0-9_]{1,40}$/i.test(error.code)
            ? error.code
            : undefined
    });
    process.exitCode = 1;
});
