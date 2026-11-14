import mongoose, { Document, Schema, Model } from "mongoose";

export interface ICategory extends Document {
  title: string;
  slug: string;
  department: "men" | "women" | "accessories" | "new-arrivals" | "all";
  parentCategory?: string;
  subcategories: string[];
  description: string;
  image: string;
  link: string;
  buttonText: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    department: {
      type: String,
      enum: ["men", "women", "accessories", "new-arrivals", "all"],
      default: "all",
    },
    parentCategory: { type: String, default: "" },
    subcategories: { type: [String], default: [] },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    link: { type: String, default: "" },
    buttonText: { type: String, default: "EXPLORE COLLECTION" },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export const CategoryModel: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);
