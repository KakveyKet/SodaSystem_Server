import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import LotteryPlay from '../models/LotteryPlay.js';

const TWO_DIGIT_RATE_NUMBERS = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109];
const THREE_DIGIT_RATE_NUMBERS = [65, 70, 75, 80, 85, 90, 95, 100];

const PLAY_CATEGORY_FIELD = LotteryPlay.schema.path('categoryId')
  ? 'categoryId'
  : 'category';

const PLAY_PRODUCT_FIELD = LotteryPlay.schema.path('productId')
  ? 'productId'
  : 'product';

const PLAY_CUSTOMER_FIELD = LotteryPlay.schema.path('customerId')
  ? 'customerId'
  : 'customer';

const PRODUCT_CATEGORY_FIELD = Product.schema.path('categoryId')
  ? 'categoryId'
  : 'category';

const parseBoolean = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return null;
};

const escapeRegex = (value = '') => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const getUserLabel = (req) => {
  return req.user?.name || req.user?.email || 'System';
};

const getModelId = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'object') {
    return value._id || value.id || null;
  }

  return value;
};

const getStartOfDay = (value) => {
  const date = value ? new Date(value) : new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const getEndOfDay = (value) => {
  const date = value ? new Date(value) : new Date();
  date.setHours(23, 59, 59, 999);
  return date;
};

const buildPlayCategoryFilter = (categoryId) => ({
  $or: [{ categoryId }, { category: categoryId }]
});

const buildPlayProductFilter = (productId) => ({
  $or: [{ productId }, { product: productId }]
});

const buildPlayCustomerFilter = (customerId) => ({
  $or: [{ customerId }, { customer: customerId }]
});

const applyPlayPopulate = (query) => {
  if (LotteryPlay.schema.path('categoryId')) {
    query.populate('categoryId', 'name status');
  }

  if (LotteryPlay.schema.path('category')) {
    query.populate('category', 'name status');
  }

  if (LotteryPlay.schema.path('productId')) {
    query.populate('productId', 'name status winMultiplier');
  }

  if (LotteryPlay.schema.path('product')) {
    query.populate('product', 'name status winMultiplier');
  }

  if (LotteryPlay.schema.path('customerId')) {
    query.populate(
      'customerId',
      'username branchId phoneNumber address description balance status'
    );
  }

  if (LotteryPlay.schema.path('customer')) {
    query.populate(
      'customer',
      'username branchId phoneNumber address description balance status'
    );
  }

  return query;
};

const validatePlayAssociation = async (categoryId, productId, customerId) => {
  if (!categoryId) {
    return 'Category is required';
  }

  if (!productId) {
    return 'Product is required';
  }

  if (!customerId) {
    return 'Customer is required';
  }

  const category = await Category.findById(categoryId);

  if (!category) {
    return 'Category does not exist';
  }

  const product = await Product.findById(productId);

  if (!product) {
    return 'Product does not exist';
  }

  const customer = await Customer.findById(customerId);

  if (!customer) {
    return 'Customer does not exist';
  }

  const productCategoryId =
    getModelId(product[PRODUCT_CATEGORY_FIELD]) ||
    getModelId(product.categoryId) ||
    getModelId(product.category);

  if (!productCategoryId) {
    return 'Selected product does not have category';
  }

  if (String(productCategoryId) !== String(categoryId)) {
    return 'Selected product does not belong to selected category';
  }

  return '';
};

const validatePlayDate = (playDate) => {
  if (!playDate) {
    return 'Play date is required';
  }

  const date = new Date(playDate);

  if (Number.isNaN(date.getTime())) {
    return 'Play date is invalid';
  }

  return '';
};

const validateRates = (twoDigitRate, threeDigitRate) => {
  if (!TWO_DIGIT_RATE_NUMBERS.includes(Number(twoDigitRate))) {
    return 'Please select valid 2D rate';
  }

  if (!THREE_DIGIT_RATE_NUMBERS.includes(Number(threeDigitRate))) {
    return 'Please select valid 3D rate';
  }

  return '';
};

const validateRows = (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return 'At least one play row is required';
  }

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const label = `Row ${index + 1}`;

    if (!row.rowTitle || !row.rowTitle.trim()) {
      return `${label}: Row name is required`;
    }

    if (row.isTwoNumber) {
      if (row.twoDigitNumber === null || row.twoDigitNumber === undefined) {
        return `${label}: 2D number is required`;
      }

      if (Number(row.twoDigitNumber) < 0 || Number(row.twoDigitNumber) > 99) {
        return `${label}: 2D number must be between 0 and 99`;
      }

      if (Number(row.twoDigitAmount || 0) < 0) {
        return `${label}: 2D amount cannot be negative`;
      }

      if (Number(row.winTwoNumberType || 0) < 0) {
        return `${label}: 2D type cannot be negative`;
      }
    }

    if (row.isThreeNumber) {
      if (row.threeDigitNumber === null || row.threeDigitNumber === undefined) {
        return `${label}: 3D number is required`;
      }

      if (Number(row.threeDigitNumber) < 0 || Number(row.threeDigitNumber) > 999) {
        return `${label}: 3D number must be between 0 and 999`;
      }

      if (Number(row.threeDigitAmount || 0) < 0) {
        return `${label}: 3D amount cannot be negative`;
      }

      if (Number(row.winThreeNumberType || 0) < 0) {
        return `${label}: 3D type cannot be negative`;
      }
    }
  }

  return '';
};

