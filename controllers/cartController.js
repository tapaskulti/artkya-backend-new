const cartModel = require("../models/cart");

exports.createCart = async (req, res) => {
  try {
    const { userId } = req.query;

    const checkCartAvailable = await cartModel.findOne({ userId: userId });

    if (checkCartAvailable) {
      return res.status(401).send({
        status: false,
        message: "Cart For This User Is Already Present",
      });
    }
    req.body.userId = userId;
    const createCart = await cartModel.create(req.body);

    return res.status(201).send({
      success: true,
      message: "Cart Created Successfully",
      data: createCart,
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

// Add Item to The Cart

exports.addToCart = async (req, res) => {
  try {
    const { artId, userId, productCost } = req.query;
    let totalItems, totalCost;
    const findCart = await cartModel.findOne({ userId })
    .populate("userId")
    // .populate("arts")

    if (findCart?.arts.includes(artId)) {
      return res.status(400).send({
        success: false,
        message: "Art Already Present In Cart",
      });
    } else {
      findCart?.arts.push(artId);
    }

    totalItems = await findCart.arts.length;  

    findCart.totalItems = totalItems;

    console.log(findCart, totalItems);

    await findCart.save();

    return res.status(200).send({
      success: true,
      data: findCart,
      message: "Art Addded Successfully",
    });
  } catch (error) {
    console.log(error)
    return res.status(500).send({ success: false, message: error.message });
  }
};

// Remove Items From Cart
exports.removeFromCart = async (req, res) => {
  try {
    const { artId, userId } = req.query;

    const findCart = await cartModel.findOne({ userId });

    findCart.arts = findCart.arts.filter((art) => {
      console.log(art.toString());
      art.toString() !== artId.toString();
    });

    totalItems = await findCart.arts.length;
    findCart.totalItems = totalItems;

    console.log(totalItems);

    await findCart.save();
    return res.status(200).send({
      success: true,
      data: totalItems,
      message: "Art Removed Successfully",
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

