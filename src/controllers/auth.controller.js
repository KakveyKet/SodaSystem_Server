import jwt from "jsonwebtoken";

import Customer from "../models/Customer.js";
import User, { USER_ROLES } from "../models/User.js";

const createHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const sendError = (error, res, fallbackMessage) => {
  console.error(`${fallbackMessage}:`, error);

  if (error.statusCode) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message:
        Object.values(error.errors || {})[0]?.message ||
        "Account validation failed",
    });
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || error.keyValue || {})[0];

    return res.status(409).json({
      success: false,
      message:
        field === "email"
          ? "Email is already being used"
          : "Username is already being used",
    });
  }

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
};

const normalizeUsername = (value) => {
  const username = String(value ?? "").trim().toLowerCase();

  if (!username) {
    throw createHttpError("Username is required", 400);
  }

  return username;
};

const normalizeEmail = (value) => {
  const email = String(value ?? "").trim().toLowerCase();

  if (!email) {
    return "";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createHttpError("Please provide a valid email address", 400);
  }

  return email;
};

const normalizePassword = (value) => {
  const password = String(value ?? "");

  if (!password) {
    throw createHttpError("Password is required", 400);
  }

  if (password.length < 6) {
    throw createHttpError(
      "Password must contain at least 6 characters",
      400,
    );
  }

  return password;
};

const normalizeStatus = (value, fallback = true) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if ([true, "true", 1, "1"].includes(value)) {
    return true;
  }

  if ([false, "false", 0, "0"].includes(value)) {
    return false;
  }

  throw createHttpError("Status must be true or false", 400);
};

const signToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw createHttpError("JWT_SECRET is not configured", 500);
  }

  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    },
  );
};

const sanitizeUser = (user) => ({
  id: user._id.toString(),
  name: user.name || "",
  username: user.username,
  email: user.email || null,
  role: user.role,
  status: user.status !== false,
  lastLoginAt: user.lastLoginAt || null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const ensureIdentityAvailable = async (username, email) => {
  const conditions = [{ username }];

  if (email) {
    conditions.push({ email });
  }

  const existing = await User.findOne({ $or: conditions }).lean();

  if (existing) {
    throw createHttpError(
      "Username or email is already being used",
      409,
    );
  }
};

const login = async (req, res) => {
  try {
    const identifier = String(
      req.body.identifier || req.body.username || req.body.email || "",
    )
      .trim()
      .toLowerCase();

    const password = String(req.body.password || "");

    if (!identifier) {
      throw createHttpError("Username or email is required", 400);
    }

    if (!password) {
      throw createHttpError("Password is required", 400);
    }

    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    }).select("+password");

    if (!user) {
      throw createHttpError("Invalid username, email, or password", 401);
    }

    const passwordMatches = await user.comparePassword(password);

    if (!passwordMatches) {
      throw createHttpError("Invalid username, email, or password", 401);
    }

    if (user.status === false) {
      throw createHttpError("Your account is inactive", 403);
    }

    let customer = null;

    if (user.role === "customer") {
      customer = await Customer.findOne({ userId: user._id }).lean();

      if (!customer) {
        throw createHttpError(
          "Customer profile is not linked to this login account",
          403,
        );
      }

      if (customer.status === false) {
        throw createHttpError("Your customer account is inactive", 403);
      }
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: {
        token,
        user: sanitizeUser(user),
        customer,
      },
    });
  } catch (error) {
    return sendError(error, res, "Could not log in");
  }
};

const registerUser = async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const email = normalizeEmail(req.body.email);
    const password = normalizePassword(req.body.password);

    await ensureIdentityAvailable(username, email);

    const user = await User.create({
      name: String(req.body.name || "").trim(),
      username,
      email: email || undefined,
      password,
      role: "user",
      status: true,
    });

    const token = signToken(user);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      data: {
        token,
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    return sendError(error, res, "Could not create account");
  }
};

const registerAccountByAdmin = async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username);
    const email = normalizeEmail(req.body.email);
    const password = normalizePassword(req.body.password);
    const role = String(req.body.role || "user").trim().toLowerCase();
    const status = normalizeStatus(req.body.status, true);

    if (!USER_ROLES.includes(role)) {
      throw createHttpError("Role must be admin, user, or customer", 400);
    }

    if (role === "customer") {
      throw createHttpError(
        "Create customer accounts from the Customer page",
        400,
      );
    }

    await ensureIdentityAvailable(username, email);

    const user = await User.create({
      name: String(req.body.name || "").trim(),
      username,
      email: email || undefined,
      password,
      role,
      status,
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: { user: sanitizeUser(user) },
    });
  } catch (error) {
    return sendError(error, res, "Could not create account");
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      throw createHttpError("Account not found", 404);
    }

    const customer =
      user.role === "customer"
        ? await Customer.findOne({ userId: user._id }).lean()
        : null;

    return res.status(200).json({
      success: true,
      data: {
        user: sanitizeUser(user),
        customer,
      },
    });
  } catch (error) {
    return sendError(error, res, "Could not fetch account");
  }
};

export {
  login,
  login as loginUser,
  registerUser,
  registerUser as register,
  registerAccountByAdmin,
  registerAccountByAdmin as adminRegister,
  getMe,
  getMe as getProfile,
};
