import { Request, Response } from "express";
import { uploadToSupabase, deleteFromSupabase } from "../utils/supabase";

export const uploadSingleImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided in request (use 'image' field)." });
    }

    const folder = (req.body.folder as string) || "products";
    const result = await uploadToSupabase(req.file, folder);

    return res.status(201).json({
      message: "Image uploaded successfully to Supabase Storage",
      data: result,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return res.status(500).json({
      message: "Failed to upload image to Supabase",
      error: error.message || error,
    });
  }
};

export const uploadMultipleImages = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No image files provided in request (use 'images' field)." });
    }

    const folder = (req.body.folder as string) || "products";
    const results = await Promise.all(
      files.map((file) => uploadToSupabase(file, folder))
    );

    return res.status(201).json({
      message: `${results.length} images uploaded successfully to Supabase Storage`,
      data: results,
    });
  } catch (error: any) {
    console.error("Multi-upload error:", error);
    return res.status(500).json({
      message: "Failed to upload multiple images to Supabase",
      error: error.message || error,
    });
  }
};

export const deleteImage = async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const target =
      body.url ||
      body.path ||
      (req.query.url as string) ||
      (req.query.path as string);

    if (!target) {
      return res.status(400).json({
        message:
          "Missing image 'url' or 'path' in request body or query parameter.",
      });
    }

    const deleted = await deleteFromSupabase(target);
    if (!deleted) {
      return res.status(400).json({
        message: "Failed to delete file from Supabase storage.",
      });
    }

    return res.status(200).json({
      message: "Image successfully purged from Supabase Storage",
      target,
    });
  } catch (error: any) {
    console.error("Delete file error:", error);
    return res.status(500).json({
      message: "Error deleting file from Supabase",
      error: error.message || error,
    });
  }
};

