import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://wbhfhfklvertgdleofgh.supabase.co";
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || "";
export const SUPABASE_BUCKET =
  process.env.SUPABASE_BUCKET || "aurevilux-products";

export const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Uploads a Multer file buffer directly to Supabase Storage.
 * @param file Express.Multer.File from multer memoryStorage
 * @param folder Subfolder inside bucket (e.g., 'products', 'brands', 'campaigns')
 */
export async function uploadToSupabase(
  file: Express.Multer.File,
  folder: string = "products"
): Promise<{ url: string; path: string; fileName: string; size: number }> {
  const timestamp = Date.now();
  const sanitizedOriginal = file.originalname
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "-")
    .replace(/-+/g, "-");
  const filePath = `${folder}/${timestamp}-${sanitizedOriginal}`;

  const { data, error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
      cacheControl: "31536000", // 1 year CDN cache
    });

  if (error) {
    throw new Error(`Supabase Upload Failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(SUPABASE_BUCKET)
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
    fileName: sanitizedOriginal,
    size: file.size,
  };
}

/**
 * Removes a file from Supabase Storage by its public URL or internal path.
 */
export async function deleteFromSupabase(
  fileUrlOrPath: string
): Promise<boolean> {
  let targetPath = fileUrlOrPath;

  if (targetPath.includes(SUPABASE_BUCKET)) {
    const parts = targetPath.split(`${SUPABASE_BUCKET}/`);
    if (parts.length > 1) {
      targetPath = parts[1];
    }
  }

  const { error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .remove([targetPath]);

  if (error) {
    console.error(`Failed to delete file from Supabase (${targetPath}):`, error);
    return false;
  }

  return true;
}

