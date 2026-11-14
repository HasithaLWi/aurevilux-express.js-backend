import { Request, Response } from "express";
import mongoose from "mongoose";
import { ProductModel } from "../models/product.model";
import { CategoryModel } from "../models/category.model";
import { BrandModel } from "../models/brand.model";
import { AuthRequest } from "../middlewares/auth";
import { deleteFromSupabase } from "../utils/supabase";

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const {
      category,
      department,
      brand,
      minPrice,
      maxPrice,
      q,
      search,
      sort,
      inStock,
      isBestSeller,
      isNewArrival,
      includeInactive,
      page = "1",
      limit = "50",
    } = req.query;

    const conditions: Record<string, any>[] = [{ isDeleted: { $ne: true } }];

    // Consumers only see active products; management passes includeInactive=true
    if (includeInactive !== "true") {
      conditions.push({ isActive: { $ne: false } });
    }

    if (category && category !== "all") {
      const catVal = String(category).toLowerCase();
      if (catVal.match(/^[0-9a-fA-F]{24}$/)) {
        conditions.push({ category: new mongoose.Types.ObjectId(catVal) });
      } else {
        const matchedCats = await CategoryModel.find({
          $or: [{ slug: catVal }, { title: new RegExp(`^${catVal}$`, "i") }],
        }).select("_id");
        const catIds = matchedCats.map((c) => c._id);

        conditions.push({
          $or: [
            ...(catIds.length > 0 ? [{ category: { $in: catIds } }] : []),
            { department: new RegExp(`^${catVal}$`, "i") },
            { categoryLabel: new RegExp(catVal, "i") },
          ],
        });
      }
    }

    if (department && department !== "all") {
      conditions.push({ department: new RegExp(`^${department}$`, "i") });
    }

    if (brand && brand !== "all") {
      const brandVal = String(brand).trim();
      if (brandVal.match(/^[0-9a-fA-F]{24}$/)) {
        conditions.push({ brand: new mongoose.Types.ObjectId(brandVal) });
      } else {
        const matchedBrands = await BrandModel.find({
          $or: [
            { name: new RegExp(`^${brandVal}$`, "i") },
            { slug: brandVal.toLowerCase() },
          ],
        }).select("_id");
        const brandIds = matchedBrands.map((b) => b._id);
        conditions.push({ brand: { $in: brandIds } });
      }
    }

    if (inStock !== undefined) {
      conditions.push({ inStock: inStock === "true" });
    }

    if (isBestSeller !== undefined) {
      conditions.push({ isBestSeller: isBestSeller === "true" });
    }

    if (isNewArrival !== undefined) {
      conditions.push({ isNewArrival: isNewArrival === "true" });
    }

    if (minPrice || maxPrice) {
      const priceCondition: Record<string, any> = {};
      if (minPrice) priceCondition.$gte = Number(minPrice);
      if (maxPrice) priceCondition.$lte = Number(maxPrice);
      conditions.push({ price: priceCondition });
    }

    // Search bar optimization: Searches product name, department, category & maison
    const querySearch = (q || search || "").toString().trim();
    if (querySearch) {
      const isExactShort = querySearch.toLowerCase() === "men";
      const searchRegex = isExactShort
        ? new RegExp("(^|\\s|/)men($|\\s|/)", "i")
        : new RegExp(querySearch, "i");

      // Find brand or category matching the search text
      const [matchedBrands, matchedCats] = await Promise.all([
        BrandModel.find({ name: searchRegex }).select("_id"),
        CategoryModel.find({
          $or: [{ title: searchRegex }, { slug: searchRegex }],
        }).select("_id"),
      ]);

      const brandIds = matchedBrands.map((b) => b._id);
      const catIds = matchedCats.map((c) => c._id);

      const orConditions: any[] = [
        { name: searchRegex },
        { department: isExactShort ? new RegExp("^men$", "i") : searchRegex },
        { categoryLabel: searchRegex },
        { description: searchRegex },
      ];

      if (brandIds.length > 0) {
        orConditions.push({ brand: { $in: brandIds } });
      }
      if (catIds.length > 0) {
        orConditions.push({ category: { $in: catIds } });
      }

      conditions.push({ $or: orConditions });
    }

    const filter =
      conditions.length === 1 ? conditions[0] : { $and: conditions };

    let sortOptions: Record<string, any> = { createdAt: -1 };
    if (sort === "price_asc" || sort === "price-low-high")
      sortOptions = { price: 1 };
    else if (sort === "price_desc" || sort === "price-high-low")
      sortOptions = { price: -1 };
    else if (sort === "rating") sortOptions = { rating: -1 };
    else if (sort === "newest") sortOptions = { createdAt: -1 };

    const pageNum = Math.max(1, parseInt(String(page), 10));
    const limitNum = Math.max(1, parseInt(String(limit), 10));
    const skip = (pageNum - 1) * limitNum;

    const [products, totalCount] = await Promise.all([
      ProductModel.find(filter)
        .populate("brand", "name slug logo")
        .populate("category", "title slug image")
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      ProductModel.countDocuments(filter),
    ]);

    const formattedProducts = products.map((p) => {
      const obj = p.toObject();
      const brandName =
        obj.brand && typeof obj.brand === "object"
          ? (obj.brand as any).name
          : obj.brand;
      const categorySlug =
        obj.category && typeof obj.category === "object"
          ? (obj.category as any).slug
          : obj.category;

      return {
        ...obj,
        id: obj._id.toString(),
        brand: brandName,
        brandDetails: typeof obj.brand === "object" ? obj.brand : undefined,
        category: categorySlug,
        categoryDetails:
          typeof obj.category === "object" ? obj.category : undefined,
      };
    });

    return res.status(200).json({
      message: "Products fetched successfully",
      data: formattedProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error: any) {
    console.error("Fetch products error:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch products", error: error.message });
  }
};

