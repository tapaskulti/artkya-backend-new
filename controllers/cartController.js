const cartModel = require("../models/cart");

exports.createCart = async (req, res) => {
  try {
    const { userId } = req.query;

    const checkCartAvailable = await cartModel.findOne({ userId: userId });

    if (checkCartAvailable) {
      return res
        .status(401)
        .send({
          status: false,
          message: "Cart For This User Is Already Present",
        });
    }
    req.body.userId = userId;
    const createCart = await cartModel.create();

    return res.status(201).send({
      success: true,
      message: "Cart Created Successfully",
      data: createCart,
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};
