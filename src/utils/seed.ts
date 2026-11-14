import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

import { UserModel } from "../models/user.model";
import { ProductModel } from "../models/product.model";
import { CategoryModel } from "../models/category.model";
import { BrandModel } from "../models/brand.model";
import {
  SEED_CATEGORIES,
  SEED_BRANDS,
  SEED_USERS_RAW,
  SEED_RAW_PRODUCTS,
} from "./seedData";

const MONGO_URL =
  process.env.MONGO_LOCAL_URL ||
  "mongodb://admin:1234@localhost:27017/auravilux?authSource=admin";

export async function resetAndSeedDatabase(shouldDisconnect = false) {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log("[Seed Engine] Connecting to MongoDB...");
      await mongoose.connect(MONGO_URL);
    }
    console.log("[Seed Engine] Seeding database with clean relational schemas...");

    // 1. Drop or clean old catalog collections
    await Promise.all([
      ProductModel.deleteMany({}),
      CategoryModel.deleteMany({}),
      BrandModel.deleteMany({}),
    ]);
    console.log("✓ Cleared catalog collections (products, categories, brands).");

    // 2. Seed / Upsert Users with bcrypt password hashes
    const salt = bcrypt.genSaltSync(10);
    const seededUsers = [];

    for (const rawUser of SEED_USERS_RAW) {
      const { plainPassword, ...userData } = rawUser;
      const hashedPassword = bcrypt.hashSync(plainPassword, salt);

      const existingUser = await UserModel.findOne({
        $or: [{ username: userData.username }, { email: userData.email }],
      });

      if (existingUser) {
        existingUser.name = userData.name;
        existingUser.roles = userData.roles;
        existingUser.status = userData.status;
        existingUser.approve = userData.approve;
        existingUser.isActive = true;
        existingUser.isDeleted = false;
        existingUser.password = hashedPassword;
        await existingUser.save();
        seededUsers.push(existingUser);
      } else {
        const newUser = await UserModel.create({
          ...userData,
          password: hashedPassword,
        });
        seededUsers.push(newUser);
      }
    }
    console.log(`✓ Synchronized ${seededUsers.length} executive & patron accounts.`);

    // Purge legacy mock user "sophia" if present
    await UserModel.deleteMany({ email: "sophia@aurevia.com" });

    // Reviewer user reference for sample reviews
    const reviewerUser =
      seededUsers.find((u) => u.username === "marcus_sterling") || seededUsers[0];

    // 3. Seed Categories & build slug -> ObjectId map
    const insertedCategories = await CategoryModel.insertMany(SEED_CATEGORIES);
    const categoryMap = new Map<string, mongoose.Types.ObjectId>(
      insertedCategories.map((c) => [c.slug.toLowerCase(), c._id as mongoose.Types.ObjectId])
    );
    console.log(`✓ Seeded ${insertedCategories.length} categories.`);

    // 4. Seed Brands & build name -> ObjectId map
    const insertedBrands = await BrandModel.insertMany(SEED_BRANDS);
    const brandMap = new Map<string, mongoose.Types.ObjectId>(
      insertedBrands.map((b) => [b.name.toLowerCase(), b._id as mongoose.Types.ObjectId])
    );
    console.log(`✓ Seeded ${insertedBrands.length} brands with full schema fields.`);

    const fallbackCategoryId = insertedCategories[0]._id as mongoose.Types.ObjectId;
    const fallbackBrandId = insertedBrands[0]._id as mongoose.Types.ObjectId;

    // 5. Transform RAW_PRODUCTS with valid Category & Brand ObjectIds
    const productsWithRefs = SEED_RAW_PRODUCTS.map((raw) => {
      const categoryId =
        categoryMap.get(raw.categorySlug.toLowerCase()) || fallbackCategoryId;
      const brandId =
        brandMap.get(raw.brandName.toLowerCase()) || fallbackBrandId;

      return {
        name: raw.name,
        slug: raw.slug,
        price: raw.price,
        rating: raw.rating,
        reviewsCount: raw.reviewsCount,
        category: categoryId,
        categoryLabel: raw.categoryLabel,
        department: raw.department,
        description: raw.description,
        longDescription: raw.longDescription,
        images: raw.images,
        colors: raw.colors,
        sizes: raw.sizes,
        brand: brandId,
        inStock: raw.inStock,
        stockCount: raw.stockCount,
        isBestSeller: raw.isBestSeller,
        isNewArrival: raw.isNewArrival,
        isActive: raw.isActive,
        isDeleted: raw.isDeleted,
        specifications: raw.specifications,
        reviews: raw.reviews.map((rev) => ({
          ...rev,
          userId: reviewerUser._id,
        })),
      };
    });

    // 6. Insert validated products
    const insertedProducts = await ProductModel.insertMany(productsWithRefs);
    console.log(
      `✓ Seeded ${insertedProducts.length} luxury products with real ObjectId relations.`
    );

    console.log("✓ Database successfully initialized with updated models!");
  } catch (error) {
    console.error("✗ Seeding failed:", error);
    throw error;
  } finally {
    if (shouldDisconnect) {
      await mongoose.disconnect();
      console.log("✓ Disconnected from MongoDB");
    }
  }
}

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

// Standalone execution support: node -r tsx/register seed.ts
if (require.main === module) {
  resetAndSeedDatabase(true)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
