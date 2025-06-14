const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    shippingAddress: {
      type: Object,
    },
    billingAddress: {
      type: Object,
    },
    sameAsShipping: {
      type: Boolean,
      default: false,
    },
    artId: [
      {
        type: ObjectId,
        ref: "artDetails",
        required: true,
      },
    ],
    // Total Order Amount
    totalAmount: {
      type: Number,
      required: true,
    },
    cancelled: {
      type: Boolean,
      default: false,
    },
    // Payment Status
    paymentStatus: {
      type: String,
      enum: ["paid", "pending", "failed"],
      default: "paid",
    },
    status: {
      type: String,
      default: "transit",
      enum: ["transit", "delivered", "returned"],
      trim: true,
    },
    orderStatus: {
      type: String,
      enum: ["confirmed", "processing", "shipped", "delivered", "cancelled"],
      default: "confirmed",
    },
    // returnedStatus: {
    //   type: String,
    //   default: "transit",
    //   enum: ["transit", "recieved", "verified", "refund_Initiated", "refunded"],
    //   trim: true,
    // },
  },
  { timestamps: true }
);

module.exports = mongoose.model("order", orderSchema);
