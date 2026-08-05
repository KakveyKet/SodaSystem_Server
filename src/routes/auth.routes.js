import express from "express";

import {
  getMe,
  login,
  logout,
  registerAccountByAdmin,
  registerAdmin,
} from "../controllers/auth.controller.js";

import {
  authorizeRoles,
  protect,
} from "../middleware/auth.middleware.js";

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| Public routes
|--------------------------------------------------------------------------
*/

/*
 * Creates a super administrator.
 *
 * The controller always uses role: "admin".
 */
router.post(
  "/admin-register",
  registerAdmin,
);

router.post(
  "/login",
  login,
);

/*
|--------------------------------------------------------------------------
| Authenticated routes
|--------------------------------------------------------------------------
*/

router.get(
  "/me",
  protect,
  getMe,
);

router.post(
  "/logout",
  protect,
  logout,
);

/*
|--------------------------------------------------------------------------
| Administrator routes
|--------------------------------------------------------------------------
*/

router.post(
  "/register",
  protect,
  authorizeRoles("admin"),
  registerAccountByAdmin,
);

export default router;