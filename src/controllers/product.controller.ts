import { Request, Response } from "express";
import { ProductModel } from "../models/product.model";
import { AuthRequest } from "../middlewares/auth";
import { deleteFromSupabase } from "../utils/supabase";

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const {
      category,
      department,
      subcategory,
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

    const conditions: Record<string, any>[] = [
      { isDeleted: { $ne: true } },
    ];

    // Consumers only see active products; management passes includeInactive=true
    if (includeInactive !== "true") {
      conditions.push({ isActive: { $ne: false } });
    }

    if (category && category !== "all") {
      const catVal = String(category).toLowerCase();
      conditions.push({
        $or: [
          { category: catVal },
          { department: catVal },
        ],
      });
    }

    if (department && department !== "all") {
      conditions.push({ department: String(department).toLowerCase() });
    }

    if (subcategory && subcategory !== "all") {
      conditions.push({ subcategory: new RegExp(`^${subcategory}$`, "i") });
    }

    if (brand && brand !== "all") {
      conditions.push({ brand: new RegExp(`^${brand}$`, "i") });
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

    // Search bar optimization: Searches product name, department, category, subcategory & maison
    const querySearch = (q || search || "").toString().trim();
    if (querySearch) {
      const isExactShort = querySearch.toLowerCase() === "men";
      const searchRegex = isExactShort
        ? new RegExp("(^|\\s|/)men($|\\s|/)", "i")
        : new RegExp(querySearch, "i");

      conditions.push({
        $or: [
          { name: searchRegex },
          { department: isExactShort ? "men" : searchRegex },
          { category: isExactShort ? "men" : searchRegex },
          { categoryLabel: searchRegex },
          { subcategory: searchRegex },
          { brand: searchRegex },
          { description: searchRegex },
        ],
      });
    }

    const filter = conditions.length === 1 ? conditions[0] : { $and: conditions };

    let sortOptions: Record<string, any> = { createdAt: -1 };
    if (sort === "price_asc" || sort === "price-low-high") sortOptions = { price: 1 };
    else if (sort === "price_desc" || sort === "price-high-low") sortOptions = { price: -1 };
    else if (sort === "rating") sortOptions = { rating: -1 };
    else if (sort === "newest") sortOptions = { createdAt: -1 };

    const pageNum = Math.max(1, parseInt(String(page), 10));
    const limitNum = Math.max(1, parseInt(String(limit), 10));
    const skip = (pageNum - 1) * limitNum;

    const [products, totalCount] = await Promise.all([
      ProductModel.find(filter).sort(sortOptions).skip(skip).limit(limitNum),
      ProductModel.countDocuments(filter),
    ]);

    return res.status(200).json({
      message: "Products fetched successfully",
      data: products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error: any) {
    console.error("Fetch products error:", error);
    return res.status(500).json({ message: "Failed to fetch products", error: error.message });
  }
};

export const getProductByIdOrSlug = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    let product = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      product = await ProductModel.findById(id);
    }
    if (!product) {
      product = await ProductModel.findOne({ slug: id.toLowerCase() });
    }

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json({
      message: "Product retrieved successfully",
      data: product,
    });
  } catch (error: any) {
    console.error("Get product error:", error);
    return res.status(500).json({ message: "Failed to retrieve product", error: error.message });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const productData = req.body;

    if (!productData.name || !productData.price || !productData.category || !productData.brand) {
      return res.status(400).json({
        message: "Missing required fields: name, price, category, and brand are required.",
      });
    }

    if (productData.images && Array.isArray(productData.images) && productData.images.length > 5) {
      return res.status(400).json({
        message: "A maximum of 5 product images are permitted.",
      });
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
      isActive: productData.isActive !== undefined ? productData.isActive : true,
      isDeleted: false,
    });
    await newProduct.save();

    return res.status(201).json({
      message: "Product created successfully",
      data: newProduct,
    });
  } catch (error: any) {
    console.error("Create product error:", error);
    return res.status(500).json({ message: "Failed to create product", error: error.message });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const updateData = req.body;

    if (updateData.images && Array.isArray(updateData.images) && updateData.images.length > 5) {
      return res.status(400).json({
        message: "A maximum of 5 product images are permitted.",
      });
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
    return res.status(500).json({ message: "Failed to update product", error: error.message });
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
    return res.status(500).json({ message: "Failed to toggle product status", error: error.message });
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
          console.warn(`Could not purge image ${imgUrl} from Supabase:`, supabaseErr);
        }
      }
    }

    return res.status(200).json({
      message: "Product soft-deleted and images purged from storage",
      data: { id: product._id, name: product.name },
    });
  } catch (error: any) {
    console.error("Delete product error:", error);
    return res.status(500).json({ message: "Failed to delete product", error: error.message });
  }
};

export const updateProductStock = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { stockCount } = req.body;

    if (stockCount === undefined || typeof stockCount !== "number") {
      return res.status(400).json({ message: "Please provide a valid numeric stockCount." });
    }

    const inStock = stockCount > 0;
    const query = id.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: id }
      : { slug: id.toLowerCase() };

    const product = await ProductModel.findOneAndUpdate(
      query,
      { stockCount, inStock },
      { new: true }
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
    return res.status(500).json({ message: "Failed to update stock", error: error.message });
  }
};

export const addProductReview = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, rating, comment } = req.body;

    if (!name || !rating || !comment) {
      return res.status(400).json({ message: "Name, rating (1-5), and comment are required." });
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
      product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length;
    product.rating = Math.round(avg * 10) / 10;

    await product.save();

    return res.status(201).json({
      message: "Review added successfully",
      data: product,
    });
  } catch (error: any) {
    console.error("Add review error:", error);
    return res.status(500).json({ message: "Failed to add review", error: error.message });
  }
};

