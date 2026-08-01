import express from 'express';

import {
  createUser,
  deleteUser,
  getMe,
  getUserById,
  getUsers,
  updateUser
} from '../controllers/user.controller.js';

import {
  protect
} from '../middleware/auth.middleware.js';

const router = express.Router();

const adminOnly = (
  req,
  res,
  next
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication is required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message:
        'Administrator access is required'
    });
  }

  next();
};

/*
|--------------------------------------------------------------------------
| Current authenticated user
|--------------------------------------------------------------------------
| Keep /me before /:id.
*/
router.get(
  '/me',
  protect,
  getMe
);

/*
|--------------------------------------------------------------------------
| User management
|--------------------------------------------------------------------------
| Only administrators can access these routes.
*/
router
  .route('/')
  .get(
    protect,
    adminOnly,
    getUsers
  )
  .post(
    protect,
    adminOnly,
    createUser
  );

router
  .route('/:id')
  .get(
    protect,
    adminOnly,
    getUserById
  )
  .put(
    protect,
    adminOnly,
    updateUser
  )
  .delete(
    protect,
    adminOnly,
    deleteUser
  );

export default router;