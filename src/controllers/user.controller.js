import mongoose from "mongoose";

import User from "../models/User.js";

const MAX_PAGE_LIMIT = 100;

/*
|--------------------------------------------------------------------------
| Error helpers
|--------------------------------------------------------------------------
*/

const createHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;

  return error;
};

const handleControllerError = (error, res, fallbackMessage) => {
  console.error(`${fallbackMessage}:`, error);

  if (error.statusCode) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  if (error.name === "ValidationError") {
    const validationMessage = Object.values(error.errors || {})[0]?.message;

    return res.status(400).json({
      success: false,
      message: validationMessage || "User validation failed",
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID",
    });
  }

  if (error.code === 11000) {
    const duplicateField = Object.keys(
      error.keyPattern || error.keyValue || {},
    )[0];

    if (duplicateField === "username") {
      return res.status(409).json({
        success: false,
        message: "Username is already taken",
      });
    }

    if (duplicateField === "email") {
      return res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
    }

    return res.status(409).json({
      success: false,
      message: "A user with this information already exists",
    });
  }

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
};

/*
|--------------------------------------------------------------------------
| General helpers
|--------------------------------------------------------------------------
*/

const escapeRegex = (value = "") => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const parsePositiveInteger = (value, fallback) => {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
};

const parseBooleanValue = (value) => {
  if (value === true || value === "true") {
    return true;
  }

  if (value === false || value === "false") {
    return false;
  }

  return undefined;
};

const validateObjectId = (value, fieldName = "User ID") => {
  if (!value || !mongoose.isValidObjectId(value)) {
    throw createHttpError(`${fieldName} is invalid`, 400);
  }

  return String(value);
};

const normalizeName = (value) => {
  return String(value ?? "").trim();
};

const normalizeUsername = (value) => {
  return String(value ?? "")
    .trim()
    .toLowerCase();
};

const normalizeEmail = (value) => {
  return String(value ?? "")
    .trim()
    .toLowerCase();
};

const validateName = (value) => {
  const name = normalizeName(value);

  if (!name) {
    throw createHttpError("Name is required", 400);
  }

  return name;
};

const validateUsername = (value) => {
  const username = normalizeUsername(value);

  if (!username) {
    throw createHttpError("Username is required", 400);
  }

  if (username.length < 3) {
    throw createHttpError("Username must be at least 3 characters", 400);
  }

  if (username.length > 30) {
    throw createHttpError("Username cannot be longer than 30 characters", 400);
  }

  const usernamePattern = /^[a-z0-9._-]+$/;

  if (!usernamePattern.test(username)) {
    throw createHttpError(
      "Username can only contain letters, numbers, dots, underscores, and hyphens",
      400,
    );
  }

  return username;
};

const validateEmail = (value) => {
  const email = normalizeEmail(value);

  if (!email) {
    throw createHttpError("Email is required", 400);
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    throw createHttpError("Please provide a valid email address", 400);
  }

  return email;
};

const validatePassword = (value, required = false) => {
  const password = String(value ?? "");

  if (!password) {
    if (required) {
      throw createHttpError("Password is required", 400);
    }

    return null;
  }

  if (password.length < 6) {
    throw createHttpError("Password must be at least 6 characters", 400);
  }

  return password;
};

const validateRole = (value) => {
  const role = String(value ?? "user")
    .trim()
    .toLowerCase();

  if (!["user", "admin"].includes(role)) {
    throw createHttpError("Role must be user or admin", 400);
  }

  return role;
};

const getAuthenticatedUserId = (req) => {
  return String(req.user?._id || req.user?.id || req.user?.userId || "");
};

/*
|--------------------------------------------------------------------------
| Response formatter
|--------------------------------------------------------------------------
*/

const formatUser = (user) => {
  if (!user) {
    return null;
  }

  const source = typeof user.toObject === "function" ? user.toObject() : user;

  const userId = source._id || source.id;

  return {
    id: userId ? String(userId) : null,

    _id: userId ? String(userId) : null,

    name: source.name || "",

    username: source.username || "",

    email: source.email || "",

    role: source.role || "user",

    status: source.status !== false,

    createdAt: source.createdAt || null,

    updatedAt: source.updatedAt || null,
  };
};

/*
|--------------------------------------------------------------------------
| Duplicate validation
|--------------------------------------------------------------------------
*/

const ensureUniqueUserFields = async ({
  username,
  email,
  excludeUserId = null,
}) => {
  const conditions = [];

  if (username) {
    conditions.push({
      username,
    });
  }

  if (email) {
    conditions.push({
      email,
    });
  }

  if (!conditions.length) {
    return;
  }

  const filter = {
    $or: conditions,
  };

  if (excludeUserId) {
    filter._id = {
      $ne: excludeUserId,
    };
  }

  const existingUser = await User.findOne(filter)
    .select("_id username email")
    .lean();

  if (!existingUser) {
    return;
  }

  if (username && existingUser.username === username) {
    throw createHttpError("Username is already taken", 409);
  }

  if (email && existingUser.email === email) {
    throw createHttpError("Email is already registered", 409);
  }

  throw createHttpError("A user with this information already exists", 409);
};

/*
|--------------------------------------------------------------------------
| GET /api/users
|--------------------------------------------------------------------------
*/

