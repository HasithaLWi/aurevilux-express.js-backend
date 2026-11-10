import mongoose, { Document, Schema, Model } from "mongoose";

export interface IBrandApp extends Document {
  brandName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  country: string;
  status: "Pending" | "Approved" | "Rejected";
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const BrandAppSchema = new Schema<IBrandApp>(
  {
    brandName: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: "" },
    website: { type: String, default: "" },
    country: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
      index: true,
    },
    notes: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

export const BrandAppModel: Model<IBrandApp> =
  mongoose.models.BrandApp || mongoose.model<IBrandApp>("BrandApp", BrandAppSchema);

