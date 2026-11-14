import mongoose, { Document, Schema, Model } from "mongoose";

export interface ISavedAddress {
  id?: string;
  type: "Home" | "Office" | "Other";
  isDefault: boolean;
  name: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
}

export interface ISavedCard {
  id?: string;
  brand: "visa" | "mastercard" | "amex" | "generic";
  cardNumber: string; // Masked string e.g. "**** **** **** 4242"
  expiry: string;
  cardHolder: string;
  isDefault: boolean;
}

export interface IUserProfile extends Document {
  userId: mongoose.Types.ObjectId;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  tier: string;
  memberSince: string;
  avatarUrl: string;
  birthday: string;
  gender: string;
  savedAddresses: ISavedAddress[];
  savedCards: ISavedCard[];
  createdAt: Date;
  updatedAt: Date;
}

const SavedAddressSchema = new Schema<ISavedAddress>(
  {
    type: { type: String, enum: ["Home", "Office", "Other"], default: "Home" },
    isDefault: { type: Boolean, default: false },
    name: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    phone: { type: String, default: "" },
  },
  { _id: true }
);

const SavedCardSchema = new Schema<ISavedCard>(
  {
    brand: {
      type: String,
      enum: ["visa", "mastercard", "amex", "generic"],
      default: "visa",
    },
    cardNumber: { type: String, required: true },
    expiry: { type: String, required: true },
    cardHolder: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const UserProfileSchema = new Schema<IUserProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    phone: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    postalCode: { type: String, default: "" },
    country: { type: String, default: "" },
    tier: { type: String, default: "Haute Member" },
    memberSince: {
      type: String,
      default: () => new Date().toISOString().split("T")[0],
    },
    avatarUrl: { type: String, default: "" },
    birthday: { type: String, default: "" },
    gender: { type: String, default: "" },
    savedAddresses: { type: [SavedAddressSchema], default: [] },
    savedCards: { type: [SavedCardSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

export const UserProfileModel: Model<IUserProfile> =
  mongoose.models.UserProfile ||
  mongoose.model<IUserProfile>("UserProfile", UserProfileSchema);

