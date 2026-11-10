import { Request, Response } from "express";
import { ProductModel } from "../models/product.model";
import { AuthRequest } from "../middlewares/auth";

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const {
      category,
      brand,
      minPrice,
      maxPrice,
      q,
      sort,
      inStock,
      isBestSeller,
      isNewArrival,
      page = "1",
      limit = "50",
    } = req.query;

    const filter: Record<string, any> = {};

    if (category && category !== "all") {
      filter.category = category;
    }

    if (brand && brand !== "all") {
      filter.brand = new RegExp(`^${brand}$`, "i");
    }

    if (inStock !== undefined) {
      filter.inStock = inStock === "true";
    }

    if (isBestSeller !== undefined) {
      filter.isBestSeller = isBestSeller === "true";
    }

    if (isNewArrival !== undefined) {
      filter.isNewArrival = isNewArrival === "true";
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (q) {
      const searchRegex = new RegExp(String(q), "i");
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { brand: searchRegex },
        { categoryLabel: searchRegex },
      ];
    }

    let sortOptions: Record<string, any> = { createdAt: -1 };
    if (sort === "price_asc") sortOptions = { price: 1 };
    else if (sort === "price_desc") sortOptions = { price: -1 };
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
    const { id } = req.params;

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

    const newProduct = new ProductModel(productData);
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
    const { id } = req.params;
    const updateData = req.body;

    const product = await ProductModel.findByIdAndUpdate(id, updateData, {
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

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await ProductModel.findByIdAndDelete(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found to delete" });
    }

    return res.status(200).json({
      message: "Product removed from catalog",
      data: { id: product._id, name: product.name },
    });
  } catch (error: any) {
    console.error("Delete product error:", error);
    return res.status(500).json({ message: "Failed to delete product", error: error.message });
  }
};

export const updateProductStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { stockCount } = req.body;

    if (stockCount === undefined || typeof stockCount !== "number") {
      return res.status(400).json({ message: "Please provide a valid numeric stockCount." });
    }

    const inStock = stockCount > 0;
    const product = await ProductModel.findByIdAndUpdate(
      id,
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

