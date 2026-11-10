import mongoose, { Document, Schema, Model } from "mongoose";

export interface ICategory extends Document {
  title: string;
  slug: string;
  description: string;
  image: string;
  link: string;
  buttonText: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    link: { type: String, default: "" },
    buttonText: { type: String, default: "EXPLORE COLLECTION" },
  },
  {
    timestamps: true,
  }
);

export const CategoryModel: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);

