import { Router } from "express";
import {
  subscribeNewsletter,
  getAllSubscribersAdmin,
  broadcastNewsletterAdmin,
  unsubscribeNewsletter,
} from "../controllers/newsletter.controller";

const router = Router();

router.post("/subscribe", subscribeNewsletter);
router.post("/unsubscribe", unsubscribeNewsletter);
router.get("/admin/subscribers", getAllSubscribersAdmin);
router.post("/admin/broadcast", broadcastNewsletterAdmin);

export default router;

