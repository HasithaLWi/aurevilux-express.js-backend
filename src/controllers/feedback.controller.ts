import { Request, Response } from "express";
import { FeedbackModel } from "../models/feedback.model";

export const submitFeedback = async (req: Request, res: Response) => {
  try {
    const { name, email, role, rating, comment } = req.body;
    if (!name || !email || !comment || !rating) {
      return res.status(400).json({ message: "Name, email, rating, and feedback comment are required." });
    }

    const feedback = new FeedbackModel({
      name,
      email,
      role: role || "Private Client",
      rating: Number(rating),
      comment,
      status: "pending",
      isFeatured: false,
    });

    await feedback.save();
    return res.status(201).json({
      message: "Thank you for sharing your bespoke experience with Aurevilux.",
      data: feedback,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to submit feedback", error: error.message });
  }
};

export const getFeaturedTestimonials = async (_req: Request, res: Response) => {
  try {
    const testimonials = await FeedbackModel.find({ isFeatured: true }).sort({ createdAt: -1 });
    return res.status(200).json({
      message: "Featured testimonials retrieved",
      data: testimonials,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to fetch testimonials", error: error.message });
  }
};

export const getAllFeedbackAdmin = async (_req: Request, res: Response) => {
  try {
    const feedbackList = await FeedbackModel.find().sort({ createdAt: -1 });
    return res.status(200).json({
      message: "All feedback retrieved for moderation",
      data: feedbackList,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to fetch feedback", error: error.message });
  }
};

export const toggleFeatureFeedback = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const feedback = await FeedbackModel.findById(id);
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    feedback.isFeatured = !feedback.isFeatured;
    if (feedback.isFeatured) {
      feedback.status = "approved";
    }
    await feedback.save();

    return res.status(200).json({
      message: `Feedback featured status updated to ${feedback.isFeatured}`,
      data: feedback,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update featured status", error: error.message });
  }
};

export const deleteFeedbackAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const feedback = await FeedbackModel.findByIdAndDelete(id);
    if (!feedback) {
      return res.status(404).json({ message: "Feedback entry not found" });
    }

    return res.status(200).json({
      message: "Feedback deleted successfully",
      id,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to delete feedback", error: error.message });
  }
};

