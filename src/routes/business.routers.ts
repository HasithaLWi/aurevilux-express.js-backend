import { Router } from "express";
import {
  getBusinessInfo,
  updateBusinessInfo,
} from "../controllers/business.controller";
import { authenticate } from "../middlewares/auth";
import { requireRole } from "../middlewares/role";
import { UserRole } from "../models/user.model";

const router = Router();

// Public retrieval for storefront, policies, lookbook, and footer
router.get("/", getBusinessInfo);

// Protected admin update
router.put(
  "/",
  authenticate,
  requireRole([UserRole.SUPERADMIN, UserRole.ADMIN]),
  updateBusinessInfo
);

export default router;
