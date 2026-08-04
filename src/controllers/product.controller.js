import mongoose from "mongoose";

import Product from "../models/Product.js";

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
      message: validationMessage || "Product validation failed",
    });
  }

  if (error.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid product ID",
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "A product with this name already exists",
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

const hasOwn = (object, property) => {
  return Object.prototype.hasOwnProperty.call(object, property);
};

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

const validateObjectId = (value, fieldName = "Product ID") => {
  if (!value || !mongoose.isValidObjectId(value)) {
    throw createHttpError(`${fieldName} is invalid`, 400);
  }

  return String(value);
};

const getActorId = (req) => {
  const actorId = req.user?._id || req.user?.id || req.user?.userId || null;

  if (!actorId || !mongoose.isValidObjectId(actorId)) {
    return null;
  }

  return String(actorId);
};

/*
|--------------------------------------------------------------------------
| Field normalization
|--------------------------------------------------------------------------
*/

const normalizeProductName = (value) => {
  const name = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (!name) {
    throw createHttpError("Product name is required", 400);
  }

  if (name.length > 150) {
    throw createHttpError("Product name cannot exceed 150 characters", 400);
  }

  return name;
};

const normalizeWinMultiplier = (value) => {
  if (value === null || value === undefined || value === "") {
    throw createHttpError("Product multiplier is required", 400);
  }

  const winMultiplier = Number(value);

  if (!Number.isFinite(winMultiplier)) {
    throw createHttpError("Product multiplier must be a valid number", 400);
  }

  if (winMultiplier < 0) {
    throw createHttpError("Product multiplier cannot be negative", 400);
  }

  return winMultiplier;
};

const normalizeDescription = (value) => {
  const description = String(value ?? "").trim();

  if (description.length > 1000) {
    throw createHttpError("Description cannot exceed 1000 characters", 400);
  }

  return description;
};

const normalizeStatus = (value) => {
  const status = parseBooleanValue(value);

  if (status === undefined) {
    throw createHttpError("Status must be true or false", 400);
  }

  return status;
};

const createExactNameRegex = (name) => {
  return new RegExp(`^${escapeRegex(name)}$`, "i");
};

/*
|--------------------------------------------------------------------------
| Duplicate product helper
|--------------------------------------------------------------------------
*/

const findDuplicateProduct = async (name, excludedProductId = null) => {
  const filter = {
    name: {
      $regex: createExactNameRegex(name),
    },
  };

  if (excludedProductId) {
    filter._id = {
      $ne: excludedProductId,
    };
  }

  return Product.findOne(filter).select("_id name").lean();
};

/*
|--------------------------------------------------------------------------
| GET /api/products
|--------------------------------------------------------------------------
*/

const getProducts = async (req, res) => {
  try {
    const page = parsePositiveInteger(req.query.page, 1);

    const limit = Math.min(
      parsePositiveInteger(req.query.limit, 10),
      MAX_PAGE_LIMIT,
    );

    const skip = (page - 1) * limit;

    const filter = {};

    const search = String(req.query.search ?? "").trim();

    if (search) {
      const safeSearch = escapeRegex(search);

      filter.$or = [
        {
          name: {
            $regex: safeSearch,
            $options: "i",
          },
        },
        {
          description: {
            $regex: safeSearch,
            $options: "i",
          },
        },
      ];
    }

    if (req.query.status !== undefined) {
      const status = parseBooleanValue(req.query.status);

      if (status === undefined) {
        throw createHttpError("Status filter must be true or false", 400);
      }

      filter.status = status;
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({
          createdAt: -1,
          _id: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Product.countDocuments(filter),
    ]);

    const pages = Math.max(Math.ceil(total / limit), 1);

    return res.status(200).json({
      success: true,
      data: products,

      pagination: {
        page,
        limit,
        total,
        pages,
      },
    });
  } catch (error) {
    return handleControllerError(error, res, "Could not fetch products");
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/products/:id
|--------------------------------------------------------------------------
*/

const getProductById = async (req, res) => {
  try {
    const productId = validateObjectId(req.params.id);

    const product = await Product.findById(productId).lean();

    if (!product) {
      throw createHttpError("Product not found", 404);
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    return handleControllerError(error, res, "Could not fetch product");
  }
};

/*
|--------------------------------------------------------------------------
| POST /api/products
|--------------------------------------------------------------------------
*/

const createProduct = async (req, res) => {
  try {
    const name = normalizeProductName(req.body.name);

    const winMultiplier = normalizeWinMultiplier(req.body.winMultiplier);

    const description = normalizeDescription(req.body.description);

    let status = true;

    if (hasOwn(req.body, "status")) {
      status = normalizeStatus(req.body.status);
    }

    const duplicateProduct = await findDuplicateProduct(name);

    if (duplicateProduct) {
      throw createHttpError(`Product "${name}" already exists`, 409);
    }

    const actorId = getActorId(req);

    const product = await Product.create({
      name,
      winMultiplier,
      description,
      status,

      createdBy: actorId,

      updatedBy: actorId,
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product,
    });
  } catch (error) {
    return handleControllerError(error, res, "Could not create product");
  }
};

/*
|--------------------------------------------------------------------------
| PUT/PATCH /api/products/:id
|--------------------------------------------------------------------------
*/

const updateProduct = async (req, res) => {
  try {
    const productId = validateObjectId(req.params.id);

    const product = await Product.findById(productId);

    if (!product) {
      throw createHttpError("Product not found", 404);
    }

    const hasName = hasOwn(req.body, "name");

    const hasWinMultiplier = hasOwn(req.body, "winMultiplier");

    const hasDescription = hasOwn(req.body, "description");

    const hasStatus = hasOwn(req.body, "status");

    if (!hasName && !hasWinMultiplier && !hasDescription && !hasStatus) {
      throw createHttpError("No product fields were provided for update", 400);
    }

    /*
    |--------------------------------------------------------------------------
    | Update name
    |--------------------------------------------------------------------------
    */

    if (hasName) {
      const name = normalizeProductName(req.body.name);

      const duplicateProduct = await findDuplicateProduct(name, productId);

      if (duplicateProduct) {
        throw createHttpError(`Product "${name}" already exists`, 409);
      }

      product.name = name;
    }

    /*
    |--------------------------------------------------------------------------
    | Update multiplier
    |--------------------------------------------------------------------------
    */

    if (hasWinMultiplier) {
      product.winMultiplier = normalizeWinMultiplier(req.body.winMultiplier);
    }

    /*
    |--------------------------------------------------------------------------
    | Update description
    |--------------------------------------------------------------------------
    */

    if (hasDescription) {
      product.description = normalizeDescription(req.body.description);
    }

    /*
    |--------------------------------------------------------------------------
    | Update status
    |--------------------------------------------------------------------------
    */

    if (hasStatus) {
      product.status = normalizeStatus(req.body.status);
    }

    const actorId = getActorId(req);

    if (actorId) {
      product.updatedBy = actorId;
    }

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product,
    });
  } catch (error) {
    return handleControllerError(error, res, "Could not update product");
  }
};

/*
|--------------------------------------------------------------------------
| PATCH /api/products/:id/status
|--------------------------------------------------------------------------
*/

const updateProductStatus = async (req, res) => {
  try {
    const productId = validateObjectId(req.params.id);

    if (!hasOwn(req.body, "status")) {
      throw createHttpError("Status is required", 400);
    }

    const status = normalizeStatus(req.body.status);

    const product = await Product.findById(productId);

    if (!product) {
      throw createHttpError("Product not found", 404);
    }

    product.status = status;

    const actorId = getActorId(req);

    if (actorId) {
      product.updatedBy = actorId;
    }

    await product.save();

    return res.status(200).json({
      success: true,

      message: status
        ? "Product activated successfully"
        : "Product deactivated successfully",

      data: product,
    });
  } catch (error) {
    return handleControllerError(error, res, "Could not update product status");
  }
};

/*
|--------------------------------------------------------------------------
| DELETE /api/products/:id
|--------------------------------------------------------------------------
*/

const deleteProduct = async (req, res) => {
  try {
    const productId = validateObjectId(req.params.id);

    const product = await Product.findById(productId);

    if (!product) {
      throw createHttpError("Product not found", 404);
    }

    const deletedProduct = {
      id: product._id.toString(),

      name: product.name,

      winMultiplier: product.winMultiplier,
    };

    await product.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      data: deletedProduct,
    });
  } catch (error) {
    return handleControllerError(error, res, "Could not delete product");
  }
};

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

export {
  getProducts,
  getProducts as getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
};
