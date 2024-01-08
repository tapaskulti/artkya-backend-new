const express = require("express");
const { createWishlist, addToWishlist, removeFromWishList } = require("../controllers/wishlistController");
const router = express.Router();

router.route("/createWishlist").post(createWishlist)
router.route("/addToWishlist").patch(addToWishlist)
router.route("/removeFromWishList").patch(removeFromWishList)

module.exports = router;