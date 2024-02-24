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
    const { artId, userId, artPrice } = req.query;
    let totalItems;
    const findCart = await cartModel
      .findOne({ userId })
      // .populate("userId")
      .populate({
        path: "arts",
        // select:{_id:1,price:1}
      });

    if (findCart?.arts.toString().includes(artId.toString())) {
      return res.status(400).send({
        success: false,
        message: "Art Already Present In Cart",
      });
    } else {
      findCart?.arts.push(artId);
    }

    totalItems = await findCart.arts.length;

    findCart.totalItems = totalItems;

    // findCart?.arts?.map((singleArt)=>{
    //   console.log("price----->",singleArt);
    //   totalCost === totalCost+singleArt?.price
    //   console.log("totalCost----->",totalCost);
    // })

    findCart.totalPrice = parseInt(findCart.totalPrice) + parseInt(artPrice);

    console.log(findCart, totalItems);

    await findCart.save();

    return res.status(200).send({
      success: true,
      data: findCart,
      message: "Art Addded Successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ success: false, message: error.message });
  }
};

// Remove Items From Cart
exports.removeFromCart = async (req, res) => {
  try {
    const { artId, userId, artPrice } = req.query;

    console.log(artId, userId, artPrice);

    const findCart = await cartModel.findOne({ userId });

    console.log(findCart.arts);

    findCart.arts = findCart.arts.filter((singleArt) => {
      console.log(singleArt.toString() == artId.toString());
      return singleArt.toString() !== artId.toString();
    });

    console.log(findCart.arts);

    totalItems = await findCart.arts.length;
    findCart.totalItems = totalItems;

    console.log(totalItems);
    console.log(findCart.totalPrice);

    findCart.totalPrice = parseInt(findCart.totalPrice) - parseInt(artPrice);

    console.log(findCart.totalPrice);

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

// Get Cart Of A Certain User

exports.cartByUserId = async (req, res) => {
  try {
    const { userId } = req.query;

    const findCart = await cartModel.findOne({ userId }).populate("arts");

    return res.status(200).send({
      success: true,
      data: findCart,
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};
