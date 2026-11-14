import { Request, Response } from "express";
import { UserModel, UserRole, UserStatus } from "../models/user.model";
import { InviteModel } from "../models/invite.model";
import bcrypt from "bcryptjs";
import { signAccessToken, signRefreshToken } from "../utils/token";
import { AuthRequest } from "../middlewares/auth";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../services/email.service";
import { OAuth2Client } from "google-auth-library";

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "997178440277-12np226o5k54cvq6ie9ajvs5ql90e171.apps.googleusercontent.com";
const googleOAuthClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, username, password } = req.body;
    if (!name || !email || !username || !password) {
      return res.status(400).json({
        message: "All fields are required..!",
      });
    }

    const extEmail = await UserModel.findOne({ email: email.toLowerCase() });
    if (extEmail) {
      return res.status(400).json({
        message: "Email already exists..!",
      });
    }

    const extUsername = await UserModel.findOne({ username: username.toLowerCase() });
    if (extUsername) {
      return res.status(400).json({
        message: "Username already exists..!",
      });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const newUser = new UserModel({
      name,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password: hashedPassword,
      roles: [UserRole.CUSTOMER],
      status: [UserStatus.ACTIVE],
      approve: true,
      authProvider: "local",
      isActive: true,
      isDeleted: false,
    });

    await newUser.save();

    const accessToken = signAccessToken(newUser);
    const refreshToken = signRefreshToken(newUser);

    res.status(201).json({
      message: "User registered successfully..!",
      data: {
        username: newUser.username,
        name: newUser.name,
        email: newUser.email,
        roles: newUser.roles,
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      message: "Registration fail",
      error: err.message || err,
    });
  }
};

export const registerWithInvite = async (req: Request, res: Response) => {
  try {
    const { token, name, username, password } = req.body;
    if (!token || !name || !username || !password) {
      return res.status(400).json({ message: "All fields and invite token are required." });
    }

    const invite = await InviteModel.findOne({ token, used: false });
    if (!invite) {
      return res.status(400).json({ message: "Invalid or expired invite token." });
    }

    if (new Date() > invite.expiresAt) {
      return res.status(400).json({ message: "This invite token has expired." });
    }

    const extEmail = await UserModel.findOne({ email: invite.email });
    if (extEmail) {
      return res.status(400).json({ message: "An account with this email already exists." });
    }

    const extUsername = await UserModel.findOne({ username: username.toLowerCase() });
    if (extUsername) {
      return res.status(400).json({ message: "Username already taken." });
    }

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const assignedRole = invite.role === "ADMIN" ? UserRole.ADMIN : UserRole.STAFF;

    const newUser = new UserModel({
      name,
      email: invite.email,
      username: username.toLowerCase(),
      password: hashedPassword,
      roles: [assignedRole],
      status: [UserStatus.ACTIVE],
      approve: true,
      authProvider: "local",
      isActive: true,
      isDeleted: false,
    });

    await newUser.save();

    invite.used = true;
    await invite.save();

    const accessToken = signAccessToken(newUser);
    const refreshToken = signRefreshToken(newUser);

    return res.status(201).json({
      message: `Welcome to the Atelier. Registered as ${assignedRole}.`,
      data: {
        username: newUser.username,
        name: newUser.name,
        email: newUser.email,
        roles: newUser.roles,
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ message: "Failed to register via invite", error: err.message });
  }
};

export const verifyInvite = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const invite = await InviteModel.findOne({ token, used: false });
    if (!invite) {
      return res.status(404).json({ message: "Invite token not found or already consumed." });
    }

    if (new Date() > invite.expiresAt) {
      return res.status(400).json({ message: "Invite link has expired." });
    }

    return res.status(200).json({
      message: "Valid invite token",
      data: {
        email: invite.email,
        role: invite.role,
        invitedBy: invite.invitedBy,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ message: "Error verifying invite", error: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) {
      return res.status(400).json({ message: "username or password missing..!" });
    }

    const user = await UserModel.findOne({
      $or: [{ username: username.toLowerCase() }, { email: username.toLowerCase() }],
      isDeleted: { $ne: true },
    });

    if (!user) {
      return res.status(401).json({ message: "User not found..!" });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: "Account is suspended. Please contact Atelier Concierge." });
    }

    if (!user.password && user.authProvider === "google") {
      return res.status(400).json({
        message: "This account was created via Google Sign-In. Please sign in with Google.",
      });
    }

    const isValid = await bcrypt.compare(password, user.password || "");
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials..!" });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    res.status(200).json({
      message: "Success",
      data: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        roles: user.roles,
        avatarUrl: user.avatarUrl,
        authProvider: user.authProvider || "local",
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({
      message: "Login fail",
      error: err.message || err,
    });
  }
};

