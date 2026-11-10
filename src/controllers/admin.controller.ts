import { Request, Response } from "express";
import { OrderModel } from "../models/order.model";
import { ProductModel } from "../models/product.model";
import { UserModel } from "../models/user.model";
import { BrandAppModel } from "../models/brandApp.model";

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
      ProductModel.countDocuments(),
      ProductModel.countDocuments({ stockCount: { $lte: 5 } }),
      UserModel.countDocuments(),
    ]);

    const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const pendingOrdersCount = orders.filter((o) =>
      ["Pending", "Processing"].includes(o.status)
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
      { "reviews.0": { $exists: true } },
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

