import express from 'express';

import {
  getChiefExpenses,
  getChiefExpenseById,
  createChiefExpense
} from '../controllers/chiefExpense.controller.js';

import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getChiefExpenses);
router.post('/', createChiefExpense);
router.get('/:id', getChiefExpenseById);

export default router;