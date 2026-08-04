import jwt from "jsonwebtoken";

import User from "../models/User.js";

const readBearerToken = (req) => {
  const authorization = req.headers.authorization || "";

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice(7).trim();
};

const protect = async (req, res, next) => {
  try {
    const token = readBearerToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "JWT_SECRET is not configured",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id || decoded._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "The account for this token no longer exists",
      });
    }

    if (user.status === false) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Authentication token has expired",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    console.error("Authentication middleware error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not authenticate the request",
    });
  }
};

/*
 * Strict role rules:
 *
 * authorizeRoles("admin")    => admin only
 * authorizeRoles("user")     => admin and user
 * authorizeRoles("customer") => admin and customer
 *
 * A customer is NOT automatically treated as a normal user.
 */
const roleCanAccess = (currentRole, allowedRoles) => {
  if (currentRole === "admin") {
    return true;
  }

  return allowedRoles.includes(currentRole);
};

const authorizeRoles =
  (...allowedRoles) =>
  (req, res, next) => {
    const currentRole = req.user?.role;

    if (!currentRole) {
      return res.status(403).json({
        success: false,
        message: "Account role is missing",
      });
    }

    if (!roleCanAccess(currentRole, allowedRoles)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
      });
    }

    return next();
  };

const authMiddleware = protect;
const adminOnly = authorizeRoles("admin");

export {
  protect,
  authMiddleware,
  authorizeRoles,
  roleCanAccess,
  adminOnly,
};

export default protect;
