import express from "express";

import {
  getMyInvoiceById,
  getMyInvoices,
} from "../controllers/customerInvoice.controller.js";

import {
  authorizeRoles,
  protect,
} from "../middleware/auth.middleware.js";

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| All routes require a Customer account
|--------------------------------------------------------------------------
*/

router.use(protect);

router.use(
  authorizeRoles(
    "customer"
  )
);

/*
|--------------------------------------------------------------------------
| Read-only routes
|--------------------------------------------------------------------------
|
| There are intentionally no POST, PUT, PATCH, or DELETE routes.
|
*/

router.get(
  "/",
  getMyInvoices
);

router.get(
  "/:id",
  getMyInvoiceById
);

export default router;