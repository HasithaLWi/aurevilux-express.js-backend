import { Request, Response } from "express";
import { CourierPartnerModel } from "../models/courier.model";

export const getAllCouriers = async (req: Request, res: Response) => {
  try {
    const { includeInactive } = req.query;
    const filter = includeInactive === "true" ? {} : { isActive: true };
    const couriers = await CourierPartnerModel.find(filter).sort({ name: 1 });
    return res.status(200).json({
      message: "Courier partners retrieved successfully",
      data: couriers,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to retrieve courier partners",
      error: error.message,
    });
  }
};

export const createCourier = async (req: Request, res: Response) => {
  try {
    const { name, code, serviceType, trackingUrlTemplate, supportContact, logo } = req.body;
    if (!name || !code) {
      return res.status(400).json({
        message: "Name and unique code are required.",
      });
    }

    const existing = await CourierPartnerModel.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(409).json({ message: `Courier with code "${code}" already exists.` });
    }

    const courier = await CourierPartnerModel.create({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      serviceType: serviceType || "White-Glove Courier",
      trackingUrlTemplate: trackingUrlTemplate?.trim() || "",
      supportContact: supportContact?.trim() || "",
      logo: logo?.trim() || "",
      isActive: true,
    });

    return res.status(201).json({
      message: "Courier partner established successfully",
      data: courier,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to create courier partner",
      error: error.message,
    });
  }
};

export const updateCourier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const courier = await CourierPartnerModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!courier) {
      return res.status(404).json({ message: "Courier partner not found." });
    }

    return res.status(200).json({
      message: "Courier partner updated successfully",
      data: courier,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to update courier partner",
      error: error.message,
    });
  }
};

export const toggleCourierActive = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const courier = await CourierPartnerModel.findById(id);
    if (!courier) {
      return res.status(404).json({ message: "Courier partner not found." });
    }

    courier.isActive = !courier.isActive;
    await courier.save();

    return res.status(200).json({
      message: `Courier "${courier.name}" status updated to ${courier.isActive ? "Active" : "Inactive"}.`,
      data: courier,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to toggle courier status",
      error: error.message,
    });
  }
};

export const deleteCourier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const courier = await CourierPartnerModel.findByIdAndDelete(id);
    if (!courier) {
      return res.status(404).json({ message: "Courier partner not found." });
    }

    return res.status(200).json({
      message: `Courier partner "${courier.name}" removed successfully`,
      data: courier,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to delete courier partner",
      error: error.message,
    });
  }
};
