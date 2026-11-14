import { Document, model, Schema } from "mongoose";

export interface IFeedback extends Document {
  name: string;
  email: string;
  role?: string; // e.g. "Haute Couture Collector", "Patron from Paris"
  rating: number;
  comment: string;
  isFeatured: boolean;
  status: "pending" | "approved" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

const feedbackSchema = new Schema<IFeedback>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    role: { type: String, default: "Boutique Patron" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    isFeatured: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "approved", "archived"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const FeedbackModel = model<IFeedback>("Feedback", feedbackSchema);

