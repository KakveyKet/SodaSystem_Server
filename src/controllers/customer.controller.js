import mongoose from "mongoose";

import Customer from "../models/Customer.js";
import CustomerTransaction from "../models/CustomerTransaction.js";
import User from "../models/User.js";

const MAX_PAGE_LIMIT = 500;

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
        "Customer validation failed",
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid customer ID",
    });
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || error.keyValue || {})[0];

    const messages = {
      username: "Username is already being used",
      email: "Email is already being used",
      userId: "This login account is already linked to another customer",
    };

    return res.status(409).json({
      success: false,
      message: messages[field] || "Duplicate customer data",
    });
  }

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
};

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object, key);

const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const normalizeBoolean = (value, fallback = true) => {
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

const validateObjectId = (value) => {
  if (!value || !mongoose.isValidObjectId(value)) {
    throw createHttpError("Customer ID is invalid", 400);
  }

  return String(value);
};

const getActorName = (req) =>
  String(
    req.user?.username ||
      req.user?.name ||
      req.user?.email ||
      "System",
  ).trim();

const getActorUserId = (req) => {
  const value = req.user?._id || req.user?.id || null;

  return value && mongoose.isValidObjectId(value)
    ? value
    : null;
};

const normalizeCustomerUsername = (value) => {
  const username = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (!username) {
    throw createHttpError("Customer username is required", 400);
  }

  if (username.length > 100) {
    throw createHttpError(
      "Customer username cannot exceed 100 characters",
      400,
    );
  }

  return username;
};

const normalizeLoginUsername = (value) =>
  normalizeCustomerUsername(value).toLowerCase();

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

const normalizePassword = (value, required = false) => {
  const password = String(value ?? "");

  if (required && !password) {
    throw createHttpError(
      "Password is required to create customer login access",
      400,
    );
  }

  if (password && password.length < 6) {
    throw createHttpError(
      "Password must contain at least 6 characters",
      400,
    );
  }

  return password;
};

const normalizeText = (value, fieldName, maxLength) => {
  const text = String(value ?? "").trim();

  if (text.length > maxLength) {
    throw createHttpError(
      `${fieldName} cannot exceed ${maxLength} characters`,
      400,
    );
  }

  return text;
};

const normalizeBalance = (value) => {
  const balance = Number(value);

  if (!Number.isFinite(balance)) {
    throw createHttpError("Customer balance must be a valid number", 400);
  }

  if (balance < 0) {
    throw createHttpError("Customer balance cannot be negative", 400);
  }

  return balance;
};

const normalizeAmount = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw createHttpError("Amount must be greater than zero", 400);
  }

  return amount;
};

const normalizePercentages = (value) => {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw createHttpError("Percentages must be an array", 400);
  }

  return value.map((item) => {
    const number = Number(item);

    if (!Number.isFinite(number) || number < 0) {
      throw createHttpError(
        "Percentages must contain valid non-negative numbers",
        400,
      );
    }

    return number;
  });
};

const populateCustomer = (query) =>
  query.populate({
    path: "userId",
    select: "name username email role status lastLoginAt createdAt updatedAt",
  });

const ensureUserIdentityAvailable = async (
  username,
  email,
  excludedUserId = null,
) => {
  const conditions = [{ username }];

  if (email) {
    conditions.push({ email });
  }

  const filter = { $or: conditions };

  if (excludedUserId) {
    filter._id = { $ne: excludedUserId };
  }

  const existing = await User.findOne(filter).lean();

  if (existing) {
    throw createHttpError(
      "Username or email is already being used by another login account",
      409,
    );
  }
};

const ensureCustomerIdentityAvailable = async (
  username,
  email,
  excludedCustomerId = null,
) => {
  const conditions = [
    {
      username: {
        $regex: new RegExp(`^${escapeRegex(username)}$`, "i"),
      },
    },
  ];

  if (email) {
    conditions.push({
      email: {
        $regex: new RegExp(`^${escapeRegex(email)}$`, "i"),
      },
    });
  }

  const filter = { $or: conditions };

  if (excludedCustomerId) {
    filter._id = { $ne: excludedCustomerId };
  }

  const existing = await Customer.findOne(filter).lean();

  if (existing) {
    throw createHttpError(
      "Username or email is already being used by another customer",
      409,
    );
  }
};

/*
|--------------------------------------------------------------------------
| Balance ledger writer
|--------------------------------------------------------------------------
|
| THIS is the important fix.
|
| The report reads CustomerTransaction.
| Updating only Customer.balance is not enough.
|
*/

