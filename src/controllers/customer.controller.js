import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import CustomerTransaction from '../models/CustomerTransaction.js';

const getCurrentUserName = (req) => {
  return req.user?.name || req.user?.email || 'System';
};

const isValidMongoId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const validatePercentages = (percentages) => {
  if (percentages === undefined) {
    return true;
  }

  if (!Array.isArray(percentages)) {
    return false;
  }

  return percentages.every((item) => {
    return item && typeof item === 'object' && !Array.isArray(item);
  });
};

const parsePositiveAmount = (amount) => {
  const parsedAmount = Number(amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return null;
  }

  return parsedAmount;
};

export const getCustomers = async (req, res, next) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const search = req.query.search?.trim() || '';
    const status = req.query.status;
    const branchId = req.query.branchId?.trim() || '';

    const skip = (page - 1) * limit;

    const filter = {};

    if (search) {
      filter.$or = [
        {
          username: {
            $regex: search,
            $options: 'i'
          }
        },
        {
          phoneNumber: {
            $regex: search,
            $options: 'i'
          }
        },
        {
          address: {
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

    if (branchId) {
      filter.branchId = branchId;
    }

    if (status === 'true') {
      filter.status = true;
    }

    if (status === 'false') {
      filter.status = false;
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .sort({
          createdAt: -1
        })
        .skip(skip)
        .limit(limit),

      Customer.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      message: 'Customers fetched successfully',
      data: customers,
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

export const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidMongoId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Customer fetched successfully',
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req, res, next) => {
  try {
    const {
      branchId,
      username,
      phoneNumber,
      address,
      description,
      percentages,
      status
    } = req.body;

    if (!branchId || !branchId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required'
      });
    }

    if (!username || !username.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }

    if (!validatePercentages(percentages)) {
      return res.status(400).json({
        success: false,
        message: 'Percentages must be an array of object/map values'
      });
    }

    const currentUser = getCurrentUserName(req);

    const customer = await Customer.create({
      branchId: branchId.trim(),
      username: username.trim(),
      phoneNumber,
      address,
      description,
      percentages,
      balance: 0,
      status,
      createdBy: currentUser,
      updatedBy: currentUser
    });

    return res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    const {
      branchId,
      username,
      phoneNumber,
      address,
      description,
      percentages,
      status
    } = req.body;

    if (!isValidMongoId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    if (branchId !== undefined) {
      if (!branchId.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Branch ID cannot be empty'
        });
      }

      customer.branchId = branchId.trim();
    }

    if (username !== undefined) {
      if (!username.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Username cannot be empty'
        });
      }

      customer.username = username.trim();
    }

    if (phoneNumber !== undefined) {
      customer.phoneNumber = phoneNumber;
    }

    if (address !== undefined) {
      customer.address = address;
    }

    if (description !== undefined) {
      customer.description = description;
    }

    if (percentages !== undefined) {
      if (!validatePercentages(percentages)) {
        return res.status(400).json({
          success: false,
          message: 'Percentages must be an array of object/map values'
        });
      }

      customer.percentages = percentages;
    }

    if (status !== undefined) {
      customer.status = status;
    }

    customer.updatedBy = getCurrentUserName(req);

    await customer.save();

    return res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidMongoId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    await CustomerTransaction.deleteMany({
      customerId: id
    });

    await customer.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const depositCustomerBalance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, note } = req.body;

    if (!isValidMongoId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    const depositAmount = parsePositiveAmount(amount);

    if (!depositAmount) {
      return res.status(400).json({
        success: false,
        message: 'Deposit amount must be greater than 0'
      });
    }

    const currentUser = getCurrentUserName(req);

    const customerBeforeDeposit = await Customer.findOneAndUpdate(
      {
        _id: id
      },
      {
        $inc: {
          balance: depositAmount
        },
        $set: {
          updatedBy: currentUser
        }
      },
      {
        new: false
      }
    );

    if (!customerBeforeDeposit) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const beforeBalance = Number(customerBeforeDeposit.balance || 0);
    const afterBalance = beforeBalance + depositAmount;

    const transaction = await CustomerTransaction.create({
      customerId: id,
      type: 'deposit',
      amount: depositAmount,
      beforeBalance,
      afterBalance,
      note,
      createdBy: currentUser
    });

    const updatedCustomer = await Customer.findById(id);

    return res.status(200).json({
      success: true,
      message: 'Deposit completed successfully',
      data: {
        customer: updatedCustomer,
        transaction
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getCustomerTransactions = async (req, res, next) => {
  try {
    const { id } = req.params;

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const type = req.query.type?.trim() || '';

    const skip = (page - 1) * limit;

    if (!isValidMongoId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    const customer = await Customer.findById(id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const filter = {
      customerId: id
    };

    if (type) {
      filter.type = type;
    }

    const [transactions, total] = await Promise.all([
      CustomerTransaction.find(filter)
        .sort({
          createdAt: -1
        })
        .skip(skip)
        .limit(limit),

      CustomerTransaction.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      message: 'Customer transactions fetched successfully',
      data: transactions,
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