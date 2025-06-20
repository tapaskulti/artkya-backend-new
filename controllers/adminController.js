const nodemailer = require("nodemailer");
const handlebars = require("handlebars");
const fs = require("fs");
const path = require("path");
const User = require("../models/user");
const ArtistDetails = require("../models/artistDetails");
const ArtDetails = require("../models/art");
const { default: mongoose } = require("mongoose");
const Order = require("../models/order");
const sgMail = require('@sendgrid/mail');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');


const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.contactUs = async (req, res) => {
  const { name, email, message } = req.body;

  // Input validation
  if (!name || !email || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // if (!validateEmail(email)) {
  //   return res.status(400).json({ error: "Invalid email format" });
  // }

  try {
    // Email to admin/yourself
    const adminMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "New Contact Form Submission",
      html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong> ${message}</p>
        `,
    };

    // Email to user (acknowledgment)
    const userMailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Thank you for contacting us",
      html: `
          <h2>Thank you for reaching out!</h2>
          <p>Dear ${name},</p>
          <p>We have received your message and will get back to you as soon as possible.</p>
          <p>Here's a copy of your message:</p>
          <p><em>${message}</em></p>
          <br>
          <p>Best regards,</p>
          <p>Your Company Name</p>
        `,
    };

    // Send both emails concurrently
    await Promise.all([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(userMailOptions),
    ]);

    res.status(200).json({ message: "Messages sent successfully" });
  } catch (err) {
    console.error("Email sending error:", err);
    res.status(500).json({ error: "Failed to send email" });
  }
};

exports.buyOriginalArtMail = async (req, res) => {
  const {
    customerName,
    customerAddress,
    contactNo,
    customerEmail,
    artid,
    artPrice,
    originalImage,
  } = req.body;

  // const originalArtBuyTemplate = fs.readFileSync(
  //   path.join(__dirname, "../template/OriginalArtBuy.hbs"),
  //   "utf8"
  // );

  // const template = handlebars.compile(originalArtBuyTemplate);

  // const originalArtBuyBody = template({
  //   original_art_id: artid,
  //   customer_name: customerName,
  //   address: customerAddress,
  //   contact_number: contactNo,
  //   email: customerEmail,
  //   art_price: artPrice,
  //   image_url: originalImage,
  // });

  try {
    // Email to admin/yourself
    const adminMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "New Contact Form Submission",
      html: originalArtBuyBody,
    };

    // Email to user (acknowledgment)
    const userMailOptions = {
      from: process.env.EMAIL_USER,
      to: customerEmail,
      subject: "Thank you for contacting us",
      // html: originalArtBuyBody
    };

    // Send both emails concurrently
    await Promise.all([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(userMailOptions),
    ]);

    res.status(200).json({ message: "Messages sent successfully" });
  } catch (err) {
    console.error("Email sending error:", err);
    res.status(500).json({ error: "Failed to send email" });
  }
};

// Get total users and total artists
exports.getTotalUsersAndArtists = async (req, res) => {
  try {
    const [totalUsers, totalArtists] = await Promise.all([
      User.countDocuments(),
      ArtistDetails.countDocuments(),
    ]);

    return res.status(200).json({
      totalUsers,
      totalArtists,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.getTotalPaintings = async (req, res) => {
  const totalPaintings = await ArtDetails.countDocuments();

  return res.status(200).json({
    totalPaintings
  });
};

// Get all user details with search
exports.getAllUsers = async (req, res) => {
  try {
    const { search = ""  } = req.query

   const userData = await User.aggregate([
    {
      $match: {        
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      },
    },
      {
        $project: {
          _id: 1,
          name: { $concat: ["$firstName", " ", "$lastName"] },
          email: 1,
          role: 1,
          userType: {
            $cond: {
              if: "$isArtist",
              then: "ARTIST",
              else: "USER",
            },
          },
          joiningDate: {
            $dateToString: {
              format: "%d %b %Y",
              date: "$createdAt",
              timezone: "Asia/Kolkata",
            },
          },
          verified: {
            $cond: {
              if: "$isArtApprovalReq",
              then: "Unverified",
              else: "Verified",
            },
          },
          status: {
            $cond: {
              if: "$isActive",
              then: "Active",
              else: "Inactive",
            },
          },
        },
      },
    ]);

    return res.status(200).json(userData);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Get all artist details with search
exports.getAllArtists = async (req, res) => {
  try {
    const { search = "" } = req.query;

    const artists = await User.aggregate([
      // Match only artists, optionally filter by name or email
      {
        $match: {
          isArtist: true,
          $or: [
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        },
      },
      {
        $lookup: {
          from: "artistdetails",
          localField: "_id",
          foreignField: "userId",
          as: "artistDetails",
        },
      },
      { $unwind: { path: "$artistDetails", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "artdetails",
          localField: "_id",
          foreignField: "artist",
          as: "soldArts",
          pipeline: [{ $match: { isOriginalSold: true } }],
        },
      },
      {
        $project: {
          name: { $concat: ["$firstName", " ", "$lastName"] },
          email: 1,
          userType: "ARTIST",
          joiningDate: "$createdAt",
          verified: "$isArtist",
          status: {
            $cond: {
              if: "$isActive",
              then: "Active",
              else: "Inactive",
            },
          },
          originalCommission: "$artistDetails.originalPercent",
          totalArtSold: { $size: "$soldArts" },
          totalRevenue: { $sum: "$soldArts.totalPrice" },
        },
      },
    ]);

    return res.status(200).json({ success: true, data: artists });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
// Get all Painting details with search
exports.getAllPainting = async (req, res) => {
  try {
    const paintings = await ArtDetails.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "artist",
          foreignField: "_id",
          as: "artistInfo",
        },
      },
      {
        $unwind: {
          path: "$artistInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: -1,
          id: "$_id",
          title: 1,
          artist: {
            $cond: {
              if: { $ifNull: ["$artistInfo.firstName", false] },
              then: {
                $concat: ["$artistInfo.firstName", " ", "$artistInfo.lastName"],
              },
              else: "Unknown Artist",
            },
          },
          price: "$priceDetails.price",
          commission: "$commissionAmount",
          status: {
            $cond: {
              if: { $eq: ["$isOriginalSold", true] },
              then: "Sold",
              else: "Available",
            },
          },
          category: "$category",
          uploadDate: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          approved: "$isPublished",
          thumbnail: "$thumbnail.secure_url",
        },
      },
    ]);

    return res.status(200).json({ success: true, data: paintings });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


// Activate/Deactivate User (Handles artist status)
exports.toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.query;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.isActive = !user.isActive;
    if (user.role === "ARTIST") {
      user.isArtist = user.isActive;
    }

    await user.save();
    return res.status(200).json({
      message: `User ${user.isActive ? "Activated" : "Deactivated"}`,
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update Print Commission Percentage
exports.updateArtistCommission = async (req, res) => {
  try {
    let { userId, originalPercent } = req.body;
    originalPercent = parseInt(originalPercent);

    const artistDetails = await ArtistDetails.findOneAndUpdate(
      { userId: userId },
      { originalPercent: originalPercent },
      { new: true }
    );

    if (!artistDetails) {
      return res.status(404).json({ message: "Artist not found" });
    }

    return res
      .status(200)
      .json({ message: "Commission updated", artistDetails });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Directly verify an artist (Admin privilege)
exports.verifyArtist = async (req, res) => {
  try {
    const { userId } = req.query;
    const artistDetails = await ArtistDetails.findOneAndUpdate(
      { userId: userId },
      { isVerified: true,isArtApprovalReq:false },
      { new: true }
    );

    if (!artistDetails) {
      return res.status(404).json({ message: "Artist not found" });
    }

    return res
      .status(200)
      .json({ message: "Artist verified by admin", artistDetails });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};



// Reject artwork
exports.rejectArtwork = async (req, res) => {
  try {
    const { artId } = req.query;
    const artwork = await ArtDetails.findByIdAndUpdate(
      { _id: artId },
      { isPublished: false },
      { new: true }
    );
    if (!artwork) return res.status(404).json({ message: "Artwork not found" });

    return res.status(200).json({ message: "Artwork rejected", artwork });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

function calculateArtworkPricing(basePrice, commissionPercent) {
  const commissionAmount = (basePrice * commissionPercent) / 100;
  const totalPrice = basePrice + commissionAmount;
  return { commissionAmount, totalPrice };
}
exports.approveArtwork = async (req, res) => {
  try {
    const { artId } = req.query;

    const artwork = await ArtDetails.findOne({ _id: artId }).populate("artist");
    if (!artwork || artwork.isPublished) {
      return res.status(400).json({ message: "Invalid or already approved artwork" });
    }

    const artist = artwork.artist;
    const artistDetails = await ArtistDetails.findOne({ userId: artist._id });

    if (!artistDetails) {
      return res.status(404).json({ message: "Artist details not found" });
    }

    const approvedArtworks = await ArtDetails.countDocuments({
      artist: artist._id,
      isPublished: true,
    });

    // If artist has 3+ approved artworks, disable future approvals
    if (approvedArtworks >= 3 || artistDetails.isVerified) {
      artistDetails.isArtApprovalReq = false;
      await artistDetails.save();

      artwork.isPublished = true;
      const { commissionAmount, totalPrice } = calculateArtworkPricing(
        artwork.priceDetails.price,
        artistDetails.originalPercent || 20 // fallback if not set
      );

      artwork.commissionPercent = artistDetails.originalPercent;
      artwork.commissionAmount = commissionAmount;
      artwork.totalPrice = totalPrice;

      await artwork.save();
      return res.json({ message: "Artwork auto-approved", artwork });
    }

    // Approve with pricing logic
    artwork.isPublished = true;
    const { commissionAmount, totalPrice } = calculateArtworkPricing(
      artwork.priceDetails.price,
      artistDetails.originalPercent || 20
    );

    artwork.commissionPercent = artistDetails.originalPercent;
    artwork.commissionAmount = commissionAmount;
    artwork.totalPrice = totalPrice;

    await artwork.save();

    return res.status(200).json({ message: "Artwork approved", artwork });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};


exports.getAllOrdersAdmin = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      paymentStatus,
      search,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;

    // Build complex query
    const query = {};
    
    // Status filters
    if (status) query.orderStatus = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    
    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }
    
    // Amount range filter
    if (minAmount || maxAmount) {
      query.totalAmount = {};
      if (minAmount) query.totalAmount.$gte = parseFloat(minAmount);
      if (maxAmount) query.totalAmount.$lte = parseFloat(maxAmount);
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Base aggregation pipeline
    let pipeline = [
      { $match: query },
      {
        $lookup: {
          from: 'users',
          localField: 'buyerId',
          foreignField: '_id',
          as: 'buyer'
        }
      },
      {
        $lookup: {
          from: 'artdetails', // Make sure this matches your collection name
          localField: 'artId',
          foreignField: '_id',
          as: 'artworks'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'artworks.artist',
          foreignField: '_id',
          as: 'artists'
        }
      }
    ];

    // Add search functionality
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'buyer.firstName': { $regex: search, $options: 'i' } },
            { 'buyer.lastName': { $regex: search, $options: 'i' } },
            { 'buyer.email': { $regex: search, $options: 'i' } },
            { 'artworks.title': { $regex: search, $options: 'i' } },
            { '_id': { $regex: search.replace(/[^a-fA-F0-9]/g, ''), $options: 'i' } }
          ]
        }
      });
    }

    // Add sorting and pagination
    pipeline.push(
      { $sort: sort },
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) }
    );

    const orders = await Order.aggregate(pipeline);
    
    // Get total count for pagination
    const totalPipeline = [...pipeline.slice(0, -2)]; // Remove skip and limit
    totalPipeline.push({ $count: "total" });
    const totalResult = await Order.aggregate(totalPipeline);
    const total = totalResult[0]?.total || 0;

    // Transform data for admin view
    const transformedOrders = orders.map(order => ({
      orderId: order._id,
      orderNumber: order._id.toString().slice(-8).toUpperCase(),
      orderDate: order.createdAt,
      lastUpdated: order.updatedAt,
      status: {
        payment: order.paymentStatus,
        order: order.orderStatus,
        shipping: order.status
      },
      totals: {
        amount: order.totalAmount,
        items: order.totalItems || order.artId.length,
        currency: 'USD'
      },
      customer: {
        id: order.buyer[0]?._id,
        name: `${order.buyer[0]?.firstName || ''} ${order.buyer[0]?.lastName || ''}`.trim(),
        email: order.buyer[0]?.email,
        avatar: order.buyer[0]?.avatar?.secure_url || order.buyer[0]?.profilePicture,
        isVerified: order.buyer[0]?.isActive
      },
      shipping: {
        address: order.shippingAddress,
        sameAsBilling: order.sameAsShipping
      },
      billing: {
        address: order.billingAddress || order.shippingAddress
      },
      artworks: order.artworks.map(art => {
        const artist = order.artists.find(a => a._id.toString() === art.artist?.toString());
        return {
          id: art._id,
          title: art.title,
          thumbnail: art.thumbnail?.secure_url || art.thumbnail || '',
          artist: {
            id: artist?._id,
            name: artist ? `${artist.firstName || ''} ${artist.lastName || ''}`.trim() : 'Unknown Artist'
          },
          price: {
            amount: art.priceDetails?.price || art.price || 0,
            currency: art.priceDetails?.currency || 'USD'
          },
          category: art.category || 'Paintings',
          medium: art.medium || [],
          styles: art.styles || [],
          isOriginal: art.isOriginal || false
        };
      }),
      flags: {
        cancelled: order.cancelled || false,
        canCancel: order.orderStatus === 'confirmed' && !order.cancelled,
        canReturn: order.orderStatus === 'delivered' && !order.cancelled,
        needsAttention: (order.orderStatus === 'processing' && 
                       new Date() - new Date(order.createdAt) > 24 * 60 * 60 * 1000) || // 24 hours
                       order.paymentStatus === 'failed',
        highValue: order.totalAmount > 500
      },
      paymentId: order.paymentId
    }));

    // Get dashboard statistics
    const stats = await getAdminDashboardStats();

    res.status(200).json({
      success: true,
      data: {
        orders: transformedOrders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalOrders: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        },
        stats
      }
    });

  } catch (error) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

// UPDATE_ORDER_STATUS API
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes, notifyCustomer = true } = req.body;

    // Validate orderId
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    // Validate status
    const validOrderStatuses = ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    const validShippingStatuses = ['transit', 'delivered', 'returned'];
    
    if (!validOrderStatuses.includes(status) && !validShippingStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + [...validOrderStatuses, ...validShippingStatuses].join(', ')
      });
    }

    // Find the order
    const order = await Order.findById(orderId)
      .populate('buyerId', 'firstName lastName email')
      .populate('artId', 'title');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Prevent updating cancelled orders
    if (order.cancelled && status !== 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update status of cancelled order'
      });
    }

    // Update fields based on status type
    let updateFields = {
      updatedAt: new Date()
    };

    // Determine if it's an order status or shipping status
    if (validOrderStatuses.includes(status)) {
      updateFields.orderStatus = status;
      
      // Auto-update shipping status based on order status
      if (status === 'shipped') {
        updateFields.status = 'transit';
      } else if (status === 'delivered') {
        updateFields.status = 'delivered';
      } else if (status === 'cancelled') {
        updateFields.cancelled = true;
        updateFields.status = 'returned'; // or keep original status
      }
    } else if (validShippingStatuses.includes(status)) {
      updateFields.status = status;
      
      // Auto-update order status based on shipping status
      if (status === 'delivered') {
        updateFields.orderStatus = 'delivered';
      }
    }

    // Add notes if provided
    if (notes) {
      updateFields.adminNotes = notes;
    }

    // Update the order
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).populate('buyerId', 'firstName lastName email')
     .populate('artId', 'title artist');

    // Log the status change (optional - you can create a separate StatusLog model)
    const statusLog = {
      orderId: orderId,
      previousStatus: order.orderStatus,
      newStatus: status,
      changedBy: req.user.id, // Assuming you have user info in req.user
      changedAt: new Date(),
      notes: notes || ''
    };

    // You can save this to a separate StatusLog collection if needed
    // await StatusLog.create(statusLog);

    // Send notification email to customer if requested
    if (notifyCustomer && updatedOrder.buyerId) {
      try {
        // You can integrate with your email service here
        // await sendStatusUpdateEmail(updatedOrder, status, notes);
        console.log(`Status update email should be sent to ${updatedOrder.buyerId.email}`);
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
        // Don't fail the entire request if email fails
      }
    }

    // Return updated order in the same format as getAllOrdersAdmin
    const transformedOrder = {
      orderId: updatedOrder._id,
      orderNumber: updatedOrder._id.toString().slice(-8).toUpperCase(),
      orderDate: updatedOrder.createdAt,
      lastUpdated: updatedOrder.updatedAt,
      status: {
        payment: updatedOrder.paymentStatus,
        order: updatedOrder.orderStatus,
        shipping: updatedOrder.status
      },
      totals: {
        amount: updatedOrder.totalAmount,
        items: updatedOrder.totalItems || updatedOrder.artId.length,
        currency: 'USD'
      },
      customer: {
        id: updatedOrder.buyerId._id,
        name: `${updatedOrder.buyerId.firstName || ''} ${updatedOrder.buyerId.lastName || ''}`.trim(),
        email: updatedOrder.buyerId.email
      },
      flags: {
        cancelled: updatedOrder.cancelled || false,
        canCancel: updatedOrder.orderStatus === 'confirmed' && !updatedOrder.cancelled,
        canReturn: updatedOrder.orderStatus === 'delivered' && !updatedOrder.cancelled,
        needsAttention: false, // Reset after manual update
        highValue: updatedOrder.totalAmount > 500
      },
      adminNotes: updatedOrder.adminNotes || ''
    };

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: {
        order: transformedOrder,
        statusLog: statusLog
      }
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

// Helper function to get admin dashboard stats
async function getAdminDashboardStats() {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalOrders,
      todayOrders,
      weekOrders,
      monthOrders,
      revenueData,
      statusBreakdown,
      topArtworks
    ] = await Promise.all([
      // Total orders
      Order.countDocuments({}),
      
      // Today's orders
      Order.countDocuments({ createdAt: { $gte: startOfDay } }),
      
      // This week's orders
      Order.countDocuments({ createdAt: { $gte: startOfWeek } }),
      
      // This month's orders
      Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
      
      // Revenue calculation
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
      ]),
      
      // Status breakdown
      Order.aggregate([
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
      ]),
      
      // Top artworks
      Order.aggregate([
        { $unwind: '$artId' },
        { $group: { _id: '$artId', orders: { $sum: 1 } } },
        { $sort: { orders: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'artdetails',
            localField: '_id',
            foreignField: '_id',
            as: 'artwork'
          }
        },
        { $unwind: '$artwork' },
        {
          $project: {
            id: '$_id',
            title: '$artwork.title',
            orders: 1
          }
        }
      ])
    ]);

    const totalRevenue = revenueData[0]?.totalRevenue || 0;
    const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0;

    // Format status breakdown
    const statusBreakdownObj = {};
    statusBreakdown.forEach(status => {
      statusBreakdownObj[status._id] = status.count;
    });

    return {
      overview: {
        totalOrders,
        todayOrders,
        weekOrders,
        monthOrders,
        totalRevenue,
        avgOrderValue: parseFloat(avgOrderValue)
      },
      statusBreakdown: statusBreakdownObj,
      topArtworks
    };

  } catch (error) {
    console.error('Error fetching admin dashboard stats:', error);
    return {
      overview: {
        totalOrders: 0,
        todayOrders: 0,
        weekOrders: 0,
        monthOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0
      },
      statusBreakdown: {},
      topArtworks: []
    };
  }
}


// Configure SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Send Order Email
exports.sendOrderEmail = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { emailType, customMessage, recipientEmail } = req.body;

    // Get order details with populated data
    const order = await Order.findById(orderId)
      .populate('buyerId', 'firstName lastName email')
      .populate('artId', 'title thumbnail artist priceDetails');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const customer = order.buyerId;
    const toEmail = recipientEmail || customer.email;

    let emailSubject, emailContent;

    switch (emailType) {
      case 'confirmation':
        emailSubject = `Order Confirmation - #${order._id.toString().slice(-8).toUpperCase()}`;
        emailContent = `
          <h2>Order Confirmation</h2>
          <p>Dear ${customer.firstName} ${customer.lastName},</p>
          <p>Thank you for your order! Your order has been confirmed and is being processed.</p>
          <div style="border: 1px solid #ddd; padding: 20px; margin: 20px 0;">
            <h3>Order Details:</h3>
            <p><strong>Order Number:</strong> #${order._id.toString().slice(-8).toUpperCase()}</p>
            <p><strong>Total Amount:</strong> $${order.totalAmount}</p>
            <p><strong>Payment Status:</strong> ${order.paymentStatus}</p>
            <p><strong>Order Status:</strong> ${order.orderStatus}</p>
          </div>
          <p>You will receive another email when your order ships.</p>
          <p>Best regards,<br>Art Gallery Team</p>
        `;
        break;

      case 'shipping':
        emailSubject = `Your Order Has Shipped - #${order._id.toString().slice(-8).toUpperCase()}`;
        emailContent = `
          <h2>Order Shipped</h2>
          <p>Dear ${customer.firstName} ${customer.lastName},</p>
          <p>Great news! Your order has been shipped and is on its way to you.</p>
          <div style="border: 1px solid #ddd; padding: 20px; margin: 20px 0;">
            <h3>Shipping Details:</h3>
            <p><strong>Order Number:</strong> #${order._id.toString().slice(-8).toUpperCase()}</p>
            <p><strong>Shipping Address:</strong></p>
            <p>${order.shippingAddress.address1}<br>
               ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}<br>
               ${order.shippingAddress.country}</p>
          </div>
          <p>You can expect delivery within 5-7 business days.</p>
          <p>Best regards,<br>Art Gallery Team</p>
        `;
        break;

      case 'delivery':
        emailSubject = `Order Delivered - #${order._id.toString().slice(-8).toUpperCase()}`;
        emailContent = `
          <h2>Order Delivered</h2>
          <p>Dear ${customer.firstName} ${customer.lastName},</p>
          <p>Your order has been successfully delivered!</p>
          <p>We hope you love your new artwork. If you have any questions or concerns, please don't hesitate to contact us.</p>
          <p>Best regards,<br>Art Gallery Team</p>
        `;
        break;

      case 'custom':
        emailSubject = `Update on Your Order - #${order._id.toString().slice(-8).toUpperCase()}`;
        emailContent = customMessage || 'Custom message from Art Gallery Team';
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid email type'
        });
    }

    const msg = {
      to: toEmail,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: emailSubject,
      html: emailContent,
    };

    await sgMail.send(msg);

    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      data: {
        orderId,
        emailType,
        recipient: toEmail
      }
    });

  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error.message
    });
  }
};