export const getProductByIdOrSlug = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    let product = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await ProductModel.findById(id)
        .populate("brand", "name slug logo")
        .populate("category", "title slug image");
    }
    if (!product) {
      product = await ProductModel.findOne({ slug: id.toLowerCase() })
        .populate("brand", "name slug logo")
        .populate("category", "title slug image");
    }

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const obj = product.toObject();
    const brandName =
      obj.brand && typeof obj.brand === "object"
        ? (obj.brand as any).name
        : obj.brand;
    const categorySlug =
      obj.category && typeof obj.category === "object"
        ? (obj.category as any).slug
        : obj.category;

    const formattedProduct = {
      ...obj,
      id: obj._id.toString(),
      brand: brandName,
      brandDetails: typeof obj.brand === "object" ? obj.brand : undefined,
      category: categorySlug,
      categoryDetails:
        typeof obj.category === "object" ? obj.category : undefined,
    };

    return res.status(200).json({
      message: "Product retrieved successfully",
      data: formattedProduct,
    });
  } catch (error: any) {
    console.error("Get product error:", error);
    return res
      .status(500)
      .json({ message: "Failed to retrieve product", error: error.message });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const productData = req.body;

    if (
      !productData.name ||
      !productData.price ||
      !productData.category ||
      !productData.brand
    ) {
      return res.status(400).json({
        message:
          "Missing required fields: name, price, category, and brand are required.",
      });
    }

    if (
      productData.images &&
      Array.isArray(productData.images) &&
      productData.images.length > 5
    ) {
      return res.status(400).json({
        message: "A maximum of 5 product images are permitted.",
      });
    }

    // Resolve Brand to ObjectId if passed as name/slug
    if (
      productData.brand &&
      !String(productData.brand).match(/^[0-9a-fA-F]{24}$/)
    ) {
      const foundBrand = await BrandModel.findOne({
        $or: [
          { name: new RegExp(`^${productData.brand}$`, "i") },
          { slug: String(productData.brand).toLowerCase() },
        ],
      });
      if (foundBrand) {
        productData.brand = foundBrand._id;
      }
    }

    // Resolve Category to ObjectId if passed as slug/title
    if (
      productData.category &&
      !String(productData.category).match(/^[0-9a-fA-F]{24}$/)
    ) {
      const foundCategory = await CategoryModel.findOne({
        $or: [
          { slug: String(productData.category).toLowerCase() },
          { title: new RegExp(`^${productData.category}$`, "i") },
        ],
      });
      if (foundCategory) {
        productData.category = foundCategory._id;
      }
    }

    // Ensure department is an array
    if (productData.department && !Array.isArray(productData.department)) {
      productData.department = [String(productData.department).toUpperCase()];
    }

    // Auto-generate slug if missing
    if (!productData.slug) {
      productData.slug = productData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
    }

    // Ensure unique slug
    const existing = await ProductModel.findOne({ slug: productData.slug });
    if (existing) {
      productData.slug = `${productData.slug}-${Date.now().toString().slice(-4)}`;
    }

    const newProduct = new ProductModel({
      ...productData,
      isActive:
        productData.isActive !== undefined ? productData.isActive : true,
      isDeleted: false,
    });
    await newProduct.save();

    return res.status(201).json({
      message: "Product created successfully",
      data: newProduct,
    });
  } catch (error: any) {
    console.error("Create product error:", error);
    return res
      .status(500)
      .json({ message: "Failed to create product", error: error.message });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const updateData = req.body;

    if (
      updateData.images &&
      Array.isArray(updateData.images) &&
      updateData.images.length > 5
    ) {
      return res.status(400).json({
        message: "A maximum of 5 product images are permitted.",
      });
    }

    // Resolve Brand to ObjectId if passed as name/slug
    if (
      updateData.brand &&
      !String(updateData.brand).match(/^[0-9a-fA-F]{24}$/)
    ) {
      const foundBrand = await BrandModel.findOne({
        $or: [
          { name: new RegExp(`^${updateData.brand}$`, "i") },
          { slug: String(updateData.brand).toLowerCase() },
        ],
      });
      if (foundBrand) {
        updateData.brand = foundBrand._id;
      }
    }

    // Resolve Category to ObjectId if passed as slug/title
    if (
      updateData.category &&
      !String(updateData.category).match(/^[0-9a-fA-F]{24}$/)
    ) {
      const foundCategory = await CategoryModel.findOne({
        $or: [
          { slug: String(updateData.category).toLowerCase() },
          { title: new RegExp(`^${updateData.category}$`, "i") },
        ],
      });
      if (foundCategory) {
        updateData.category = foundCategory._id;
      }
    }

    // Ensure department is an array if provided
    if (updateData.department && !Array.isArray(updateData.department)) {
      updateData.department = [String(updateData.department).toUpperCase()];
    }

    const query = id.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: id }
      : { slug: id.toLowerCase() };

    const product = await ProductModel.findOneAndUpdate(query, updateData, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found to update" });
    }

    return res.status(200).json({
      message: "Product updated successfully",
      data: product,
    });
  } catch (error: any) {
    console.error("Update product error:", error);
    return res
      .status(500)
      .json({ message: "Failed to update product", error: error.message });
  }
};

