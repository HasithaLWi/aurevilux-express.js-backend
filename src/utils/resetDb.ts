import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config();

import { UserModel } from "../models/user.model";
import { UserProfileModel } from "../models/userProfile.model";
import { ProductModel } from "../models/product.model";
import { CategoryModel } from "../models/category.model";
import { BrandModel } from "../models/brand.model";
import { OrderModel } from "../models/order.model";
import { InviteModel } from "../models/invite.model";
import { FeedbackModel } from "../models/feedback.model";
import { NewsletterModel } from "../models/newsletter.model";
import { CourierPartnerModel } from "../models/courier.model";
import { BusinessModel } from "../models/business.model";

import {
  SEED_CATEGORIES,
  SEED_BRANDS,
  SEED_USERS_RAW,
  SEED_COURIERS_DATA,
  SEED_PATRON_PROFILE,
  SEED_RAW_PRODUCTS,
  SEED_SAMPLE_FEEDBACKS,
  SEED_SAMPLE_NEWSLETTER,
} from "./seedData";

const MONGO_URL =
  process.env.MONGO_ATLAS_URL ||
  process.env.MONGO_LOCAL_URL ||
  "mongodb://admin:1234@localhost:27017/auravilux?authSource=admin";

export async function resetAndSeedDatabase(shouldDisconnect = true) {
  try {
    console.log("==========================================================");
    console.log("       AUREVILUX ATELIER DATABASE SEED & RESET ENGINE     ");
    console.log("==========================================================");

    if (mongoose.connection.readyState !== 1) {
      console.log("[DB Reset] Connecting to MongoDB Atlas...");
      await mongoose.connect(MONGO_URL);
    }
    console.log("✓ Connected to MongoDB.");

    // 1. Purge all existing collections
    console.log("[DB Reset] Purging legacy collections...");
    await Promise.all([
      ProductModel.deleteMany({}),
      CategoryModel.deleteMany({}),
      BrandModel.deleteMany({}),
      UserModel.deleteMany({}),
      UserProfileModel.deleteMany({}),
      OrderModel.deleteMany({}),
      InviteModel.deleteMany({}),
      FeedbackModel.deleteMany({}),
      NewsletterModel.deleteMany({}),
      CourierPartnerModel.deleteMany({}),
      BusinessModel.deleteMany({}),
    ]);
    console.log("✓ Dropped and cleared all collections.");

    // 2. Seed Users & VIP Patron Profile
    console.log("[DB Reset] Seeding executive staff & patron accounts...");
    const salt = bcrypt.genSaltSync(10);
    const createdUsers: any[] = [];

    for (const rawUser of SEED_USERS_RAW) {
      const { plainPassword, ...userData } = rawUser;
      const hashedPassword = bcrypt.hashSync(plainPassword, salt);

      const newUser = await UserModel.create({
        ...userData,
        password: hashedPassword,
      });
      createdUsers.push(newUser);
    }
    console.log(`✓ Synchronized ${createdUsers.length} executive, staff & patron accounts.`);

    // Attach profile to VIP Patron (Lord Alexander Sterling)
    const patronUser = createdUsers.find((u) => u.email === "patron@aurevilux.com");
    if (patronUser) {
      await UserProfileModel.create({
        userId: patronUser._id,
        ...SEED_PATRON_PROFILE,
      });
      console.log("✓ Attached VIP Patron profile with saved addresses & encrypted cards.");
    }

    // 3. Seed Categories (NO subcategories)
    console.log("[DB Reset] Seeding luxury categories (single-tier taxonomy)...");
    const insertedCategories = await CategoryModel.insertMany(SEED_CATEGORIES);
    const categoryMap = new Map<string, mongoose.Types.ObjectId>(
      insertedCategories.map((c) => [c.slug.toLowerCase(), c._id as mongoose.Types.ObjectId])
    );
    console.log(`✓ Seeded ${insertedCategories.length} categories.`);

    // 4. Seed Brands
    console.log("[DB Reset] Seeding luxury fashion maisons...");
    const insertedBrands = await BrandModel.insertMany(SEED_BRANDS);
    const brandMap = new Map<string, mongoose.Types.ObjectId>(
      insertedBrands.map((b) => [b.name.toLowerCase(), b._id as mongoose.Types.ObjectId])
    );
    console.log(`✓ Seeded ${insertedBrands.length} brands with logos & campaign lookbooks.`);

    // 4b. Seed Courier Partners
    console.log("[DB Reset] Seeding white-glove courier partners...");
    await CourierPartnerModel.insertMany(SEED_COURIERS_DATA);
    console.log(`✓ Seeded ${SEED_COURIERS_DATA.length} courier partners with real-time tracking templates.`);

    const fallbackCategoryId = insertedCategories[0]._id as mongoose.Types.ObjectId;
    const fallbackBrandId = insertedBrands[0]._id as mongoose.Types.ObjectId;

    // 5. Seed Products with Relational ObjectIds & Variant Stock
    console.log("[DB Reset] Seeding luxury catalog pieces with variant size stock allocations...");
    const reviewerUser = patronUser || createdUsers[0];

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
        sizeStock: (raw as any).sizeStock || [],
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

    const insertedProducts = await ProductModel.insertMany(productsWithRefs);
    console.log(
      `✓ Seeded ${insertedProducts.length} luxury pieces (including sold-out test pieces).`
    );

    // 6. Seed Sample VIP Orders (Across all 5 pipeline statuses)
    console.log("[DB Reset] Generating sample VIP orders & shipping records...");
    const sampleItems = insertedProducts.slice(0, 3).map((p) => ({
      productId: p._id,
      name: p.name,
      brand: (insertedBrands[0] as any).name || "Saint Laurent",
      price: p.price,
      quantity: 1,
      selectedColor: p.colors[0]?.name || "Obsidian Black",
      selectedSize: p.sizes[0] || "M",
      image: p.images[0] || "",
    }));

    const sampleOrders = [
      {
        orderNumber: "ORD-2026-90811",
        userId: patronUser?._id,
        items: [sampleItems[0]],
        total: sampleItems[0].price + 35,
        itemsCount: 1,
        customer: {
          name: "Lord Alexander Sterling",
          email: "patron@aurevilux.com",
          phone: "+1 212 555 0199",
        },
        shippingAddress: {
          street: "740 Park Avenue, Penthouse B",
          city: "New York",
          state: "New York",
          postalCode: "10021",
          country: "United States",
        },
        status: "Delivered" as const,
        paymentStatus: "Paid" as const,
        carrier: "DHL Express Elite",
        trackingNumber: "AWB-DHL-9840217",
        estimatedDelivery: "Delivered Oct 28, 2026",
        timeline: [
          { title: "Order Authorized", date: "2026-10-25 10:15 AM", completed: true },
          { title: "Atelier Consignment Packed", date: "2026-10-25 04:30 PM", completed: true },
          { title: "Dispatched via DHL Elite", date: "2026-10-26 09:00 AM", completed: true },
          { title: "Delivered to Patron", date: "2026-10-28 02:45 PM", completed: true },
        ],
      },
      {
        orderNumber: "ORD-2026-90812",
        userId: patronUser?._id,
        items: [sampleItems[1]],
        total: sampleItems[1].price,
        itemsCount: 1,
        customer: {
          name: "Lord Alexander Sterling",
          email: "patron@aurevilux.com",
          phone: "+1 212 555 0199",
        },
        shippingAddress: {
          street: "14 Rue du Faubourg Saint-Honoré",
          city: "Paris",
          state: "Île-de-France",
          postalCode: "75008",
          country: "France",
        },
        status: "In Transit" as const,
        paymentStatus: "Paid" as const,
        carrier: "Ferrari Logistics",
        trackingNumber: "FER-889102-LUX",
        estimatedDelivery: "Expected Nov 18, 2026",
        timeline: [
          { title: "Order Authorized", date: "2026-11-14 11:30 AM", completed: true },
          { title: "Atelier Consignment Packed", date: "2026-11-14 05:00 PM", completed: true },
          { title: "Dispatched via Ferrari Logistics", date: "2026-11-15 08:30 AM", completed: true },
          { title: "Delivered to Patron", date: "Pending", completed: false },
        ],
      },
      {
        orderNumber: "ORD-2026-90813",
        userId: patronUser?._id,
        items: [sampleItems[2]],
        total: sampleItems[2].price,
        itemsCount: 1,
        customer: {
          name: "Lord Alexander Sterling",
          email: "patron@aurevilux.com",
          phone: "+1 212 555 0199",
        },
        shippingAddress: {
          street: "740 Park Avenue, Penthouse B",
          city: "New York",
          state: "New York",
          postalCode: "10021",
          country: "United States",
        },
        status: "Processing" as const,
        paymentStatus: "Paid" as const,
        carrier: "FedEx Private Luxe",
        trackingNumber: "",
        estimatedDelivery: "Awaiting Dispatch",
        timeline: [
          { title: "Order Authorized", date: "2026-11-15 09:00 AM", completed: true },
          { title: "Atelier Consignment Packed", date: "In Progress", completed: false },
          { title: "Dispatched", date: "Pending", completed: false },
          { title: "Delivered to Patron", date: "Pending", completed: false },
        ],
      },
      {
        orderNumber: "ORD-2026-90814",
        userId: patronUser?._id,
        items: [sampleItems[0]],
        total: sampleItems[0].price,
        itemsCount: 1,
        customer: {
          name: "Lord Alexander Sterling",
          email: "patron@aurevilux.com",
          phone: "+1 212 555 0199",
        },
        shippingAddress: {
          street: "740 Park Avenue, Penthouse B",
          city: "New York",
          state: "New York",
          postalCode: "10021",
          country: "United States",
        },
        status: "Pending" as const,
        paymentStatus: "Pending" as const,
        carrier: "Malca-Amit Security",
        trackingNumber: "",
        estimatedDelivery: "Awaiting Settlement",
        timeline: [
          { title: "Order Placement Registered", date: "2026-11-15 01:20 PM", completed: true },
          { title: "Bank Wire Verification", date: "Pending", completed: false },
        ],
      },
      {
        orderNumber: "ORD-2026-90815",
        userId: patronUser?._id,
        items: [sampleItems[1]],
        total: sampleItems[1].price,
        itemsCount: 1,
        customer: {
          name: "Lord Alexander Sterling",
          email: "patron@aurevilux.com",
          phone: "+1 212 555 0199",
        },
        shippingAddress: {
          street: "740 Park Avenue, Penthouse B",
          city: "New York",
          state: "New York",
          postalCode: "10021",
          country: "United States",
        },
        status: "Cancelled" as const,
        paymentStatus: "Pending" as const,
        carrier: "DHL Express Elite",
        trackingNumber: "",
        estimatedDelivery: "Consignment Revoked",
        timeline: [
          { title: "Order Placement Registered", date: "2026-11-10 10:00 AM", completed: true },
          { title: "Order Cancelled by Patron - Inventory Restored", date: "2026-11-10 11:30 AM", completed: true },
        ],
      },
    ];

    await OrderModel.insertMany(sampleOrders);
    console.log(`✓ Seeded ${sampleOrders.length} sample VIP orders across all pipeline states.`);

    // 7. Seed Active Staff Invitation
    console.log("[DB Reset] Creating sample executive staff invitations...");
    await InviteModel.create({
      email: "curator@aurevilux.com",
      role: "STAFF",
      token: "invite-senior-curator-2026",
      invitedBy: "superadmin@aurevilux.com",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      used: false,
    });
    console.log("✓ Seeded active staff invite: token 'invite-senior-curator-2026' for curator@aurevilux.com");

    // 8. Seed Verified Testimonials / Feedback
    console.log("[DB Reset] Seeding approved website testimonials...");
    await FeedbackModel.insertMany(SEED_SAMPLE_FEEDBACKS);
    console.log(`✓ Seeded ${SEED_SAMPLE_FEEDBACKS.length} verified testimonials.`);

    // 9. Seed Newsletter Subscriptions
    console.log("[DB Reset] Seeding luxury newsletter subscribers...");
    await NewsletterModel.insertMany(
      SEED_SAMPLE_NEWSLETTER.map((email) => ({
        email,
        isActive: true,
        subscribedAt: new Date(),
      }))
    );
    console.log(`✓ Seeded ${SEED_SAMPLE_NEWSLETTER.length} newsletter subscribers.`);

    // 10. Seed Atelier Business Parameters & Lookbook Studio
    console.log("[DB Reset] Seeding atelier business parameters & lookbook studio...");
    await BusinessModel.create({
      name: "Aurevilux Haute Couture",
      legalName: "Aurevilux Luxury Group S.A.",
      tagline:
        "Crafting confidence and contemporary elegance. Sourcing the finest silhouettes and bespoke designs for the refined modern wardrobe.",
      email: "concierge@aurevilux.com",
      phone: "+33 1 42 68 00 00",
      address: "12 Place Vendôme, 75001 Paris, France",
      currency: "USD ($) - UNITED STATES DOLLAR",
      freeShippingThreshold: 2500,
      lookbook: {
        title: "Modern Elegance",
        subtitle: "THE LOOKBOOK",
        quote:
          "A curation of timeless silhouettes and modern craftsmanship, defining confident individuality through sophisticated design and understated luxury. Tailored to perfection, styled for the avant-garde.",
        quoteCaption: "Atelier Aurevilux Editorial",
        description:
          "A curation of timeless silhouettes and modern craftsmanship, defining confident individuality through sophisticated design and understated luxury. Tailored to perfection, styled for the avant-garde.",
        story:
          "Founded on the principles of immaculate bespoke tailoring and rare artisan sourcing, Aurevilux represents the pinnacle of modern luxury. Each collection is carefully orchestrated in limited quantities to preserve exclusivity and honor timeless craftsmanship.",
        mainImage: "/images/fashion_models/luxury_lookbook_hero.jpg",
        leftImage: "/images/fashion_models/featured_categories_men.jpg",
        rightImage: "/images/fashion_models/featured_categories_women.jpg",
        galleryImages: [],
      },
    });
    console.log("✓ Seeded atelier business parameters and lookbook studio.");

    console.log("==========================================================");
    console.log("✓ DATABASE RESET & COMPLETE SEED COMPLETED SUCCESSFULLY!");
    console.log("==========================================================");
    console.log("VIP Accounts Ready:");
    console.log("  SuperAdmin: superadmin@aurevilux.com / superadmin123");
    console.log("  Admin:      admin@aurevilux.com / admin123");
    console.log("  Staff:      staff@aurevilux.com / staff123");
    console.log("  New Hire:   newhire@aurevilux.com / newhire123 (Pending approval)");
    console.log("  VIP Patron: patron@aurevilux.com / customer123 (Saved addresses & cards)");
    console.log("==========================================================");
  } catch (error) {
    console.error("✗ Database reset error:", error);
    throw error;
  } finally {
    if (shouldDisconnect) {
      await mongoose.disconnect();
      console.log("✓ Disconnected cleanly from MongoDB.");
    }
  }
}

// Standalone execution: node -r tsx/register resetDb.ts
if (require.main === module) {
  resetAndSeedDatabase(true)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