// Generate Order Report
exports.generateOrderReport = async (req, res) => {
  try {
    const { reportType, dateFrom, dateTo, filters, format = 'pdf' } = req.body;

    // Build query based on filters
    const query = {};
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    if (filters?.status) query.orderStatus = filters.status;
    if (filters?.paymentStatus) query.paymentStatus = filters.paymentStatus;

    const orders = await Order.find(query)
      .populate('buyerId', 'firstName lastName email')
      .populate('artId', 'title artist priceDetails category')
      .sort({ createdAt: -1 });

    if (format === 'pdf') {
      // Generate PDF Report
      const doc = new PDFDocument();
      let buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf"`);
        res.send(pdfData);
      });

      // Add content to PDF
      doc.fontSize(20).text(`${reportType.toUpperCase()} REPORT`, 100, 50);
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, 100, 80);
      doc.text(`Total Orders: ${orders.length}`, 100, 100);
      doc.text(`Total Revenue: $${orders.reduce((sum, order) => sum + order.totalAmount, 0)}`, 100, 120);

      let yPosition = 160;
      doc.text('Order Details:', 100, yPosition);
      yPosition += 30;

      orders.slice(0, 50).forEach((order, index) => { // Limit to 50 orders for PDF
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }
        
        doc.text(`${index + 1}. Order #${order._id.toString().slice(-8).toUpperCase()}`, 100, yPosition);
        doc.text(`   Customer: ${order.buyerId.firstName} ${order.buyerId.lastName}`, 100, yPosition + 15);
        doc.text(`   Amount: $${order.totalAmount} | Status: ${order.orderStatus}`, 100, yPosition + 30);
        doc.text(`   Date: ${order.createdAt.toLocaleDateString()}`, 100, yPosition + 45);
        
        yPosition += 70;
      });

      doc.end();

    } else if (format === 'excel') {
      // Generate Excel Report
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Orders Report');

      // Add headers
      worksheet.columns = [
        { header: 'Order ID', key: 'orderId', width: 15 },
        { header: 'Customer Name', key: 'customerName', width: 20 },
        { header: 'Customer Email', key: 'customerEmail', width: 25 },
        { header: 'Total Amount', key: 'totalAmount', width: 15 },
        { header: 'Payment Status', key: 'paymentStatus', width: 15 },
        { header: 'Order Status', key: 'orderStatus', width: 15 },
        { header: 'Order Date', key: 'orderDate', width: 15 },
        { header: 'Items Count', key: 'itemsCount', width: 12 }
      ];

      // Add data
      orders.forEach(order => {
        worksheet.addRow({
          orderId: order._id.toString().slice(-8).toUpperCase(),
          customerName: `${order.buyerId.firstName} ${order.buyerId.lastName}`,
          customerEmail: order.buyerId.email,
          totalAmount: order.totalAmount,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
          orderDate: order.createdAt.toLocaleDateString(),
          itemsCount: order.artId.length
        });
      });

      // Style headers
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report-${new Date().toISOString().split('T')[0]}.xlsx"`);
      
      await workbook.xlsx.write(res);
      res.end();

    } else {
      // CSV format
      const csvData = orders.map(order => ({
        'Order ID': order._id.toString().slice(-8).toUpperCase(),
        'Customer Name': `${order.buyerId.firstName} ${order.buyerId.lastName}`,
        'Customer Email': order.buyerId.email,
        'Total Amount': order.totalAmount,
        'Payment Status': order.paymentStatus,
        'Order Status': order.orderStatus,
        'Order Date': order.createdAt.toLocaleDateString(),
        'Items Count': order.artId.length
      }));

      const csvContent = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${reportType}-report-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    }

  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message
    });
  }
};

