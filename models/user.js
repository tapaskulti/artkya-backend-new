const mongoose = require("mongoose");
const ObjectId = mongoose.Schema.Types.ObjectId;

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "enter the first name"],
      trim: "true",
    },
    lastName: {
      type: String,
      required: [true, "enter the last name"],
      trim: "true",
    },
    avatar: {
      id: {
        type: String,
      },
      secure_url: {
        type: String,
      },
    },
    email: {
      type: String,
      required: [true, "email is mandatory"],
      validate: [validator.isEmail, "please enter email in correct format"],
      trim: true,
      unique: [true, "email is  alraedy been used"],
    },
    password: {
      type: String,
      required: [true, "please enter your password"],
      minlength: [8, "password should of min length six character"],
    },
    role: {
      type: String,
      enum: ["ADMIN", "USER"],
      default: "USER",
    },
    isArtist: {
      type: Boolean,
      default: false,
    },
    country: {
      type: Boolean,
      default: false,
    },
    refresh_token: {
      type: String,
    },
    refresh_token_expiry: {
      type: Date,
    },
    forgotPasswordToken: {
      type: String,
    },
    forgotPasswordExpiry: {
      type: Date,
    },
    followers: [
      {
        type: ObjectId,
        ref: "user",
      },
    ],
    following: [
      {
        type: ObjectId,
        ref: "user",
      },
    ],
    art: [
      {
        type: ObjectId,
        ref: "art",
      },
    ],
    // wishlist: 
    //   {
    //     type: ObjectId,
    //     ref: "wishlist",
    //   },
    // cart: 
    //   {
    //     type: ObjectId,
    //     ref: "cart",
    //   },
    // order: 
    //   {
    //     type: ObjectId,
    //     ref: "order",
    //   },
  },
  { timestamps: true }
);

module.exports = mongoose.model("user", userSchema);
