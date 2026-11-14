import { Request, Response } from "express";
import { NewsletterModel } from "../models/newsletter.model";
import { sendNewsletterBroadcast, sendNewsletterWelcomeEmail } from "../services/email.service";

export const subscribeNewsletter = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ message: "A valid email address is required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await NewsletterModel.findOne({ email: cleanEmail });
    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        await existing.save();
        sendNewsletterWelcomeEmail(cleanEmail).catch((err) =>
          console.error("[Newsletter Welcome Email Error]:", err)
        );
        return res.status(200).json({
          message: "Welcome back to The Inner Circle. Your subscription has been reactivated.",
          data: existing,
        });
      }
      return res.status(200).json({
        message: "You are already an esteemed patron in The Inner Circle.",
        data: existing,
      });
    }

    const subscriber = new NewsletterModel({ email: cleanEmail, isActive: true });
    await subscriber.save();

    // Asynchronously dispatch luxury welcome email with INNERCIRCLE10 privilege code
    sendNewsletterWelcomeEmail(cleanEmail).catch((err) =>
      console.error("[Newsletter Welcome Email Error]:", err)
    );

    return res.status(201).json({
      message: "Welcome to Aurevilux Atelier. Your subscription to The Inner Circle has been confirmed.",
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
    const email = (req.body?.email || req.query?.email)?.toString();
    if (!email) {
      return res.status(400).json({ message: "Email is required to unsubscribe." });
    }

    const subscriber = await NewsletterModel.findOneAndUpdate(
      { email: email.trim().toLowerCase() },
      { isActive: false },
      { new: true }
    );

    if (!subscriber) {
      return res.status(404).json({ message: "Subscriber record not found." });
    }

    return res.status(200).json({
      message: `Your email (${subscriber.email}) has been successfully unsubscribed from Aurevilux Atelier dispatches.`,
      data: subscriber,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to unsubscribe", error: error.message });
  }
};

export const toggleSubscriberStatusAdmin = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const subscriber = await NewsletterModel.findById(id);
    if (!subscriber) {
      return res.status(404).json({ message: "Subscriber record not found." });
    }

    subscriber.isActive = !subscriber.isActive;
    await subscriber.save();

    return res.status(200).json({
      message: subscriber.isActive
        ? `Subscriber ${subscriber.email} reactivated.`
        : `Subscriber ${subscriber.email} unsubscribed.`,
      data: subscriber,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update subscriber status", error: error.message });
  }
};

export const deleteSubscriberAdmin = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const deleted = await NewsletterModel.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Subscriber record not found." });
    }

    return res.status(200).json({
      message: `Subscriber ${deleted.email} permanently removed.`,
      data: deleted,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to delete subscriber", error: error.message });
  }
};

