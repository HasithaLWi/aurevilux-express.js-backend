import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || "";
export const SUPABASE_BUCKET =
  process.env.SUPABASE_BUCKET || "aurevilux-products";
export const SUPABASE_USER_BUCKET =
  process.env.SUPABASE_USER_BUCKET || "aurevilux-user";

export const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Uploads a Multer file buffer directly to Supabase Storage.
 * @param file Express.Multer.File from multer memoryStorage
 * @param folder Subfolder inside bucket (e.g., 'products', 'avatars', 'brands')
 * @param bucket Target Supabase bucket (defaults to SUPABASE_BUCKET, or SUPABASE_USER_BUCKET)
 */
export async function uploadToSupabase(
  file: Express.Multer.File,
  folder: string = "products",
  bucket: string = SUPABASE_BUCKET
): Promise<{ url: string; publicUrl: string; path: string; fileName: string; size: number }> {
  const timestamp = Date.now();
  const sanitizedOriginal = file.originalname
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "-")
    .replace(/-+/g, "-");
  const filePath = `${folder}/${timestamp}-${sanitizedOriginal}`;

  const targetBucket = bucket || SUPABASE_BUCKET;

  const { data, error } = await supabase.storage
    .from(targetBucket)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
      cacheControl: "31536000", // 1 year CDN cache
    });

  if (error) {
    throw new Error(`Supabase Upload Failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(targetBucket)
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    publicUrl: urlData.publicUrl,
    path: data.path,
    fileName: sanitizedOriginal,
    size: file.size,
  };
}

/**
 * Checks if a given URL or path belongs to Supabase Storage.
 */
export function isSupabaseStorageUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const clean = url.trim();
  return (
    clean.includes("supabase.co/storage/v1/object") ||
    clean.includes(SUPABASE_BUCKET) ||
    clean.includes(SUPABASE_USER_BUCKET)
  );
}

/**
 * Removes a file from Supabase Storage by its public URL or internal path.
 */
export async function deleteFromSupabase(
  fileUrlOrPath: string,
  bucket?: string
): Promise<boolean> {
  if (!fileUrlOrPath || typeof fileUrlOrPath !== "string") return false;

  const cleanUrl = fileUrlOrPath.split("?")[0].trim();
  if (!cleanUrl) return false;

  let targetBucket = bucket || SUPABASE_BUCKET;
  let targetPath = cleanUrl;

  if (cleanUrl.includes(SUPABASE_USER_BUCKET)) {
    targetBucket = SUPABASE_USER_BUCKET;
    const parts = cleanUrl.split(`${SUPABASE_USER_BUCKET}/`);
    if (parts.length > 1) {
      targetPath = parts[1];
    }
  } else if (cleanUrl.includes(SUPABASE_BUCKET)) {
    targetBucket = SUPABASE_BUCKET;
    const parts = cleanUrl.split(`${SUPABASE_BUCKET}/`);
    if (parts.length > 1) {
      targetPath = parts[1];
    }
  } else if (!isSupabaseStorageUrl(cleanUrl)) {
    // Non-Supabase asset (e.g. Unsplash, external, local /images/...)
    return false;
  }

  // Strip leading slashes and decode URI entities
  targetPath = targetPath.replace(/^\/+/, "");
  try {
    targetPath = decodeURIComponent(targetPath);
  } catch {}

  const { data, error } = await supabase.storage
    .from(targetBucket)
    .remove([targetPath]);

  if (error) {
    console.warn(`Failed to delete file from Supabase (${targetBucket}/${targetPath}):`, error.message);
    return false;
  }

  return true;
}

