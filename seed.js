const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const { ROLES } = require('./config/permissions');
const connectDB = require('./config/db');

dotenv.config();

connectDB();

const importData = async () => {
  try {
    await User.deleteMany();

    const superAdmin = {
      name: 'Super Admin',
      email: 'admin@bagsclub.com',
      password: 'password123',
      role: ROLES.SUPER_ADMIN,
    };

    const associate = {
        name: 'John Doe',
        email: 'john@bagsclub.com',
        password: 'password123',
        role: ROLES.ASSOCIATE_MEMBER
    };

    await User.create(superAdmin);
    await User.create(associate);

    console.log('Data Imported!');
    process.exit();
  } catch (error) {
    console.error(`${error}`);
    process.exit(1);
  }
};

importData();
