const express = require("express");
const { refund, payment } = require("../controllers/paymentController");
const router = express.Router();

router.route("/payment").post(payment);
router.route("/refund").post(refund);

module.exports = router;
