const express = require("express");
const { createOrders, getOrderById, getUserOrders } = require("../controllers/orderController");
const auth = require("../middlewares/auth");

const router = express.Router();

router.route("/createOrder").post(createOrders);
router.route("/getOrderById").get(auth,getOrderById);
router.route("/getUserOrders").get(auth,getUserOrders);

module.exports = router;
