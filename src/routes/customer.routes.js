import express from "express";

import {
  createCustomer,
  deleteCustomer,
  depositCustomerBalance,
  getCustomerById,
  getCustomers,
  getMyCustomerProfile,
  setCustomerBalance,
  updateCustomer,
  updateCustomerBalance,
  updateCustomerStatus,
  withdrawCustomerBalance,
} from "../controllers/customer.controller.js";

import {
  authorizeRoles,
  protect,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

router.get(
  "/me",
  authorizeRoles("customer"),
  getMyCustomerProfile,
);

router
  .route("/")
  .get(
    authorizeRoles("admin"),
    getCustomers,
  )
  .post(
    authorizeRoles("admin"),
    createCustomer,
  );

router.patch(
  "/:id/balance",
  authorizeRoles("admin"),
  updateCustomerBalance,
);

router.patch(
  "/:id/balance/set",
  authorizeRoles("admin"),
  setCustomerBalance,
);

router.patch(
  "/:id/balance/deposit",
  authorizeRoles("admin"),
  depositCustomerBalance,
);

router.patch(
  "/:id/balance/withdraw",
  authorizeRoles("admin"),
  withdrawCustomerBalance,
);

router.patch(
  "/:id/status",
  authorizeRoles("admin"),
  updateCustomerStatus,
);

router
  .route("/:id")
  .get(
    authorizeRoles("admin"),
    getCustomerById,
  )
  .put(
    authorizeRoles("admin"),
    updateCustomer,
  )
  .patch(
    authorizeRoles("admin"),
    updateCustomer,
  )
  .delete(
    authorizeRoles("admin"),
    deleteCustomer,
  );

export default router;
