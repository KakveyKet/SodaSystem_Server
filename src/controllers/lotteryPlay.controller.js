import mongoose from "mongoose";

import LotteryPlay from "../models/LotteryPlay.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import Rate from "../models/Rate.js";

const MAX_PAGE_LIMIT = 500;

/*
|--------------------------------------------------------------------------
| Error helpers
|--------------------------------------------------------------------------
*/

const createHttpError = (message, statusCode = 400) => {
  const error = new Error(message);

  error.statusCode = statusCode;

  return error;
};

const handleControllerError = (error, res, fallbackMessage) => {
  console.error(`${fallbackMessage}:`, error);

  if (error.statusCode) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  if (error.name === "ValidationError") {
    const validationMessage = Object.values(error.errors || {})[0]?.message;

    return res.status(400).json({
      success: false,

      message: validationMessage || "Validation failed",
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,

      message: "Invalid data was provided",
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,

      message: "A duplicate record already exists",
    });
  }

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
};

/*
|--------------------------------------------------------------------------
| General helpers
|--------------------------------------------------------------------------
*/

const escapeRegex = (value = "") => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const parsePositiveInteger = (value, fallback) => {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return parsedValue;
};

const parseBooleanValue = (value) => {
  if (value === true || value === "true" || value === 1 || value === "1") {
    return true;
  }

  if (value === false || value === "false" || value === 0 || value === "0") {
    return false;
  }

  return undefined;
};

const normalizeBoolean = (value, fallback = false) => {
  const parsedValue = parseBooleanValue(value);

  if (parsedValue !== undefined) {
    return parsedValue;
  }

  return fallback;
};

const getActorName = (req) => {
  return req.user?.username || req.user?.name || req.user?.email || "System";
};

const getValueId = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (mongoose.isValidObjectId(value)) {
    return String(value);
  }

  if (typeof value === "object") {
    const nestedValue = value._id || value.id || null;

    if (nestedValue && mongoose.isValidObjectId(nestedValue)) {
      return String(nestedValue);
    }
  }

  return null;
};

const validateObjectId = (value, fieldName) => {
  const objectId = getValueId(value);

  if (!objectId) {
    throw createHttpError(`${fieldName} is invalid`, 400);
  }

  return objectId;
};

const normalizeRequiredDate = (value, fieldName) => {
  if (!value) {
    throw createHttpError(`${fieldName} is required`, 400);
  }

  const text = String(value).trim();

  let date;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    date = new Date(`${text}T00:00:00.000Z`);
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) {
    throw createHttpError(`${fieldName} is invalid`, 400);
  }

  return date;
};

const parseDateBoundary = (value, endOfDay = false) => {
  if (!value) {
    return null;
  }

  const text = String(value).trim();

  let date;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    date = new Date(`${text}T${endOfDay ? "23:59:59.999Z" : "00:00:00.000Z"}`);
  } else {
    date = new Date(text);
  }

  if (Number.isNaN(date.getTime())) {
    throw createHttpError(`Invalid date: ${text}`, 400);
  }

  return date;
};

const appendAndCondition = (filter, condition) => {
  if (!Array.isArray(filter.$and)) {
    filter.$and = [];
  }

  filter.$and.push(condition);
};

const parseCommaSeparatedIds = (value, fieldName) => {
  const source = Array.isArray(value) ? value : String(value).split(",");

  const ids = source
    .map((item) => {
      return String(item).trim();
    })
    .filter(Boolean)
    .map((item) => {
      return validateObjectId(item, fieldName);
    });

  return Array.from(new Set(ids));
};

/*
|--------------------------------------------------------------------------
| Multiple-reference input helper
|--------------------------------------------------------------------------
*/

