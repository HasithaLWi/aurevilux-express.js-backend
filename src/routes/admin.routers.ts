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
  getPendingStaffApprovals,
  approveStaffMember,
  rejectStaffMember,
  revokeInvitation,
} from "../controllers/admin.controller";
import { authenticate } from "../middlewares/auth";
import { requireRole } from "../middlewares/role";
import { UserRole } from "../models/user.model";

const router = Router();

// Analytics (protected — admin/staff only)
router.get(
  "/analytics",
  authenticate,
  requireRole([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.STAFF]),
  getDashboardAnalytics
);

// Brand applications (protected)
router.get(
  "/brand-applications",
  authenticate,
  requireRole([UserRole.SUPERADMIN, UserRole.ADMIN]),
  getBrandApplications
);
router.patch(
  "/brand-applications/:id/status",
  authenticate,
  requireRole([UserRole.SUPERADMIN, UserRole.ADMIN]),
  updateBrandApplicationStatus
);

// Product Reviews moderation (protected)
router.get(
  "/reviews",
  authenticate,
  requireRole([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.STAFF]),
  getReviewsForModeration
);
router.delete(
  "/reviews/:reviewId",
  authenticate,
  requireRole([UserRole.SUPERADMIN, UserRole.ADMIN]),
  deleteReviewAdmin
);

// Staff Approval Queue (SUPERADMIN/ADMIN only)
router.get(
  "/staff/pending-approvals",
  authenticate,
  requireRole([UserRole.SUPERADMIN, UserRole.ADMIN]),
  getPendingStaffApprovals
);
router.patch(
  "/staff/:id/approve",
  authenticate,
  requireRole([UserRole.SUPERADMIN, UserRole.ADMIN]),
  approveStaffMember
);
router.patch(
  "/staff/:id/reject",
  authenticate,
  requireRole([UserRole.SUPERADMIN, UserRole.ADMIN]),
  rejectStaffMember
);

// Invitation management
router.delete(
  "/invites/:id",
  authenticate,
  requireRole([UserRole.SUPERADMIN, UserRole.ADMIN]),
  revokeInvitation
);

// Staff & Team Management
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
