const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

console.log('Starting test...');
console.log('Node Version:', process.version);
console.log('Mongoose Version:', require('mongoose/package.json').version);

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Connected!');
        process.exit(0);
    })
    .catch(err => {
        console.error('Connection Error:', err);
        process.exit(1);
    });

console.log('Connect called...');
// Keep alive
setTimeout(() => {
    console.log('Timeout reached (10s)');
    process.exit(1);
}, 10000);
