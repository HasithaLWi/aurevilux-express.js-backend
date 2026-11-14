import { Router } from "express";
import {
  subscribeNewsletter,
  getAllSubscribersAdmin,
  broadcastNewsletterAdmin,
  unsubscribeNewsletter,
  toggleSubscriberStatusAdmin,
  deleteSubscriberAdmin,
} from "../controllers/newsletter.controller";

const router = Router();

router.post("/subscribe", subscribeNewsletter);
router.post("/unsubscribe", unsubscribeNewsletter);
router.get("/unsubscribe", unsubscribeNewsletter);
router.get("/admin/subscribers", getAllSubscribersAdmin);
router.post("/admin/broadcast", broadcastNewsletterAdmin);
router.patch("/admin/subscribers/:id/status", toggleSubscriberStatusAdmin);
router.delete("/admin/subscribers/:id", deleteSubscriberAdmin);

export default router;

