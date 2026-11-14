import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import bcrypt from "bcryptjs";
import { UserModel, UserRole, UserStatus } from "../models/user.model";
import { ProductModel } from "../models/product.model";
import { CategoryModel } from "../models/category.model";
import { BrandModel } from "../models/brand.model";
import { SEED_CATEGORIES, SEED_BRANDS, SEED_PRODUCTS } from "./seedData";

const MONGO_URL = process.env.MONGO_LOCAL_URL || "";

export async function resetAndSeedDatabase() {
  try {
    if (mongoose.connection.readyState !== 1) {
      if (!MONGO_URL) return;
      await mongoose.connect(MONGO_URL);
    }
    console.log("Resetting and seeding database with clean schemas...");

    // 1. Drop products, categories, and brands to ensure clean, updated schemas
    try {
      await mongoose.connection.collection("products").drop();
      console.log("✓ Dropped old products collection.");
    } catch (e: any) {}

    try {
      await mongoose.connection.collection("categories").drop();
      console.log("✓ Dropped old categories collection.");
    } catch (e: any) {}

    try {
      await mongoose.connection.collection("brands").drop();
      console.log("✓ Dropped old brands collection.");
    } catch (e: any) {}

    // 2. Recreate & Seed Products with full schema fields
    await ProductModel.insertMany(SEED_PRODUCTS);
    console.log(`✓ Seeded ${SEED_PRODUCTS.length} clean, validated products into MongoDB.`);

    // 3. Seed Categories with departments and subcategories
    await CategoryModel.insertMany(SEED_CATEGORIES);
    console.log(`✓ Seeded ${SEED_CATEGORIES.length} categories.`);

    // 4. Seed Brands with isActive and isDeleted
    await BrandModel.insertMany(SEED_BRANDS);
    console.log(`✓ Seeded ${SEED_BRANDS.length} brands with full schema fields.`);

    // 5. Seed Users (Executive Personnel only; no fake mock customers)
    const adminUser = await UserModel.findOne({
      $or: [{ username: "admin" }, { email: "admin@aurevilux.com" }],
    });
    if (!adminUser) {
      const salt = bcrypt.genSaltSync(10);
      const hashedAdminPassword = bcrypt.hashSync("admin123", salt);
      const hashedStaffPassword = bcrypt.hashSync("staff123", salt);

      await UserModel.create([
        {
          name: "Alexander Sterling",
          email: "admin@aurevilux.com",
          username: "admin",
          password: hashedAdminPassword,
          roles: [UserRole.SUPERADMIN],
          status: [UserStatus.ACTIVE],
          approve: true,
          authProvider: "local",
          isActive: true,
          isDeleted: false,
          avatarUrl: "",
        },
        {
          name: "Elena Rostova",
          email: "staff@aurevilux.com",
          username: "staff",
          password: hashedStaffPassword,
          roles: [UserRole.STAFF],
          status: [UserStatus.ACTIVE],
          approve: true,
          authProvider: "local",
          isActive: true,
          isDeleted: false,
          avatarUrl: "",
        },
      ]);
      console.log("✓ Seeded default executive accounts: admin, staff");
    }

    // Purge legacy mock user "sophia" if present
    await UserModel.deleteMany({ email: "sophia@aurevia.com" });

    console.log("Database reset and ready with clean schema!");
  } catch (error) {
    console.error("Seeding error:", error);
  }
}

export async function seedDatabase() {
  const prodCount = await ProductModel.countDocuments();
  if (prodCount === 0) {
    await resetAndSeedDatabase();
  }
}

if (require.main === module) {
  resetAndSeedDatabase().then(() => {
    mongoose.disconnect();
    process.exit(0);
  });
}
