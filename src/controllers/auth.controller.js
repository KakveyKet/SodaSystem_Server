import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000
};

const SUPER_ADMIN = {
  name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
  email: (process.env.SUPER_ADMIN_EMAIL || 'admin@example.com').toLowerCase().trim(),
  password: process.env.SUPER_ADMIN_PASSWORD || 'Admin@12345',
  role: 'admin'
};

const normalizeEmail = (email = '') => {
  return email.toLowerCase().trim();
};

const formatUser = (user, extra = {}) => {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role || 'user',
    ...extra
  };
};

const createToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing in .env file');
  }

  return generateToken(userId);
};

const sendAuthResponse = (res, statusCode, token, user) => {
  res.cookie('token', token, cookieOptions);

  return res.status(statusCode).json({
    token,
    user
  });
};

const isSuperAdminLogin = (email, password) => {
  return normalizeEmail(email) === SUPER_ADMIN.email && password === SUPER_ADMIN.password;
};

const compareUserPassword = async (user, plainPassword) => {
  if (!user.password) {
    throw new Error('Password field is missing. Make sure User model has password field and .select("+password") works.');
  }

  if (typeof user.comparePassword === 'function') {
    return await user.comparePassword(plainPassword);
  }

  return await bcrypt.compare(plainPassword, user.password);
};

const getOrCreateSuperAdmin = async () => {
  let superAdmin = await User.findOne({
    email: SUPER_ADMIN.email
  }).select('+password');

  if (!superAdmin) {
    superAdmin = await User.create({
      name: SUPER_ADMIN.name,
      email: SUPER_ADMIN.email,
      password: SUPER_ADMIN.password,
      role: SUPER_ADMIN.role
    });

    console.log('✅ Super Admin created in MongoDB:', SUPER_ADMIN.email);

    return superAdmin;
  }

  let shouldSave = false;

  if (superAdmin.name !== SUPER_ADMIN.name) {
    superAdmin.name = SUPER_ADMIN.name;
    shouldSave = true;
  }

  if (superAdmin.role !== SUPER_ADMIN.role) {
    superAdmin.role = SUPER_ADMIN.role;
    shouldSave = true;
  }

  const passwordIsCorrect = await compareUserPassword(superAdmin, SUPER_ADMIN.password);

  if (!passwordIsCorrect) {
    superAdmin.password = SUPER_ADMIN.password;
    shouldSave = true;
  }

  if (shouldSave) {
    await superAdmin.save();
    console.log('✅ Super Admin updated in MongoDB:', SUPER_ADMIN.email);
  }

  return superAdmin;
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required'
      });
    }

    if (normalizedEmail === SUPER_ADMIN.email) {
      return res.status(403).json({
        message: 'This email is reserved for Super Admin'
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'Email already registered'
      });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password
    });

    const token = createToken(user._id);

    return sendAuthResponse(res, 201, token, formatUser(user));
  } catch (error) {
    console.error('REGISTER ERROR:', error);
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    if (isSuperAdminLogin(normalizedEmail, password)) {
      const superAdmin = await getOrCreateSuperAdmin();
      const token = createToken(superAdmin._id);

      return sendAuthResponse(
        res,
        200,
        token,
        formatUser(superAdmin, {
          isSuperAdmin: true
        })
      );
    }

    const user = await User.findOne({
      email: normalizedEmail
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    const passwordIsCorrect = await compareUserPassword(user, password);

    if (!passwordIsCorrect) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    const token = createToken(user._id);

    return sendAuthResponse(res, 200, token, formatUser(user));
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    next(error);
  }
};

export const logout = (req, res) => {
  res.clearCookie('token');

  return res.json({
    message: 'Logged out successfully'
  });
};