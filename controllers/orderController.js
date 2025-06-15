const Order = require("../models/order");
const ArtDetails = require("../models/art");
const User = require("../models/user");

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

    console.log(req.body);

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
      paymentId,
      paymentMethod,
    });

    const createOrder = await newOrder.save();

    if (createOrder) {
      const updatePromises = artIds?.map(async (singleArtId) => {
        const findArt = await ArtDetails.findOne({ _id: singleArtId }).select({
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

// Get Order by order ID
const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.query;
    const { _id } = req.user; // From auth middleware
    const user = await User.findOne({ _id }).select({
      role: 1,
    });
    const userId = _id;
    const userRole = user?.role;

    // Build query based on user role
    const query = { _id: orderId };
    if (userRole !== "ADMIN" && userRole !== "SUPERADMIN") {
      query.buyerId = userId; // Users can only see their own orders
    }

    const order = await Order.findOne(query)
      .populate(
        "buyerId",
        "firstName lastName email avatar shippingAddress billingAddress"
      )
      .populate({
        path: "artId",
        populate: {
          path: "artist",
          select: "firstName lastName email avatar",
        },
      })
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or access denied",
      });
    }

    // Transform detailed order data
    const orderDetails = {
      orderId: order._id,
      orderNumber: order._id.toString().slice(-8).toUpperCase(),
      orderDate: order.createdAt,
      lastUpdated: order.updatedAt,
      status: {
        payment: order.paymentStatus,
        order: order.orderStatus,
        shipping: order.status,
        canUpdate: ["ADMIN", "SUPERADMIN"].includes(userRole),
      },
      totals: {
        subtotal: order.artId.reduce(
          (sum, art) => sum + (art.totalPrice || 0),
          0
        ),
        shipping: 20, // Add if you have shipping costs
        tax: 0, // Add if you have tax
        total: order.totalAmount,
        currency: "USD",
      },
      customer: {
        id: order.buyerId._id,
        name: `${order.buyerId.firstName} ${order.buyerId.lastName}`,
        email: order.buyerId.email,
        avatar: order.buyerId.avatar?.secure_url,
      },
      addresses: {
        shipping: order.shippingAddress,
        billing: order.billingAddress,
        sameAsBilling: order.sameAsShipping,
      },
      artworks: order.artId.map((art, index) => ({
        id: art._id,
        title: art.title,
        description: art.description,
        thumbnail: art.thumbnail?.secure_url || "",
        images: art.art || [],
        artist: {
          id: art.artist?._id,
          name: art.artist
            ? `${art.artist.firstName} ${art.artist.lastName}`
            : "Unknown Artist",
          email: art.artist?.email,
          avatar: art.artist?.avatar?.secure_url,
        },
        price: {
          amount: art.priceDetails?.price || 0,
          currency: art.priceDetails?.currency || "USD",
        },
        details: {
          category: art.category,
          medium: art.medium,
          materials: art.materials,
          styles: art.styles,
          dimensions: {
            width: art.width,
            height: art.height,
            depth: art.depth,
          },
          year: art.year,
          isOriginal: !art.isOriginalSold,
        },
        quantity: 1, // Since each artwork is unique
      })),
      actions: {
        canCancel:
          ["confirmed", "processing"].includes(order.orderStatus) &&
          !order.cancelled,
        canReturn: order.orderStatus === "delivered",
        canReorder: true,
        canDownloadInvoice: order.paymentStatus === "paid",
      },
      notes: order.notes || [], // Add if you want to track order notes
      refunds: order.refunds || [], // Add if you handle refunds
    };

    res.status(200).json({
      success: true,
      data: { order: orderDetails },
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch order details",
      error: error.message,
    });
  }
};

// get order by user id
const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.query;
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = { buyerId: userId };
    if (status) {
      query.orderStatus = status;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Get orders with full population
    const orders = await Order.find(query)
      .populate("buyerId", "firstName lastName email avatar")
      .populate({
        path: "artId",
        populate: {
          path: "artist",
          select: "firstName lastName avatar",
        },
        select:
          "title thumbnail priceDetails category medium styles isOriginalSold totalPrice",
      })
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean(); // Use lean for better performance

    const total = await Order.countDocuments(query);

    // Transform data for better frontend consumption
    const transformedOrders = orders.map((order) => ({
      orderId: order._id,
      orderNumber: order._id.toString().slice(-8).toUpperCase(),
      orderDate: order.createdAt,
      lastUpdated: order.updatedAt,
      status: {
        payment: order.paymentStatus,
        order: order.orderStatus,
        shipping: order.status,
      },
      totals: {
        amount: order.totalAmount,
        items: order.totalItems || order.artId.length,
        currency: "USD", // You can make this dynamic
      },
      customer: {
        id: order.buyerId._id,
        name: `${order.buyerId.firstName} ${order.buyerId.lastName}`,
        email: order.buyerId.email,
        avatar: order.buyerId.avatar?.secure_url,
      },
      shipping: {
        address: order.shippingAddress,
        sameAsBilling: order.sameAsShipping,
      },
      billing: {
        address: order.billingAddress,
      },
      artworks: order.artId.map((art) => ({
        id: art._id,
        title: art.title,
        thumbnail: art.thumbnail?.secure_url || "",
        artist: {
          id: art.artist?._id,
          name: art.artist
            ? `${art.artist.firstName} ${art.artist.lastName}`
            : "Unknown Artist",
          avatar: art.artist?.avatar?.secure_url,
        },
        price: {
          amount: art.totalPrice || 0,
          currency: art.priceDetails?.currency || "USD",
        },
        category: art.category,
        medium: art.medium,
        styles: art.styles,
        isOriginal:
          art.isOriginalSold !== undefined ? !art.isOriginalSold : true,
      })),
      flags: {
        cancelled: order.cancelled,
        canCancel: ["confirmed", "processing"].includes(order.orderStatus),
        canReturn: order.orderStatus === "delivered",
      },
    }));

    // Calculate summary statistics
    const summary = {
      totalOrders: total,
      totalSpent: transformedOrders.reduce(
        (sum, order) => sum + order.totals.amount,
        0
      ),
      averageOrderValue:
        total > 0
          ? transformedOrders.reduce(
              (sum, order) => sum + order.totals.amount,
              0
            ) / total
          : 0,
    };

    res.status(200).json({
      success: true,
      data: {
        orders: transformedOrders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalOrders: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
        summary,
      },
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user orders",
      error: error.message,
    });
  }
};

module.exports = {
  createOrders,
  getOrderById,
  getUserOrders,
};
