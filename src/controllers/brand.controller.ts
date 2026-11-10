import { Request, Response } from "express";
import { BrandModel } from "../models/brand.model";
import { BrandAppModel } from "../models/brandApp.model";

export const getAllBrands = async (_req: Request, res: Response) => {
  try {
    const brands = await BrandModel.find().sort({ name: 1 });
    return res.status(200).json({
      message: "Brands fetched successfully",
      data: brands,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to fetch brands", error: error.message });
  }
};

export const getBrandByIdOrSlug = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let brand = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      brand = await BrandModel.findById(id);
    }
    if (!brand) {
      brand = await BrandModel.findOne({ slug: id.toLowerCase() });
    }
    if (!brand) {
      return res.status(404).json({ message: "Brand house not found" });
    }
    return res.status(200).json({ message: "Brand house retrieved", data: brand });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to retrieve brand", error: error.message });
  }
};

export const submitBrandApplication = async (req: Request, res: Response) => {
  try {
    const { brandName, contactName, email, phone, website, country, notes } = req.body;

    if (!brandName || !contactName || !email) {
      return res.status(400).json({
        message: "Brand name, contact name, and email are required for partnership application.",
      });
    }

    const application = new BrandAppModel({
      brandName,
      contactName,
      email,
      phone,
      website,
      country,
      notes,
      status: "Pending",
    });

    await application.save();

    return res.status(201).json({
      message: "Atelier brand partnership application submitted successfully",
      data: application,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to submit brand application", error: error.message });
  }
};

export const createBrand = async (req: Request, res: Response) => {
  try {
    const { name, logo, campaignImage, description, featured } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Brand name is required" });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const brand = new BrandModel({
      name,
      slug,
      logo,
      campaignImage,
      description,
      featured: featured !== undefined ? featured : true,
    });

    await brand.save();
    return res.status(201).json({ message: "Brand created successfully", data: brand });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to create brand", error: error.message });
  }
};

export const updateBrand = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const brand = await BrandModel.findByIdAndUpdate(id, req.body, { new: true });
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }
    return res.status(200).json({ message: "Brand updated successfully", data: brand });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update brand", error: error.message });
  }
};

export const deleteBrand = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const brand = await BrandModel.findByIdAndDelete(id);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }
    return res.status(200).json({ message: "Brand deleted successfully", data: { id: brand._id } });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to delete brand", error: error.message });
  }
};

