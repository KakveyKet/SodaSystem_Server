import mongoose from 'mongoose';

import User from '../models/User.js';

const ALLOWED_ROLES = ['user', 'admin'];

const escapeRegex = (value = '') => {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
};

const normalizeEmail = (email = '') => {
  return String(email)
    .trim()
    .toLowerCase();
};

const getCurrentUserId = (req) => {
  return (
    req.user?.id ||
    req.user?._id ||
    null
  );
};

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

const getSafeUser = async (userId) => {
  return User.findById(userId).select(
    'name email role createdAt updatedAt'
  );
};

/*
|--------------------------------------------------------------------------
| Current logged-in user
|--------------------------------------------------------------------------
| GET /api/users/me
*/
export const getMe = async (
  req,
  res,
  next
) => {
  try {
    const userId = getCurrentUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication is required'
      });
    }

    const user = await getSafeUser(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| Get all users
|--------------------------------------------------------------------------
| GET /api/users
| Admin only
*/
export const getUsers = async (
  req,
  res,
  next
) => {
  try {
    const page = Math.max(
      Number.parseInt(req.query.page, 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number.parseInt(req.query.limit, 10) || 10,
        1
      ),
      100
    );

    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.search?.trim()) {
      const searchValue = escapeRegex(
        req.query.search.trim()
      );

      filter.$or = [
        {
          name: {
            $regex: searchValue,
            $options: 'i'
          }
        },
        {
          email: {
            $regex: searchValue,
            $options: 'i'
          }
        }
      ];
    }

    if (
      req.query.role &&
      ALLOWED_ROLES.includes(req.query.role)
    ) {
      filter.role = req.query.role;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select(
          'name email role createdAt updatedAt'
        )
        .sort({
          createdAt: -1
        })
        .skip(skip)
        .limit(limit),

      User.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| Get one user
|--------------------------------------------------------------------------
| GET /api/users/:id
| Admin only
*/
export const getUserById = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const user = await getSafeUser(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| Create user
|--------------------------------------------------------------------------
| POST /api/users
| Admin only
*/
export const createUser = async (
  req,
  res,
  next
) => {
  try {
    const {
      name,
      email,
      password,
      role = 'user'
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    if (!email?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 6 characters'
      });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message:
          'Role must be either user or admin'
      });
    }

    const normalizedEmail =
      normalizeEmail(email);

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          'Email is already registered'
      });
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role
    });

    const safeUser = await getSafeUser(
      user._id
    );

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: safeUser
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          'Email is already registered'
      });
    }

    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| Update user
|--------------------------------------------------------------------------
| PUT /api/users/:id
| Admin only
*/
export const updateUser = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    /*
      Password is select:false in the model, so use
      select('+password') when updating it.
    */
    const user = await User.findById(id)
      .select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const {
      name,
      email,
      password,
      role
    } = req.body;

    if (
      name !== undefined &&
      !String(name).trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Name cannot be empty'
      });
    }

    if (
      email !== undefined &&
      !String(email).trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Email cannot be empty'
      });
    }

    if (
      password &&
      String(password).length < 6
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 6 characters'
      });
    }

    if (
      role !== undefined &&
      !ALLOWED_ROLES.includes(role)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Role must be either user or admin'
      });
    }

    const currentUserId =
      getCurrentUserId(req);

    /*
      Prevent the logged-in administrator from
      removing their own administrator role.
    */
    if (
      currentUserId &&
      String(currentUserId) === String(user._id) &&
      role !== undefined &&
      role !== 'admin'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'You cannot remove your own administrator role'
      });
    }

    /*
      Protect the final administrator account.
    */
    if (
      user.role === 'admin' &&
      role === 'user'
    ) {
      const adminCount =
        await User.countDocuments({
          role: 'admin'
        });

      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message:
            'The last administrator cannot be changed to user'
        });
      }
    }

    if (email !== undefined) {
      const normalizedEmail =
        normalizeEmail(email);

      const duplicateUser =
        await User.findOne({
          email: normalizedEmail,
          _id: {
            $ne: user._id
          }
        });

      if (duplicateUser) {
        return res.status(409).json({
          success: false,
          message:
            'Email is already registered'
        });
      }

      user.email = normalizedEmail;
    }

    if (name !== undefined) {
      user.name = String(name).trim();
    }

    if (role !== undefined) {
      user.role = role;
    }

    /*
      Leave the password unchanged when the
      frontend sends an empty password.
    */
    if (password) {
      user.password = password;
    }

    /*
      The pre-save hook hashes a changed password.
    */
    await user.save();

    const safeUser = await getSafeUser(
      user._id
    );

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: safeUser
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          'Email is already registered'
      });
    }

    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| Delete user
|--------------------------------------------------------------------------
| DELETE /api/users/:id
| Admin only
*/
export const deleteUser = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentUserId =
      getCurrentUserId(req);

    if (
      currentUserId &&
      String(currentUserId) ===
        String(user._id)
    ) {
      return res.status(400).json({
        success: false,
        message:
          'You cannot delete your own account'
      });
    }

    if (user.role === 'admin') {
      const adminCount =
        await User.countDocuments({
          role: 'admin'
        });

      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message:
            'The last administrator cannot be deleted'
        });
      }
    }

    await user.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
};