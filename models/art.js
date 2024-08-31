const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;

const artDetailsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: "true",
    },
    art: [Object],
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
    priceDetails: {
      minPrice: { type: Number },
      price: { type: Number },
      offerPrice: { type: Number },
      currency: { type: String },
    },
    discountedPrice: {
      type: String,
    },
    keywords: [{ type: String }],
    description: {
      type: String,
    },
    isFeatured: {
      type: Boolean,
    },
    isPublished: {
      type: Boolean,
    },
    isAdultContent: {
      type: Boolean,
      default: false,
    },
    wishlisted: {
      type: Boolean,
      default: false,
    },
    InQueue:{
      type: Boolean,
      default: false,
    },
    artist: {
      type: ObjectId,
      ref: "user",
    },
    original: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("artDetails", artDetailsSchema);