const getMultipleReferenceInput = ({
  body = {},
  pluralField,
  legacyField,
  label,
}) => {
  const hasPluralField = Object.prototype.hasOwnProperty.call(
    body,
    pluralField,
  );

  const hasLegacyField = Object.prototype.hasOwnProperty.call(
    body,
    legacyField,
  );

  if (!hasPluralField && !hasLegacyField) {
    return {
      provided: false,
      ids: null,
    };
  }

  const source = hasPluralField ? body[pluralField] : [body[legacyField]];

  if (!Array.isArray(source)) {
    throw createHttpError(`${pluralField} must be an array`, 400);
  }

  const cleanedSource = source.filter((value) => {
    return value !== null && value !== undefined && value !== "";
  });

  if (cleanedSource.length === 0) {
    throw createHttpError(
      `At least one ${label.toLowerCase()} is required`,
      400,
    );
  }

  const ids = cleanedSource.map((referenceValue) => {
    return validateObjectId(referenceValue, `${label} ID`);
  });

  const uniqueIds = Array.from(new Set(ids));

  if (uniqueIds.length !== ids.length) {
    throw createHttpError(
      `Duplicate ${label.toLowerCase()} selections are not allowed`,
      400,
    );
  }

  return {
    provided: true,
    ids: uniqueIds,
  };
};

/*
|--------------------------------------------------------------------------
| Category helpers
|--------------------------------------------------------------------------
*/

const getCategoryInput = (body = {}) => {
  const result = getMultipleReferenceInput({
    body,

    pluralField: "categoryIds",

    legacyField: "categoryId",

    label: "Category",
  });

  return {
    provided: result.provided,

    categoryIds: result.ids,
  };
};

const validateCategories = async (categoryIds) => {
  if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
    throw createHttpError("At least one category is required", 400);
  }

  const categories = await Category.find({
    _id: {
      $in: categoryIds,
    },
  })
    .select("_id name status")
    .lean();

  if (categories.length !== categoryIds.length) {
    throw createHttpError("One or more selected categories do not exist", 404);
  }

  const inactiveCategory = categories.find((category) => {
    return category.status === false;
  });

  if (inactiveCategory) {
    throw createHttpError(
      `Category "${inactiveCategory.name}" is inactive`,
      400,
    );
  }

  return categories;
};

/*
|--------------------------------------------------------------------------
| Product helpers
|--------------------------------------------------------------------------
*/

const getProductInput = (body = {}) => {
  const result = getMultipleReferenceInput({
    body,

    pluralField: "productIds",

    legacyField: "productId",

    label: "Product",
  });

  return {
    provided: result.provided,

    productIds: result.ids,
  };
};

const validateProducts = async (productIds) => {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    throw createHttpError("At least one product is required", 400);
  }

  const products = await Product.find({
    _id: {
      $in: productIds,
    },
  })
    .select("_id name status winMultiplier")
    .lean();

  if (products.length !== productIds.length) {
    throw createHttpError("One or more selected products do not exist", 404);
  }

  const inactiveProduct = products.find((product) => {
    return product.status === false;
  });

  if (inactiveProduct) {
    throw createHttpError(`Product "${inactiveProduct.name}" is inactive`, 400);
  }

  /*
   * Products and Categories are independent.
   *
   * There is no Product-Category validation here.
   */
  return products;
};

/*
|--------------------------------------------------------------------------
| Customer helper
|--------------------------------------------------------------------------
*/

const validateCustomer = async (customerId) => {
  const customer = await Customer.findById(customerId)
    .select("_id username status")
    .lean();

  if (!customer) {
    throw createHttpError("Customer not found", 404);
  }

  if (customer.status === false) {
    throw createHttpError("The selected customer is inactive", 400);
  }

  return customer;
};

/*
|--------------------------------------------------------------------------
| Rate helpers
|--------------------------------------------------------------------------
*/

const normalizeRateNumber = (value, fieldName) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    throw createHttpError(`${fieldName} is invalid`, 400);
  }

  return number;
};

