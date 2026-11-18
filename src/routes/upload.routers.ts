import { Router } from "express";
import { upload, uploadVideo } from "../middlewares/upload";
import {
  uploadSingleImage,
  uploadSingleVideo,
  uploadMultipleImages,
  deleteImage,
} from "../controllers/upload.controller";

const router = Router();

// Upload a single image file (Form-Data field: "image")
router.post("/single", upload.single("image"), uploadSingleImage);

// Upload a single video file (Form-Data field: "video" or "file" or "image")
router.post(
  "/video",
  (req, res, next) => {
    uploadVideo.fields([
      { name: "video", maxCount: 1 },
      { name: "file", maxCount: 1 },
      { name: "image", maxCount: 1 },
    ])(req, res, (err) => {
      if (err) return next(err);
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      if (files) {
        req.file = files.video?.[0] || files.file?.[0] || files.image?.[0];
      }
      next();
    });
  },
  uploadSingleVideo
);

// Upload multiple image files (Form-Data field: "images")
router.post("/multiple", upload.array("images", 10), uploadMultipleImages);

// Delete an image or video file from Supabase by url/path
router.delete("/", deleteImage);

export default router;
