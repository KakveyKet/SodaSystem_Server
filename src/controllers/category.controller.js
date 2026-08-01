import Category from '../models/Category.js';
import Product from '../models/Product.js';
import LotteryPlay from '../models/LotteryPlay.js';

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

const buildCategoryProductFilter = (categoryId) => {
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

const buildCategoryPlayFilter = (categoryId, productIds = []) => {
  const orFilters = [
    {
      categoryId
    },
    {
      category: categoryId
    }
  ];

  if (productIds.length > 0) {
    orFilters.push({
      productId: {
        $in: productIds
      }
    });

    orFilters.push({
      product: {
        $in: productIds
      }
    });
  }

  return {
    $or: orFilters
  };
};

export const getCategories = async (req, res, next) => {
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

    const status = parseBoolean(req.query.status);

    if (status !== null) {
      filter.status = status;
    }

    const [categories, total] = await Promise.all([
      Category.find(filter)
        .sort({
          createdAt: -1
        })
        .skip(skip)
        .limit(limit),
      Category.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      data: categories,
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

export const getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const { name, description, status } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    const duplicateCategory = await Category.findOne({
      name: {
        $regex: `^${escapeRegex(name.trim())}$`,
        $options: 'i'
      }
    });

    if (duplicateCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists'
      });
    }

    const category = await Category.create({
      name: name.trim(),
      description: description?.trim() || '',
      status: status !== false,
      createdBy: req.user?.name || req.user?.email || 'System',
      updatedBy: req.user?.name || req.user?.email || 'System'
    });

    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { name, description, status } = req.body;

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    const duplicateCategory = await Category.findOne({
      _id: {
        $ne: category._id
      },
      name: {
        $regex: `^${escapeRegex(name.trim())}$`,
        $options: 'i'
      }
    });

    if (duplicateCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category name already exists'
      });
    }

    category.name = name.trim();
    category.description = description?.trim() || '';
    category.status = status !== false;
    category.updatedBy = req.user?.name || req.user?.email || 'System';

    await category.save();

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    const assignedProductCount = await Product.countDocuments({
      $or: [
        {
          categoryId: id
        },
        {
          category: id
        }
      ]
    });

    if (assignedProductCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category because it is assigned to ${assignedProductCount} product(s)`
      });
    }

    const assignedPlayCount = await LotteryPlay.countDocuments({
      $or: [
        {
          categoryId: id
        },
        {
          category: id
        }
      ]
    });

    if (assignedPlayCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category because it is assigned to ${assignedPlayCount} play(s)`
      });
    }

    await Category.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};