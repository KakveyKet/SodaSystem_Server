import express from 'express';

import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  depositCustomerBalance,
  getCustomerTransactions
} from '../controllers/customer.controller.js';

import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getCustomers);
router.post('/', createCustomer);

router.post('/:id/deposit', depositCustomerBalance);
router.get('/:id/transactions', getCustomerTransactions);

router.get('/:id', getCustomerById);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;