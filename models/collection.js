const mongoose = require("mongoose");

const allCollectionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
    },
    description: {
      type: String,
    },
    type: {
      type: String,
      enum: ["COMMUNITY", "PORTFOLIO"],
    },
    visibility: {
      type: String,
      enum: ["PRIVATE", "PUBLIC"],
      default: "PUBLIC",
    },
    arts: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "art",
        },
      },
    ],
    totalItems: {
      type: Number,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("allCollection", allCollectionSchema);