const resolveActiveRate = async (value, fieldName) => {
  const number = normalizeRateNumber(value, fieldName);

  const rate = await Rate.findOne({
    number,
    status: true,
  })
    .select("_id name number status")
    .lean();

  if (!rate) {
    throw createHttpError(`${fieldName} does not exist or is inactive`, 400);
  }

  return rate;
};

/*
|--------------------------------------------------------------------------
| Row number validation
|--------------------------------------------------------------------------
|
| There is no maximum value for 2D or 3D.
|
*/

const validatePlayNumber = (value, rowNumber, numberType) => {
  if (value === null || value === undefined || value === "") {
    throw createHttpError(
      `Row ${rowNumber} ${numberType} number is required`,
      400,
    );
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw createHttpError(
      `Row ${rowNumber} has an invalid ${numberType} number`,
      400,
    );
  }

  if (number < 0) {
    throw createHttpError(
      `Row ${rowNumber} ${numberType} number cannot be negative`,
      400,
    );
  }

  return number;
};

const validateTwoDigitNumber = (value, rowNumber) => {
  return validatePlayNumber(value, rowNumber, "2D");
};

const validateThreeDigitNumber = (value, rowNumber) => {
  return validatePlayNumber(value, rowNumber, "3D");
};

const normalizeNonNegativeNumber = (value, fieldName) => {
  const number = Number(value ?? 0);

  if (!Number.isFinite(number) || number < 0) {
    throw createHttpError(
      `${fieldName} must be a valid non-negative number`,
      400,
    );
  }

  return number;
};

/*
|--------------------------------------------------------------------------
| Normalize rows
|--------------------------------------------------------------------------
*/

const normalizeRows = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw createHttpError("At least one play row is required", 400);
  }

  return rows.map((row, index) => {
    const rowNumber = index + 1;

    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw createHttpError(`Row ${rowNumber} is invalid`, 400);
    }

    const rowTitle = String(row.rowTitle ?? "").trim();

    if (!rowTitle) {
      throw createHttpError(`Row ${rowNumber} title is required`, 400);
    }

    const isTwoNumber = normalizeBoolean(row.isTwoNumber, false);

    const isThreeNumber = normalizeBoolean(row.isThreeNumber, false);

    const twoDigitNumber = isTwoNumber
      ? validateTwoDigitNumber(row.twoDigitNumber, rowNumber)
      : null;

    const threeDigitNumber = isThreeNumber
      ? validateThreeDigitNumber(row.threeDigitNumber, rowNumber)
      : null;

    const winTwoNumberType = isTwoNumber
      ? normalizeNonNegativeNumber(
          row.winTwoNumberType,
          `Row ${rowNumber} correct 2D value`,
        )
      : 0;

    const winThreeNumberType = isThreeNumber
      ? normalizeNonNegativeNumber(
          row.winThreeNumberType,
          `Row ${rowNumber} correct 3D value`,
        )
      : 0;

    const twoDigitAmount = isTwoNumber
      ? normalizeNonNegativeNumber(
          row.twoDigitAmount,
          `Row ${rowNumber} 2D amount`,
        )
      : 0;

    const threeDigitAmount = isThreeNumber
      ? normalizeNonNegativeNumber(
          row.threeDigitAmount,
          `Row ${rowNumber} 3D amount`,
        )
      : 0;

    const normalizedRow = {
      rowTitle,

      twoDigitNumber,
      threeDigitNumber,

      winTwoNumberType,
      winThreeNumberType,

      twoDigitAmount,
      threeDigitAmount,

      isTwoNumber,
      isThreeNumber,

      checkedStatus: normalizeBoolean(row.checkedStatus, false),
    };

    const rowId = getValueId(row._id || row.id);

    if (rowId) {
      normalizedRow._id = rowId;
    }

    return normalizedRow;
  });
};

/*
|--------------------------------------------------------------------------
| Population helper
|--------------------------------------------------------------------------
*/