const normalizeRows = (rows = []) => {
  return rows.map((row) => ({
    rowTitle: row.rowTitle.trim(),

    twoDigitNumber: row.isTwoNumber ? Number(row.twoDigitNumber) : null,
    threeDigitNumber: row.isThreeNumber ? Number(row.threeDigitNumber) : null,

    winTwoNumberType: row.isTwoNumber ? Number(row.winTwoNumberType || 0) : 0,
    winThreeNumberType: row.isThreeNumber ? Number(row.winThreeNumberType || 0) : 0,

    twoDigitAmount: row.isTwoNumber ? Number(row.twoDigitAmount || 0) : 0,
    threeDigitAmount: row.isThreeNumber ? Number(row.threeDigitAmount || 0) : 0,

    isTwoNumber: Boolean(row.isTwoNumber),
    isThreeNumber: Boolean(row.isThreeNumber),

    checkedStatus: false
  }));
};

export const getLotteryPlays = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.max(Number(req.query.limit || 10), 1);
    const skip = (page - 1) * limit;

    const filter = {};
    const andFilters = [];

    if (req.query.search) {
      const search = escapeRegex(req.query.search.trim());

      andFilters.push({
        $or: [
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
        ]
      });
    }

    if (req.query.categoryId) {
      andFilters.push(buildPlayCategoryFilter(req.query.categoryId));
    }

    if (req.query.productId) {
      andFilters.push(buildPlayProductFilter(req.query.productId));
    }

    if (req.query.customerId) {
      andFilters.push(buildPlayCustomerFilter(req.query.customerId));
    }

    const status = parseBoolean(req.query.status);

    if (status !== null) {
      andFilters.push({ status });
    }

    const startDate = getStartOfDay(req.query.dateFrom);
    const endDate = getEndOfDay(req.query.dateTo || req.query.dateFrom);

    andFilters.push({
      $or: [
        {
          playDate: {
            $gte: startDate,
            $lte: endDate
          }
        },
        {
          playDate: {
            $exists: false
          },
          createdAt: {
            $gte: startDate,
            $lte: endDate
          }
        },
        {
          playDate: null,
          createdAt: {
            $gte: startDate,
            $lte: endDate
          }
        }
      ]
    });

    if (andFilters.length > 0) {
      filter.$and = andFilters;
    }

    const [lotteryPlays, total] = await Promise.all([
      applyPlayPopulate(
        LotteryPlay.find(filter)
          .sort({
            playDate: -1,
            createdAt: -1
          })
          .skip(skip)
          .limit(limit)
      ),
      LotteryPlay.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      data: lotteryPlays,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getLotteryPlayById = async (req, res, next) => {
  try {
    const lotteryPlay = await applyPlayPopulate(
      LotteryPlay.findById(req.params.id)
    );

    if (!lotteryPlay) {
      return res.status(404).json({
        success: false,
        message: 'Play not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: lotteryPlay
    });
  } catch (error) {
    next(error);
  }
};

export const createLotteryPlay = async (req, res, next) => {
  try {
    const {
      categoryId,
      category,
      productId,
      product,
      customerId,
      customer,
      playDate,
      title,
      rows,
      twoDigitRate = 100,
      threeDigitRate = 100,
      status
    } = req.body;

    const nextCategoryId = categoryId || category;
    const nextProductId = productId || product;
    const nextCustomerId = customerId || customer;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Play name is required'
      });
    }

    const associationError = await validatePlayAssociation(
      nextCategoryId,
      nextProductId,
      nextCustomerId
    );

    if (associationError) {
      return res.status(400).json({
        success: false,
        message: associationError
      });
    }

    const dateError = validatePlayDate(playDate);

    if (dateError) {
      return res.status(400).json({
        success: false,
        message: dateError
      });
    }

    const rateError = validateRates(twoDigitRate, threeDigitRate);

    if (rateError) {
      return res.status(400).json({
        success: false,
        message: rateError
      });
    }

    const rowError = validateRows(rows);

    if (rowError) {
      return res.status(400).json({
        success: false,
        message: rowError
      });
    }

    const lotteryPlay = await LotteryPlay.create({
      [PLAY_CATEGORY_FIELD]: nextCategoryId,
      [PLAY_PRODUCT_FIELD]: nextProductId,
      [PLAY_CUSTOMER_FIELD]: nextCustomerId,
      playDate: new Date(playDate),
      title: title.trim(),
      twoDigitRate: Number(twoDigitRate),
      threeDigitRate: Number(threeDigitRate),
      rows: normalizeRows(rows),
      status: status !== false,
      createdBy: getUserLabel(req),
      updatedBy: getUserLabel(req)
    });

    const populatedPlay = await applyPlayPopulate(
      LotteryPlay.findById(lotteryPlay._id)
    );

    return res.status(201).json({
      success: true,
      message: 'Play created successfully',
      data: populatedPlay
    });
  } catch (error) {
    next(error);
  }
};

