import { Document, model, Schema } from "mongoose";

export enum UserRole {
  SUPERADMIN = "SUPERADMIN",
  ADMIN = "ADMIN",
  STAFF = "STAFF",
  CUSTOMER = "CUSTOMER",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  DELETED = "DELETED",
}

export interface IUser extends Document {
  name: string;
  email: string;
  username: string;
  password?: string;
  roles: UserRole[];
  status: UserStatus[];
  approve: boolean;
  avatarUrl?: string;
  authProvider: "local" | "google";
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: {
      type: String,
      required: function (this: IUser) {
        return this.authProvider === "local";
      },
    },
    roles: {
      type: [String],
      enum: Object.values(UserRole),
      default: [UserRole.CUSTOMER],
    },
    status: {
      type: [String],
      enum: Object.values(UserStatus),
      default: [UserStatus.ACTIVE],
    },
    approve: { type: Boolean, default: true },
    avatarUrl: { type: String, default: "" },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    resetPasswordToken: { type: String, default: null, index: true },
    resetPasswordExpires: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const UserModel = model<IUser>("users", userSchema);
