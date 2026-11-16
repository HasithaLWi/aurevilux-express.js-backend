import { resetAndSeedDatabase } from "./resetDb";
import { ProductModel } from "../models/product.model";

export { resetAndSeedDatabase };

export async function seedDatabase() {
  try {
    const prodCount = await ProductModel.countDocuments({ isDeleted: { $ne: true } });
    if (prodCount === 0) {
      console.log("[Seed Engine] Empty product catalog detected. Auto-seeding database...");
      await resetAndSeedDatabase(false);
    } else {
      console.log(`[Seed Engine] Product catalog verified (${prodCount} active pieces).`);
    }
  } catch (err) {
    console.warn("[Seed Engine Check]:", err);
  }
}

// Standalone execution support: tsx src/utils/seed.ts
if (require.main === module) {
  resetAndSeedDatabase(true)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
