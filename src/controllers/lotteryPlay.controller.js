import mongoose from 'mongoose';

import LotteryPlay from '../models/LotteryPlay.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';

const TWO_DIGIT_WIN_MULTIPLIER = 100;
const THREE_DIGIT_WIN_MULTIPLIER = 600;

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

const createHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeString = (value) => String(value ?? '').trim();

const normalizeNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const requireObjectId = (value, fieldName) => {
  if (!value) {
    throw createHttpError(`${fieldName} is required`, 400);
  }

  const id =
    typeof value === 'object'
      ? value._id || value.id
      : value;

  if (!isValidObjectId(id)) {
    throw createHttpError(`${fieldName} is invalid`, 400);
  }

  return String(id);
};

const normalizeProductIds = (values) => {
  if (!Array.isArray(values) || !values.length) {
    throw createHttpError('At least one product is required', 400);
  }

  const ids = Array.from(
    new Set(
      values
        .map((value) =>
          typeof value === 'object'
            ? value._id || value.id
            : value
        )
        .map(String)
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );

  if (!ids.length) {
    throw createHttpError('At least one product is required', 400);
  }

  if (ids.length > 2) {
    throw createHttpError('A maximum of two products is allowed', 400);
  }

  for (const id of ids) {
    if (!isValidObjectId(id)) {
      throw createHttpError('One or more product IDs are invalid', 400);
    }
  }

  return ids;
};

const normalizeRow = (row, index) => {
  const rowNumber = index + 1;
  const rowTitle = normalizeString(row?.rowTitle);

  if (!rowTitle) {
    throw createHttpError(`Row ${rowNumber}: Row name is required`, 400);
  }

  const categoryId = requireObjectId(
    row?.categoryId,
    `Row ${rowNumber}: Category`
  );

  const isTwoNumber = Boolean(row?.isTwoNumber);
  const isThreeNumber = Boolean(row?.isThreeNumber);

  if (!isTwoNumber && !isThreeNumber) {
    throw createHttpError(`Row ${rowNumber}: Enable 2D or 3D`, 400);
  }

  let twoDigitNumber = null;
  let threeDigitNumber = null;
  let winTwoNumberType = 0;
  let winThreeNumberType = 0;

  if (isTwoNumber) {
    if (
      row?.twoDigitNumber === null ||
      row?.twoDigitNumber === undefined ||
      row?.twoDigitNumber === ''
    ) {
      throw createHttpError(`Row ${rowNumber}: 2D number is required`, 400);
    }

    twoDigitNumber = Number(row.twoDigitNumber);
    winTwoNumberType = normalizeNumber(row?.winTwoNumberType, 0);

    if (!Number.isFinite(twoDigitNumber) || twoDigitNumber < 0) {
      throw createHttpError(
        `Row ${rowNumber}: 2D number must be valid and non-negative`,
        400
      );
    }

    if (!Number.isFinite(winTwoNumberType) || winTwoNumberType < 0) {
      throw createHttpError(
        `Row ${rowNumber}: Correct 2D value must be valid and non-negative`,
        400
      );
    }
  }

  if (isThreeNumber) {
    if (
      row?.threeDigitNumber === null ||
      row?.threeDigitNumber === undefined ||
      row?.threeDigitNumber === ''
    ) {
      throw createHttpError(`Row ${rowNumber}: 3D number is required`, 400);
    }

    threeDigitNumber = Number(row.threeDigitNumber);
    winThreeNumberType = normalizeNumber(row?.winThreeNumberType, 0);

    if (!Number.isFinite(threeDigitNumber) || threeDigitNumber < 0) {
      throw createHttpError(
        `Row ${rowNumber}: 3D number must be valid and non-negative`,
        400
      );
    }

    if (!Number.isFinite(winThreeNumberType) || winThreeNumberType < 0) {
      throw createHttpError(
        `Row ${rowNumber}: Correct 3D value must be valid and non-negative`,
        400
      );
    }
  }

  return {
    rowTitle,
    categoryId,
    twoDigitNumber,
    threeDigitNumber,
    winTwoNumberType,
    winThreeNumberType,
    isTwoNumber,
    isThreeNumber,
    checkedStatus: Boolean(row?.checkedStatus)
  };
};

const normalizeRows = (rows) => {
  if (!Array.isArray(rows) || !rows.length) {
    throw createHttpError('At least one invoice row is required', 400);
  }

  return rows.map(normalizeRow);
};

const validateReferences = async ({ customerId, productIds, rows }) => {
  const customer = await Customer.findById(customerId)
    .select('_id status')
    .lean();

  if (!customer) {
    throw createHttpError('Customer not found', 404);
  }

  if (customer.status === false) {
    throw createHttpError('Customer is inactive', 400);
  }

  const productCount = await Product.countDocuments({
    _id: { $in: productIds },
    status: { $ne: false }
  });

  if (productCount !== productIds.length) {
    throw createHttpError(
      'One or more products are invalid or inactive',
      400
    );
  }

  const categoryIds = Array.from(
    new Set(rows.map((row) => String(row.categoryId)))
  );

  const categoryCount = await Category.countDocuments({
    _id: { $in: categoryIds },
    status: { $ne: false }
  });

  if (categoryCount !== categoryIds.length) {
    throw createHttpError(
      'One or more row categories are invalid or inactive',
      400
    );
  }
};

const normalizePlayPayload = async (body) => {
  const title = normalizeString(body?.title);

  if (!title) {
    throw createHttpError('Invoice name is required', 400);
  }

  const customerId = requireObjectId(body?.customerId, 'Customer');
  const productIds = normalizeProductIds(body?.productIds);
  const rows = normalizeRows(body?.rows);

  const playDate = body?.playDate
    ? new Date(body.playDate)
    : new Date();

  if (Number.isNaN(playDate.getTime())) {
    throw createHttpError('Invoice date is invalid', 400);
  }

  const twoDigitRate = normalizeNumber(body?.twoDigitRate, 100);
  const threeDigitRate = normalizeNumber(body?.threeDigitRate, 65);

  if (twoDigitRate <= 0) {
    throw createHttpError('2D rate must be greater than zero', 400);
  }

  if (threeDigitRate <= 0) {
    throw createHttpError('3D rate must be greater than zero', 400);
  }

  await validateReferences({ customerId, productIds, rows });

  return {
    title,
    customerId,
    productIds,
    playDate,
    twoDigitRate,
    threeDigitRate,
    rows
  };
};

const getRatePercent = (value) => {
  const rate = Number(value || 0);
  return rate > 0 ? rate : 100;
};

const calculateAmountWithRate = (amount, rate) => {
  return (Number(amount || 0) * getRatePercent(rate)) / 100;
};

const toPlayResultNumber = (value) => {
  return Math.trunc(Math.abs(Number(value || 0)));
};

const calculateRows = (rows, twoDigitRate, threeDigitRate) => {
  let twoDigitBaseTotal = 0;
  let threeDigitBaseTotal = 0;
  let twoDigitCorrectTotal = 0;
  let threeDigitCorrectTotal = 0;

  for (const row of rows) {
    if (row.isTwoNumber) {
      twoDigitBaseTotal += Number(row.twoDigitNumber || 0);
      twoDigitCorrectTotal += Number(row.winTwoNumberType || 0);
    }

    if (row.isThreeNumber) {
      threeDigitBaseTotal += Number(row.threeDigitNumber || 0);
      threeDigitCorrectTotal += Number(row.winThreeNumberType || 0);
    }
  }

  const twoDigitGrandTotal = calculateAmountWithRate(
    twoDigitBaseTotal,
    twoDigitRate
  );

  const threeDigitGrandTotal = calculateAmountWithRate(
    threeDigitBaseTotal,
    threeDigitRate
  );

  const twoDigitCorrectDeduction =
    twoDigitCorrectTotal * TWO_DIGIT_WIN_MULTIPLIER;

  const threeDigitCorrectDeduction =
    threeDigitCorrectTotal * THREE_DIGIT_WIN_MULTIPLIER;

  const twoDigitResult = toPlayResultNumber(twoDigitGrandTotal);
  const threeDigitResult = toPlayResultNumber(threeDigitGrandTotal);
  const twoDigitCorrectResult = toPlayResultNumber(
    twoDigitCorrectDeduction
  );
  const threeDigitCorrectResult = toPlayResultNumber(
    threeDigitCorrectDeduction
  );

  return {
    twoDigitBaseTotal,
    threeDigitBaseTotal,
    twoDigitRate,
    threeDigitRate,
    twoDigitCorrectTotal,
    threeDigitCorrectTotal,
    twoDigitGrandTotal,
    threeDigitGrandTotal,
    twoDigitCorrectDeduction,
    threeDigitCorrectDeduction,
    twoDigitResult,
    threeDigitResult,
    twoDigitCorrectResult,
    threeDigitCorrectResult,
    grandTotal:
      twoDigitResult +
      threeDigitResult -
      twoDigitCorrectResult -
      threeDigitCorrectResult
  };
};

const getCategoryIdentity = (row, legacyCategoryId = null) => {
  const value = row?.categoryId || row?.category || legacyCategoryId;

  if (!value) {
    return {
      categoryId: null,
      categoryName: '-'
    };
  }

  if (typeof value === 'object') {
    return {
      categoryId: String(value._id || value.id || ''),
      categoryName: value.name || '-'
    };
  }

  return {
    categoryId: String(value),
    categoryName: '-'
  };
};

const getLegacyCategoryId = (play) => {
  if (play?.categoryId) {
    return play.categoryId;
  }

  if (Array.isArray(play?.categoryIds) && play.categoryIds.length) {
    return play.categoryIds[0];
  }

  return null;
};

const calculateCategoryGroups = (play) => {
  const rows = Array.isArray(play?.rows) ? play.rows : [];
  const legacyCategoryId = getLegacyCategoryId(play);
  const groups = new Map();

  for (const row of rows) {
    const identity = getCategoryIdentity(row, legacyCategoryId);
    const key = identity.categoryId || '__uncategorized__';

    if (!groups.has(key)) {
      groups.set(key, {
        categoryId: identity.categoryId,
        categoryName: identity.categoryName,
        rows: []
      });
    }

    const group = groups.get(key);

    if (group.categoryName === '-' && identity.categoryName !== '-') {
      group.categoryName = identity.categoryName;
    }

    group.rows.push(row);
  }

  return Array.from(groups.values()).map((group) => ({
    categoryId: group.categoryId,
    categoryName: group.categoryName,
    rowCount: group.rows.length,
    calculation: calculateRows(
      group.rows,
      Number(play?.twoDigitRate || 100),
      Number(play?.threeDigitRate || 100)
    )
  }));
};

const serializePlay = (play) => {
  const data =
    typeof play?.toObject === 'function'
      ? play.toObject()
      : { ...play };

  return {
    ...data,
    categoryGroups: calculateCategoryGroups(data)
  };
};

const handleControllerError = (
  error,
  res,
  fallbackMessage
) => {
  console.error(fallbackMessage, error);

  if (error.statusCode) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message
    });
  }

  if (error.name === 'ValidationError') {
    const message =
      Object.values(error.errors || {})[0]?.message ||
      'Validation failed';

    return res.status(400).json({
      success: false,
      message
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID'
    });
  }

  return res.status(500).json({
    success: false,
    message: fallbackMessage
  });
};

