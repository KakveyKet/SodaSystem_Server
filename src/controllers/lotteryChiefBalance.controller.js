import mongoose from 'mongoose';
import LotteryChiefBalance from '../models/LotteryChiefBalance.js';

const getCurrentUserName = (req) => {
  return req.user?.name || req.user?.email || 'System';
};

const parsePositiveAmount = (amount) => {
  const parsedAmount = Number(amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return null;
  }

  return parsedAmount;
};

const normalizeInvoiceIds = (invoiceIds) => {
  if (!invoiceIds) {
    return [];
  }

  if (!Array.isArray(invoiceIds)) {
    return [];
  }

  return invoiceIds
    .map((id) => String(id).trim())
    .filter((id) => id.length > 0);
};

export const getLotteryChiefBalances = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const branchId = req.query.branchId?.trim() || '';
    const status = req.query.status;

    const skip = (page - 1) * limit;

    const filter = {};

    if (branchId) {
      filter.branchId = branchId;
    }

    if (status === 'true') {
      filter.status = true;
    }

    if (status === 'false') {
      filter.status = false;
    }

    const [balances, total] = await Promise.all([
      LotteryChiefBalance.find(filter)
        .populate('lastChiefExpenseId')
        .sort({
          createdAt: -1
        })
        .skip(skip)
        .limit(limit),

      LotteryChiefBalance.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      message: 'Lottery chief balances fetched successfully',
      data: balances,
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

export const getLotteryChiefBalanceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lottery chief balance ID'
      });
    }

    const balance = await LotteryChiefBalance.findById(id).populate(
      'lastChiefExpenseId'
    );

    if (!balance) {
      return res.status(404).json({
        success: false,
        message: 'Lottery chief balance not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Lottery chief balance fetched successfully',
      data: balance
    });
  } catch (error) {
    next(error);
  }
};

export const addLotteryChiefWinAmount = async (req, res, next) => {
  try {
    const { branchId, invoiceIds, amount } = req.body;

    if (!branchId || !branchId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required'
      });
    }

    const winAmount = parsePositiveAmount(amount);

    if (!winAmount) {
      return res.status(400).json({
        success: false,
        message: 'Win amount must be greater than 0'
      });
    }

    const currentUser = getCurrentUserName(req);
    const normalizedInvoiceIds = normalizeInvoiceIds(invoiceIds);

    const balance = await LotteryChiefBalance.findOneAndUpdate(
      {
        branchId: branchId.trim()
      },
      {
        $inc: {
          amount: winAmount
        },
        $addToSet: {
          invoiceIds: {
            $each: normalizedInvoiceIds
          }
        },
        $set: {
          status: true,
          updatedBy: currentUser
        },
        $setOnInsert: {
          branchId: branchId.trim(),
          createdBy: currentUser
        }
      },
      {
        new: true,
        upsert: true
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Lottery chief win amount added successfully',
      data: balance
    });
  } catch (error) {
    next(error);
  }
};

export const updateLotteryChiefBalanceStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lottery chief balance ID'
      });
    }

    if (typeof status !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Status must be boolean'
      });
    }

    const balance = await LotteryChiefBalance.findById(id);

    if (!balance) {
      return res.status(404).json({
        success: false,
        message: 'Lottery chief balance not found'
      });
    }

    balance.status = status;
    balance.updatedBy = getCurrentUserName(req);

    await balance.save();

    return res.status(200).json({
      success: true,
      message: 'Lottery chief balance status updated successfully',
      data: balance
    });
  } catch (error) {
    next(error);
  }
};