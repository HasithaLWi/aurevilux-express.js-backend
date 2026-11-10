import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { ProductModel } from "../models/product.model";
import { CategoryModel } from "../models/category.model";
import { BrandModel } from "../models/brand.model";
import { SEED_CATEGORIES, SEED_BRANDS, SEED_PRODUCTS } from "./seedData";

const MONGO_URL = process.env.MONGO_LOCAL_URL || "";

export async function seedDatabase() {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGO_URL);
    }
    console.log("Seeding database check...");

    // Seed Categories
    const catCount = await CategoryModel.countDocuments();
    if (catCount === 0) {
      await CategoryModel.insertMany(SEED_CATEGORIES);
      console.log(`✓ Seeded ${SEED_CATEGORIES.length} categories.`);
    }

    // Seed Brands
    const brandCount = await BrandModel.countDocuments();
    if (brandCount === 0) {
      await BrandModel.insertMany(SEED_BRANDS);
      console.log(`✓ Seeded ${SEED_BRANDS.length} brands.`);
    }

    // Seed Products
    const prodCount = await ProductModel.countDocuments();
    if (prodCount === 0) {
      await ProductModel.insertMany(SEED_PRODUCTS);
      console.log(`✓ Seeded ${SEED_PRODUCTS.length} products.`);
    }

    console.log("Database ready!");
  } catch (error) {
    console.error("Seeding error:", error);
  }
}

if (require.main === module) {
  seedDatabase().then(() => {
    mongoose.disconnect();
    process.exit(0);
  });
}

