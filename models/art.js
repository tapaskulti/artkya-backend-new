const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;

const artDetailsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: "true",
    },
    arts: [{ type: ObjectId, ref: "artWork" }],
    // art: [
    //   {
    //     type: String,
    //   },
    // ],
    thumbnail: {
      id: {
        type: String,
      },
      secure_url: {
        type: String,
      },
    },
    category: {
      type: String,
      default: "Painting",
    },
    subject: {
      type: String,
    },
    year: {
      type: String,
    },
    orientation: {
      type: String,
    },
    medium: [{ type: String }],
    materials: [{ type: String }],
    styles: [{ type: String }],
    width: {
      type: String,
    },
    height: {
      type: String,
    },
    depth: {
      type: String,
    },
    price: {
      type: Number,
    },
    discountedPrice: {
      type: Number,
    },
    keywords: [{ type: String }],
    description: {
      type: String,
    },
    isFeatured:{
      type:Boolean
    },
    artist: {
      type: ObjectId,
      ref: "user",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("artDetails", artDetailsSchema);
