const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    arts: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "art",
        },
        quantity: { 
            type: Number, 
            default:1
         },
         shippingCost: {
            type: Number,
          },
      },
    ],
    totalPrice: {
      type: Number,
    },
    totalItems: {
      type: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cart", cartSchema);
