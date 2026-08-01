import express from 'express';

import {
  getLotteryChiefBalances,
  getLotteryChiefBalanceById,
  addLotteryChiefWinAmount,
  updateLotteryChiefBalanceStatus
} from '../controllers/lotteryChiefBalance.controller.js';

import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getLotteryChiefBalances);
router.post('/add-win', addLotteryChiefWinAmount);
router.get('/:id', getLotteryChiefBalanceById);
router.patch('/:id/status', updateLotteryChiefBalanceStatus);

export default router;