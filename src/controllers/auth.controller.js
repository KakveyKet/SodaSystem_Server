import jwt from "jsonwebtoken";

import User from "../models/User.js";

/*
|--------------------------------------------------------------------------
| Error helper
|--------------------------------------------------------------------------
*/

const createHttpError = (
  message,
  statusCode = 400,
) => {
  const error = new Error(
    message,
  );

  error.statusCode =
    statusCode;

  return error;
};

const handleAuthError = (
  error,
  res,
  fallbackMessage,
) => {
  console.error(
    `${fallbackMessage}:`,
    error,
  );

  if (error.statusCode) {
    return res
      .status(
        error.statusCode,
      )
      .json({
        success: false,
        message:
          error.message,
      });
  }

  if (
    error.name ===
    "ValidationError"
  ) {
    const message =
      Object.values(
        error.errors || {},
      )[0]?.message ||
      "Validation failed";

    return res
      .status(400)
      .json({
        success: false,
        message,
      });
  }

  if (
    error.code === 11000
  ) {
    const duplicateField =
      Object.keys(
        error.keyPattern ||
        error.keyValue ||
        {},
      )[0];

    const messages = {
      username:
        "Username is already registered",

      email:
        "Email is already registered",
    };

    return res
      .status(409)
      .json({
        success: false,

        message:
          messages[
            duplicateField
          ] ||
          "Account already exists",
      });
  }

  return res
    .status(500)
    .json({
      success: false,
      message:
        fallbackMessage,
    });
};

/*
|--------------------------------------------------------------------------
| Normalization helpers
|--------------------------------------------------------------------------
*/

const normalizeName = (
  value,
  fallback = "",
) => {
  return String(
    value ??
    fallback ??
    "",
  )
    .replace(/\s+/g, " ")
    .trim();
};

const normalizeUsername = (
  value,
) => {
  const username =
    String(value ?? "")
      .trim()
      .toLowerCase();

  if (!username) {
    throw createHttpError(
      "Username is required",
      400,
    );
  }

  if (
    username.length > 100
  ) {
    throw createHttpError(
      "Username cannot exceed 100 characters",
      400,
    );
  }

  return username;
};

const normalizeEmail = (
  value,
) => {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  const email =
    String(value)
      .trim()
      .toLowerCase();

  if (!email) {
    return undefined;
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email,
    )
  ) {
    throw createHttpError(
      "Please provide a valid email address",
      400,
    );
  }

  return email;
};

const normalizePassword = (
  value,
) => {
  const password =
    String(value ?? "");

  if (!password) {
    throw createHttpError(
      "Password is required",
      400,
    );
  }

  if (
    password.length < 6
  ) {
    throw createHttpError(
      "Password must contain at least 6 characters",
      400,
    );
  }

  return password;
};

const normalizeStatus = (
  value,
  fallback = true,
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  if (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1"
  ) {
    return true;
  }

  if (
    value === false ||
    value === "false" ||
    value === 0 ||
    value === "0"
  ) {
    return false;
  }

  throw createHttpError(
    "Status must be true or false",
    400,
  );
};

/*
|--------------------------------------------------------------------------
| JWT
|--------------------------------------------------------------------------
*/

const createToken = (
  user,
) => {
  const jwtSecret =
    process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw createHttpError(
      "JWT_SECRET is missing from the server environment",
      500,
    );
  }

  return jwt.sign(
    {
      id:
        user._id.toString(),

      role:
        user.role,

      username:
        user.username,
    },
    jwtSecret,
    {
      expiresIn:
        process.env
          .JWT_EXPIRES_IN ||
        "7d",
    },
  );
};

/*
|--------------------------------------------------------------------------
| Safe user response
|--------------------------------------------------------------------------
*/

