const Order = require("../models/order");
const ArtDetails = require("../models/art");

const createOrders = async (req, res) => {
  try {
    const {
      buyerId,
      artIds,
      shippingAddress,
      billingAddress,
      sameAsShipping,
      totalAmount,
      totalItems,
      paymentId,
      paymentMethod,
      orderType,
    } = req.body;

    if (
      !buyerId ||
      !artIds ||
      !Array.isArray(artIds) ||
      artIds.length === 0 ||
      !totalAmount
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: buyerId, artIds, totalAmount",
      });
    }

    console.log(req.body)


    const newOrder = new Order({
      buyerId,
      artId: artIds,
      shippingAddress,
      billingAddress: sameAsShipping ? shippingAddress : billingAddress,
      sameAsShipping,
      totalAmount,
      totalItems,
      paymentStatus: "paid",
      orderStatus: "confirmed",
      status: "transit",
    });

    const createOrder = await newOrder.save();

    if (createOrder) {
      const updatePromises = artIds?.map(async (singleArtId) => {
        const findArt = await ArtDetails
          .findOne({ _id: singleArtId })
          .select({
            isOriginalSold: 1,
          });
        findArt.isOriginalSold = true;
        findArt.save();
      });

      return res.status(201).json({
        success: true,
        message: "Order created successfully",
      });
    }
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message });
  }
};

// Get Order by ID
const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("buyerId", "firstName lastName email")
      .populate({
        path: "artId",
        populate: {
          path: "artist",
          select: "firstName lastName",
        },
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: { order },
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: error.message,
    });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const query = { buyerId: userId };
    if (status) query.orderStatus = status;

    const orders = await Order.find(query)
      .populate({
        path: "artId",
        populate: {
          path: "artist",
          select: "firstName lastName",
        },
      })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        orders,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
      },
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

module.exports = {
  createOrders,
  getOrderById,
  getUserOrders,
};
