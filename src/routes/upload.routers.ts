import { Router } from "express";
import { upload } from "../middlewares/upload";
import {
  uploadSingleImage,
  uploadMultipleImages,
  deleteImage,
} from "../controllers/upload.controller";

const router = Router();

// Upload a single image file (Form-Data field: "image")
router.post("/single", upload.single("image"), uploadSingleImage);

// Upload multiple image files (Form-Data field: "images")
router.post("/multiple", upload.array("images", 10), uploadMultipleImages);

// Delete an image file from Supabase by url/path
router.delete("/", deleteImage);

export default router;

