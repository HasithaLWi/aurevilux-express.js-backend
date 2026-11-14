import { Document, model, Schema } from "mongoose";

export interface INewsletter extends Document {
  email: string;
  isActive: boolean;
  subscribedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const newsletterSchema = new Schema<INewsletter>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    isActive: { type: Boolean, default: true },
    subscribedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const NewsletterModel = model<INewsletter>("Newsletter", newsletterSchema);

