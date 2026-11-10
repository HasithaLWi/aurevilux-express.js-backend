import { Router } from "express";
import {
  getAllBrands,
  getBrandByIdOrSlug,
  submitBrandApplication,
  createBrand,
  updateBrand,
  deleteBrand,
} from "../controllers/brand.controller";

const router = Router();

router.get("/", getAllBrands);
router.get("/:id", getBrandByIdOrSlug);
router.post("/apply", submitBrandApplication);
router.post("/", createBrand);
router.put("/:id", updateBrand);
router.delete("/:id", deleteBrand);

export default router;

