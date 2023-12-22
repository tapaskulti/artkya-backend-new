const express = require("express");
const { createWishlist } = require("../controllers/wishlistController");
const router = express.Router();

router.route("/createWishlist").post(createWishlist)

module.exports = router;