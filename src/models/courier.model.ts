import mongoose, { Document, Schema, Model } from "mongoose";

export interface ICourierPartner extends Document {
  name: string;
  code: string;
  serviceType: string;
  trackingUrlTemplate?: string;
  supportContact: string;
  logo?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CourierPartnerSchema = new Schema<ICourierPartner>(
  {
    name: { type: String, required: true, trim: true },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    serviceType: { type: String, default: "White-Glove Courier" },
    trackingUrlTemplate: { type: String, default: "" },
    supportContact: { type: String, default: "" },
    logo: { type: String, default: "" },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const CourierPartnerModel: Model<ICourierPartner> =
  mongoose.models.CourierPartner ||
  mongoose.model<ICourierPartner>("CourierPartner", CourierPartnerSchema);