const buildListFilter = (req) => {
  const filter = {};
  const search = normalizeString(req.query.search);

  if (search) {
    filter.$or = [
      {
        title: {
          $regex: search,
          $options: 'i'
        }
      },
      {
        'rows.rowTitle': {
          $regex: search,
          $options: 'i'
        }
      }
    ];
  }

  if (
    req.query.customerId &&
    isValidObjectId(req.query.customerId)
  ) {
    filter.customerId = req.query.customerId;
  }

  if (
    req.query.productId &&
    isValidObjectId(req.query.productId)
  ) {
    filter.productIds = req.query.productId;
  }

  if (
    req.query.categoryId &&
    isValidObjectId(req.query.categoryId)
  ) {
    const categoryConditions = [
      { 'rows.categoryId': req.query.categoryId },
      { categoryId: req.query.categoryId },
      { categoryIds: req.query.categoryId }
    ];

    if (filter.$or) {
      filter.$and = [
        { $or: filter.$or },
        { $or: categoryConditions }
      ];
      delete filter.$or;
    } else {
      filter.$or = categoryConditions;
    }
  }

  if (req.query.dateFrom || req.query.dateTo) {
    filter.playDate = {};

    if (req.query.dateFrom) {
      const dateFrom = new Date(`${req.query.dateFrom}T00:00:00.000`);

      if (!Number.isNaN(dateFrom.getTime())) {
        filter.playDate.$gte = dateFrom;
      }
    }

    if (req.query.dateTo) {
      const dateTo = new Date(`${req.query.dateTo}T23:59:59.999`);

      if (!Number.isNaN(dateTo.getTime())) {
        filter.playDate.$lte = dateTo;
      }
    }

    if (!Object.keys(filter.playDate).length) {
      delete filter.playDate;
    }
  }

  return filter;
};

