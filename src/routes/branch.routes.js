import express from "express";

import {
  createBranch,
  deleteBranch,
  getBranchById,
  getBranches,
  updateBranch,
  updateBranchStatus,
} from "../controllers/branch.controller.js";

import {
  authorizeRoles,
  protect,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect);

/*
|--------------------------------------------------------------------------
| Read branches
|--------------------------------------------------------------------------
|
| Admin and normal staff can read active/reference branch data.
| Branch management itself is admin-only.
|
*/

router.get(
  "/",
  authorizeRoles(
    "admin",
    "user",
  ),
  getBranches,
);

router.get(
  "/:id",
  authorizeRoles(
    "admin",
    "user",
  ),
  getBranchById,
);

/*
|--------------------------------------------------------------------------
| Admin management
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  authorizeRoles(
    "admin",
  ),
  createBranch,
);

router.put(
  "/:id",
  authorizeRoles(
    "admin",
  ),
  updateBranch,
);

router.patch(
  "/:id",
  authorizeRoles(
    "admin",
  ),
  updateBranch,
);

router.patch(
  "/:id/status",
  authorizeRoles(
    "admin",
  ),
  updateBranchStatus,
);

router.delete(
  "/:id",
  authorizeRoles(
    "admin",
  ),
  deleteBranch,
);

export default router;
