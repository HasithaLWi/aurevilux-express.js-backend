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
import { requireRole } from "../middlewares/role";
import { UserRole } from "../models/user.model";

const router = Router();

// Public routes
router.get("/", getAllProducts);
router.get("/:id", getProductByIdOrSlug);

// Protected customer review (any authenticated user)
router.post("/:id/reviews", authenticate, addProductReview);

// Back-Office / Admin catalog endpoints (protected)
router.post("/", authenticate, requireRole([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.STAFF]), createProduct);
router.put("/:id", authenticate, requireRole([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.STAFF]), updateProduct);
router.patch("/:id/toggle-active", authenticate, requireRole([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.STAFF]), toggleProductActive);
router.delete("/:id", authenticate, requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]), deleteProduct);
router.patch("/:id/stock", authenticate, requireRole([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.STAFF]), updateProductStock);

export default router;

