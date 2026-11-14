import express, { type Request, type Response } from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

// Routers
import AuthRouter from "./routes/auth.routers";
import ProductRouter from "./routes/product.routers";
import CategoryRouter from "./routes/category.routers";
import BrandRouter from "./routes/brand.routers";
import OrderRouter from "./routes/order.routers";
import UserRouter from "./routes/user.routers";
import AdminRouter from "./routes/admin.routers";
import UploadRouter from "./routes/upload.routers";
import FeedbackRouter from "./routes/feedback.routers";
import NewsletterRouter from "./routes/newsletter.routers";
import { seedDatabase } from "./utils/seed";

const MONGO_URL = process.env.MONGO_LOCAL_URL || "";
const PORT = process.env.PORT || 5000;

const app = express();

app.use(cors());
app.use(express.json());

// Health Check
app.get("/api/v1/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "Aurevilux Luxury API",
    version: "1.0.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use("/api/v1/auth", AuthRouter);
app.use("/api/v1/products", ProductRouter);
app.use("/api/v1/categories", CategoryRouter);
app.use("/api/v1/brands", BrandRouter);
app.use("/api/v1/orders", OrderRouter);
app.use("/api/v1/users", UserRouter);
app.use("/api/v1/admin", AdminRouter);
app.use("/api/v1/upload", UploadRouter);
app.use("/api/v1/feedback", FeedbackRouter);
app.use("/api/v1/newsletter", NewsletterRouter);

mongoose
  .connect(MONGO_URL)
  .then(async () => {
    console.log("DB connected..!");
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => console.error("Fail to connect DB..!", err));

export default app;