export const toggleProductActive = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const query = id.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: id }
      : { slug: id.toLowerCase() };

    const product = await ProductModel.findOne(query);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.isActive = !product.isActive;
    await product.save();

    return res.status(200).json({
      message: `Product visibility set to ${product.isActive ? "Active (Visible in Store)" : "Inactive (Hidden from Store)"}`,
      data: { id: product._id, isActive: product.isActive },
    });
  } catch (error: any) {
    return res.status(500).json({
      message: "Failed to toggle product status",
      error: error.message,
    });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const query = id.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: id }
      : { slug: id.toLowerCase() };

    const product = await ProductModel.findOne(query);
    if (!product) {
      return res.status(404).json({ message: "Product not found to delete" });
    }

    // Soft delete product
    product.isDeleted = true;
    product.isActive = false;
    await product.save();

    // Purge associated images from Supabase Storage
    if (product.images && product.images.length > 0) {
      for (const imgUrl of product.images) {
        try {
          await deleteFromSupabase(imgUrl);
        } catch (supabaseErr) {
          console.warn(
            `Could not purge image ${imgUrl} from Supabase:`,
            supabaseErr,
          );
        }
      }
    }

    return res.status(200).json({
      message: "Product soft-deleted and images purged from storage",
      data: { id: product._id, name: product.name },
    });
  } catch (error: any) {
    console.error("Delete product error:", error);
    return res
      .status(500)
      .json({ message: "Failed to delete product", error: error.message });
  }
};

export const updateProductStock = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { stockCount } = req.body;

    if (stockCount === undefined || typeof stockCount !== "number") {
      return res
        .status(400)
        .json({ message: "Please provide a valid numeric stockCount." });
    }

    const inStock = stockCount > 0;
    const query = id.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: id }
      : { slug: id.toLowerCase() };

    const product = await ProductModel.findOneAndUpdate(
      query,
      { stockCount, inStock },
      { new: true },
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({
      message: "Stock level updated successfully",
      data: {
        id: product._id,
        name: product.name,
        stockCount: product.stockCount,
        inStock: product.inStock,
      },
    });
  } catch (error: any) {
    console.error("Stock update error:", error);
    return res
      .status(500)
      .json({ message: "Failed to update stock", error: error.message });
  }
};

export const addProductReview = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, rating, comment } = req.body;

    if (!name || !rating || !comment) {
      return res
        .status(400)
        .json({ message: "Name, rating (1-5), and comment are required." });
    }

    const product = await ProductModel.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found to review" });
    }

    const newReview = {
      userId: req.user?.sub as any,
      name,
      rating: Number(rating),
      comment,
      date: new Date().toISOString().split("T")[0],
    };

    product.reviews.push(newReview as any);
    product.reviewsCount = product.reviews.length;
    const avg =
      product.reviews.reduce((acc, r) => acc + r.rating, 0) /
      product.reviews.length;
    product.rating = Math.round(avg * 10) / 10;

    await product.save();

    return res.status(201).json({
      message: "Review added successfully",
      data: product,
    });
  } catch (error: any) {
    console.error("Add review error:", error);
    return res
      .status(500)
      .json({ message: "Failed to add review", error: error.message });
  }
};
