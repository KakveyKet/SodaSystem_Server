import express from "express";

import {
  getMe,
  login,
  registerAccountByAdmin,
  registerUser,
} from "../controllers/auth.controller.js";

import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/register", registerUser);

/* Preserves your existing public secret admin-registration flow. */
router.post("/admin-register", registerAccountByAdmin);

router.get("/me", protect, getMe);
router.get("/profile", protect, getMe);

export default router;