const serializeUser = (
  user,
) => {
  return {
    id:
      user._id,

    _id:
      user._id,

    name:
      user.name ||
      "",

    username:
      user.username,

    email:
      user.email ||
      null,

    role:
      user.role,

    status:
      user.status !==
      false,

    lastLoginAt:
      user.lastLoginAt ||
      null,

    createdAt:
      user.createdAt,

    updatedAt:
      user.updatedAt,
  };
};

/*
|--------------------------------------------------------------------------
| Check account identity
|--------------------------------------------------------------------------
*/

const ensureIdentityAvailable =
  async (
    username,
    email,
    excludedUserId = null,
  ) => {
    const conditions = [
      {
        username,
      },
    ];

    if (email) {
      conditions.push({
        email,
      });
    }

    const filter = {
      $or: conditions,
    };

    if (excludedUserId) {
      filter._id = {
        $ne:
          excludedUserId,
      };
    }

    const existingUser =
      await User.findOne(
        filter,
      )
        .select(
          "_id username email",
        )
        .lean();

    if (!existingUser) {
      return;
    }

    if (
      existingUser.username ===
      username
    ) {
      throw createHttpError(
        "Username is already registered",
        409,
      );
    }

    throw createHttpError(
      "Email is already registered",
      409,
    );
  };

/*
|--------------------------------------------------------------------------
| POST /api/auth/admin-register
|--------------------------------------------------------------------------
|
| This endpoint always creates an administrator.
|
| Even when the frontend sends:
|
| role: "user"
|
| it is ignored.
|
*/

const registerAdmin =
  async (
    req,
    res,
  ) => {
    try {
      const environmentEmail =
        normalizeEmail(
          process.env
            .SUPER_ADMIN_EMAIL,
        );

      const email =
        normalizeEmail(
          req.body.email ??
          environmentEmail,
        );

      const defaultUsername =
        email
          ? email.split(
              "@",
            )[0]
          : "superadmin";

      const username =
        normalizeUsername(
          req.body.username ??
          defaultUsername,
        );

      const name =
        normalizeName(
          req.body.name,
          process.env
            .SUPER_ADMIN_NAME ||
          "Super Admin",
        );

      const password =
        normalizePassword(
          req.body.password ??
          process.env
            .SUPER_ADMIN_PASSWORD,
        );

      await ensureIdentityAvailable(
        username,
        email,
      );

      const administratorData = {
        name:
          name ||
          "Super Admin",

        username,

        password,

        /*
        |--------------------------------------------------------------------------
        | Important fix
        |--------------------------------------------------------------------------
        |
        | The administrator role is forced here.
        |
        | Do not use:
        |
        | role: req.body.role
        |
        | Do not omit role, because the User model defaults to "user".
        |
        */

        role:
          "admin",

        status:
          true,
      };

      if (email) {
        administratorData.email =
          email;
      }

      const administrator =
        await User.create(
          administratorData,
        );

      const token =
        createToken(
          administrator,
        );

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Administrator created successfully",

          token,

          user:
            serializeUser(
              administrator,
            ),

          data: {
            token,

            user:
              serializeUser(
                administrator,
              ),
          },
        });
    } catch (error) {
      return handleAuthError(
        error,
        res,
        "Could not create administrator",
      );
    }
  };

/*
|--------------------------------------------------------------------------
| POST /api/auth/register
|--------------------------------------------------------------------------
|
| This endpoint is for an authenticated administrator to create another
| account.
|
*/

