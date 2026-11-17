import mongoose, { Document, Schema, Model } from "mongoose";

export interface IBusinessLookbook {
  title: string;
  subtitle: string;
  quote: string;
  quoteCaption: string;
  description: string;
  story: string;
  mainImage: string;
  leftImage: string;
  rightImage: string;
  galleryImages: string[];
}

export interface IConciergeConfig {
  activeProvider: "gemini" | "groq";
  enabled: boolean;
  welcomeMessage: string;
}

export interface IBusiness extends Document {
  name: string;
  legalName: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  freeShippingThreshold: number;
  termsAndConditions: string;
  privacyPolicy: string;
  lookbook: IBusinessLookbook;
  conciergeConfig: IConciergeConfig;
  createdAt: Date;
  updatedAt: Date;
}

const BusinessLookbookSchema = new Schema<IBusinessLookbook>(
  {
    title: { type: String, default: "Modern Elegance" },
    subtitle: { type: String, default: "THE LOOKBOOK" },
    quote: {
      type: String,
      default:
        "A curation of timeless silhouettes and modern craftsmanship, defining confident individuality through sophisticated design and understated luxury. Tailored to perfection, styled for the avant-garde.",
    },
    quoteCaption: { type: String, default: "Atelier Aurevilux Editorial" },
    description: {
      type: String,
      default:
        "A curation of timeless silhouettes and modern craftsmanship, defining confident individuality through sophisticated design and understated luxury. Tailored to perfection, styled for the avant-garde.",
    },
    story: {
      type: String,
      default:
        "Founded on the principles of immaculate bespoke tailoring and rare artisan sourcing, Aurevilux represents the pinnacle of modern luxury. Each collection is carefully orchestrated in limited quantities to preserve exclusivity and honor timeless craftsmanship.",
    },
    mainImage: {
      type: String,
      default: "/images/fashion_models/luxury_lookbook_hero.jpg",
    },
    leftImage: {
      type: String,
      default: "/images/fashion_models/featured_categories_men.jpg",
    },
    rightImage: {
      type: String,
      default: "/images/fashion_models/featured_categories_women.jpg",
    },
    galleryImages: [{ type: String }],
  },
  { _id: false }
);

const ConciergeConfigSchema = new Schema<IConciergeConfig>(
  {
    activeProvider: {
      type: String,
      enum: ["gemini", "groq"],
      default: "gemini",
    },
    enabled: { type: Boolean, default: true },
    welcomeMessage: {
      type: String,
      default:
        "Hello. I am Éléanore, your Aurevilux client advisor. How may I assist you today?",
    },
  },
  { _id: false }
);

const BusinessSchema = new Schema<IBusiness>(
  {
    name: { type: String, default: "Aurevilux Haute Couture" },
    legalName: { type: String, default: "Aurevilux Luxury Group S.A." },
    tagline: {
      type: String,
      default:
        "Crafting confidence and contemporary elegance. Sourcing the finest silhouettes and bespoke designs for the refined modern wardrobe.",
    },
    email: { type: String, default: "concierge@aurevilux.com" },
    phone: { type: String, default: "+33 1 42 68 00 00" },
    address: {
      type: String,
      default: "12 Place Vendôme, 75001 Paris, France",
    },
    currency: { type: String, default: "USD ($) - UNITED STATES DOLLAR" },
    freeShippingThreshold: { type: Number, default: 2500 },
    termsAndConditions: {
      type: String,
      default: `# Aurevilux Terms of Service & Bespoke Client Accord

Welcome to Aurevilux Haute Couture. By accessing our private salon and digital boutique, you enter into a binding covenant with Aurevilux Luxury Group.

### 1. Acquisition & Exclusivity
All acquisitions through the Aurevilux salon represent rare, limited-edition, or bespoke handcrafted creations. Due to the limited nature of our catalog, piece allocations are handled on a strict chronological basis.

### 2. White-Glove Logistics & Custody
Every order is dispatched via our bonded, high-security white-glove logistics partners. Ownership and risk of loss transfer to the patron upon verified concierge signature at your registered destination.

### 3. Atelier Exchanges & Archival Returns
We uphold an uncompromising commitment to perfection. Inquiries regarding bespoke adjustments or archival exchanges must be initiated within fourteen (14) days of reception through your private client concierge.

### 4. Intellectual Property
All design silhouettes, editorial imagery, monogram emblems, and creative direction remain the exclusive intellectual heritage of Aurevilux and its partner Maisons.`,
    },
    privacyPolicy: {
      type: String,
      default: `# Aurevilux Patron Privacy & Confidentiality Covenant

At Aurevilux, the privacy and discretion of our patrons is of paramount importance. This covenant details the safeguarding of your private dossier.

### 1. Dossier Information Collected
We collect only the essential personal details required to orchestrate bespoke acquisitions, white-glove consignments, and private salon appointments (including legal name, contact coordinates, and secure delivery destinations).

### 2. Payment Data Security
All financial settlements are encrypted using military-grade AES-256 protocols. Aurevilux does not store raw credit card numbers or vaulted card security codes.

### 3. Confidentiality Guarantee
Your dossier is strictly private. We never sell, distribute, or monetize client information to third parties. Information is shared strictly with bonded logistics couriers to fulfill delivery.

### 4. Salon Rights
Patrons maintain the absolute right to inspect, update, or request the purging of their client dossier at any time by contacting concierge@aurevilux.com.`,
    },
    lookbook: { type: BusinessLookbookSchema, default: () => ({}) },
    conciergeConfig: { type: ConciergeConfigSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export const BusinessModel: Model<IBusiness> =
  mongoose.models.Business ||
  mongoose.model<IBusiness>("Business", BusinessSchema);