const populateLotteryPlay = (query) => {
  return query
    .populate({
      path: "categoryIds",

      select: "name description status",
    })

    .populate({
      path: "categoryId",

      select: "name description status",
    })

    .populate({
      path: "productIds",

      select: "name winMultiplier description status",
    })

    .populate({
      path: "productId",

      select: "name winMultiplier description status",
    })

    .populate({
      path: "customerId",

      select:
        "username branchId phoneNumber address description balance status",
    });
};

/*
|--------------------------------------------------------------------------
| Normalize old populated invoices
|--------------------------------------------------------------------------
*/

const normalizePopulatedPlay = (lotteryPlay) => {
  if (!lotteryPlay) {
    return lotteryPlay;
  }

  if (
    (!Array.isArray(lotteryPlay.categoryIds) ||
      lotteryPlay.categoryIds.length === 0) &&
    lotteryPlay.categoryId
  ) {
    lotteryPlay.categoryIds = [lotteryPlay.categoryId];
  }

  if (
    !lotteryPlay.categoryId &&
    Array.isArray(lotteryPlay.categoryIds) &&
    lotteryPlay.categoryIds.length > 0
  ) {
    lotteryPlay.categoryId = lotteryPlay.categoryIds[0];
  }

  if (
    (!Array.isArray(lotteryPlay.productIds) ||
      lotteryPlay.productIds.length === 0) &&
    lotteryPlay.productId
  ) {
    lotteryPlay.productIds = [lotteryPlay.productId];
  }

  if (
    !lotteryPlay.productId &&
    Array.isArray(lotteryPlay.productIds) &&
    lotteryPlay.productIds.length > 0
  ) {
    lotteryPlay.productId = lotteryPlay.productIds[0];
  }

  return lotteryPlay;
};

const normalizePopulatedPlays = (lotteryPlays) => {
  return lotteryPlays.map(normalizePopulatedPlay);
};

/*
|--------------------------------------------------------------------------
| GET /api/lottery-plays
|--------------------------------------------------------------------------
*/

