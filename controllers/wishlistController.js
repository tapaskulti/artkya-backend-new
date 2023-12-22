const wishlistModel = require("../models/wishlist");

exports.createWishlist = async (req, res) => {
  try {
    const { userId } = req.query;

    const checkWishlistAvailable = await wishlistModel.findOne({ userId: userId });

    if (checkWishlistAvailable) {
      return res
        .status(401)
        .send({
          status: false,
          message: "Wishlist For This User Is Already Present",
        });
    }
    req.body.userId = userId;
    const wishlistCart = await wishlistModel.create(req.body);

    return res.status(201).send({
      success: true,
      message: "Wishlist Created Successfully",
      data: wishlistCart,
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};