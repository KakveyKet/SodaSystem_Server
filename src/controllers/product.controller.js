import Category from '../models/Category.js';
import Product from '../models/Product.js';
import LotteryPlay from '../models/LotteryPlay.js';

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

const buildProductCategoryFilter = (categoryId) => {
  return {
    $or: [
      {
        categoryId
      },
      {
        category: categoryId
      }
    ]
  };
};

const buildProductPlayFilter = (productId) => {
  return {
    $or: [
      {
        productId
      },
      {
        product: productId
      }
    ]
  };
};

const applyProductPopulate = (query) => {
  if (Product.schema.path('categoryId')) {
    query.populate('categoryId', 'name status');
  }

  if (Product.schema.path('category')) {
    query.populate('category', 'name status');
  }

  return query;
};

const validateCategoryExists = async (categoryId) => {
  if (!categoryId) {
    return 'Category is required';
  }

  const category = await Category.findById(categoryId);

  if (!category) {
    return 'Category does not exist';
  }

  return '';
};

export const getProducts = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.max(Number(req.query.limit || 10), 1);
    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.search) {
      const search = escapeRegex(req.query.search.trim());

      filter.$or = [
        {
          name: {
            $regex: search,
            $options: 'i'
          }
        },
        {
          description: {
            $regex: search,
            $options: 'i'
          }
        }
      ];
    }

    if (req.query.categoryId) {
      Object.assign(filter, buildProductCategoryFilter(req.query.categoryId));
    }

    const status = parseBoolean(req.query.status);

    if (status !== null) {
      filter.status = status;
    }

    const [products, total] = await Promise.all([
      applyProductPopulate(
        Product.find(filter)
          .sort({
            createdAt: -1
          })
          .skip(skip)
          .limit(limit)
      ),
      Product.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      data: products,
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

export const getProductById = async (req, res, next) => {
  try {
    const product = await applyProductPopulate(Product.findById(req.params.id));

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const { categoryId, category, name, winMultiplier, description, status } = req.body;

    const nextCategoryId = categoryId || category;

    const categoryError = await validateCategoryExists(nextCategoryId);

    if (categoryError) {
      return res.status(400).json({
        success: false,
        message: categoryError
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required'
      });
    }

    if (winMultiplier === null || winMultiplier === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Win multiplier is required'
      });
    }

    if (Number(winMultiplier) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Win multiplier cannot be negative'
      });
    }

    const duplicateProduct = await Product.findOne({
      ...buildProductCategoryFilter(nextCategoryId),
      name: {
        $regex: `^${escapeRegex(name.trim())}$`,
        $options: 'i'
      }
    });

    if (duplicateProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product already exists in this category'
      });
    }

    const product = await Product.create({
      [PRODUCT_CATEGORY_FIELD]: nextCategoryId,
      name: name.trim(),
      winMultiplier: Number(winMultiplier),
      description: description?.trim() || '',
      status: status !== false,
      createdBy: getUserLabel(req),
      updatedBy: getUserLabel(req)
    });

    const populatedProduct = await applyProductPopulate(
      Product.findById(product._id)
    );

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: populatedProduct
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const { categoryId, category, name, winMultiplier, description, status } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const nextCategoryId =
      categoryId ||
      category ||
      product.categoryId ||
      product.category;

    const categoryError = await validateCategoryExists(nextCategoryId);

    if (categoryError) {
      return res.status(400).json({
        success: false,
        message: categoryError
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required'
      });
    }

    if (winMultiplier === null || winMultiplier === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Win multiplier is required'
      });
    }

    if (Number(winMultiplier) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Win multiplier cannot be negative'
      });
    }

    const duplicateProduct = await Product.findOne({
      _id: {
        $ne: product._id
      },
      ...buildProductCategoryFilter(nextCategoryId),
      name: {
        $regex: `^${escapeRegex(name.trim())}$`,
        $options: 'i'
      }
    });

    if (duplicateProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product already exists in this category'
      });
    }

    product[PRODUCT_CATEGORY_FIELD] = nextCategoryId;
    product.name = name.trim();
    product.winMultiplier = Number(winMultiplier);
    product.description = description?.trim() || '';
    product.status = status !== false;
    product.updatedBy = getUserLabel(req);

    await product.save();

    const populatedProduct = await applyProductPopulate(
      Product.findById(product._id)
    );

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: populatedProduct
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const assignedPlayCount = await LotteryPlay.countDocuments(
      buildProductPlayFilter(id)
    );

    if (assignedPlayCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete product because it is assigned to ${assignedPlayCount} play(s)`
      });
    }

    await Product.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};