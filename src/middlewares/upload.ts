import multer from "multer";

const storage = multer.memoryStorage();

const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

const ALLOWED_VIDEO_MIME_TYPES = [
  "video/webm",
  "video/mp4",
  "video/quicktime",
  "video/x-matroska",
  "video/ogg",
  // Also allow poster image formats
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

export const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit for images
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only image files (JPEG, PNG, WEBP, AVIF, GIF) are accepted."
        )
      );
    }
  },
});

export const uploadVideo = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for luxury editorial video clips
  },
  fileFilter: (_req, file, cb) => {
    const mime = (file.mimetype || "").toLowerCase();
    const ext = file.originalname.split(".").pop()?.toLowerCase() || "";
    const isAllowedExt = [
      "webm",
      "mp4",
      "mov",
      "mkv",
      "ogv",
      "webp",
      "jpg",
      "jpeg",
      "png",
    ].includes(ext);

    if (ALLOWED_VIDEO_MIME_TYPES.includes(mime) || isAllowedExt) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only video files (WebM, MP4, QuickTime/HEVC) and poster images are accepted."
        )
      );
    }
  },
});
