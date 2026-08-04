import mongoose from "mongoose";

import Customer, {
  normalizePercentageItems,
} from "../models/Customer.js";

import User from "../models/User.js";

const MAX_PAGE_LIMIT = 500;

/*
|--------------------------------------------------------------------------
| Error helpers
|--------------------------------------------------------------------------
*/

const createHttpError = (
  message,
  statusCode = 400,
) => {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  return error;
};

const handleControllerError = (
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
    const validationMessage =
      Object.values(
        error.errors || {},
      )[0]?.message;

    return res
      .status(400)
      .json({
        success: false,
        message:
          validationMessage ||
          "Customer validation failed",
      });
  }

  if (
    error.name ===
    "CastError"
  ) {
    return res
      .status(400)
      .json({
        success: false,
        message:
          "Invalid customer ID",
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
        "Username is already being used",

      email:
        error.keyValue?.email ===
        null
          ? "The old MongoDB email index must be repaired before blank emails can be used"
          : "Email is already being used",

      userId:
        "This login account is already linked to another customer",
    };

    return res
      .status(409)
      .json({
        success: false,
        message:
          messages[
            duplicateField
          ] ||
          "Duplicate customer data",
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
| General helpers
|--------------------------------------------------------------------------
*/

const hasOwn = (
  object,
  property,
) => {
  return Object.prototype
    .hasOwnProperty.call(
      object,
      property,
    );
};

const escapeRegex = (
  value = "",
) => {
  return String(
    value,
  ).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
};

const parsePositiveInteger = (
  value,
  fallback,
) => {
  const parsed =
    Number.parseInt(
      value,
      10,
    );

  if (
    !Number.isInteger(
      parsed,
    ) ||
    parsed <= 0
  ) {
    return fallback;
  }

  return parsed;
};

const validateObjectId = (
  value,
  fieldName = "Customer ID",
) => {
  if (
    !value ||
    !mongoose.isValidObjectId(
      value,
    )
  ) {
    throw createHttpError(
      `${fieldName} is invalid`,
      400,
    );
  }

  return String(value);
};

const getActorName = (
  req,
) => {
  return String(
    req.user?.username ||
    req.user?.name ||
    req.user?.email ||
    "System",
  ).trim();
};

/*
|--------------------------------------------------------------------------
| Field normalization
|--------------------------------------------------------------------------
*/

const normalizeCustomerUsername = (
  value,
) => {
  const username =
    String(value ?? "")
      .replace(/\s+/g, " ")
      .trim();

  if (!username) {
    throw createHttpError(
      "Customer username is required",
      400,
    );
  }

  if (
    username.length > 100
  ) {
    throw createHttpError(
      "Customer username cannot exceed 100 characters",
      400,
    );
  }

  return username;
};

const normalizeLoginUsername = (
  value,
) => {
  return normalizeCustomerUsername(
    value,
  ).toLowerCase();
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

  /*
   * Blank email is valid.
   */
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
  required = false,
) => {
  const password =
    String(value ?? "");

  if (
    required &&
    !password
  ) {
    throw createHttpError(
      "Password is required to create customer login access",
      400,
    );
  }

  if (
    password &&
    password.length < 6
  ) {
    throw createHttpError(
      "Password must contain at least 6 characters",
      400,
    );
  }

  return password;
};

const normalizeText = (
  value,
  fieldName,
  maximumLength,
) => {
  const text =
    String(
      value ?? "",
    ).trim();

  if (
    text.length >
    maximumLength
  ) {
    throw createHttpError(
      `${fieldName} cannot exceed ${maximumLength} characters`,
      400,
    );
  }

  return text;
};

const normalizeBalance = (
  value,
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return 0;
  }

  const balance =
    Number(value);

  if (
    !Number.isFinite(
      balance,
    )
  ) {
    throw createHttpError(
      "Customer balance must be a valid number",
      400,
    );
  }

  if (balance < 0) {
    throw createHttpError(
      "Customer balance cannot be negative",
      400,
    );
  }

  return balance;
};

const normalizeAmount = (
  value,
) => {
  const amount =
    Number(value);

  if (
    !Number.isFinite(
      amount,
    ) ||
    amount <= 0
  ) {
    throw createHttpError(
      "Amount must be greater than zero",
      400,
    );
  }

  return amount;
};

const normalizeBoolean = (
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
| Identity checks
|--------------------------------------------------------------------------
*/

const ensureUserIdentityAvailable =
  async (
    username,
    email,
    excludedUserId = null,
  ) => {
    const conditions = [
      {
        username:
          username.toLowerCase(),
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
          "_id username email role",
        )
        .lean();

    if (existingUser) {
      throw createHttpError(
        "Username or email is already being used by another login account",
        409,
      );
    }
  };

const ensureCustomerIdentityAvailable =
  async (
    username,
    email,
    excludedCustomerId = null,
  ) => {
    const conditions = [
      {
        username: {
          $regex:
            new RegExp(
              `^${escapeRegex(
                username,
              )}$`,
              "i",
            ),
        },
      },
    ];

    if (email) {
      conditions.push({
        email: {
          $regex:
            new RegExp(
              `^${escapeRegex(
                email,
              )}$`,
              "i",
            ),
        },
      });
    }

    const filter = {
      $or: conditions,
    };

    if (
      excludedCustomerId
    ) {
      filter._id = {
        $ne:
          excludedCustomerId,
      };
    }

    const existingCustomer =
      await Customer.findOne(
        filter,
      )
        .select(
          "_id username email",
        )
        .lean();

    if (
      existingCustomer
    ) {
      throw createHttpError(
        "Username or email is already being used by another customer",
        409,
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Population
|--------------------------------------------------------------------------
*/

const populateCustomer = (
  query,
) => {
  return query.populate({
    path: "userId",

    select:
      "name username email role status lastLoginAt createdAt updatedAt",
  });
};

/*
|--------------------------------------------------------------------------
| GET /api/customers
|--------------------------------------------------------------------------
*/

const getCustomers =
  async (
    req,
    res,
  ) => {
    try {
      const page =
        parsePositiveInteger(
          req.query.page,
          1,
        );

      const limit =
        Math.min(
          parsePositiveInteger(
            req.query.limit,
            10,
          ),
          MAX_PAGE_LIMIT,
        );

      const skip =
        (page - 1) *
        limit;

      const filter = {};

      const search =
        String(
          req.query.search ??
          "",
        ).trim();

      if (search) {
        const safeSearch =
          escapeRegex(search);

        filter.$or = [
          {
            username: {
              $regex:
                safeSearch,
              $options: "i",
            },
          },

          {
            email: {
              $regex:
                safeSearch,
              $options: "i",
            },
          },

          {
            branchId: {
              $regex:
                safeSearch,
              $options: "i",
            },
          },

          {
            phoneNumber: {
              $regex:
                safeSearch,
              $options: "i",
            },
          },

          {
            address: {
              $regex:
                safeSearch,
              $options: "i",
            },
          },
        ];
      }

      if (
        req.query.status !==
        undefined
      ) {
        filter.status =
          normalizeBoolean(
            req.query.status,
          );
      }

      const [
        customers,
        total,
      ] = await Promise.all([
        populateCustomer(
          Customer.find(
            filter,
          ),
        )
          .sort({
            createdAt: -1,
            _id: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        Customer.countDocuments(
          filter,
        ),
      ]);

      return res
        .status(200)
        .json({
          success: true,
          data: customers,

          pagination: {
            page,
            limit,
            total,

            pages:
              Math.max(
                Math.ceil(
                  total /
                  limit,
                ),
                1,
              ),
          },
        });
    } catch (error) {
      return handleControllerError(
        error,
        res,
        "Could not fetch customers",
      );
    }
  };

/*
|--------------------------------------------------------------------------
| GET /api/customers/:id
|--------------------------------------------------------------------------
*/

const getCustomerById =
  async (
    req,
    res,
  ) => {
    try {
      const customerId =
        validateObjectId(
          req.params.id,
        );

      const customer =
        await populateCustomer(
          Customer.findById(
            customerId,
          ),
        ).lean();

      if (!customer) {
        throw createHttpError(
          "Customer not found",
          404,
        );
      }

      return res
        .status(200)
        .json({
          success: true,
          data: customer,
        });
    } catch (error) {
      return handleControllerError(
        error,
        res,
        "Could not fetch customer",
      );
    }
  };

/*
|--------------------------------------------------------------------------
| GET /api/customers/me
|--------------------------------------------------------------------------
*/

const getMyCustomerProfile =
  async (
    req,
    res,
  ) => {
    try {
      if (
        req.user?.role !==
        "customer"
      ) {
        throw createHttpError(
          "Only customer accounts can access this profile",
          403,
        );
      }

      const customer =
        await Customer.findOne({
          userId:
            req.user._id,
        }).lean();

      if (!customer) {
        throw createHttpError(
          "Customer profile is not linked to this account",
          404,
        );
      }

      if (
        customer.status ===
        false
      ) {
        throw createHttpError(
          "Customer account is inactive",
          403,
        );
      }

      return res
        .status(200)
        .json({
          success: true,
          data: customer,
        });
    } catch (error) {
      return handleControllerError(
        error,
        res,
        "Could not fetch customer profile",
      );
    }
  };

/*
|--------------------------------------------------------------------------
| POST /api/customers
|--------------------------------------------------------------------------
*/

const createCustomer =
  async (
    req,
    res,
  ) => {
    let createdUser =
      null;

    try {
      const customerUsername =
        normalizeCustomerUsername(
          req.body.username,
        );

      const loginUsername =
        normalizeLoginUsername(
          customerUsername,
        );

      const email =
        normalizeEmail(
          req.body.email,
        );

      const password =
        normalizePassword(
          req.body.password,
          true,
        );

      const status =
        normalizeBoolean(
          req.body.status,
          true,
        );

      const balance =
        normalizeBalance(
          req.body.balance,
        );

      const percentages =
        hasOwn(
          req.body,
          "percentages",
        )
          ? normalizePercentageItems(
              req.body.percentages,
            )
          : [];

      await Promise.all([
        ensureUserIdentityAvailable(
          loginUsername,
          email,
        ),

        ensureCustomerIdentityAvailable(
          customerUsername,
          email,
        ),
      ]);

      const userPayload = {
        name:
          String(
            req.body.name ||
            customerUsername,
          ).trim(),

        username:
          loginUsername,

        password,

        role:
          "customer",

        status,
      };

      /*
       * Do not add email when blank.
       */
      if (email) {
        userPayload.email =
          email;
      }

      createdUser =
        await User.create(
          userPayload,
        );

      const actorName =
        getActorName(req);

      const customerPayload = {
        userId:
          createdUser._id,

        username:
          customerUsername,

        branchId:
          normalizeText(
            req.body.branchId,
            "Branch ID",
            100,
          ),

        phoneNumber:
          normalizeText(
            req.body.phoneNumber,
            "Phone number",
            50,
          ),

        address:
          normalizeText(
            req.body.address,
            "Address",
            500,
          ),

        description:
          normalizeText(
            req.body.description,
            "Description",
            1000,
          ),

        percentages,
        balance,
        status,

        createdBy:
          actorName,

        updatedBy:
          actorName,
      };

      /*
       * Do not add email when blank.
       */
      if (email) {
        customerPayload.email =
          email;
      }

      const customer =
        await Customer.create(
          customerPayload,
        );

      const populatedCustomer =
        await populateCustomer(
          Customer.findById(
            customer._id,
          ),
        ).lean();

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Customer and login account created successfully",

          data:
            populatedCustomer,
        });
    } catch (error) {
      if (
        createdUser?._id
      ) {
        await User.findByIdAndDelete(
          createdUser._id,
        ).catch(
          (
            rollbackError,
          ) => {
            console.error(
              "Could not roll back customer login account:",
              rollbackError,
            );
          },
        );
      }

      return handleControllerError(
        error,
        res,
        "Could not create customer",
      );
    }
  };

/*
|--------------------------------------------------------------------------
| PUT /api/customers/:id
|--------------------------------------------------------------------------
*/

const updateCustomer =
  async (
    req,
    res,
  ) => {
    let linkedUser =
      null;

    let createdUser =
      null;

    let previousUserState =
      null;

    try {
      const customerId =
        validateObjectId(
          req.params.id,
        );

      const customer =
        await Customer.findById(
          customerId,
        );

      if (!customer) {
        throw createHttpError(
          "Customer not found",
          404,
        );
      }

      if (customer.userId) {
        linkedUser =
          await User.findById(
            customer.userId,
          ).select(
            "+password",
          );
      }

      const customerUsername =
        hasOwn(
          req.body,
          "username",
        )
          ? normalizeCustomerUsername(
              req.body.username,
            )
          : customer.username;

      const loginUsername =
        normalizeLoginUsername(
          customerUsername,
        );

      const email =
        hasOwn(
          req.body,
          "email",
        )
          ? normalizeEmail(
              req.body.email,
            )
          : normalizeEmail(
              customer.email,
            );

      const password =
        hasOwn(
          req.body,
          "password",
        )
          ? normalizePassword(
              req.body.password,
              false,
            )
          : "";

      const status =
        hasOwn(
          req.body,
          "status",
        )
          ? normalizeBoolean(
              req.body.status,
            )
          : customer.status !==
            false;

      if (
        !linkedUser &&
        !password
      ) {
        throw createHttpError(
          "This customer has no login account. Enter a password to create login access.",
          400,
        );
      }

      await Promise.all([
        ensureUserIdentityAvailable(
          loginUsername,
          email,
          linkedUser?._id ||
          null,
        ),

        ensureCustomerIdentityAvailable(
          customerUsername,
          email,
          customerId,
        ),
      ]);

      customer.username =
        customerUsername;

      customer.email =
        email;

      customer.status =
        status;

      if (
        hasOwn(
          req.body,
          "branchId",
        )
      ) {
        customer.branchId =
          normalizeText(
            req.body.branchId,
            "Branch ID",
            100,
          );
      }

      if (
        hasOwn(
          req.body,
          "phoneNumber",
        )
      ) {
        customer.phoneNumber =
          normalizeText(
            req.body.phoneNumber,
            "Phone number",
            50,
          );
      }

      if (
        hasOwn(
          req.body,
          "address",
        )
      ) {
        customer.address =
          normalizeText(
            req.body.address,
            "Address",
            500,
          );
      }

      if (
        hasOwn(
          req.body,
          "description",
        )
      ) {
        customer.description =
          normalizeText(
            req.body.description,
            "Description",
            1000,
          );
      }

      if (
        hasOwn(
          req.body,
          "balance",
        )
      ) {
        customer.balance =
          normalizeBalance(
            req.body.balance,
          );
      }

      if (
        hasOwn(
          req.body,
          "percentages",
        )
      ) {
        customer.percentages =
          normalizePercentageItems(
            req.body.percentages,
          );
      }

      customer.updatedBy =
        getActorName(req);

      if (linkedUser) {
        previousUserState = {
          name:
            linkedUser.name,

          username:
            linkedUser.username,

          email:
            linkedUser.email,

          password:
            linkedUser.password,

          role:
            linkedUser.role,

          status:
            linkedUser.status,
        };

        linkedUser.name =
          String(
            req.body.name ??
            linkedUser.name ??
            customerUsername,
          ).trim();

        linkedUser.username =
          loginUsername;

        linkedUser.email =
          email;

        linkedUser.role =
          "customer";

        linkedUser.status =
          status;

        if (password) {
          linkedUser.password =
            password;
        }

        await linkedUser.save();
      } else {
        const userPayload = {
          name:
            String(
              req.body.name ||
              customerUsername,
            ).trim(),

          username:
            loginUsername,

          password,

          role:
            "customer",

          status,
        };

        if (email) {
          userPayload.email =
            email;
        }

        createdUser =
          await User.create(
            userPayload,
          );

        customer.userId =
          createdUser._id;
      }

      try {
        await customer.save({
          validateModifiedOnly:
            true,
        });
      } catch (
        customerSaveError
      ) {
        if (
          createdUser?._id
        ) {
          await User.findByIdAndDelete(
            createdUser._id,
          );
        }

        if (
          linkedUser?._id &&
          previousUserState
        ) {
          const restoreUpdate = {
            $set: {
              name:
                previousUserState.name,

              username:
                previousUserState.username,

              password:
                previousUserState.password,

              role:
                previousUserState.role,

              status:
                previousUserState.status,
            },
          };

          if (
            previousUserState.email
          ) {
            restoreUpdate.$set.email =
              previousUserState.email;
          } else {
            restoreUpdate.$unset = {
              email: "",
            };
          }

          await User.collection.updateOne(
            {
              _id:
                linkedUser._id,
            },
            restoreUpdate,
          );
        }

        throw customerSaveError;
      }

      const populatedCustomer =
        await populateCustomer(
          Customer.findById(
            customer._id,
          ),
        ).lean();

      return res
        .status(200)
        .json({
          success: true,

          message: linkedUser
            ? "Customer and login account updated successfully"
            : "Customer login account created and linked successfully",

          data:
            populatedCustomer,
        });
    } catch (error) {
      return handleControllerError(
        error,
        res,
        "Could not update customer",
      );
    }
  };

/*
|--------------------------------------------------------------------------
| PATCH /api/customers/:id/balance
|--------------------------------------------------------------------------
*/

const updateCustomerBalance =
  async (
    req,
    res,
  ) => {
    try {
      const customerId =
        validateObjectId(
          req.params.id,
        );

      const customer =
        await Customer.findById(
          customerId,
        );

      if (!customer) {
        throw createHttpError(
          "Customer not found",
          404,
        );
      }

      const operation =
        String(
          req.body.operation ||
          "set",
        )
          .trim()
          .toLowerCase();

      const oldBalance =
        Number(
          customer.balance ||
          0,
        );

      let newBalance;

      if (
        operation === "set"
      ) {
        newBalance =
          normalizeBalance(
            req.body.balance,
          );
      } else if (
        operation ===
        "deposit"
      ) {
        newBalance =
          oldBalance +
          normalizeAmount(
            req.body.amount,
          );
      } else if (
        operation ===
        "withdraw"
      ) {
        const amount =
          normalizeAmount(
            req.body.amount,
          );

        if (
          amount >
          oldBalance
        ) {
          throw createHttpError(
            "Withdrawal amount cannot exceed the customer balance",
            400,
          );
        }

        newBalance =
          oldBalance -
          amount;
      } else {
        throw createHttpError(
          "Operation must be set, deposit, or withdraw",
          400,
        );
      }

      customer.balance =
        newBalance;

      customer.updatedBy =
        getActorName(req);

      await customer.save({
        validateModifiedOnly:
          true,
      });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Customer balance updated successfully",

          data: {
            customer,
            operation,
            oldBalance,
            newBalance,
          },
        });
    } catch (error) {
      return handleControllerError(
        error,
        res,
        "Could not update customer balance",
      );
    }
  };

/*
|--------------------------------------------------------------------------
| PATCH /api/customers/:id/status
|--------------------------------------------------------------------------
*/

const updateCustomerStatus =
  async (
    req,
    res,
  ) => {
    try {
      const customerId =
        validateObjectId(
          req.params.id,
        );

      const customer =
        await Customer.findById(
          customerId,
        );

      if (!customer) {
        throw createHttpError(
          "Customer not found",
          404,
        );
      }

      if (
        !hasOwn(
          req.body,
          "status",
        )
      ) {
        throw createHttpError(
          "Status is required",
          400,
        );
      }

      const status =
        normalizeBoolean(
          req.body.status,
        );

      customer.status =
        status;

      customer.updatedBy =
        getActorName(req);

      await customer.save({
        validateModifiedOnly:
          true,
      });

      if (customer.userId) {
        await User.findByIdAndUpdate(
          customer.userId,
          {
            $set: {
              status,
              role:
                "customer",
            },
          },
          {
            runValidators:
              true,
          },
        );
      }

      return res
        .status(200)
        .json({
          success: true,

          message: status
            ? "Customer activated successfully"
            : "Customer deactivated successfully",

          data:
            customer,
        });
    } catch (error) {
      return handleControllerError(
        error,
        res,
        "Could not update customer status",
      );
    }
  };

/*
|--------------------------------------------------------------------------
| DELETE /api/customers/:id
|--------------------------------------------------------------------------
*/

const deleteCustomer =
  async (
    req,
    res,
  ) => {
    try {
      const customerId =
        validateObjectId(
          req.params.id,
        );

      const customer =
        await Customer.findById(
          customerId,
        );

      if (!customer) {
        throw createHttpError(
          "Customer not found",
          404,
        );
      }

      const linkedUserId =
        customer.userId;

      const deletedCustomer = {
        id:
          customer._id.toString(),

        username:
          customer.username,

        email:
          customer.email ||
          null,

        balance:
          customer.balance,

        linkedUserId:
          linkedUserId
            ? linkedUserId.toString()
            : null,
      };

      await customer.deleteOne();

      if (linkedUserId) {
        await User.deleteOne({
          _id:
            linkedUserId,

          role:
            "customer",
        });
      }

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Customer and linked login account deleted successfully",

          data:
            deletedCustomer,
        });
    } catch (error) {
      return handleControllerError(
        error,
        res,
        "Could not delete customer",
      );
    }
  };

export {
  getCustomers,
  getCustomers as getAllCustomers,
  getCustomerById,
  getMyCustomerProfile,
  createCustomer,
  updateCustomer,
  updateCustomerBalance,
  updateCustomerStatus,
  deleteCustomer,
};