const writeBalanceTransaction = async ({
  req,
  customerId,
  oldBalance,
  newBalance,
  source,
  requestedOperation,
  description = "",
  transactionDate = new Date(),
}) => {
  const oldValue = Number(oldBalance || 0);
  const newValue = Number(newBalance || 0);

  if (oldValue === newValue) {
    return null;
  }

  const operation =
    newValue > oldValue
      ? "deposit"
      : "withdraw";

  const amount =
    Math.abs(newValue - oldValue);

  return CustomerTransaction.create({
    customerId,
    operation,
    source,
    requestedOperation,
    amount,
    oldBalance: oldValue,
    newBalance: newValue,
    transactionDate,
    description:
      String(description || "").trim() ||
      (operation === "deposit"
        ? "Customer loan / deposit"
        : "Customer withdrawal"),
    createdBy: getActorName(req),
    createdByUserId: getActorUserId(req),
  });
};

const getCustomers = async (req, res) => {
  try {
    const page = parsePositiveInteger(req.query.page, 1);

    const limit = Math.min(
      parsePositiveInteger(req.query.limit, 10),
      MAX_PAGE_LIMIT,
    );

    const skip = (page - 1) * limit;
    const filter = {};
    const search = String(req.query.search || "").trim();

    if (search) {
      const safe = escapeRegex(search);

      filter.$or = [
        { username: { $regex: safe, $options: "i" } },
        { email: { $regex: safe, $options: "i" } },
        { branchId: { $regex: safe, $options: "i" } },
        { phoneNumber: { $regex: safe, $options: "i" } },
      ];
    }

    if (req.query.status !== undefined) {
      filter.status = normalizeBoolean(req.query.status);
    }

    const [customers, total] = await Promise.all([
      populateCustomer(Customer.find(filter))
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Customer.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: customers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    return sendError(error, res, "Could not fetch customers");
  }
};

const getCustomerById = async (req, res) => {
  try {
    const customerId = validateObjectId(req.params.id);

    const customer = await populateCustomer(
      Customer.findById(customerId),
    ).lean();

    if (!customer) {
      throw createHttpError("Customer not found", 404);
    }

    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    return sendError(error, res, "Could not fetch customer");
  }
};

const getMyCustomerProfile = async (req, res) => {
  try {
    if (req.user?.role !== "customer") {
      throw createHttpError(
        "Only customer accounts can access this profile",
        403,
      );
    }

    const customer = await Customer.findOne({
      userId: req.user._id,
    }).lean();

    if (!customer) {
      throw createHttpError(
        "Customer profile is not linked to this account",
        404,
      );
    }

    if (customer.status === false) {
      throw createHttpError("Customer account is inactive", 403);
    }

    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    return sendError(error, res, "Could not fetch customer profile");
  }
};

const createCustomer = async (req, res) => {
  let createdUser = null;
  let createdCustomer = null;

  try {
    const customerUsername =
      normalizeCustomerUsername(req.body.username);

    const loginUsername =
      normalizeLoginUsername(req.body.username);

    const email =
      normalizeEmail(req.body.email);

    const password =
      normalizePassword(req.body.password, true);

    const status =
      normalizeBoolean(req.body.status, true);

    const balance =
      hasOwn(req.body, "balance")
        ? normalizeBalance(req.body.balance)
        : 0;

    const percentages =
      hasOwn(req.body, "percentages")
        ? normalizePercentages(req.body.percentages)
        : [];

    await Promise.all([
      ensureUserIdentityAvailable(loginUsername, email),
      ensureCustomerIdentityAvailable(customerUsername, email),
    ]);

    createdUser = await User.create({
      name: String(req.body.name || customerUsername).trim(),
      username: loginUsername,
      email: email || undefined,
      password,
      role: "customer",
      status,
    });

    const actorName =
      getActorName(req);

    createdCustomer =
      await Customer.create({
        userId: createdUser._id,
        username: customerUsername,
        email,
        branchId: normalizeText(
          req.body.branchId,
          "Branch ID",
          100,
        ),
        phoneNumber: normalizeText(
          req.body.phoneNumber,
          "Phone number",
          50,
        ),
        address: normalizeText(
          req.body.address,
          "Address",
          500,
        ),
        description: normalizeText(
          req.body.description,
          "Description",
          1000,
        ),
        percentages,
        balance,
        status,
        createdBy: actorName,
        updatedBy: actorName,
      });

    /*
     * Initial balance is a loan/deposit.
     */
    if (balance > 0) {
      try {
        await writeBalanceTransaction({
          req,
          customerId: createdCustomer._id,
          oldBalance: 0,
          newBalance: balance,
          source: "customer_create",
          requestedOperation: "create",
          description:
            req.body.balanceNote ||
            req.body.transactionDescription ||
            "Initial customer loan / deposit",
        });
      } catch (transactionError) {
        await Customer.findByIdAndDelete(
          createdCustomer._id,
        ).catch(() => {});

        await User.findByIdAndDelete(
          createdUser._id,
        ).catch(() => {});

        throw transactionError;
      }
    }

    const populated =
      await populateCustomer(
        Customer.findById(
          createdCustomer._id,
        ),
      ).lean();

    return res.status(201).json({
      success: true,
      message:
        "Customer and login account created successfully",
      data: populated,
    });
  } catch (error) {
    if (createdCustomer?._id) {
      await Customer.findByIdAndDelete(
        createdCustomer._id,
      ).catch(() => {});
    }

    if (createdUser?._id) {
      await User.findByIdAndDelete(
        createdUser._id,
      ).catch((rollbackError) => {
        console.error(
          "Customer login rollback failed:",
          rollbackError,
        );
      });
    }

    return sendError(
      error,
      res,
      "Could not create customer",
    );
  }
};

const updateCustomer = async (req, res) => {
  let createdUser = null;

  try {
    const customerId =
      validateObjectId(req.params.id);

    const customer =
      await Customer.findById(customerId);

    if (!customer) {
      throw createHttpError("Customer not found", 404);
    }

    const oldBalance =
      Number(customer.balance || 0);

    const linkedUser =
      customer.userId
        ? await User.findById(
            customer.userId,
          ).select("+password")
        : null;

    const customerUsername =
      hasOwn(req.body, "username")
        ? normalizeCustomerUsername(
            req.body.username,
          )
        : customer.username;

    const loginUsername =
      normalizeLoginUsername(
        customerUsername,
      );

    const email =
      hasOwn(req.body, "email")
        ? normalizeEmail(
            req.body.email,
          )
        : normalizeEmail(
            customer.email,
          );

    const password =
      hasOwn(req.body, "password")
        ? normalizePassword(
            req.body.password,
            false,
          )
        : "";

    const status =
      hasOwn(req.body, "status")
        ? normalizeBoolean(
            req.body.status,
          )
        : customer.status !== false;

    if (!linkedUser && !password) {
      throw createHttpError(
        "This customer has no login account. Enter a password to create login access.",
        400,
      );
    }

    await Promise.all([
      ensureUserIdentityAvailable(
        loginUsername,
        email,
        linkedUser?._id || null,
      ),

      ensureCustomerIdentityAvailable(
        customerUsername,
        email,
        customerId,
      ),
    ]);

    if (linkedUser) {
      linkedUser.name = String(
        req.body.name ??
          linkedUser.name ??
          customerUsername,
      ).trim();

      linkedUser.username =
        loginUsername;

      linkedUser.email =
        email || undefined;

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
      createdUser =
        await User.create({
          name: String(
            req.body.name ||
              customerUsername,
          ).trim(),
          username: loginUsername,
          email: email || undefined,
          password,
          role: "customer",
          status,
        });

      customer.userId =
        createdUser._id;
    }

    customer.username =
      customerUsername;

    customer.email =
      email;

    customer.status =
      status;

    if (hasOwn(req.body, "branchId")) {
      customer.branchId =
        normalizeText(
          req.body.branchId,
          "Branch ID",
          100,
        );
    }

    if (hasOwn(req.body, "phoneNumber")) {
      customer.phoneNumber =
        normalizeText(
          req.body.phoneNumber,
          "Phone number",
          50,
        );
    }

    if (hasOwn(req.body, "address")) {
      customer.address =
        normalizeText(
          req.body.address,
          "Address",
          500,
        );
    }

    if (hasOwn(req.body, "description")) {
      customer.description =
        normalizeText(
          req.body.description,
          "Description",
          1000,
        );
    }

    if (hasOwn(req.body, "percentages")) {
      customer.percentages =
        normalizePercentages(
          req.body.percentages,
        );
    }

    let newBalance =
      oldBalance;

    if (hasOwn(req.body, "balance")) {
      newBalance =
        normalizeBalance(
          req.body.balance,
        );

      customer.balance =
        newBalance;
    }

    customer.updatedBy =
      getActorName(req);

    await customer.save();

    /*
     * Customer edit form balance change must also hit the ledger.
     */
    if (
      newBalance !==
      oldBalance
    ) {
      try {
        await writeBalanceTransaction({
          req,
          customerId:
            customer._id,
          oldBalance,
          newBalance,
          source:
            "customer_update",
          requestedOperation:
            "update",
          description:
            req.body.balanceNote ||
            req.body.transactionDescription ||
            (newBalance > oldBalance
              ? "Customer loan / deposit from customer update"
              : "Customer withdrawal from customer update"),
        });
      } catch (transactionError) {
        customer.balance =
          oldBalance;

        customer.updatedBy =
          getActorName(req);

        await customer.save().catch(
          (rollbackError) => {
            console.error(
              "Customer balance rollback failed:",
              rollbackError,
            );
          },
        );

        throw transactionError;
      }
    }

    const populated =
      await populateCustomer(
        Customer.findById(
          customer._id,
        ),
      ).lean();

    return res.status(200).json({
      success: true,
      message: createdUser
        ? "Customer login account created and linked successfully"
        : "Customer and login account updated successfully",
      data: populated,
    });
  } catch (error) {
    if (createdUser?._id) {
      await User.findByIdAndDelete(
        createdUser._id,
      ).catch((rollbackError) => {
        console.error(
          "Customer login rollback failed:",
          rollbackError,
        );
      });
    }

    return sendError(
      error,
      res,
      "Could not update customer",
    );
  }
};

const updateCustomerBalance = async (req, res) => {
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

    const requestedOperation =
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
    let source;

    if (
      requestedOperation ===
      "set"
    ) {
      newBalance =
        normalizeBalance(
          req.body.balance,
        );

      source =
        "balance_set";
    } else if (
      requestedOperation ===
      "deposit"
    ) {
      const amount =
        normalizeAmount(
          req.body.amount,
        );

      newBalance =
        oldBalance +
        amount;

      source =
        "balance_deposit";
    } else if (
      requestedOperation ===
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

      source =
        "balance_withdraw";
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

    await customer.save();

    let transaction =
      null;

    if (
      newBalance !==
      oldBalance
    ) {
      try {
        transaction =
          await writeBalanceTransaction({
            req,
            customerId:
              customer._id,
            oldBalance,
            newBalance,
            source,
            requestedOperation,
            description:
              req.body.description ||
              req.body.balanceNote ||
              req.body.transactionDescription ||
              (newBalance > oldBalance
                ? "Customer loan / deposit"
                : "Customer withdrawal"),
          });
      } catch (transactionError) {
        customer.balance =
          oldBalance;

        customer.updatedBy =
          getActorName(req);

        await customer.save().catch(
          (rollbackError) => {
            console.error(
              "Customer balance rollback failed:",
              rollbackError,
            );
          },
        );

        throw transactionError;
      }
    }

    return res.status(200).json({
      success: true,
      message:
        newBalance > oldBalance
          ? "Customer loan / deposit posted successfully"
          : newBalance < oldBalance
            ? "Customer withdrawal posted successfully"
            : "Customer balance was unchanged",
      data: {
        customer,
        requestedOperation,
        oldBalance,
        newBalance,
        transaction,
      },
    });
  } catch (error) {
    return sendError(
      error,
      res,
      "Could not update customer balance",
    );
  }
};

const depositCustomerBalance = async (req, res) => {
  req.body.operation =
    "deposit";

  return updateCustomerBalance(
    req,
    res,
  );
};

const withdrawCustomerBalance = async (req, res) => {
  req.body.operation =
    "withdraw";

  return updateCustomerBalance(
    req,
    res,
  );
};

const setCustomerBalance = async (req, res) => {
  req.body.operation =
    "set";

  return updateCustomerBalance(
    req,
    res,
  );
};

const updateCustomerStatus = async (req, res) => {
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

    if (!hasOwn(req.body, "status")) {
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

    await customer.save();

    if (customer.userId) {
      await User.findByIdAndUpdate(
        customer.userId,
        {
          $set: {
            status,
            role: "customer",
          },
        },
        {
          runValidators:
            true,
        },
      );
    }

    return res.status(200).json({
      success: true,
      message: status
        ? "Customer activated successfully"
        : "Customer deactivated successfully",
      data: customer,
    });
  } catch (error) {
    return sendError(
      error,
      res,
      "Could not update customer status",
    );
  }
};

const deleteCustomer = async (req, res) => {
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

    /*
     * Keep CustomerTransaction history after customer deletion.
     */
    await customer.deleteOne();

    if (linkedUserId) {
      await User.deleteOne({
        _id: linkedUserId,
        role: "customer",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Customer and linked login account deleted successfully",
    });
  } catch (error) {
    return sendError(
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
  depositCustomerBalance,
  withdrawCustomerBalance,
  setCustomerBalance,
  updateCustomerStatus,
  deleteCustomer,
};