const populatePlay = (query) => {
  return query
    .populate({
      path: 'customerId',
      select:
        'branchId phoneNumber address description balance status userId username name email',
      populate: {
        path: 'userId',
        select: 'username email role status'
      }
    })
    .populate({
      path: 'productIds',
      select:
        'name code playType numberType productType categoryId category status'
    })
    .populate({
      path: 'rows.categoryId',
      select: 'name status'
    });
};

const getLotteryPlays = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(
      Math.max(Number(req.query.limit || 10), 1),
      500
    );
    const skip = (page - 1) * limit;
    const filter = buildListFilter(req);

    const [plays, total] = await Promise.all([
      populatePlay(
        LotteryPlay.find(filter)
          .sort({ playDate: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
      ),
      LotteryPlay.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      data: plays.map(serializePlay),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1)
      }
    });
  } catch (error) {
    return handleControllerError(
      error,
      res,
      'Could not fetch invoices'
    );
  }
};

const getLotteryPlayById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw createHttpError('Invalid invoice ID', 400);
    }

    const play = await populatePlay(
      LotteryPlay.findById(req.params.id)
    );

    if (!play) {
      throw createHttpError('Invoice not found', 404);
    }

    return res.status(200).json({
      success: true,
      data: serializePlay(play)
    });
  } catch (error) {
    return handleControllerError(
      error,
      res,
      'Could not fetch invoice'
    );
  }
};

