import express from 'express';

import {
  getRates,
  getRateById,
  createRate,
  updateRate,
  deleteRate
} from '../controllers/rate.controller.js';

import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getRates);
router.post('/', createRate);
router.get('/:id', getRateById);
router.put('/:id', updateRate);
router.delete('/:id', deleteRate);

export default router;