import { Router } from "express";
import {
  createOrder,
  getMyOrders,
  getOrderByIdOrNumber,
  cancelOrderCustomer,
  getAllOrdersAdmin,
  updateOrderStatus,
  updateOrderTracking,
} from "../controllers/order.controller";
import { authenticate } from "../middlewares/auth";

const router = Router();

// Customer endpoints
router.post("/", createOrder); // Place order (authenticated or guest checkout)
router.get("/me", authenticate, getMyOrders); // Get logged-in user's orders
router.get("/:id", getOrderByIdOrNumber); // Get order tracking details
router.patch("/:id/cancel", authenticate, cancelOrderCustomer); // Cancel order before processing

// Admin / Back-Office order management
router.get("/admin/all", getAllOrdersAdmin);
router.patch("/:id/status", updateOrderStatus);
router.patch("/:id/tracking", updateOrderTracking);

export default router;
