import express from 'express';

import {
  getLotteryPlays,
  getLotteryPlayById,
  getMyLotteryPlays,
  getMyLotteryPlayById,
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

/*
|--------------------------------------------------------------------------
| Customer read-only invoice access
|--------------------------------------------------------------------------
|
| Customer ID is resolved from req.user on the backend.
| The frontend never gets permission to request another customer's invoices.
|
*/
router.get(
  '/me',
  authorizeRoles('customer'),
  getMyLotteryPlays
);

router.get(
  '/me/:id',
  authorizeRoles('customer'),
  getMyLotteryPlayById
);

/* Admin / staff invoice access */
router.get(
  '/',
  authorizeRoles('admin', 'user'),
  getLotteryPlays
);

router.get(
  '/:id',
  authorizeRoles('admin', 'user'),
  getLotteryPlayById
);

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
