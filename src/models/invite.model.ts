import { Document, model, Schema } from "mongoose";

export interface IInvite extends Document {
  email: string;
  role: "ADMIN" | "STAFF";
  token: string;
  invitedBy: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const inviteSchema = new Schema<IInvite>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ["ADMIN", "STAFF"], required: true },
    token: { type: String, required: true, unique: true },
    invitedBy: { type: String, required: true },
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days validity
    },
    used: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const InviteModel = model<IInvite>("Invite", inviteSchema);

