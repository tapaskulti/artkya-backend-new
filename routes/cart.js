const express = require("express");
const { createCart, addToCart, removeFromCart, cartByUserId } = require("../controllers/cartController");
const router = express.Router();

router.route("/createCart").post(createCart)
router.route("/addToCart").patch(addToCart)
router.route("/removeFromCart").patch(removeFromCart)
router.route("/cartByUserId").get(cartByUserId)

module.exports = router;
