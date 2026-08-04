import 'dotenv/config';
import mongoose from 'mongoose';

import User from '../models/User.js';

const ADMIN_USER = {
  name: 'Kakvey',
  username: 'kakvey',
  email: 'kakvey@gmail.com',
  password: '123123',
  role: 'admin'
};

const connectDatabase = async () => {
  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error(
      'MONGO_URI is missing from the .env file'
    );
  }

  await mongoose.connect(mongoUri);

  console.log('MongoDB connected');
};

const seedAdmin = async () => {
  try {
    await connectDatabase();

    let user = await User.findOne({
      $or: [
        {
          username:
            ADMIN_USER.username
        },
        {
          email:
            ADMIN_USER.email
        }
      ]
    }).select('+password');

    if (user) {
      user.name =
        ADMIN_USER.name;

      user.username =
        ADMIN_USER.username;

      user.email =
        ADMIN_USER.email;

      /*
       * Assign the plain password here.
       * The User model pre-save hook will hash it.
       */
      user.password =
        ADMIN_USER.password;

      user.role =
        ADMIN_USER.role;

      /*
       * Support the status field when it exists
       * in the current User schema.
       */
      if (User.schema.path('status')) {
        user.status = true;
      }

      await user.save();

      console.log(
        'Existing user updated as admin'
      );
    } else {
      const userData = {
        name:
          ADMIN_USER.name,

        username:
          ADMIN_USER.username,

        email:
          ADMIN_USER.email,

        password:
          ADMIN_USER.password,

        role:
          ADMIN_USER.role
      };

      if (User.schema.path('status')) {
        userData.status = true;
      }

      user = await User.create(
        userData
      );

      console.log(
        'New admin user created'
      );
    }

    console.log('----------------------------');
    console.log(`Name: ${user.name}`);
    console.log(
      `Username: ${user.username}`
    );
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log('----------------------------');
  } catch (error) {
    console.error(
      'Admin seed failed:',
      error.message
    );

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();

    console.log(
      'MongoDB disconnected'
    );
  }
};

seedAdmin();