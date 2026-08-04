import express from "express";

import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
} from "../controllers/product.controller.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Collection routes
|--------------------------------------------------------------------------
*/

router.route("/").get(getProducts).post(createProduct);

/*
|--------------------------------------------------------------------------
| Status route
|--------------------------------------------------------------------------
|
| Keep this route before /:id.
|
*/

router.patch("/:id/status", updateProductStatus);

/*
|--------------------------------------------------------------------------
| Product routes
|--------------------------------------------------------------------------
*/

router
  .route("/:id")
  .get(getProductById)
  .put(updateProduct)
  .patch(updateProduct)
  .delete(deleteProduct);

export default router;
