import { Request, Response } from "express";
import { NewsletterModel } from "../models/newsletter.model";
import { sendNewsletterBroadcast } from "../services/email.service";

export const subscribeNewsletter = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ message: "A valid email address is required." });
    }

    const existing = await NewsletterModel.findOne({ email: email.toLowerCase() });
    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        await existing.save();
        return res.status(200).json({ message: "Subscription reactivated successfully." });
      }
      return res.status(200).json({ message: "You are already an esteemed subscriber." });
    }

    const subscriber = new NewsletterModel({ email: email.toLowerCase(), isActive: true });
    await subscriber.save();

    return res.status(201).json({
      message: "Welcome to Aurevilux Atelier. Your subscription has been confirmed.",
      data: subscriber,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Subscription failed", error: error.message });
  }
};

export const getAllSubscribersAdmin = async (_req: Request, res: Response) => {
  try {
    const subscribers = await NewsletterModel.find().sort({ subscribedAt: -1 });
    return res.status(200).json({
      message: "Subscribers list retrieved",
      data: subscribers,
      total: subscribers.length,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to fetch subscribers", error: error.message });
  }
};

export const broadcastNewsletterAdmin = async (req: Request, res: Response) => {
  try {
    const { subject, content } = req.body;
    if (!subject || !content) {
      return res.status(400).json({ message: "Subject and HTML content are required for broadcast." });
    }

    const subscribers = await NewsletterModel.find({ isActive: true });
    const emails = subscribers.map((s) => s.email);

    if (emails.length === 0) {
      return res.status(400).json({ message: "No active subscribers found." });
    }

    await sendNewsletterBroadcast(emails, subject, content);

    return res.status(200).json({
      message: `Newsletter dispatch initiated to ${emails.length} subscribers`,
      recipientsCount: emails.length,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to broadcast newsletter", error: error.message });
  }
};

export const unsubscribeNewsletter = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const subscriber = await NewsletterModel.findOneAndUpdate(
      { email: email.toLowerCase() },
      { isActive: false },
      { new: true }
    );

    if (!subscriber) {
      return res.status(404).json({ message: "Subscriber not found." });
    }

    return res.status(200).json({ message: "Unsubscribed successfully." });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to unsubscribe", error: error.message });
  }
};

