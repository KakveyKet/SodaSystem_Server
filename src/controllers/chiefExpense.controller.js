import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import ChiefExpense from '../models/ChiefExpense.js';
import LotteryChiefBalance from '../models/LotteryChiefBalance.js';

const getCurrentUserName = (req) => {
  return req.user?.name || req.user?.email || 'System';
};

const isValidMongoId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const parsePositiveAmount = (amount) => {
  const parsedAmount = Number(amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return null;
  }

  return parsedAmount;
};

export const getChiefExpenses = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const branchId = req.query.branchId?.trim() || '';
    const customerId = req.query.customerId?.trim() || '';
    const search = req.query.search?.trim() || '';

    const skip = (page - 1) * limit;

    const filter = {};

    if (branchId) {
      filter.branchId = branchId;
    }

    if (customerId) {
      if (!isValidMongoId(customerId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer ID'
        });
      }

      filter.customerId = customerId;
    }

    if (search) {
      filter.description = {
        $regex: search,
        $options: 'i'
      };
    }

    const [expenses, total] = await Promise.all([
      ChiefExpense.find(filter)
        .populate('customerId', 'branchId username phoneNumber balance status')
        .sort({
          createdAt: -1
        })
        .skip(skip)
        .limit(limit),

      ChiefExpense.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      message: 'Chief expenses fetched successfully',
      data: expenses,
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

export const getChiefExpenseById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidMongoId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid chief expense ID'
      });
    }

    const expense = await ChiefExpense.findById(id).populate(
      'customerId',
      'branchId username phoneNumber balance status'
    );

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Chief expense not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Chief expense fetched successfully',
      data: expense
    });
  } catch (error) {
    next(error);
  }
};

export const createChiefExpense = async (req, res, next) => {
  try {
    const { branchId, customerId, paymentDate, amount, description } = req.body;

    if (!branchId || !branchId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required'
      });
    }

    if (!customerId || !isValidMongoId(customerId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid customer ID is required'
      });
    }

    const paymentAmount = parsePositiveAmount(amount);

    if (!paymentAmount) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const currentUser = getCurrentUserName(req);

    const balanceBeforePayment = await LotteryChiefBalance.findOneAndUpdate(
      {
        branchId: branchId.trim(),
        status: true,
        amount: {
          $gte: paymentAmount
        }
      },
      {
        $inc: {
          amount: -paymentAmount
        },
        $set: {
          updatedBy: currentUser
        }
      },
      {
        new: false
      }
    );

    if (!balanceBeforePayment) {
      return res.status(400).json({
        success: false,
        message:
          'Lottery chief balance is not enough, inactive, or does not exist for this branch'
      });
    }

    const expense = await ChiefExpense.create({
      branchId: branchId.trim(),
      customerId,
      paymentDate: paymentDate || new Date(),
      amount: paymentAmount,
      description,
      createdBy: currentUser
    });

    const updatedBalance = await LotteryChiefBalance.findOneAndUpdate(
      {
        branchId: branchId.trim()
      },
      {
        $set: {
          lastChiefExpenseId: expense._id,
          updatedBy: currentUser
        }
      },
      {
        new: true
      }
    ).populate('lastChiefExpenseId');

    const populatedExpense = await ChiefExpense.findById(expense._id).populate(
      'customerId',
      'branchId username phoneNumber balance status'
    );

    return res.status(201).json({
      success: true,
      message:
        'Chief expense created successfully and lottery chief balance deducted',
      data: {
        expense: populatedExpense,
        lotteryChiefBalance: updatedBalance
      }
    });
  } catch (error) {
    next(error);
  }
};