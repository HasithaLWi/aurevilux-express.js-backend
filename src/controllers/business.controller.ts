import { Request, Response } from "express";
import { BusinessModel } from "../models/business.model";

export const getBusinessInfo = async (_req: Request, res: Response) => {
  try {
    let business = await BusinessModel.findOne();
    if (!business) {
      business = await BusinessModel.create({});
    }
    return res.status(200).json({
      message: "Business information retrieved successfully",
      data: business,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to retrieve business information",
      error: error.message,
    });
  }
};

export const updateBusinessInfo = async (req: Request, res: Response) => {
  try {
    const updateData = req.body;
    let business = await BusinessModel.findOne();
    if (!business) {
      business = await BusinessModel.create(updateData);
    } else {
      Object.assign(business, updateData);
      await business.save();
    }

    return res.status(200).json({
      message: "Atelier parameters & business settings saved successfully",
      data: business,
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to update business information",
      error: error.message,
    });
  }
};
