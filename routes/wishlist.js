const express = require("express");
const {
  createWishlist,
  addToWishlist,
  removeFromWishList,
  wishlistByUserId,
} = require("../controllers/wishlistController");
const router = express.Router();

router.route("/createWishlist").post(createWishlist);
router.route("/addToWishlist").patch(addToWishlist);
router.route("/removeFromWishList").patch(removeFromWishList);
router.route("/wishlistByUserId").get(wishlistByUserId);

module.exports = router;
