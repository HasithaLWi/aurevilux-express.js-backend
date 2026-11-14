import { Router } from "express";
import {
  getMyDetails,
  getRrefreshToken,
  login,
  register,
  googleAuth,
  registerWithInvite,
  verifyInvite,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth";

const router = Router();

router.post("/register", register);
router.post("/register-invite", registerWithInvite);
router.get("/verify-invite/:token", verifyInvite);
router.post("/login", login);
router.post("/google", googleAuth);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", authenticate, getMyDetails);
router.post("/refresh-token", getRrefreshToken);

export default router;
