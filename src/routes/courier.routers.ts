import { Router } from "express";
import {
  getAllCouriers,
  createCourier,
  updateCourier,
  toggleCourierActive,
  deleteCourier,
} from "../controllers/courier.controller";
import { authenticate } from "../middlewares/auth";
import { requireRole } from "../middlewares/role";
import { UserRole } from "../models/user.model";

const router = Router();

// Public / Authenticated read
router.get("/", getAllCouriers);

// Admin-only management
router.post(
  "/",
  authenticate,
  requireRole([UserRole.SUPERADMIN, UserRole.ADMIN]),
  createCourier
);
router.put(
  "/:id",
  authenticate,
  requireRole([UserRole.SUPERADMIN, UserRole.ADMIN]),
  updateCourier
);
router.patch(
  "/:id/toggle-active",
  authenticate,
  requireRole([UserRole.SUPERADMIN, UserRole.ADMIN]),
  toggleCourierActive
);
router.delete(
  "/:id",
  authenticate,
  requireRole([UserRole.SUPERADMIN, UserRole.ADMIN]),
  deleteCourier
);

export default router;
