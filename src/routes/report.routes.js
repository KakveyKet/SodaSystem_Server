import express from "express";

import {
  getCustomerDepositReport,
  getCustomerTransactionReport,
  getMyCustomerTransactionReport,
} from "../controllers/customerReport.controller.js";

import {
  authorizeRoles,
  protect,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

/* Customer can see ONLY their own report. */
router.get(
  "/my-transactions",
  authorizeRoles("customer"),
  getMyCustomerTransactionReport,
);

/* Admin report. */
router.get(
  "/customer-transactions",
  authorizeRoles("admin"),
  getCustomerTransactionReport,
);

/* Compatibility deposit-only admin report. */
router.get(
  "/customer-deposits",
  authorizeRoles("admin"),
  getCustomerDepositReport,
);

export default router;
