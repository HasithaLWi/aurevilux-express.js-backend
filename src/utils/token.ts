import { IUser } from "../models/user.model";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;

export const signAccessToken = (user: IUser): string => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      roles: user.roles,
      username: user.username,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl || "",
    },
    JWT_SECRET,
    { expiresIn: "7d" } // extended for smooth UX
  );
};

export const signRefreshToken = (user: IUser): string => {
  return jwt.sign(
    {
      sub: user._id.toString(),
    },
    JWT_REFRESH_SECRET,
    { expiresIn: "30d" }
  );
};