export const googleAuth = async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ message: "Google credential ID token is required." });
    }

    // Strictly verify the cryptographically signed Google ID token with Google's public certs
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).json({ message: "Invalid or forged Google authentication token." });
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || payload.given_name || "Aurevilux Patron";
    const avatarUrl = payload.picture || "";

    let user = await UserModel.findOne({ email });

    if (user) {
      if (user.isDeleted) {
        return res.status(403).json({ message: "Account has been deactivated. Please contact concierge." });
      }
      if (!user.isActive) {
        return res.status(403).json({ message: "Account is suspended. Please contact concierge." });
      }
      if (avatarUrl && !user.avatarUrl) {
        user.avatarUrl = avatarUrl;
        await user.save();
      }
    } else {
      // Auto-generate clean unique username from verified email
      const cleanBase = email.split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase() || "patron";
      let finalUsername = cleanBase;
      const existingUser = await UserModel.findOne({ username: finalUsername });
      if (existingUser) {
        finalUsername = `${cleanBase}${Math.floor(100 + Math.random() * 900)}`;
      }

      user = new UserModel({
        name,
        email,
        username: finalUsername,
        roles: [UserRole.CUSTOMER],
        status: [UserStatus.ACTIVE],
        approve: true,
        authProvider: "google",
        avatarUrl: avatarUrl,
        isActive: true,
        isDeleted: false,
      });

      await user.save();
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    return res.status(200).json({
      message: "Google authentication successful",
      data: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        roles: user.roles,
        avatarUrl: user.avatarUrl,
        authProvider: user.authProvider || "local",
        access_token: accessToken,
        refresh_token: refreshToken,
      },
    });
  } catch (err: any) {
    console.error("Google Auth verification failed:", err);
    return res.status(401).json({
      message: "Google authentication verification failed",
      error: err.message || "Invalid Google token",
    });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await UserModel.findOne({ email: email.toLowerCase(), isDeleted: { $ne: true } });
    if (!user) {
      // Return 200 for security so attackers cannot enumerate registered emails
      return res.status(200).json({ message: "If that email is registered, recovery instructions have been dispatched." });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour expiration
    await user.save();

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

    await sendPasswordResetEmail(user.email, resetUrl);

    return res.status(200).json({
      message: "Password recovery instructions sent to your email address.",
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to process forgot password", error: error.message });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, email, password } = req.body;
    if (!token || !email || !password) {
      return res.status(400).json({ message: "Token, email, and new password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }

    const user = await UserModel.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
      isDeleted: { $ne: true },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired password reset link. Please request a new recovery link.",
      });
    }

    const salt = bcrypt.genSaltSync(10);
    user.password = bcrypt.hashSync(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({
      message: "Password reset successful. You can now sign in with your new credentials.",
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: "Failed to reset password", error: error.message });
  }
};

export const getMyDetails = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(404).json({ message: "Unauthorized" });
  }

  const userId = req.user.sub;
  const user = await UserModel.findById(userId).select("-password");

  if (!user) {
    return res.status(404).json({ message: "user not found..!" });
  }

  const { name, username, email, roles, _id, avatarUrl, isActive, authProvider } = user;

  res.status(200).json({
    message: "Success",
    data: { name, username, email, roles, id: _id, avatarUrl, isActive, authProvider: authProvider || "local" },
  });
};

export const getRrefreshToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  try {
    if (!refreshToken) {
      return res.status(400).json({
        message: "Token not found..!",
      });
    }
    const payload: any = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const userId = payload?.sub;
    const user = await UserModel.findById(userId);
    if (!user || user.isDeleted || !user.isActive) {
      return res.status(403).json({
        message: "Invalid or expired token..!",
      });
    }

    const newAccessToken = signAccessToken(user);
    res.status(200).json({
      data: { accessToken: newAccessToken },
    });
  } catch (err) {
    res.status(403).json({
      message: "Invalid or expire token..!",
    });
  }
};
