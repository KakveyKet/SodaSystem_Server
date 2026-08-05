import jwt from "jsonwebtoken";

import User from "../models/User.js";

/*
|--------------------------------------------------------------------------
| Extract bearer token
|--------------------------------------------------------------------------
*/

const getBearerToken = (
  req,
) => {
  const authorization =
    req.headers.authorization;

  if (
    !authorization ||
    !authorization.startsWith(
      "Bearer ",
    )
  ) {
    return null;
  }

  return authorization
    .slice(7)
    .trim();
};

/*
|--------------------------------------------------------------------------
| Protect route
|--------------------------------------------------------------------------
*/

const protect =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const token =
        getBearerToken(req);

      if (!token) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Authentication token is required",
          });
      }

      const jwtSecret =
        process.env.JWT_SECRET;

      if (!jwtSecret) {
        return res
          .status(500)
          .json({
            success: false,
            message:
              "JWT_SECRET is missing from the server environment",
          });
      }

      const decoded =
        jwt.verify(
          token,
          jwtSecret,
        );

      const userId =
        decoded.id ||
        decoded.userId ||
        decoded._id;

      const user =
        await User.findById(
          userId,
        ).select(
          "_id name username email role status lastLoginAt createdAt updatedAt",
        );

      if (!user) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Account no longer exists",
          });
      }

      if (
        user.status ===
        false
      ) {
        return res
          .status(403)
          .json({
            success: false,
            message:
              "This account is inactive",
          });
      }

      req.user =
        user;

      return next();
    } catch (error) {
      console.error(
        "Authentication error:",
        error,
      );

      if (
        error.name ===
        "TokenExpiredError"
      ) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Authentication token has expired",
          });
      }

      return res
        .status(401)
        .json({
          success: false,
          message:
            "Invalid authentication token",
        });
    }
  };

/*
|--------------------------------------------------------------------------
| Strict role authorization
|--------------------------------------------------------------------------
|
| Only the listed roles are allowed.
|
| Admin does not automatically inherit customer-only endpoints unless
| "admin" is explicitly included.
|
*/

const authorizeRoles =
  (...allowedRoles) =>
  (
    req,
    res,
    next,
  ) => {
    const currentRole =
      String(
        req.user?.role ||
        "",
      )
        .trim()
        .toLowerCase();

    if (
      !currentRole ||
      !allowedRoles.includes(
        currentRole,
      )
    ) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            "You do not have permission to access this resource",
        });
    }

    return next();
  };

export {
  protect,
  authorizeRoles,
  authorizeRoles as authorize,
};