const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    arts: [
      {
        type:mongoose.Schema.Types.ObjectId,
        ref: "artDetails",
      },
    ],
    totalPrice: {
      type: Number,
      default: 0,
    },
    totalItems: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("cart", cartSchema);
