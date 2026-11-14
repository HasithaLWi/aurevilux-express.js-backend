import { Response } from "express";
import bcrypt from "bcryptjs";
import { AuthRequest } from "../middlewares/auth";
import { UserProfileModel } from "../models/userProfile.model";
import { UserModel } from "../models/user.model";

export const getUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [user, profile] = await Promise.all([
      UserModel.findById(userId).select("-password"),
      UserProfileModel.findOne({ userId }),
    ]);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile retrieved successfully",
      data: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        roles: user.roles,
        authProvider: user.authProvider || "local",
        phone: profile?.phone || "",
        address: profile?.address || "",
        city: profile?.city || "",
        state: profile?.state || "",
        postalCode: profile?.postalCode || "",
        country: profile?.country || "",
        tier: profile?.tier || "Haute Member",
        avatarUrl: profile?.avatarUrl || user.avatarUrl || "",
        birthday: profile?.birthday || "",
        gender: profile?.gender || "",
        memberSince: profile?.memberSince || (user.createdAt ? new Date(user.createdAt).getFullYear().toString() : "2026"),
        savedAddresses: profile?.savedAddresses || [],
        savedCards: profile?.savedCards || [],
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to fetch profile", error: error.message });
  }
};

export const updateUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { name, phone, address, city, state, postalCode, country, avatarUrl, birthday, gender } = req.body;

    const userUpdates: Record<string, any> = {};
    if (name) userUpdates.name = name;
    if (avatarUrl !== undefined) userUpdates.avatarUrl = avatarUrl;
    if (Object.keys(userUpdates).length > 0) {
      await UserModel.findByIdAndUpdate(userId, userUpdates);
    }

    const updatedProfile = await UserProfileModel.findOneAndUpdate(
      { userId },
      {
        phone,
        address,
        city,
        state,
        postalCode,
        country,
        avatarUrl,
        birthday,
        gender,
      },
      { new: true, upsert: true }
    );

    const user = await UserModel.findById(userId).select("-password");

    return res.status(200).json({
      message: "Profile updated successfully",
      data: {
        id: user?._id,
        name: user?.name,
        username: user?.username,
        email: user?.email,
        roles: user?.roles,
        authProvider: user?.authProvider || "local",
        phone: updatedProfile.phone,
        address: updatedProfile.address,
        city: updatedProfile.city,
        state: updatedProfile.state,
        postalCode: updatedProfile.postalCode,
        country: updatedProfile.country,
        tier: updatedProfile.tier,
        avatarUrl: updatedProfile.avatarUrl || user?.avatarUrl || "",
        birthday: updatedProfile.birthday,
        gender: updatedProfile.gender,
        memberSince: updatedProfile.memberSince,
        savedAddresses: updatedProfile.savedAddresses || [],
        savedCards: updatedProfile.savedCards || [],
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
};

export const changeUserPassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new passwords are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!user.password) {
      return res.status(400).json({ message: "Account has no password set (OAuth login)." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password." });
    }

    const salt = bcrypt.genSaltSync(10);
    user.password = bcrypt.hashSync(newPassword, salt);
    await user.save();

    return res.status(200).json({ message: "Password updated successfully." });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to update password", error: error.message });
  }
};

export const getSavedAddresses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const profile = await UserProfileModel.findOne({ userId });
    return res.status(200).json({
      message: "Addresses fetched",
      data: profile?.savedAddresses || [],
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to get addresses", error: error.message });
  }
};

export const addSavedAddress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const addressData = req.body;
    let profile = await UserProfileModel.findOne({ userId });
    if (!profile) {
      profile = new UserProfileModel({ userId, savedAddresses: [] });
    }

    if (addressData.isDefault) {
      profile.savedAddresses.forEach((a) => (a.isDefault = false));
    }

    profile.savedAddresses.push(addressData);
    await profile.save();

    return res.status(201).json({
      message: "Address added successfully",
      data: profile.savedAddresses,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to add address", error: error.message });
  }
};

export const deleteSavedAddress = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const profile = await UserProfileModel.findOne({ userId });
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    profile.savedAddresses = profile.savedAddresses.filter(
      (a) => a.id !== id && String((a as any)._id) !== id
    );
    await profile.save();

    return res.status(200).json({
      message: "Address removed",
      data: profile.savedAddresses,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to delete address", error: error.message });
  }
};

export const getPaymentCards = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const profile = await UserProfileModel.findOne({ userId });
    return res.status(200).json({
      message: "Payment cards retrieved",
      data: profile?.savedCards || [],
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to get cards", error: error.message });
  }
};

export const addPaymentCard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { brand, cardNumber, expiry, cardHolder, isDefault } = req.body;

    // Mask the card number for security (only keep last 4 digits)
    const rawDigits = String(cardNumber || "").replace(/\s+/g, "");
    const masked = `•••• •••• •••• ${rawDigits.slice(-4) || "0000"}`;

    let profile = await UserProfileModel.findOne({ userId });
    if (!profile) {
      profile = new UserProfileModel({ userId, savedCards: [] });
    }

    if (isDefault) {
      profile.savedCards.forEach((c) => (c.isDefault = false));
    }

    profile.savedCards.push({
      brand: brand || "visa",
      cardNumber: masked,
      expiry: expiry || "12/28",
      cardHolder: cardHolder || "Cardholder",
      isDefault: isDefault || false,
    });

    await profile.save();

    return res.status(201).json({
      message: "Payment card saved securely",
      data: profile.savedCards,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to save card", error: error.message });
  }
};

export const deletePaymentCard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.sub;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const profile = await UserProfileModel.findOne({ userId });
    if (!profile) return res.status(404).json({ message: "Profile not found" });

    profile.savedCards = profile.savedCards.filter(
      (c) => c.id !== id && String((c as any)._id) !== id
    );
    await profile.save();

    return res.status(200).json({
      message: "Payment card removed",
      data: profile.savedCards,
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Failed to delete card", error: error.message });
  }
};