// Download Invoice
exports.downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { format = 'pdf' } = req.query;

    const order = await Order.findById(orderId)
      .populate('buyerId', 'firstName lastName email')
      .populate('artId', 'title thumbnail artist priceDetails category');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const customer = order.buyerId;
    const invoiceNumber = `INV-${order._id.toString().slice(-8).toUpperCase()}`;

    if (format === 'pdf') {
      const doc = new PDFDocument();
      let buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceNumber}.pdf"`);
        res.send(pdfData);
      });

      // Invoice Header
      doc.fontSize(24).text('INVOICE', 100, 50);
      doc.fontSize(12).text(`Invoice Number: ${invoiceNumber}`, 100, 80);
      doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, 100, 100);
      doc.text(`Order Date: ${order.createdAt.toLocaleDateString()}`, 100, 120);

      // Customer Details
      doc.fontSize(14).text('Bill To:', 100, 160);
      doc.fontSize(12).text(`${customer.firstName} ${customer.lastName}`, 100, 180);
      doc.text(customer.email, 100, 200);
      
      if (order.billingAddress) {
        doc.text(`${order.billingAddress.address1}`, 100, 220);
        if (order.billingAddress.address2) {
          doc.text(`${order.billingAddress.address2}`, 100, 240);
        }
        doc.text(`${order.billingAddress.city}, ${order.billingAddress.state} ${order.billingAddress.postalCode}`, 100, 260);
        doc.text(`${order.billingAddress.country}`, 100, 280);
      }

      // Items Table Header
      let yPos = 320;
      doc.fontSize(12).text('Item', 100, yPos);
      doc.text('Quantity', 300, yPos);
      doc.text('Price', 400, yPos);
      doc.text('Total', 500, yPos);
      
      // Draw line
      doc.moveTo(100, yPos + 20).lineTo(550, yPos + 20).stroke();
      yPos += 40;

      // Items
      let subtotal = 0;
      order.artId.forEach((art, index) => {
        const price = art.priceDetails?.price || 0;
        subtotal += price;
        
        doc.text(art.title, 100, yPos);
        doc.text('1', 300, yPos);
        doc.text(`$${price}`, 400, yPos);
        doc.text(`$${price}`, 500, yPos);
        yPos += 25;
      });

      // Totals
      yPos += 20;
      doc.moveTo(100, yPos).lineTo(550, yPos).stroke();
      yPos += 20;
      
      doc.text('Subtotal:', 400, yPos);
      doc.text(`$${subtotal}`, 500, yPos);
      yPos += 20;
      
      doc.text('Tax:', 400, yPos);
      doc.text('$0.00', 500, yPos);
      yPos += 20;
      
      doc.fontSize(14).text('Total:', 400, yPos);
      doc.text(`$${order.totalAmount}`, 500, yPos);

      // Payment Info
      yPos += 40;
      doc.fontSize(12).text(`Payment Method: ${order.paymentId ? 'Credit Card' : 'Other'}`, 100, yPos);
      doc.text(`Payment Status: ${order.paymentStatus.toUpperCase()}`, 100, yPos + 20);

      doc.end();

    } else {
      // JSON format for API response
      const invoiceData = {
        invoiceNumber,
        invoiceDate: new Date().toISOString(),
        orderDate: order.createdAt,
        customer: {
          name: `${customer.firstName} ${customer.lastName}`,
          email: customer.email
        },
        billingAddress: order.billingAddress,
        items: order.artId.map(art => ({
          title: art.title,
          price: art.priceDetails?.price || 0,
          quantity: 1
        })),
        subtotal: order.artId.reduce((sum, art) => sum + (art.priceDetails?.price || 0), 0),
        tax: 0,
        total: order.totalAmount,
        paymentStatus: order.paymentStatus
      };

      res.json({
        success: true,
        data: invoiceData
      });
    }

  } catch (error) {
    console.error('Download invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice',
      error: error.message
    });
  }
};