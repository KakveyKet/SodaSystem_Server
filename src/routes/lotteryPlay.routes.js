import express from 'express';

import {
  getLotteryPlays,
  getLotteryPlayById,
  createLotteryPlay,
  updateLotteryPlay,
  updateLotteryPlayCheckedStatus,
  deleteLotteryPlay
} from '../controllers/lotteryPlay.controller.js';

import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getLotteryPlays);
router.post('/', createLotteryPlay);
router.get('/:id', getLotteryPlayById);
router.put('/:id', updateLotteryPlay);
router.patch('/:id/checked-status', updateLotteryPlayCheckedStatus);
router.delete('/:id', deleteLotteryPlay);

export default router;