import mongoose from 'mongoose';
import Rate from '../models/Rate.js';

const getCurrentUserName = (req) => {
  return req.user?.name || req.user?.email || 'System';
};

const isValidMongoId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

export const getRates = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const search = req.query.search?.trim() || '';
    const status = req.query.status;

    const filter = {};

    if (search) {
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

    if (status === 'true') {
      filter.status = true;
    }

    if (status === 'false') {
      filter.status = false;
    }

    const [rates, total] = await Promise.all([
      Rate.find(filter)
        .sort({
          createdAt: -1
        })
        .skip(skip)
        .limit(limit),

      Rate.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      message: 'Rates fetched successfully',
      data: rates,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getRateById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidMongoId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rate ID'
      });
    }

    const rate = await Rate.findById(id);

    if (!rate) {
      return res.status(404).json({
        success: false,
        message: 'Rate not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Rate fetched successfully',
      data: rate
    });
  } catch (error) {
    next(error);
  }
};

export const createRate = async (req, res, next) => {
  try {
    const { name, number, description, status } = req.body;

    if (number === null || number === undefined || number === '') {
      return res.status(400).json({
        success: false,
        message: 'Rate number is required'
      });
    }

    if (Number(number) < 0) {
      return res.status(400).json({
        success: false,
        message: 'Rate number cannot be negative'
      });
    }

    const rateName = name?.trim() || `${Number(number)}%`;

    const duplicateRate = await Rate.findOne({
      name: rateName
    });

    if (duplicateRate) {
      return res.status(400).json({
        success: false,
        message: 'Rate name already exists'
      });
    }

    const currentUser = getCurrentUserName(req);

    const rate = await Rate.create({
      name: rateName,
      number: Number(number),
      description,
      status,
      createdBy: currentUser,
      updatedBy: currentUser
    });

    return res.status(201).json({
      success: true,
      message: 'Rate created successfully',
      data: rate
    });
  } catch (error) {
    next(error);
  }
};

export const updateRate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, number, description, status } = req.body;

    if (!isValidMongoId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rate ID'
      });
    }

    const rate = await Rate.findById(id);

    if (!rate) {
      return res.status(404).json({
        success: false,
        message: 'Rate not found'
      });
    }

    if (number !== undefined) {
      if (number === null || number === '') {
        return res.status(400).json({
          success: false,
          message: 'Rate number is required'
        });
      }

      if (Number(number) < 0) {
        return res.status(400).json({
          success: false,
          message: 'Rate number cannot be negative'
        });
      }

      rate.number = Number(number);
    }

    if (name !== undefined) {
      const nextName = name?.trim() || `${rate.number}%`;

      const duplicateRate = await Rate.findOne({
        _id: {
          $ne: id
        },
        name: nextName
      });

      if (duplicateRate) {
        return res.status(400).json({
          success: false,
          message: 'Rate name already exists'
        });
      }

      rate.name = nextName;
    }

    if (description !== undefined) {
      rate.description = description;
    }

    if (status !== undefined) {
      rate.status = Boolean(status);
    }

    rate.updatedBy = getCurrentUserName(req);

    await rate.save();

    return res.status(200).json({
      success: true,
      message: 'Rate updated successfully',
      data: rate
    });
  } catch (error) {
    next(error);
  }
};

export const deleteRate = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidMongoId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid rate ID'
      });
    }

    const rate = await Rate.findById(id);

    if (!rate) {
      return res.status(404).json({
        success: false,
        message: 'Rate not found'
      });
    }

    await rate.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Rate deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};