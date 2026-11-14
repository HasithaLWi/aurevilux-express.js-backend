import { Router } from "express";
import {
  submitFeedback,
  getFeaturedTestimonials,
  getAllFeedbackAdmin,
  toggleFeatureFeedback,
  deleteFeedbackAdmin,
} from "../controllers/feedback.controller";

const router = Router();

router.post("/", submitFeedback);
router.get("/testimonials", getFeaturedTestimonials);
router.get("/admin", getAllFeedbackAdmin);
router.patch("/admin/:id/feature", toggleFeatureFeedback);
router.delete("/admin/:id", deleteFeedbackAdmin);

export default router;