const getLotteryPlays = async (req, res) => {
  try {
    const page = parsePositiveInteger(req.query.page, 1);

    const limit = Math.min(
      parsePositiveInteger(req.query.limit, 10),
      MAX_PAGE_LIMIT,
    );

    const skip = (page - 1) * limit;

    const filter = {};

    /*
      |--------------------------------------------------------------------------
      | Search
      |--------------------------------------------------------------------------
      */

    const search = String(req.query.search ?? "").trim();

    if (search) {
      const safeSearch = escapeRegex(search);

      filter.$or = [
        {
          title: {
            $regex: safeSearch,

            $options: "i",
          },
        },

        {
          "rows.rowTitle": {
            $regex: safeSearch,

            $options: "i",
          },
        },
      ];
    }

    /*
      |--------------------------------------------------------------------------
      | Single category filter
      |--------------------------------------------------------------------------
      */

    if (req.query.categoryId) {
      const categoryId = validateObjectId(req.query.categoryId, "Category ID");

      appendAndCondition(filter, {
        $or: [
          {
            categoryIds: categoryId,
          },

          {
            categoryId,
          },
        ],
      });
    }

    /*
      |--------------------------------------------------------------------------
      | Multiple category filter
      |--------------------------------------------------------------------------
      |
      | categoryIds=id1,id2
      |
      | The invoice must contain all supplied categories.
      |
      */

    if (req.query.categoryIds) {
      const categoryIds = parseCommaSeparatedIds(
        req.query.categoryIds,
        "Category ID",
      );

      if (categoryIds.length === 1) {
        appendAndCondition(filter, {
          $or: [
            {
              categoryIds: categoryIds[0],
            },

            {
              categoryId: categoryIds[0],
            },
          ],
        });
      } else if (categoryIds.length > 1) {
        appendAndCondition(filter, {
          categoryIds: {
            $all: categoryIds,
          },
        });
      }
    }

    /*
      |--------------------------------------------------------------------------
      | Single product filter
      |--------------------------------------------------------------------------
      */

    if (req.query.productId) {
      const productId = validateObjectId(req.query.productId, "Product ID");

      appendAndCondition(filter, {
        $or: [
          {
            productIds: productId,
          },

          {
            productId,
          },
        ],
      });
    }

    /*
      |--------------------------------------------------------------------------
      | Multiple product filter
      |--------------------------------------------------------------------------
      |
      | productIds=id1,id2
      |
      */

    if (req.query.productIds) {
      const productIds = parseCommaSeparatedIds(
        req.query.productIds,
        "Product ID",
      );

      if (productIds.length === 1) {
        appendAndCondition(filter, {
          $or: [
            {
              productIds: productIds[0],
            },

            {
              productId: productIds[0],
            },
          ],
        });
      } else if (productIds.length > 1) {
        appendAndCondition(filter, {
          productIds: {
            $all: productIds,
          },
        });
      }
    }

    /*
      |--------------------------------------------------------------------------
      | Customer filter
      |--------------------------------------------------------------------------
      */

    if (req.query.customerId) {
      filter.customerId = validateObjectId(req.query.customerId, "Customer ID");
    }

    /*
      |--------------------------------------------------------------------------
      | Status filters
      |--------------------------------------------------------------------------
      */

    const status = parseBooleanValue(req.query.status);

    if (status !== undefined) {
      filter.status = status;
    }

    const checkedStatus = parseBooleanValue(req.query.checkedStatus);

    if (checkedStatus !== undefined) {
      filter.checkedStatus = checkedStatus;
    }

    /*
      |--------------------------------------------------------------------------
      | Date filter
      |--------------------------------------------------------------------------
      */

    const dateFrom = parseDateBoundary(req.query.dateFrom, false);

    const dateTo = parseDateBoundary(req.query.dateTo, true);

    if (dateFrom || dateTo) {
      filter.playDate = {};

      if (dateFrom) {
        filter.playDate.$gte = dateFrom;
      }

      if (dateTo) {
        filter.playDate.$lte = dateTo;
      }
    }

    /*
      |--------------------------------------------------------------------------
      | Query
      |--------------------------------------------------------------------------
      */

    const [lotteryPlays, total] = await Promise.all([
      populateLotteryPlay(LotteryPlay.find(filter))
        .sort({
          playDate: -1,
          createdAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      LotteryPlay.countDocuments(filter),
    ]);

    const pages = Math.max(Math.ceil(total / limit), 1);

    return res.status(200).json({
      success: true,

      data: normalizePopulatedPlays(lotteryPlays),

      pagination: {
        page,
        limit,
        total,
        pages,
      },
    });
  } catch (error) {
    return handleControllerError(error, res, "Could not fetch invoices");
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/lottery-plays/:id
|--------------------------------------------------------------------------
*/

const getLotteryPlayById = async (req, res) => {
  try {
    const playId = validateObjectId(req.params.id, "Invoice ID");

    const lotteryPlay = await populateLotteryPlay(
      LotteryPlay.findById(playId),
    ).lean();

    if (!lotteryPlay) {
      throw createHttpError("Invoice not found", 404);
    }

    return res.status(200).json({
      success: true,

      data: normalizePopulatedPlay(lotteryPlay),
    });
  } catch (error) {
    return handleControllerError(error, res, "Could not fetch invoice");
  }
};

/*
|--------------------------------------------------------------------------
| POST /api/lottery-plays
|--------------------------------------------------------------------------
*/

const createLotteryPlay = async (req, res) => {
  try {
    const title = String(req.body.title ?? "").trim();

    if (!title) {
      throw createHttpError("Invoice name is required", 400);
    }

    const categoryInput = getCategoryInput(req.body);

    if (!categoryInput.provided) {
      throw createHttpError("At least one category is required", 400);
    }

    const productInput = getProductInput(req.body);

    if (!productInput.provided) {
      throw createHttpError("At least one product is required", 400);
    }

    const categoryIds = categoryInput.categoryIds;

    const productIds = productInput.productIds;

    const customerId = validateObjectId(req.body.customerId, "Customer ID");

    const playDate = normalizeRequiredDate(req.body.playDate, "Invoice date");

    const rows = normalizeRows(req.body.rows);

    const [categories, products, customer, twoDigitRate, threeDigitRate] =
      await Promise.all([
        validateCategories(categoryIds),

        validateProducts(productIds),

        validateCustomer(customerId),

        resolveActiveRate(req.body.twoDigitRate, "2D rate"),

        resolveActiveRate(req.body.threeDigitRate, "3D rate"),
      ]);

    void categories;
    void products;
    void customer;

    const status = parseBooleanValue(req.body.status);

    const actor = getActorName(req);

    const lotteryPlay = await LotteryPlay.create({
      title,

      categoryIds,

      categoryId: categoryIds[0],

      productIds,

      productId: productIds[0],

      customerId,

      playDate,

      twoDigitRate: twoDigitRate.number,

      threeDigitRate: threeDigitRate.number,

      rows,

      checkedStatus: false,

      status: status !== undefined ? status : true,

      createdBy: actor,

      updatedBy: actor,
    });

    const populatedPlay = await populateLotteryPlay(
      LotteryPlay.findById(lotteryPlay._id),
    ).lean();

    return res.status(201).json({
      success: true,

      message: "Invoice created successfully",

      data: normalizePopulatedPlay(populatedPlay),
    });
  } catch (error) {
    return handleControllerError(error, res, "Could not create invoice");
  }
};

/*
|--------------------------------------------------------------------------
| PUT /api/lottery-plays/:id
|--------------------------------------------------------------------------
*/

const updateLotteryPlay = async (req, res) => {
  try {
    const playId = validateObjectId(req.params.id, "Invoice ID");

    const lotteryPlay = await LotteryPlay.findById(playId);

    if (!lotteryPlay) {
      throw createHttpError("Invoice not found", 404);
    }

    const categoryInput = getCategoryInput(req.body);

    const productInput = getProductInput(req.body);

    let customerId = null;

    let twoDigitRate = null;

    let threeDigitRate = null;

    const validations = [];

    /*
      |--------------------------------------------------------------------------
      | Reference validation
      |--------------------------------------------------------------------------
      */

    if (categoryInput.provided) {
      validations.push(validateCategories(categoryInput.categoryIds));
    }

    if (productInput.provided) {
      validations.push(validateProducts(productInput.productIds));
    }

    if (req.body.customerId !== undefined) {
      customerId = validateObjectId(req.body.customerId, "Customer ID");

      validations.push(validateCustomer(customerId));
    }

    if (req.body.twoDigitRate !== undefined) {
      validations.push(
        resolveActiveRate(req.body.twoDigitRate, "2D rate").then((rate) => {
          twoDigitRate = rate.number;

          return rate;
        }),
      );
    }

    if (req.body.threeDigitRate !== undefined) {
      validations.push(
        resolveActiveRate(req.body.threeDigitRate, "3D rate").then((rate) => {
          threeDigitRate = rate.number;

          return rate;
        }),
      );
    }

    await Promise.all(validations);

    /*
      |--------------------------------------------------------------------------
      | Apply category update
      |--------------------------------------------------------------------------
      */

    if (categoryInput.provided) {
      lotteryPlay.categoryIds = categoryInput.categoryIds;

      lotteryPlay.categoryId = categoryInput.categoryIds[0];
    }

    /*
      |--------------------------------------------------------------------------
      | Apply product update
      |--------------------------------------------------------------------------
      */

    if (productInput.provided) {
      lotteryPlay.productIds = productInput.productIds;

      lotteryPlay.productId = productInput.productIds[0];
    }

    /*
      |--------------------------------------------------------------------------
      | Apply basic field updates
      |--------------------------------------------------------------------------
      */

    if (req.body.title !== undefined) {
      const title = String(req.body.title).trim();

      if (!title) {
        throw createHttpError("Invoice name is required", 400);
      }

      lotteryPlay.title = title;
    }

    if (customerId) {
      lotteryPlay.customerId = customerId;
    }

    if (req.body.playDate !== undefined) {
      lotteryPlay.playDate = normalizeRequiredDate(
        req.body.playDate,
        "Invoice date",
      );
    }

    if (req.body.rows !== undefined) {
      lotteryPlay.rows = normalizeRows(req.body.rows);
    }

    if (twoDigitRate !== null) {
      lotteryPlay.twoDigitRate = twoDigitRate;
    }

    if (threeDigitRate !== null) {
      lotteryPlay.threeDigitRate = threeDigitRate;
    }

    const status = parseBooleanValue(req.body.status);

    if (status !== undefined) {
      lotteryPlay.status = status;
    }

    /*
     * Editing the invoice resets its checked status.
     */
    lotteryPlay.checkedStatus = false;

    lotteryPlay.updatedBy = getActorName(req);

    await lotteryPlay.save();

    const populatedPlay = await populateLotteryPlay(
      LotteryPlay.findById(lotteryPlay._id),
    ).lean();

    return res.status(200).json({
      success: true,

      message: "Invoice updated successfully",

      data: normalizePopulatedPlay(populatedPlay),
    });
  } catch (error) {
    return handleControllerError(error, res, "Could not update invoice");
  }
};

/*
|--------------------------------------------------------------------------
| PATCH /api/lottery-plays/:id/checked-status
|--------------------------------------------------------------------------
*/

const updateLotteryPlayCheckedStatus = async (req, res) => {
  try {
    const playId = validateObjectId(req.params.id, "Invoice ID");

    if (typeof req.body.checkedStatus !== "boolean") {
      throw createHttpError("checkedStatus must be true or false", 400);
    }

    const updatedLotteryPlay = await populateLotteryPlay(
      LotteryPlay.findByIdAndUpdate(
        playId,

        {
          $set: {
            checkedStatus: req.body.checkedStatus,

            updatedBy: getActorName(req),
          },
        },

        {
          new: true,
          runValidators: true,
        },
      ),
    ).lean();

    if (!updatedLotteryPlay) {
      throw createHttpError("Invoice not found", 404);
    }

    return res.status(200).json({
      success: true,

      message: "Invoice checked status updated successfully",

      data: normalizePopulatedPlay(updatedLotteryPlay),
    });
  } catch (error) {
    return handleControllerError(
      error,
      res,
      "Could not update invoice checked status",
    );
  }
};

/*
|--------------------------------------------------------------------------
| DELETE /api/lottery-plays/:id
|--------------------------------------------------------------------------
*/

const deleteLotteryPlay = async (req, res) => {
  try {
    const playId = validateObjectId(req.params.id, "Invoice ID");

    const lotteryPlay = await LotteryPlay.findById(playId);

    if (!lotteryPlay) {
      throw createHttpError("Invoice not found", 404);
    }

    await lotteryPlay.deleteOne();

    return res.status(200).json({
      success: true,

      message: "Invoice deleted successfully",

      data: {
        id: lotteryPlay._id.toString(),

        title: lotteryPlay.title,
      },
    });
  } catch (error) {
    return handleControllerError(error, res, "Could not delete invoice");
  }
};

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

export {
  getLotteryPlays,
  getLotteryPlays as getAllLotteryPlays,
  getLotteryPlayById,
  createLotteryPlay,
  updateLotteryPlay,
  updateLotteryPlayCheckedStatus,
  deleteLotteryPlay,
};
