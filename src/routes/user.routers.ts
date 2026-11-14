import { Router } from "express";
import {
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
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
router.get("/me", getUserProfile);
router.put("/profile", updateUserProfile);
router.put("/me", updateUserProfile);
router.put("/password", changeUserPassword);
router.put("/me/password", changeUserPassword);

router.get("/addresses", getSavedAddresses);
router.get("/me/addresses", getSavedAddresses);
router.post("/addresses", addSavedAddress);
router.post("/me/addresses", addSavedAddress);
router.delete("/addresses/:id", deleteSavedAddress);
router.delete("/me/addresses/:id", deleteSavedAddress);

router.get("/cards", getPaymentCards);
router.get("/me/cards", getPaymentCards);
router.post("/cards", addPaymentCard);
router.post("/me/cards", addPaymentCard);
router.delete("/cards/:id", deletePaymentCard);
router.delete("/me/cards/:id", deletePaymentCard);

export default router;

