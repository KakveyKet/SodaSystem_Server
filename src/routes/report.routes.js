import express from "express";

import {
  getCustomerDepositReport,
} from "../controllers/customerReport.controller.js";

import {
  authorizeRoles,
  protect,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get(
  "/customer-deposits",
  authorizeRoles("admin"),
  getCustomerDepositReport,
);

export default router;