const registerAccountByAdmin =
  async (
    req,
    res,
  ) => {
    try {
      const name =
        normalizeName(
          req.body.name,
        );

      const email =
        normalizeEmail(
          req.body.email,
        );

      const defaultUsername =
        email
          ? email.split(
              "@",
            )[0]
          : "";

      const username =
        normalizeUsername(
          req.body.username ??
          defaultUsername,
        );

      const password =
        normalizePassword(
          req.body.password,
        );

      const requestedRole =
        String(
          req.body.role ||
          "user",
        )
          .trim()
          .toLowerCase();

      const allowedRoles = [
        "admin",
        "user",
        "customer",
      ];

      if (
        !allowedRoles.includes(
          requestedRole,
        )
      ) {
        throw createHttpError(
          "Role must be admin, user, or customer",
          400,
        );
      }

      const status =
        normalizeStatus(
          req.body.status,
          true,
        );

      await ensureIdentityAvailable(
        username,
        email,
      );

      const userData = {
        name,
        username,
        password,
        role:
          requestedRole,
        status,
      };

      if (email) {
        userData.email =
          email;
      }

      const user =
        await User.create(
          userData,
        );

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Account created successfully",

          data:
            serializeUser(
              user,
            ),
        });
    } catch (error) {
      return handleAuthError(
        error,
        res,
        "Could not create account",
      );
    }
  };

/*
|--------------------------------------------------------------------------
| POST /api/auth/login
|--------------------------------------------------------------------------
|
| Login supports username or email.
|
*/

const login =
  async (
    req,
    res,
  ) => {
    try {
      const identifier =
        String(
          req.body.identifier ||
          req.body.username ||
          req.body.email ||
          "",
        )
          .trim()
          .toLowerCase();

      const password =
        String(
          req.body.password ||
          "",
        );

      if (!identifier) {
        throw createHttpError(
          "Username or email is required",
          400,
        );
      }

      if (!password) {
        throw createHttpError(
          "Password is required",
          400,
        );
      }

      const user =
        await User.findOne({
          $or: [
            {
              username:
                identifier,
            },
            {
              email:
                identifier,
            },
          ],
        }).select(
          "+password",
        );

      if (!user) {
        throw createHttpError(
          "Invalid username, email, or password",
          401,
        );
      }

      if (
        user.status ===
        false
      ) {
        throw createHttpError(
          "This account is inactive",
          403,
        );
      }

      const passwordMatches =
        await user.comparePassword(
          password,
        );

      if (
        !passwordMatches
      ) {
        throw createHttpError(
          "Invalid username, email, or password",
          401,
        );
      }

      user.lastLoginAt =
        new Date();

      await user.save({
        validateModifiedOnly:
          true,
      });

      const token =
        createToken(user);

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Login successful",

          token,

          user:
            serializeUser(
              user,
            ),

          data: {
            token,

            user:
              serializeUser(
                user,
              ),
          },
        });
    } catch (error) {
      return handleAuthError(
        error,
        res,
        "Could not log in",
      );
    }
  };

/*
|--------------------------------------------------------------------------
| GET /api/auth/me
|--------------------------------------------------------------------------
*/

const getMe =
  async (
    req,
    res,
  ) => {
    try {
      const userId =
        req.user?._id ||
        req.user?.id;

      if (!userId) {
        throw createHttpError(
          "Authentication is required",
          401,
        );
      }

      const user =
        await User.findById(
          userId,
        );

      if (!user) {
        throw createHttpError(
          "Account not found",
          404,
        );
      }

      if (
        user.status ===
        false
      ) {
        throw createHttpError(
          "This account is inactive",
          403,
        );
      }

      return res
        .status(200)
        .json({
          success: true,

          data:
            serializeUser(
              user,
            ),

          user:
            serializeUser(
              user,
            ),
        });
    } catch (error) {
      return handleAuthError(
        error,
        res,
        "Could not fetch account",
      );
    }
  };

/*
|--------------------------------------------------------------------------
| POST /api/auth/logout
|--------------------------------------------------------------------------
|
| JWT authentication is stateless. The frontend removes the token.
|
*/

const logout =
  async (
    req,
    res,
  ) => {
    return res
      .status(200)
      .json({
        success: true,
        message:
          "Logout successful",
      });
  };

export {
  registerAdmin,
  registerAdmin as createAdministrator,
  registerAccountByAdmin,
  login,
  getMe,
  logout,
};