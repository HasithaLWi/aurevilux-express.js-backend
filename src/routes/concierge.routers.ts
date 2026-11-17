import { Router } from "express";
import {
  handleConciergeChat,
  getConciergeStatus,
} from "../controllers/concierge.controller";

const router = Router();

// Public Storefront Endpoints for Patrons
router.post("/chat", handleConciergeChat);
router.get("/status", getConciergeStatus);

export default router;
