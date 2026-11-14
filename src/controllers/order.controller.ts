import { Request, Response } from "express";
import { OrderModel } from "../models/order.model";
import { AuthRequest } from "../middlewares/auth";

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { items, total, customer, shippingAddress } = req.body;

    if (!items || !items.length || !total || !customer || !shippingAddress) {
      return res.status(400).json({
        message: "Missing order details: items, total, customer info, and shipping address are required.",
      });
    }

    const orderNumber = `AUR-${new Date().getFullYear()}-${Math.floor(
      100000 + Math.random() * 900000
    )}`;

    const itemsCount = items.reduce(
      (sum: number, item: any) => sum + (item.quantity || 1),
      0
    );

    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const newOrder = new OrderModel({
      orderNumber,
      userId: req.user?.sub || null,
      items,
      total,
      itemsCount,
      customer,
      shippingAddress,
      status: "Pending", // Starts at Pending so customer can cancel before processing
      paymentStatus: "Paid",
      carrier: "DHL White Glove Concierge",
      trackingNumber: `EXP-${Math.floor(10000000 + Math.random() * 90000000)}`,
      estimatedDelivery: "3-5 Business Days",
      timeline: [
        { title: "Order Confirmed & Placed", date: formattedDate, completed: true },
        { title: "Atelier Tailoring & Quality Assurance", date: "Pending", completed: false },
        { title: "White Glove Packaging & Dispatch", date: "Pending", completed: false },
        { title: "Private Courier Delivery", date: "Pending", completed: false },
      ],
    });

    await newOrder.save();

    return res.status(201).json({
      message: "Order placed successfully",
      data: newOrder,
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    return res.status(500).json({ message: "Failed to place order", error: error.message });
  }
};

export const getMyOrders = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.sub) {
      return res.status(401).json({ message: "Unauthorized. Please log in to view orders." });
    }

    const userEmail = (req.user as any)?.email;
    const query = userEmail
      ? { $or: [{ userId: req.user.sub }, { "customer.email": userEmail.toLowerCase() }] }
      : { userId: req.user.sub };
    const orders = await OrderModel.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Orders retrieved successfully",
      data: orders,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to fetch orders", error: error.message });
  }
};

export const getOrderByIdOrNumber = async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) || "";
    let order = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      order = await OrderModel.findById(id);
    }
    if (!order) {
      order = await OrderModel.findOne({ orderNumber: id.toUpperCase() });
    }

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json({
      message: "Order retrieved successfully",
      data: order,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to retrieve order", error: error.message });
  }
};

export const cancelOrderCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const rawId = req.params.id;
    const id = (Array.isArray(rawId) ? rawId[0] : rawId) || "";
    let order = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      order = await OrderModel.findById(id);
    }
    if (!order) {
      order = await OrderModel.findOne({ orderNumber: id.toUpperCase() });
    }

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    // Security check: if authenticated, verify ownership unless admin
    if (req.user?.sub && order.userId && order.userId.toString() !== req.user.sub.toString()) {
      const isStaffOrAdmin = req.user.roles?.some((r: string) =>
        ["SUPERADMIN", "ADMIN", "STAFF"].includes(r)
      );
      if (!isStaffOrAdmin) {
        return res.status(403).json({ message: "Unauthorized to cancel this order." });
      }
    }

    // Cancellation guard: only allowed before processing
    const uncancelableStatuses = ["Processing", "In Transit", "Delivered", "Cancelled"];
    if (uncancelableStatuses.includes(order.status)) {
      return res.status(400).json({
        message: `Order cannot be cancelled because it is already '${order.status}'. Please contact our concierge.`,
      });
    }

    order.status = "Cancelled";
    order.timeline.push({
      title: "Order Cancelled by Patron",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      completed: true,
    });

    await order.save();

    return res.status(200).json({
      message: "Order successfully cancelled.",
      data: order,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to cancel order", error: error.message });
  }
};

export const getAllOrdersAdmin = async (req: Request, res: Response) => {
  try {
    const { status, page = "1", limit = "50" } = req.query;
    const filter: Record<string, any> = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    const pageNum = Math.max(1, parseInt(String(page), 10));
    const limitNum = Math.max(1, parseInt(String(limit), 10));
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      OrderModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      OrderModel.countDocuments(filter),
    ]);

    return res.status(200).json({
      message: "Admin orders list retrieved",
      data: orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to retrieve admin orders", error: error.message });
  }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required." });
    }

    const order = await OrderModel.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    order.status = status;
    order.timeline.push({
      title: note || `Status updated to ${status}`,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      completed: true,
    });

    await order.save();

    return res.status(200).json({
      message: "Order status updated successfully",
      data: order,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update order status", error: error.message });
  }
};

export const updateOrderTracking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { carrier, trackingNumber, estimatedDelivery } = req.body;

    const order = await OrderModel.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (carrier) order.carrier = carrier;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (estimatedDelivery) order.estimatedDelivery = estimatedDelivery;

    await order.save();

    return res.status(200).json({
      message: "Tracking details updated",
      data: order,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update tracking", error: error.message });
  }
};
