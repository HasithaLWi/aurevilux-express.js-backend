import mongoose, { Document, Schema, Model } from "mongoose";

export interface IOrderItem {
  productId?: mongoose.Types.ObjectId;
  name: string;
  brand: string;
  price: number;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
  image?: string;
}

export interface ITimelineStep {
  title: string;
  date: string;
  completed: boolean;
}

export interface IOrderCustomer {
  name: string;
  email: string;
  phone: string;
}

export interface IOrderShippingAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  userId?: mongoose.Types.ObjectId;
  items: IOrderItem[];
  total: number;
  itemsCount: number;
  customer: IOrderCustomer;
  shippingAddress: IOrderShippingAddress;
  status:
    | "Pending"
    | "Processing"
    | "In Transit"
    | "Out for Delivery"
    | "Delivered"
    | "Cancelled"
    | "Refunded";
  paymentStatus: "Pending" | "Paid" | "Failed";
  carrier: string;
  trackingNumber: string;
  estimatedDelivery: string;
  timeline: ITimelineStep[];
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product" },
    name: { type: String, required: true },
    brand: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    selectedColor: { type: String, default: "" },
    selectedSize: { type: String, default: "" },
    image: { type: String, default: "" },
  },
  { _id: false }
);

const TimelineStepSchema = new Schema<ITimelineStep>(
  {
    title: { type: String, required: true },
    date: { type: String, required: true },
    completed: { type: Boolean, default: false },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    items: { type: [OrderItemSchema], required: true },
    total: { type: Number, required: true },
    itemsCount: { type: Number, required: true },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, default: "" },
    },
    shippingAddress: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, default: "" },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "Processing",
        "In Transit",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
        "Refunded",
      ],
      default: "Processing",
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Paid",
    },
    carrier: { type: String, default: "DHL White Glove Concierge" },
    trackingNumber: { type: String, default: "" },
    estimatedDelivery: { type: String, default: "" },
    timeline: { type: [TimelineStepSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

export const OrderModel: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);

