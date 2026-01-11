const cartModel = require("../models/cart");
const ArtModel = require("../models/art"); // <-- IMPORTANT


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
    const { userId, artId } = req.body;

    // 1️⃣ Validation
    if (!userId || !artId) {
      return res.status(400).json({
        success: false,
        message: "userId and artId are required",
      });
    }

    // 2️⃣ Get art price securely
    const art = await ArtModel.findById(artId);
    if (!art) {
      return res.status(404).json({
        success: false,
        message: "Art not found",
      });
    }

    // 3️⃣ Find or create cart
    let cart = await cartModel.findOne({ userId });

    if (!cart) {
      cart = await cartModel.create({
        userId,
        arts: [],
        totalItems: 0,
        totalPrice: 0,
      });
    }

    // 4️⃣ Prevent duplicate art
    const exists = cart.arts.some(
      (id) => id.toString() === artId.toString()
    );

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Art already in cart",
      });
    }

    // 5️⃣ Add art & update totals
    cart.arts.push(artId);
    cart.totalItems = cart.arts.length;
    cart.totalPrice += art.totalPrice;

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Art added to cart successfully",
      data: cart,
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// Remove Items From Cart
exports.removeFromCart = async (req, res) => {
  try {
    const { userId, artId } = req.body;

    const cart = await cartModel.findOne({ userId });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const art = await artModel.findById(artId);
    if (!art) {
      return res.status(404).json({
        success: false,
        message: "Art not found",
      });
    }

    cart.arts = cart.arts.filter(
      (id) => id.toString() !== artId
    );

    cart.totalItems = cart.arts.length;
    cart.totalPrice = Math.max(0, cart.totalPrice - art.totalPrice);

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Art removed from cart",
      data: cart,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.removeFromCart = async (req, res) => {
  try {
    const { userId, artId } = req.body;

    const cart = await cartModel.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: "Cart not found" });
    }

    const art = await ArtModel.findById(artId);
    if (!art) {
      return res.status(404).json({ success: false, message: "Art not found" });
    }

    cart.arts = cart.arts.filter(id => id.toString() !== artId);
    cart.totalItems = cart.arts.length;
    cart.totalPrice = Math.max(0, cart.totalPrice - art.totalPrice);

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Art removed from cart",
      data: cart
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
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



exports.clearCartByUserId = async (req, res) => {
  try {
    const { userId} = req.query;

    const findCart = await cartModel.findOne({ userId }).populate("arts");

    findCart.totalPrice = 0
    findCart.totalItems = 0
    findCart.arts = []
    
    findCart.save()
    return res.status(200).send({
      success: true,
      data: findCart,
    });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};