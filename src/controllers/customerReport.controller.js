import mongoose from "mongoose";

import CustomerTransaction from "../models/CustomerTransaction.js";
import Customer from "../models/Customer.js";

const MAX_PAGE_LIMIT = 500;

const REPORT_TIMEZONE_OFFSET_MINUTES = Number(
  process.env.REPORT_TIMEZONE_OFFSET_MINUTES ?? 420,
);

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

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
};

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const pad2 = (value) => String(value).padStart(2, "0");

const reportLocalDateToUtc = (dateString, endOfDay = false) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
    String(dateString || ""),
  );

  if (!match) {
    throw createHttpError("Date must use YYYY-MM-DD format", 400);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const utcMillis =
    Date.UTC(
      year,
      month - 1,
      day,
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0,
    ) -
    REPORT_TIMEZONE_OFFSET_MINUTES * 60 * 1000;

  const date = new Date(utcMillis);

  if (Number.isNaN(date.getTime())) {
    throw createHttpError("Invalid report date", 400);
  }

  return date;
};

const addDaysToDateParts = (year, month, day, daysToAdd) => {
  const date = new Date(
    Date.UTC(year, month - 1, day + daysToAdd),
  );

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
};

const formatDateParts = ({ year, month, day }) =>
  `${year}-${pad2(month)}-${pad2(day)}`;

const getCurrentWeekDateStrings = () => {
  const shifted = new Date(
    Date.now() + REPORT_TIMEZONE_OFFSET_MINUTES * 60 * 1000,
  );

  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  const weekday = shifted.getUTCDay();

  const daysFromMonday = weekday === 0 ? 6 : weekday - 1;

  const monday = addDaysToDateParts(
    year,
    month,
    day,
    -daysFromMonday,
  );

  const sunday = addDaysToDateParts(
    monday.year,
    monday.month,
    monday.day,
    6,
  );

  return {
    dateFrom: formatDateParts(monday),
    dateTo: formatDateParts(sunday),
  };
};

const getSignedAmount = (transaction) => {
  if (
    transaction.balanceDelta !== null &&
    transaction.balanceDelta !== undefined &&
    Number.isFinite(Number(transaction.balanceDelta))
  ) {
    return Number(transaction.balanceDelta);
  }

  const amount = Number(transaction.amount || 0);

  if (transaction.operation === "withdraw") {
    return -Math.abs(amount);
  }

  return Math.abs(amount);
};

const serializeTransaction = (transaction) => {
  const data =
    typeof transaction?.toObject === "function"
      ? transaction.toObject()
      : { ...transaction };

  return {
    ...data,
    signedAmount: getSignedAmount(data),
  };
};

const buildBaseFilter = (req, forcedCustomerId = null) => {
  const currentWeek = getCurrentWeekDateStrings();

  const dateFromString = req.query.dateFrom || currentWeek.dateFrom;
  const dateToString = req.query.dateTo || currentWeek.dateTo;

  const dateFrom = reportLocalDateToUtc(dateFromString, false);
  const dateTo = reportLocalDateToUtc(dateToString, true);

  if (dateFrom > dateTo) {
    throw createHttpError(
      "Start date cannot be later than end date",
      400,
    );
  }

  const filter = {
    transactionDate: {
      $gte: dateFrom,
      $lte: dateTo,
    },
  };

  if (forcedCustomerId) {
    filter.customerId = forcedCustomerId;
  } else if (req.query.customerId) {
    if (!mongoose.isValidObjectId(req.query.customerId)) {
      throw createHttpError("Customer ID is invalid", 400);
    }

    filter.customerId = req.query.customerId;
  }

  return {
    filter,
    dateFromString,
    dateToString,
  };
};

const runReport = async (req, res, operationFilter = null, forcedCustomerId = null) => {
  try {
    const page = parsePositiveInteger(req.query.page, 1);
    const limit = Math.min(
      parsePositiveInteger(req.query.limit, 20),
      MAX_PAGE_LIMIT,
    );
    const skip = (page - 1) * limit;

    const {
      filter,
      dateFromString,
      dateToString,
    } = buildBaseFilter(req, forcedCustomerId);

    if (operationFilter) {
      filter.operation = operationFilter;
    }

    if (req.query.operation) {
      const operation = String(req.query.operation).trim().toLowerCase();

      if (!["deposit", "withdraw", "invoice"].includes(operation)) {
        throw createHttpError("Invalid transaction operation", 400);
      }

      filter.operation = operation;
    }

    const [transactions, total] = await Promise.all([
      CustomerTransaction.find(filter)
        .populate({
          path: "customerId",
          select:
            "username email branchId phoneNumber balance status userId",
          populate: {
            path: "userId",
            select: "name username email role status",
          },
        })
        .populate({
          path: "invoiceId",
          select: "title totalResult playDate balanceApplied",
        })
        .sort({
          transactionDate: -1,
          createdAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      CustomerTransaction.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: transactions.map(serializeTransaction),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
      filters: {
        customerId: forcedCustomerId || req.query.customerId || null,
        operation: filter.operation || null,
        dateFrom: dateFromString,
        dateTo: dateToString,
      },
    });
  } catch (error) {
    return sendError(
      error,
      res,
      "Could not load customer transaction report",
    );
  }
};

const getLinkedCustomerIdForUser = async (req) => {
  const userId = req.user?._id || req.user?.id;

  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw createHttpError("Customer login is invalid", 401);
  }

  const customer = await Customer.findOne({ userId })
    .select("_id status")
    .lean();

  if (!customer) {
    throw createHttpError(
      "Customer profile is not linked to this account",
      404,
    );
  }

  if (customer.status === false) {
    throw createHttpError("Customer account is inactive", 403);
  }

  return customer._id;
};

// Logged-in customer: own deposits, withdrawals and invoice balance movements.
const getMyCustomerTransactionReport = async (req, res) => {
  try {
    const customerId = await getLinkedCustomerIdForUser(req);
    return runReport(req, res, null, customerId);
  } catch (error) {
    return sendError(
      error,
      res,
      "Could not load your transaction report",
    );
  }
};

// Full balance report: deposits + withdrawals + invoice results.
const getCustomerTransactionReport = async (req, res) => {
  return runReport(req, res, null);
};

// Compatibility endpoint for old deposit-only report integrations.
const getCustomerDepositReport = async (req, res) => {
  return runReport(req, res, "deposit");
};

export {
  getCustomerTransactionReport,
  getMyCustomerTransactionReport,
  getCustomerDepositReport,
};