const getUsers = async (req, res) => {
  try {
    const page = parsePositiveInteger(req.query.page, 1);

    const limit = Math.min(
      parsePositiveInteger(req.query.limit, 10),
      MAX_PAGE_LIMIT,
    );

    const skip = (page - 1) * limit;

    const filter = {};

    const search = String(req.query.search ?? "").trim();

    if (search) {
      const safeSearch = escapeRegex(search);

      filter.$or = [
        {
          username: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          name: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          email: {
            $regex: safeSearch,
            $options: "i",
          },
        },
      ];
    }

    if (req.query.role) {
      const role = validateRole(req.query.role);

      filter.role = role;
    }

    const status = parseBooleanValue(req.query.status);

    if (status !== undefined) {
      filter.status = status;
    }

    const [userDocuments, total] = await Promise.all([
      User.find(filter)
        .select("_id name username email role status createdAt updatedAt")
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      User.countDocuments(filter),
    ]);

    const users = userDocuments.map(formatUser);

    const pages = Math.max(Math.ceil(total / limit), 1);

    return res.status(200).json({
      success: true,

      data: users,

      pagination: {
        page,
        limit,
        total,
        pages,
      },
    });
  } catch (error) {
    return handleControllerError(error, res, "Could not fetch users");
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/users/me
|--------------------------------------------------------------------------
*/

const getCurrentUser = async (req, res) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(req);

    const userId = validateObjectId(
      authenticatedUserId,
      "Authenticated user ID",
    );

    const user = await User.findById(userId)
      .select("_id name username email role status createdAt updatedAt")
      .lean();

    if (!user) {
      throw createHttpError("User not found", 404);
    }

    return res.status(200).json({
      success: true,
      data: formatUser(user),
    });
  } catch (error) {
    return handleControllerError(error, res, "Could not fetch user profile");
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/users/:id
|--------------------------------------------------------------------------
*/

const getUserById = async (req, res) => {
  try {
    const userId = validateObjectId(req.params.id);

    const user = await User.findById(userId)
      .select("_id name username email role status createdAt updatedAt")
      .lean();

    if (!user) {
      throw createHttpError("User not found", 404);
    }

    return res.status(200).json({
      success: true,
      data: formatUser(user),
    });
  } catch (error) {
    return handleControllerError(error, res, "Could not fetch user");
  }
};

/*
|--------------------------------------------------------------------------
| POST /api/users
|--------------------------------------------------------------------------
*/

const createUser = async (req, res) => {
  try {
    const name = validateName(req.body.name);

    const username = validateUsername(req.body.username);

    const email = validateEmail(req.body.email);

    const password = validatePassword(req.body.password, true);

    const role = validateRole(req.body.role);

    const parsedStatus = parseBooleanValue(req.body.status);

    await ensureUniqueUserFields({
      username,
      email,
    });

    const user = await User.create({
      name,
      username,
      email,
      password,
      role,

      status: parsedStatus !== undefined ? parsedStatus : true,
    });

    return res.status(201).json({
      success: true,

      message: "User created successfully",

      data: formatUser(user),
    });
  } catch (error) {
    return handleControllerError(error, res, "Could not create user");
  }
};

/*
|--------------------------------------------------------------------------
| PUT /api/users/:id
|--------------------------------------------------------------------------
*/

const updateUser = async (req, res) => {
  try {
    const userId = validateObjectId(req.params.id);

    const user = await User.findById(userId).select("+password");

    if (!user) {
      throw createHttpError("User not found", 404);
    }

    let updatedUsername = null;
    let updatedEmail = null;

    if (req.body.name !== undefined) {
      user.name = validateName(req.body.name);
    }

    if (req.body.username !== undefined) {
      updatedUsername = validateUsername(req.body.username);
    }

    if (req.body.email !== undefined) {
      updatedEmail = validateEmail(req.body.email);
    }

    await ensureUniqueUserFields({
      username: updatedUsername,
      email: updatedEmail,
      excludeUserId: user._id,
    });

    if (updatedUsername) {
      user.username = updatedUsername;
    }

    if (updatedEmail) {
      user.email = updatedEmail;
    }

    if (
      req.body.password !== undefined &&
      String(req.body.password).length > 0
    ) {
      user.password = validatePassword(req.body.password, false);
    }

    if (req.body.role !== undefined) {
      user.role = validateRole(req.body.role);
    }

    const parsedStatus = parseBooleanValue(req.body.status);

    if (parsedStatus !== undefined) {
      user.status = parsedStatus;
    }

    /*
     * save() is required so the User model pre-save
     * middleware hashes a newly supplied password.
     */
    await user.save();

    return res.status(200).json({
      success: true,

      message: "User updated successfully",

      data: formatUser(user),
    });
  } catch (error) {
    return handleControllerError(error, res, "Could not update user");
  }
};

/*
|--------------------------------------------------------------------------
| DELETE /api/users/:id
|--------------------------------------------------------------------------
*/

const deleteUser = async (req, res) => {
  try {
    const userId = validateObjectId(req.params.id);

    const authenticatedUserId = getAuthenticatedUserId(req);

    if (authenticatedUserId && String(authenticatedUserId) === String(userId)) {
      throw createHttpError("You cannot delete your own account", 400);
    }

    const user = await User.findById(userId);

    if (!user) {
      throw createHttpError("User not found", 404);
    }

    await user.deleteOne();

    return res.status(200).json({
      success: true,

      message: "User deleted successfully",

      data: {
        id: user._id.toString(),

        username: user.username,

        email: user.email,
      },
    });
  } catch (error) {
    return handleControllerError(error, res, "Could not delete user");
  }
};

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

export {
  getUsers,
  getCurrentUser,
  getCurrentUser as getMe,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
