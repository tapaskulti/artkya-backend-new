const express = require("express");
const {
  createWishlist,
  addToWishlist,
  removeFromWishlist,
  wishlistByUserId,
} = require("../controllers/wishlistController");

const router = express.Router();

router.post("/createWishlist", createWishlist);
router.patch("/addToWishlist", addToWishlist);
router.patch("/removeFromWishlist", removeFromWishlist);
router.get("/wishlistByUserId", wishlistByUserId);

module.exports = router;
