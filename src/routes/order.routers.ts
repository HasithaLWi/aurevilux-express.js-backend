import { Router } from "express";
import {
  createOrder,
  getMyOrders,
  getOrderByIdOrNumber,
  cancelOrderCustomer,
  getAllOrdersAdmin,
  updateOrderStatus,
  updateOrderTracking,
  validateCart,
} from "../controllers/order.controller";
import { authenticate, optionalAuthenticate } from "../middlewares/auth";
import { requireRole } from "../middlewares/role";
import { UserRole } from "../models/user.model";

const router = Router();

// Cart stock validation (pre-checkout, public)
router.post("/validate-cart", validateCart);

// Customer endpoints
router.post("/", optionalAuthenticate, createOrder); // Guest checkout allowed
router.get("/me", authenticate, getMyOrders);
router.get("/:id", getOrderByIdOrNumber);
router.patch("/:id/cancel", authenticate, cancelOrderCustomer);

// Admin / Back-Office order management (protected)
router.get("/admin/all", authenticate, requireRole([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.STAFF]), getAllOrdersAdmin);
router.patch("/:id/status", authenticate, requireRole([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.STAFF]), updateOrderStatus);
router.patch("/:id/tracking", authenticate, requireRole([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.STAFF]), updateOrderTracking);

export default router;
