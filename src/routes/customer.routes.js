import express from "express";

import {
  createCustomer,
  deleteCustomer,
  getCustomerById,
  getCustomers,
  getMyCustomerProfile,
  updateCustomer,
  updateCustomerBalance,
  updateCustomerStatus,
} from "../controllers/customer.controller.js";

import {
  authorizeRoles,
  protect,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

/* Keep /me before /:id. */
router.get(
  "/me",
  authorizeRoles("customer"),
  getMyCustomerProfile,
);

router
  .route("/")
  .get(authorizeRoles("admin"), getCustomers)
  .post(authorizeRoles("admin"), createCustomer);

router.patch(
  "/:id/balance",
  authorizeRoles("admin"),
  updateCustomerBalance,
);

router.patch(
  "/:id/balance/set",
  authorizeRoles("admin"),
  (req, _res, next) => {
    req.body.operation = "set";
    next();
  },
  updateCustomerBalance,
);

router.patch(
  "/:id/balance/deposit",
  authorizeRoles("admin"),
  (req, _res, next) => {
    req.body.operation = "deposit";
    next();
  },
  updateCustomerBalance,
);

router.patch(
  "/:id/balance/withdraw",
  authorizeRoles("admin"),
  (req, _res, next) => {
    req.body.operation = "withdraw";
    next();
  },
  updateCustomerBalance,
);

router.patch(
  "/:id/status",
  authorizeRoles("admin"),
  updateCustomerStatus,
);

router
  .route("/:id")
  .get(authorizeRoles("admin"), getCustomerById)
  .put(authorizeRoles("admin"), updateCustomer)
  .patch(authorizeRoles("admin"), updateCustomer)
  .delete(authorizeRoles("admin"), deleteCustomer);

export default router;
