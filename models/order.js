const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    shippingAddress: {
      type: Object,
    },
    billingAddress: {
      type: Object,
    },
    paymentMode: {
      type: String,
    },
    // to check the order is within return poliecy
    isOpenOrder: {
      type: Object,
    },
    artId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "art",
    },
    artistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "artistDetails",
    },
    returnable: {
      type: Boolean,
      default: true,
    },
    cancelled: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      default: "transit",
      enum: ["transit","delivered", "returned"],
      trim: true,
    },
    orderStatus: {
      type: String,
      default: "pending",
      enum: ["cancelled","returned","completed"],
      trim: true,
    },
    returnedStatus: {
      type: String,
      default: "transit",
      enum: ["transit","recieved", "verified","refund_Initiated","refunded"],
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("order", orderSchema);
