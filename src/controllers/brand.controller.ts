import { Request, Response } from "express";
import { BrandModel } from "../models/brand.model";
import { BrandAppModel } from "../models/brandApp.model";
import { deleteFromSupabase } from "../utils/supabase";

export const getAllBrands = async (req: Request, res: Response) => {
  try {
    const { includeInactive } = req.query;
    const filter: Record<string, any> = { isDeleted: { $ne: true } };
    if (includeInactive !== "true") {
      filter.isActive = { $ne: false };
    }
    const brands = await BrandModel.find(filter).sort({ name: 1 });
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
    const id = String(req.params.id);
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
    const id = String(req.params.id);
    const query = id.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: id }
      : { slug: id.toLowerCase() };

    const brand = await BrandModel.findOneAndUpdate(query, req.body, { new: true });
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }
    return res.status(200).json({ message: "Brand updated successfully", data: brand });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update brand", error: error.message });
  }
};

export const toggleBrandActive = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const query = id.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: id }
      : { slug: id.toLowerCase() };

    const brand = await BrandModel.findOne(query);
    if (!brand) return res.status(404).json({ message: "Brand not found" });

    brand.isActive = !brand.isActive;
    await brand.save();

    return res.status(200).json({
      message: `Brand status updated to ${brand.isActive ? "Active" : "Inactive"}`,
      data: brand,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to toggle brand status", error: error.message });
  }
};

export const deleteBrand = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const query = id.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: id }
      : { slug: id.toLowerCase() };

    const brand = await BrandModel.findOne(query);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    brand.isDeleted = true;
    brand.isActive = false;
    await brand.save();

    if (brand.logo) {
      try { await deleteFromSupabase(brand.logo); } catch {}
    }
    if (brand.campaignImage) {
      try { await deleteFromSupabase(brand.campaignImage); } catch {}
    }

    return res.status(200).json({
      message: "Brand house soft-deleted and assets purged",
      data: { id: brand._id, name: brand.name },
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to delete brand", error: error.message });
  }
};

