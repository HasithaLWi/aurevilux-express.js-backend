import { Request, Response } from "express";
import { OrderModel } from "../models/order.model";
import { ProductModel } from "../models/product.model";
import { AuthRequest } from "../middlewares/auth";

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { items, total, customer, shippingAddress } = req.body;

    if (!items || !items.length || !total || !customer || !shippingAddress) {
      return res.status(400).json({
        message: "Missing order details: items, total, customer info, and shipping address are required.",
      });
    }

    // ── Stock pre-validation ──────────────────────────────────────────────
    for (const item of items) {
      if (!item.productId) continue;

      let product = null;
      if (item.productId.match(/^[0-9a-fA-F]{24}$/)) {
        product = await ProductModel.findById(item.productId);
      }
      if (!product) {
        product = await ProductModel.findOne({ slug: String(item.productId).toLowerCase() });
      }

      if (!product || product.isDeleted) {
        return res.status(400).json({ message: `Product not found: ${item.name || item.productId}` });
      }
      if (!product.inStock || product.stockCount < item.quantity) {
        return res.status(409).json({
          message: `"${product.name}" has insufficient total atelier reserves (Requested: ${item.quantity}, Available: ${product.stockCount}).`,
          productId: product._id,
          available: product.stockCount,
        });
      }
      // Check variant size stock if size is specified
      if (item.selectedSize && product.sizeStock && product.sizeStock.length > 0) {
        const sizeEntry = product.sizeStock.find((s) => s.size === item.selectedSize);
        if (sizeEntry) {
          if (sizeEntry.quantity <= 0) {
            return res.status(409).json({
              message: `"${product.name}" in Size ${item.selectedSize} is completely sold out.`,
              productId: product._id,
              available: 0,
            });
          }
          if (sizeEntry.quantity < item.quantity) {
            return res.status(409).json({
              message: `"${product.name}" in Size ${item.selectedSize} only has ${sizeEntry.quantity} piece(s) available in atelier (requested: ${item.quantity}).`,
              productId: product._id,
              available: sizeEntry.quantity,
            });
          }
        }
      }

      // Canonicalize item.productId to the verified ObjectId string
      item.productId = product._id.toString();
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
      status: "Pending",
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

    // ── Decrement stock after successful order creation ───────────────────
    for (const item of items) {
      if (!item.productId) continue;
      const updated = await ProductModel.findByIdAndUpdate(
        item.productId,
        { $inc: { stockCount: -item.quantity } },
        { new: true }
      );
      if (item.selectedSize) {
        await ProductModel.updateOne(
          { _id: item.productId, "sizeStock.size": item.selectedSize },
          { $inc: { "sizeStock.$.quantity": -item.quantity } }
        );
      }
      if (updated && updated.stockCount <= 0) {
        await ProductModel.findByIdAndUpdate(item.productId, { inStock: false, stockCount: 0 });
      }
    }

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

export const findOrderByIdOrNumber = async (idOrNumber?: string | string[]) => {
  if (!idOrNumber) return null;
  const raw = Array.isArray(idOrNumber) ? idOrNumber[0] : idOrNumber;
  const trimmed = String(raw).trim();
  if (trimmed.match(/^[0-9a-fA-F]{24}$/)) {
    const byId = await OrderModel.findById(trimmed);
    if (byId) return byId;
  }
  return await OrderModel.findOne({ orderNumber: trimmed.toUpperCase() });
};

export const getOrderByIdOrNumber = async (req: Request, res: Response) => {
  try {
    const order = await findOrderByIdOrNumber(req.params.id);
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
    const order = await findOrderByIdOrNumber(req.params.id);
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

    // ── Restore stock on customer cancellation ────────────────────────────
    for (const item of order.items) {
      if (!item.productId) continue;
      await ProductModel.findByIdAndUpdate(
        item.productId,
        { $inc: { stockCount: item.quantity }, inStock: true }
      );
      if (item.selectedSize) {
        await ProductModel.updateOne(
          { _id: item.productId, "sizeStock.size": item.selectedSize },
          { $inc: { "sizeStock.$.quantity": item.quantity } }
        );
      }
    }

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

    const order = await findOrderByIdOrNumber(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    const previousStatus = order.status;
    order.status = status;
    if (!order.timeline) {
      order.timeline = [];
    }
    order.timeline.push({
      title: note || `Status updated to ${status}`,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      completed: true,
    });

    await order.save();

    // ── Restore stock if admin cancels an order ───────────────────────────
    if (status === "Cancelled" && previousStatus !== "Cancelled") {
      for (const item of order.items) {
        if (!item.productId) continue;
        await ProductModel.findByIdAndUpdate(
          item.productId,
          { $inc: { stockCount: item.quantity }, inStock: true }
        );
        if (item.selectedSize) {
          await ProductModel.updateOne(
            { _id: item.productId, "sizeStock.size": item.selectedSize },
            { $inc: { "sizeStock.$.quantity": item.quantity } }
          );
        }
      }
    }

    return res.status(200).json({
      message: "Order status updated successfully",
      data: order,
    });
  } catch (error: any) {
    console.error("Error in updateOrderStatus:", error);
    return res.status(500).json({ message: "Failed to update order status", error: error.message });
  }
};

export const updateOrderTracking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { carrier, trackingNumber, estimatedDelivery } = req.body;

    const order = await findOrderByIdOrNumber(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (carrier) order.carrier = carrier;
    if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
    if (estimatedDelivery) order.estimatedDelivery = estimatedDelivery;

    // Automatically transition to 'In Transit' when tracking is provided
    if (["Pending", "Confirmed", "Processing"].includes(order.status)) {
      order.status = "In Transit";
      if (!order.timeline) {
        order.timeline = [];
      }
      order.timeline.push({
        title: `Dispatched via ${carrier || "Express Courier"}${trackingNumber ? ` (AWB: ${trackingNumber})` : ""}`,
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        completed: true,
      });
    }

    await order.save();

    return res.status(200).json({
      message: "Tracking details updated and order transitioned to In Transit",
      data: order,
    });
  } catch (error: any) {
    console.error("Error in updateOrderTracking:", error);
    return res.status(500).json({ message: "Failed to update tracking", error: error.message });
  }
};

// ─── Cart Stock Validation (pre-checkout) ────────────────────────────────────
export const validateCart = async (req: Request, res: Response) => {
  try {
    const { items } = req.body; // Array of { productId, quantity }
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ message: "items array is required" });
    }

    const unavailable: any[] = [];

    for (const item of items) {
      if (!item.productId) continue;
      let product = null;
      if (item.productId.match(/^[0-9a-fA-F]{24}$/)) {
        product = await ProductModel.findById(item.productId).select(
          "name inStock stockCount isDeleted sizeStock"
        );
      }
      if (!product) {
        product = await ProductModel.findOne({ slug: String(item.productId).toLowerCase() }).select(
          "name inStock stockCount isDeleted sizeStock"
        );
      }
      if (
        !product ||
        product.isDeleted ||
        !product.inStock ||
        product.stockCount < item.quantity
      ) {
        unavailable.push({
          productId: item.productId,
          name: product?.name || "Unknown",
          available: product?.stockCount ?? 0,
          requested: item.quantity,
        });
        continue;
      }
      if (item.selectedSize && product.sizeStock && product.sizeStock.length > 0) {
        const sizeEntry = product.sizeStock.find((s) => s.size === item.selectedSize);
        if (sizeEntry && sizeEntry.quantity < item.quantity) {
          unavailable.push({
            productId: item.productId,
            name: `${product.name} (Size ${item.selectedSize})`,
            available: sizeEntry.quantity,
            requested: item.quantity,
          });
        }
      }
    }

    return res.status(200).json({
      valid: unavailable.length === 0,
      unavailable,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Cart validation failed", error: error.message });
  }
};
