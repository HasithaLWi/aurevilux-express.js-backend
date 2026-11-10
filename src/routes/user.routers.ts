import { Router } from "express";
import {
  getUserProfile,
  updateUserProfile,
  getSavedAddresses,
  addSavedAddress,
  deleteSavedAddress,
  getPaymentCards,
  addPaymentCard,
  deletePaymentCard,
} from "../controllers/user.controller";
import { authenticate } from "../middlewares/auth";

const router = Router();

// All user profile endpoints require authentication
router.use(authenticate);

router.get("/profile", getUserProfile);
router.put("/profile", updateUserProfile);

router.get("/addresses", getSavedAddresses);
router.post("/addresses", addSavedAddress);
router.delete("/addresses/:id", deleteSavedAddress);

router.get("/cards", getPaymentCards);
router.post("/cards", addPaymentCard);
router.delete("/cards/:id", deletePaymentCard);

export default router;

