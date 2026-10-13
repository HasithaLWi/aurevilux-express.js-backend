import { Router } from "express"
import { getMyDetails, getRrefreshToken, login, register } from "./../controllers/auth.controller"
import { authenticate } from "../middlewares/auth"

const router = Router()

// public
router.post("/login", login)
router.post("/register", register)
router.post("/refresh", getRrefreshToken)

// protected
router.get("/me", authenticate, getMyDetails)

export default router