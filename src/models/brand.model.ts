import mongoose, { Document, Schema, Model } from "mongoose";

export interface IBrand extends Document {
  name: string;
  slug: string;
  logo: string;
  campaignImage: string;
  description: string;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BrandSchema = new Schema<IBrand>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    logo: { type: String, default: "" },
    campaignImage: { type: String, default: "" },
    description: { type: String, default: "" },
    featured: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export const BrandModel: Model<IBrand> =
  mongoose.models.Brand || mongoose.model<IBrand>("Brand", BrandSchema);

