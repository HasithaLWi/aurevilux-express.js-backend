import { Router } from "express";
import {
  getDashboardAnalytics,
  getBrandApplications,
  updateBrandApplicationStatus,
  getReviewsForModeration,
  deleteReviewAdmin,
  getStaffRoster,
  inviteStaffMember,
  updateStaffMember,
  deleteStaffMember,
  toggleStaffActive,
  getAllCustomersAdmin,
  toggleCustomerActive,
} from "../controllers/admin.controller";
import { authenticate } from "../middlewares/auth";
import { requireRole } from "../middlewares/role";
import { UserRole } from "../models/user.model";

const router = Router();

// Public/Staff analytics & applications
router.get("/analytics", getDashboardAnalytics);
router.get("/brand-applications", getBrandApplications);
router.patch("/brand-applications/:id/status", updateBrandApplicationStatus);
router.get("/reviews", getReviewsForModeration);
router.delete("/reviews/:reviewId", deleteReviewAdmin);

// Staff & Team Management (Protected)
router.get(
  "/staff",
  authenticate,
  requireRole([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.STAFF]),
  getStaffRoster
);
router.post(
  "/staff/invite",
  authenticate,
  requireRole([UserRole.SUPERADMIN, UserRole.ADMIN]),
  inviteStaffMember
);
router.patch(
  "/staff/:id",
  authenticate,
  requireRole([UserRole.SUPERADMIN, UserRole.ADMIN]),
  updateStaffMember
);
router.delete(
  "/staff/:id",
  authenticate,
  requireRole([UserRole.SUPERADMIN, UserRole.ADMIN]),
  deleteStaffMember
);
router.patch(
  "/staff/:id/toggle-active",
  authenticate,
  requireRole([UserRole.SUPERADMIN, UserRole.ADMIN]),
  toggleStaffActive
);

// Customers Directory (Protected)
router.get(
  "/customers",
  authenticate,
  requireRole([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.STAFF]),
  getAllCustomersAdmin
);
router.patch(
  "/customers/:id/toggle-active",
  authenticate,
  requireRole([UserRole.SUPERADMIN, UserRole.ADMIN]),
  toggleCustomerActive
);

export default router;
