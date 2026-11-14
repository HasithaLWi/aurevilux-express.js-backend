import { Router } from "express";
import {
  getAllProducts,
  getProductByIdOrSlug,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
  toggleProductActive,
  addProductReview,
} from "../controllers/product.controller";
import { authenticate } from "../middlewares/auth";

const router = Router();

// Public routes
router.get("/", getAllProducts);
router.get("/:id", getProductByIdOrSlug);

// Protected customer review
router.post("/:id/reviews", authenticate, addProductReview);

// Back-Office / Admin catalog endpoints
router.post("/", createProduct);
router.put("/:id", updateProduct);
router.patch("/:id/toggle-active", toggleProductActive);
router.delete("/:id", deleteProduct);
router.patch("/:id/stock", updateProductStock);

export default router;

