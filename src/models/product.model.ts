import mongoose, { Document, Schema, Model } from "mongoose";

export interface IProductColor {
  name: string;
  value: string;
}

export interface IProductSpec {
  label: string;
  value: string;
}

export interface IProductReview {
  id?: string;
  userId?: mongoose.Types.ObjectId;
  name: string;
  rating: number;
  date: string;
  comment: string;
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  price: number;
  rating: number;
  reviewsCount: number;
  category: "women" | "men" | "accessories" | "new-arrivals";
  categoryLabel: string;
  description: string;
  longDescription: string;
  images: string[];
  colors: IProductColor[];
  sizes: string[];
  brand: string;
  inStock: boolean;
  stockCount: number;
  isBestSeller: boolean;
  isNewArrival: boolean;
  specifications: IProductSpec[];
  reviews: IProductReview[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductColorSchema = new Schema<IProductColor>(
  {
    name: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

const ProductSpecSchema = new Schema<IProductSpec>(
  {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false }
);

const ProductReviewSchema = new Schema<IProductReview>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    date: { type: String, default: () => new Date().toISOString().split("T")[0] },
    comment: { type: String, required: true },
  },
  { _id: true }
);

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    price: { type: Number, required: true, min: 0 },
    rating: { type: Number, default: 5.0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0 },
    category: {
      type: String,
      required: true,
      enum: ["women", "men", "accessories", "new-arrivals"],
      index: true,
    },
    categoryLabel: { type: String, default: "" },
    description: { type: String, required: true },
    longDescription: { type: String, default: "" },
    images: { type: [String], default: [] },
    colors: { type: [ProductColorSchema], default: [] },
    sizes: { type: [String], default: [] },
    brand: { type: String, required: true, index: true },
    inStock: { type: Boolean, default: true },
    stockCount: { type: Number, default: 10, min: 0 },
    isBestSeller: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    specifications: { type: [ProductSpecSchema], default: [] },
    reviews: { type: [ProductReviewSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

export const ProductModel: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

