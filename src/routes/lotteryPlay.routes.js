import express from 'express';

import {
  getLotteryPlays,
  getLotteryPlayById,
  createLotteryPlay,
  updateLotteryPlay,
  deleteLotteryPlay
} from '../controllers/lotteryPlay.controller.js';

import {
  protect,
  authorizeRoles
} from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getLotteryPlays);
router.get('/:id', getLotteryPlayById);

router.post(
  '/',
  authorizeRoles('admin', 'user'),
  createLotteryPlay
);

router.put(
  '/:id',
  authorizeRoles('admin', 'user'),
  updateLotteryPlay
);

router.delete(
  '/:id',
  authorizeRoles('admin'),
  deleteLotteryPlay
);

export default router;
