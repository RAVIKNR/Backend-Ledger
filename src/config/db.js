const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function connectDB() {
    await prisma.$connect();
    console.log('Connected to PostgreSQL');
}

async function disconnectDB() {
    await prisma.$disconnect();
}

module.exports = connectDB;
module.exports.prisma = prisma;
module.exports.disconnectDB = disconnectDB;