export const updateLotteryPlay = async (req, res, next) => {
  try {
    const lotteryPlay = await LotteryPlay.findById(req.params.id);

    if (!lotteryPlay) {
      return res.status(404).json({
        success: false,
        message: 'Play not found'
      });
    }

    const nextCategoryId =
      req.body.categoryId ||
      req.body.category ||
      lotteryPlay.categoryId ||
      lotteryPlay.category;

    const nextProductId =
      req.body.productId ||
      req.body.product ||
      lotteryPlay.productId ||
      lotteryPlay.product;

    const nextCustomerId =
      req.body.customerId ||
      req.body.customer ||
      lotteryPlay.customerId ||
      lotteryPlay.customer;

    const nextPlayDate =
      req.body.playDate !== undefined ? req.body.playDate : lotteryPlay.playDate;

    const nextTitle =
      req.body.title !== undefined ? req.body.title : lotteryPlay.title;

    const nextTwoDigitRate =
      req.body.twoDigitRate !== undefined
        ? req.body.twoDigitRate
        : lotteryPlay.twoDigitRate;

    const nextThreeDigitRate =
      req.body.threeDigitRate !== undefined
        ? req.body.threeDigitRate
        : lotteryPlay.threeDigitRate;

    const nextRows = Array.isArray(req.body.rows)
      ? req.body.rows
      : lotteryPlay.rows.map((row) => {
          return row.toObject ? row.toObject() : row;
        });

    if (!nextTitle || !nextTitle.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Play name is required'
      });
    }

    const associationError = await validatePlayAssociation(
      nextCategoryId,
      nextProductId,
      nextCustomerId
    );

    if (associationError) {
      return res.status(400).json({
        success: false,
        message: associationError
      });
    }

    const dateError = validatePlayDate(nextPlayDate);

    if (dateError) {
      return res.status(400).json({
        success: false,
        message: dateError
      });
    }

    const rateError = validateRates(nextTwoDigitRate, nextThreeDigitRate);

    if (rateError) {
      return res.status(400).json({
        success: false,
        message: rateError
      });
    }

    const rowError = validateRows(nextRows);

    if (rowError) {
      return res.status(400).json({
        success: false,
        message: rowError
      });
    }

    lotteryPlay.set({
      [PLAY_CATEGORY_FIELD]: nextCategoryId,
      [PLAY_PRODUCT_FIELD]: nextProductId,
      [PLAY_CUSTOMER_FIELD]: nextCustomerId,
      playDate: new Date(nextPlayDate),
      title: nextTitle.trim(),
      twoDigitRate: Number(nextTwoDigitRate),
      threeDigitRate: Number(nextThreeDigitRate),
      rows: normalizeRows(nextRows),
      status:
        req.body.status !== undefined
          ? req.body.status !== false
          : lotteryPlay.status,
      updatedBy: getUserLabel(req)
    });

    await lotteryPlay.save();

    const populatedPlay = await applyPlayPopulate(
      LotteryPlay.findById(lotteryPlay._id)
    );

    return res.status(200).json({
      success: true,
      message: 'Play updated successfully',
      data: populatedPlay
    });
  } catch (error) {
    next(error);
  }
};

export const updateLotteryPlayCheckedStatus = async (req, res, next) => {
  try {
    const { checkedStatus } = req.body;

    if (typeof checkedStatus !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Checked status must be boolean'
      });
    }

    const lotteryPlay = await LotteryPlay.findById(req.params.id);

    if (!lotteryPlay) {
      return res.status(404).json({
        success: false,
        message: 'Play not found'
      });
    }

    lotteryPlay.checkedStatus = checkedStatus;
    lotteryPlay.updatedBy = getUserLabel(req);

    await lotteryPlay.save();

    const populatedPlay = await applyPlayPopulate(
      LotteryPlay.findById(lotteryPlay._id)
    );

    return res.status(200).json({
      success: true,
      message: 'Checked status updated successfully',
      data: populatedPlay
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLotteryPlay = async (req, res, next) => {
  try {
    const lotteryPlay = await LotteryPlay.findById(req.params.id);

    if (!lotteryPlay) {
      return res.status(404).json({
        success: false,
        message: 'Play not found'
      });
    }

    await LotteryPlay.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Play deleted successfully',
      data: {
        deletedPlay: lotteryPlay.title
      }
    });
  } catch (error) {
    next(error);
  }
};