import mongoose from "mongoose";

import CustomerTransaction from "../models/CustomerTransaction.js";

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

const getCustomerDepositReport = async (req, res) => {
  try {
    const page = parsePositiveInteger(req.query.page, 1);

    const limit = Math.min(
      parsePositiveInteger(req.query.limit, 20),
      MAX_PAGE_LIMIT,
    );

    const skip = (page - 1) * limit;

    const currentWeek = getCurrentWeekDateStrings();

    const dateFromString =
      req.query.dateFrom || currentWeek.dateFrom;

    const dateToString =
      req.query.dateTo || currentWeek.dateTo;

    const dateFrom = reportLocalDateToUtc(dateFromString, false);
    const dateTo = reportLocalDateToUtc(dateToString, true);

    if (dateFrom > dateTo) {
      throw createHttpError(
        "Start date cannot be later than end date",
        400,
      );
    }

    const filter = {
      operation: "deposit",
      transactionDate: {
        $gte: dateFrom,
        $lte: dateTo,
      },
    };

    if (req.query.customerId) {
      if (!mongoose.isValidObjectId(req.query.customerId)) {
        throw createHttpError("Customer ID is invalid", 400);
      }

      filter.customerId = req.query.customerId;
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
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
      filters: {
        customerId: req.query.customerId || null,
        dateFrom: dateFromString,
        dateTo: dateToString,
      },
    });
  } catch (error) {
    return sendError(
      error,
      res,
      "Could not load customer deposit report",
    );
  }
};

export {
  getCustomerDepositReport,
};
