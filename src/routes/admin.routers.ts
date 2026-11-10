import { Router } from "express";
import {
  getDashboardAnalytics,
  getBrandApplications,
  updateBrandApplicationStatus,
  getReviewsForModeration,
  deleteReviewAdmin,
} from "../controllers/admin.controller";

const router = Router();

router.get("/analytics", getDashboardAnalytics);
router.get("/brand-applications", getBrandApplications);
router.patch("/brand-applications/:id/status", updateBrandApplicationStatus);
router.get("/reviews", getReviewsForModeration);
router.delete("/reviews/:reviewId", deleteReviewAdmin);

export default router;

