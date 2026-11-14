import { Request, Response } from "express";
import { OrderModel } from "../models/order.model";
import { ProductModel } from "../models/product.model";
import { UserModel, UserRole } from "../models/user.model";
import { BrandAppModel } from "../models/brandApp.model";
import { InviteModel } from "../models/invite.model";
import { AuthRequest } from "../middlewares/auth";
import crypto from "crypto";
import { sendStaffInviteEmail } from "../services/email.service";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

export const getDashboardAnalytics = async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      orders,
      todayOrders,
      productsCount,
      lowStockProducts,
      customersCount,
    ] = await Promise.all([
      OrderModel.find(),
      OrderModel.find({ createdAt: { $gte: today } }),
      ProductModel.countDocuments({ isDeleted: { $ne: true } }),
      ProductModel.countDocuments({ stockCount: { $lte: 5 }, isDeleted: { $ne: true } }),
      UserModel.countDocuments({ roles: UserRole.CUSTOMER, isDeleted: { $ne: true } }),
    ]);

    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const pendingOrdersCount = orders.filter((o) =>
      ["Pending", "Confirmed", "Processing"].includes(o.status)
    ).length;

    return res.status(200).json({
      message: "Atelier Analytics retrieved",
      data: {
        totalRevenue,
        todayRevenue,
        ordersCount: orders.length,
        todayOrdersCount: todayOrders.length,
        pendingOrdersCount,
        productsCount,
        lowStockCount: lowStockProducts,
        customersCount,
        conversionRate: 3.42,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to fetch analytics", error: error.message });
  }
};

export const getBrandApplications = async (_req: Request, res: Response) => {
  try {
    const applications = await BrandAppModel.find().sort({ createdAt: -1 });
    return res.status(200).json({
      message: "Brand applications retrieved",
      data: applications,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to fetch applications", error: error.message });
  }
};

export const updateBrandApplicationStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!["Pending", "Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status: must be Pending, Approved, or Rejected." });
    }

    const app = await BrandAppModel.findByIdAndUpdate(
      id,
      { status, ...(notes && { notes }) },
      { new: true }
    );

    if (!app) {
      return res.status(404).json({ message: "Application not found" });
    }

    return res.status(200).json({
      message: `Brand application updated to ${status}`,
      data: app,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update application", error: error.message });
  }
};

export const getReviewsForModeration = async (_req: Request, res: Response) => {
  try {
    const products = await ProductModel.find(
      { "reviews.0": { $exists: true }, isDeleted: { $ne: true } },
      { name: 1, brand: 1, reviews: 1 }
    );

    const allReviews: any[] = [];
    products.forEach((p) => {
      p.reviews.forEach((r) => {
        allReviews.push({
          reviewId: (r as any)._id,
          productId: p._id,
          productName: p.name,
          productBrand: p.brand,
          name: r.name,
          rating: r.rating,
          comment: r.comment,
          date: r.date,
        });
      });
    });

    return res.status(200).json({
      message: "Reviews for moderation retrieved",
      data: allReviews,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to fetch reviews", error: error.message });
  }
};

export const deleteReviewAdmin = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;

    const product = await ProductModel.findOneAndUpdate(
      { "reviews._id": reviewId },
      { $pull: { reviews: { _id: reviewId } } },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: "Review not found" });
    }

    product.reviewsCount = product.reviews.length;
    if (product.reviews.length > 0) {
      const avg = product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length;
      product.rating = Math.round(avg * 10) / 10;
    } else {
      product.rating = 5.0;
    }
    await product.save();

    return res.status(200).json({
      message: "Review deleted successfully",
      productId: product._id,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to delete review", error: error.message });
  }
};

/* ==========================================================================
   STAFF MANAGEMENT & RBAC (SuperAdmin > Admin > Staff)
   ========================================================================== */

export const getStaffRoster = async (_req: Request, res: Response) => {
  try {
    const staffMembers = await UserModel.find({
      roles: { $in: [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.STAFF] },
      isDeleted: { $ne: true },
    }).select("-password");

    const pendingInvites = await InviteModel.find({ used: false });

    return res.status(200).json({
      message: "Staff roster retrieved",
      data: {
        staff: staffMembers,
        invites: pendingInvites,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to fetch staff roster", error: error.message });
  }
};

export const inviteStaffMember = async (req: AuthRequest, res: Response) => {
  try {
    const { email, role } = req.body;
    const callerRoles: string[] = req.user?.roles || [];

    if (!email || !role || !["ADMIN", "STAFF"].includes(role)) {
      return res.status(400).json({ message: "Valid email and role ('ADMIN' or 'STAFF') are required." });
    }

    const isSuperAdmin = callerRoles.includes(UserRole.SUPERADMIN);
    const isAdmin = callerRoles.includes(UserRole.ADMIN);

    // Authority checks:
    // Only SuperAdmin can invite Admin. Admin can only invite Staff.
    if (role === "ADMIN" && !isSuperAdmin) {
      return res.status(403).json({
        message: "Authority Denied: Only SuperAdmin can grant Atelier Administrator privileges.",
      });
    }
    if (!isSuperAdmin && !isAdmin) {
      return res.status(403).json({ message: "Unauthorized to invite personnel." });
    }

    const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email is already registered." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const invite = new InviteModel({
      email: email.toLowerCase(),
      role,
      token,
      invitedBy: req.user?.username || req.user?.email || "SuperAdmin",
    });

    await invite.save();

    const inviteUrl = `${FRONTEND_URL}/register?inviteToken=${token}`;
    await sendStaffInviteEmail(email, role, inviteUrl);

    return res.status(201).json({
      message: `Invitation successfully dispatched to ${email} for role ${role}`,
      data: {
        email: invite.email,
        role: invite.role,
        token: invite.token,
        inviteUrl,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to dispatch staff invitation", error: error.message });
  }
};

export const updateStaffMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { roles, isActive, name } = req.body;
    const callerRoles: string[] = req.user?.roles || [];
    const isSuperAdmin = callerRoles.includes(UserRole.SUPERADMIN);

    const targetUser = await UserModel.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    // Role Hierarchy rules:
    // If target has SUPERADMIN or ADMIN, only SUPERADMIN can edit them
    const targetIsSuperAdmin = targetUser.roles.includes(UserRole.SUPERADMIN);
    const targetIsAdmin = targetUser.roles.includes(UserRole.ADMIN);

    if (targetIsSuperAdmin && !isSuperAdmin) {
      return res.status(403).json({ message: "SuperAdmin accounts can only be modified by SuperAdmin." });
    }

    if (targetIsAdmin && !isSuperAdmin) {
      return res.status(403).json({ message: "Admin accounts can only be modified by SuperAdmin." });
    }

    if (name) targetUser.name = name;
    if (typeof isActive === "boolean") targetUser.isActive = isActive;
    if (roles && Array.isArray(roles)) {
      if (roles.includes(UserRole.SUPERADMIN) && !isSuperAdmin) {
        return res.status(403).json({ message: "Only SuperAdmin can promote users to SuperAdmin." });
      }
      targetUser.roles = roles;
    }

    await targetUser.save();

    return res.status(200).json({
      message: "Staff member updated successfully",
      data: targetUser,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update staff member", error: error.message });
  }
};

export const deleteStaffMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const callerRoles: string[] = req.user?.roles || [];
    const isSuperAdmin = callerRoles.includes(UserRole.SUPERADMIN);

    const targetUser = await UserModel.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    if (targetUser.roles.includes(UserRole.SUPERADMIN)) {
      return res.status(403).json({ message: "SuperAdmin accounts cannot be deleted." });
    }

    if (targetUser.roles.includes(UserRole.ADMIN) && !isSuperAdmin) {
      return res.status(403).json({ message: "Admin accounts can only be removed by SuperAdmin." });
    }

    targetUser.isDeleted = true;
    targetUser.isActive = false;
    await targetUser.save();

    return res.status(200).json({
      message: "Staff member removed from atelier roster",
      id,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to delete staff member", error: error.message });
  }
};

export const toggleStaffActive = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const callerRoles: string[] = req.user?.roles || [];
    const isSuperAdmin = callerRoles.includes(UserRole.SUPERADMIN);

    const targetUser = await UserModel.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: "Staff member not found" });
    }

    if (targetUser.roles.includes(UserRole.SUPERADMIN) && !isSuperAdmin) {
      return res.status(403).json({ message: "Unauthorized to toggle SuperAdmin active state." });
    }
    if (targetUser.roles.includes(UserRole.ADMIN) && !isSuperAdmin) {
      return res.status(403).json({ message: "Unauthorized: Only SuperAdmin can suspend Administrators." });
    }

    targetUser.isActive = !targetUser.isActive;
    await targetUser.save();

    return res.status(200).json({
      message: `Staff member is now ${targetUser.isActive ? "Active" : "Suspended"}`,
      data: targetUser,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to toggle active state", error: error.message });
  }
};

/* ==========================================================================
   CUSTOMER DIRECTORY
   ========================================================================== */

export const getAllCustomersAdmin = async (_req: Request, res: Response) => {
  try {
    const customers = await UserModel.find({
      roles: UserRole.CUSTOMER,
      isDeleted: { $ne: true },
    }).select("-password");

    const orders = await OrderModel.find();

    const customerData = customers.map((c) => {
      const userOrders = orders.filter((o) => o.userId && o.userId.toString() === c._id.toString());
      const totalSpend = userOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      return {
        _id: c._id,
        name: c.name,
        email: c.email,
        username: c.username,
        avatarUrl: c.avatarUrl,
        authProvider: c.authProvider,
        isActive: c.isActive,
        createdAt: c.createdAt,
        ordersCount: userOrders.length,
        totalSpend,
      };
    });

    return res.status(200).json({
      message: "Customer directory retrieved",
      data: customerData,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to fetch customers", error: error.message });
  }
};

export const toggleCustomerActive = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customer = await UserModel.findById(id);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    customer.isActive = !customer.isActive;
    await customer.save();

    return res.status(200).json({
      message: `Customer account is now ${customer.isActive ? "Active" : "Suspended"}`,
      data: customer,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to toggle customer status", error: error.message });
  }
};
