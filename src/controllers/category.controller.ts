import { Request, Response } from "express";
import { CategoryModel } from "../models/category.model";

export const getAllCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await CategoryModel.find().sort({ createdAt: 1 });
    return res.status(200).json({
      message: "Categories fetched successfully",
      data: categories,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to fetch categories", error: error.message });
  }
};

export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let cat = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      cat = await CategoryModel.findById(id);
    }
    if (!cat) {
      cat = await CategoryModel.findOne({ slug: id.toLowerCase() });
    }
    if (!cat) {
      return res.status(404).json({ message: "Category not found" });
    }
    return res.status(200).json({ message: "Category retrieved", data: cat });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to retrieve category", error: error.message });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { title, description, image, link, buttonText } = req.body;
    if (!title) {
      return res.status(400).json({ message: "Category title is required" });
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const newCat = new CategoryModel({
      title,
      slug,
      description,
      image,
      link: link || `/shop?category=${slug}`,
      buttonText: buttonText || "EXPLORE COLLECTION",
    });

    await newCat.save();
    return res.status(201).json({ message: "Category created", data: newCat });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to create category", error: error.message });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cat = await CategoryModel.findByIdAndUpdate(id, req.body, { new: true });
    if (!cat) {
      return res.status(404).json({ message: "Category not found" });
    }
    return res.status(200).json({ message: "Category updated", data: cat });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update category", error: error.message });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cat = await CategoryModel.findByIdAndDelete(id);
    if (!cat) {
      return res.status(404).json({ message: "Category not found" });
    }
    return res.status(200).json({ message: "Category deleted", data: { id: cat._id } });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to delete category", error: error.message });
  }
};

