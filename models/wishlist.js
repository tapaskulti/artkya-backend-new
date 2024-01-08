const mongoose = require("mongoose");

const wishListSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    arts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "art",
      },
    ],
    totalItems: {
      type: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("wishList", wishListSchema);
