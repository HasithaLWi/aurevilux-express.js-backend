import { Document, model, Schema } from "mongoose"

export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED'
}

export interface IUser extends Document {
  name: string
  email: string
  username:string
  password: string
  roles: UserRole[]
  status:UserStatus[]
  approve: boolean
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    roles: {
      type: [String],
      enum: Object.values(UserRole),
      default: [UserRole.CUSTOMER]
    },
    status:{
      type:[String],
      enum:Object.values(UserStatus),
      default:[UserStatus.ACTIVE]
    },
    approve: { type: Boolean, default: false }
  },
  { timestamps: true }
)

export const UserModel = model<IUser>("users", userSchema)