const createLotteryPlay = async (req, res) => {
  try {
    const payload = await normalizePlayPayload(req.body);

    const play = await LotteryPlay.create({
      ...payload,
      createdBy: req.user?._id || req.user?.id || null,
      updatedBy: req.user?._id || req.user?.id || null,
      status: true
    });

    const populatedPlay = await populatePlay(
      LotteryPlay.findById(play._id)
    );

    return res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: serializePlay(populatedPlay)
    });
  } catch (error) {
    return handleControllerError(
      error,
      res,
      'Could not create invoice'
    );
  }
};

const updateLotteryPlay = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw createHttpError('Invalid invoice ID', 400);
    }

    const existingPlay = await LotteryPlay.findById(req.params.id);

    if (!existingPlay) {
      throw createHttpError('Invoice not found', 404);
    }

    const payload = await normalizePlayPayload(req.body);

    existingPlay.title = payload.title;
    existingPlay.productIds = payload.productIds;
    existingPlay.customerId = payload.customerId;
    existingPlay.playDate = payload.playDate;
    existingPlay.twoDigitRate = payload.twoDigitRate;
    existingPlay.threeDigitRate = payload.threeDigitRate;
    existingPlay.rows = payload.rows;

    // Remove old invoice-level categories from invoices once they are updated.
    existingPlay.categoryId = undefined;
    existingPlay.categoryIds = [];

    existingPlay.updatedBy =
      req.user?._id || req.user?.id || null;

    await existingPlay.save();

    const populatedPlay = await populatePlay(
      LotteryPlay.findById(existingPlay._id)
    );

    return res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      data: serializePlay(populatedPlay)
    });
  } catch (error) {
    return handleControllerError(
      error,
      res,
      'Could not update invoice'
    );
  }
};

const deleteLotteryPlay = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw createHttpError('Invalid invoice ID', 400);
    }

    const play = await LotteryPlay.findById(req.params.id);

    if (!play) {
      throw createHttpError('Invoice not found', 404);
    }

    await play.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully'
    });
  } catch (error) {
    return handleControllerError(
      error,
      res,
      'Could not delete invoice'
    );
  }
};

export {
  getLotteryPlays,
  getLotteryPlayById,
  createLotteryPlay,
  updateLotteryPlay,
  deleteLotteryPlay
};
