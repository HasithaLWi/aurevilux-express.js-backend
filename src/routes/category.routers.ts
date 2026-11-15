import { Router } from "express";
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryActive,
} from "../controllers/category.controller";
import { authenticate } from "../middlewares/auth";
import { requireRole } from "../middlewares/role";
import { UserRole } from "../models/user.model";

const router = Router();

// Public routes
router.get("/", getAllCategories);
router.get("/:id", getCategoryById);

// Admin-only protected routes
router.post("/", authenticate, requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]), createCategory);
router.put("/:id", authenticate, requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]), updateCategory);
router.patch("/:id/toggle-active", authenticate, requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]), toggleCategoryActive);
router.delete("/:id", authenticate, requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]), deleteCategory);

export default router;

