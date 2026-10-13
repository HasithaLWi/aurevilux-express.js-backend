import { Request, Response } from "express"
import { UserModel, UserRole, UserStatus } from "../models/user.model"
import bcrypt from "bcryptjs"
import { signAccessToken, signRefreshToken } from "../utils/token"
import { AuthRequest } from "../middlewares/auth"
import jwt from "jsonwebtoken"

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, username, password } = req.body
    if (!name || !email || !username || !password) {
      return res.status(400).json({
        message: "All fields are required..!"
      })
    }

    const extEmail = await UserModel.findOne({ email })
    if (extEmail) {
      return res.status(400).json({
        message: "Email already exists..!"
      })
    }

    const extUsername = await UserModel.findOne({ username })
    if (extUsername) {
      return res.status(400).json({
        message: "Username already exists..!"
      })
    }
   
    const salt = bcrypt.genSaltSync(10)
    const hashedPassword = bcrypt.hashSync(password, salt)

    const newUser = new UserModel({
      name,
      email,
      username,
      password: hashedPassword,
      roles: [UserRole.CUSTOMER],
      status:[UserStatus.ACTIVE],
      approve: true
    })

    await newUser.save()
    res.status(201).json({ message: "User registered successfully..!" })
  } catch (err) {
    console.error(err)
    res.status(500).json({
      message: "Registration fail",
      error: err
    })
  }
}

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body
  try {
    if (!username || !password) {
      return res.status(400).json({ message: "username or password missing..!" })
    }

    const user = await UserModel.findOne({ username })
    if (!user) {
      return res.status(401).json({ message: "User not found..!" })
    }

    const isValid = await bcrypt.compare(password, user?.password)
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials..!" })
    }

    const accessToken = signAccessToken(user)
    const refreshToken = signRefreshToken(user)

    res.status(200).json({
      message: "Success",
      data: {
        username: user?.username,
        roles: user?.roles,
        access_token: accessToken,
        refresh_token: refreshToken
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({
      message: "Login fail",
      error: err
    })
  }
}

export const getMyDetails = async (req: AuthRequest, res: Response) => {
  // req.user - > sub - userId, roles
  if (!req.user) {
    return res.status(404).json({ message: "Unauthorized" })
  }

  const userId = req.user.sub
  const user = await UserModel.findById(userId).select("-password")

  if (!user) {
    return res.status(404).json({ message: "user not found..!" })
  }

  const { name, username, email, roles, _id } = user

  res
    .status(200)
    .json({ message: "Success", data: { name, username, email, roles, id: _id } })
}

export const getRrefreshToken = async (req: Request, res: Response) => {
  const { refreshToken } = req.body
  try {
    if (!refreshToken)
      return res.status(400).json({
        message: "Token not found..!"
      })
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET)
    const userId = payload?.sub
    const user = await UserModel.findById(userId)
    if (!user)
      return res.status(403).json({
        message: "Invalid or expire token..!"
      })

    const newAccessToken = signAccessToken(user)
    res.status(200).json({
      data: { accessToken: newAccessToken }
    })
  } catch (err) {
    res.status(403).json({
      message: "Invalid or expire token..!"
    })
  }
}