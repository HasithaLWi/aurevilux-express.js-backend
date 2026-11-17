import { Request, Response } from "express";
import { ConciergeService, ChatMessage } from "../services/concierge.service";

/**
 * Handle incoming patron chat inquiry.
 * STRICT NO FALLBACK: Errors are logged to console.error, returning a dignified
 * 503 error without fake/mock AI messages.
 */
export const handleConciergeChat = async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body as {
      message?: string;
      history?: ChatMessage[];
    };

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "A message inquiry is required.",
      });
    }

    const response = await ConciergeService.generateReply(message.trim(), history || []);

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    // Technical error logged to server console (not leaked to client)
    console.error("[Éléanore Concierge Error]:", error?.message || error);

    return res.status(503).json({
      success: false,
      message:
        "Éléanore is momentarily unavailable. Our private atelier staff is at your disposal at concierge@aurevilux.com or +33 1 42 68 00 00.",
    });
  }
};

/**
 * Get Éléanore Concierge configuration and availability status.
 */
export const getConciergeStatus = async (_req: Request, res: Response) => {
  try {
    const status = await ConciergeService.getStatus();
    return res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error("[Éléanore Status Error]:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load concierge status.",
    });
  }
};
