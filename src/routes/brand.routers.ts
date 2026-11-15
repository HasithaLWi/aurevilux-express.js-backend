import { Router } from "express";
import {
  getAllBrands,
  getBrandByIdOrSlug,
  submitBrandApplication,
  createBrand,
  updateBrand,
  toggleBrandActive,
  deleteBrand,
} from "../controllers/brand.controller";
import { authenticate } from "../middlewares/auth";
import { requireRole } from "../middlewares/role";
import { UserRole } from "../models/user.model";

const router = Router();

// Public routes
router.get("/", getAllBrands);
router.get("/:id", getBrandByIdOrSlug);
router.post("/apply", submitBrandApplication); // Public brand application form

// Admin-only protected routes
router.post("/", authenticate, requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]), createBrand);
router.put("/:id", authenticate, requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]), updateBrand);
router.patch("/:id/toggle-active", authenticate, requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]), toggleBrandActive);
router.delete("/:id", authenticate, requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]), deleteBrand);

export default router;

