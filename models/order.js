const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    shippingAddress:{
      type:Object
    },
    billingAddress:{
      type:Object
    },
    arts: [
      {
        artId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "art",
        },
        cancellable: {
          type: Boolean,
          default: true,
        },
        status: {
          type: String,
          default: "pending",
          enum: ["pending", "completed", "cancelled"],
          trim: true,
        },
      },
    ],
    
  },
  { timestamps: true }
);

module.exports = mongoose.model("order", orderSchema);
