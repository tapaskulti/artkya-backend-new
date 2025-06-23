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

// Update Painting Status
exports.updatePaintingStatus = async (req, res) => {
  try {
    const { artId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['Available', 'Sold', 'Hidden'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    const artwork = await ArtDetails.findById(artId);
    if (!artwork) {
      return res.status(404).json({
        success: false,
        message: 'Artwork not found'
      });
    }

    // Update status logic
    let updateFields = { updatedAt: new Date() };
    
    if (status === 'Sold') {
      updateFields.isOriginalSold = true;
      updateFields.soldDate = new Date();
    } else if (status === 'Available') {
      updateFields.isOriginalSold = false;
      updateFields.soldDate = null;
    } else if (status === 'Hidden') {
      updateFields.isPublished = false;
    }

    const updatedArtwork = await ArtDetails.findByIdAndUpdate(
      artId,
      { $set: updateFields },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `Artwork status updated to ${status}`,
      data: { artwork: updatedArtwork }
    });

  } catch (error) {
    console.error('Error updating painting status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update painting status',
      error: error.message
    });
  }
};

// Delete Painting
exports.deletePainting = async (req, res) => {
  try {
    const { artId } = req.params;

    const artwork = await ArtDetails.findById(artId);
    if (!artwork) {
      return res.status(404).json({
        success: false,
        message: 'Artwork not found'
      });
    }

    // Check if artwork is sold - prevent deletion of sold items
    if (artwork.isOriginalSold) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete sold artwork'
      });
    }

    // Soft delete - just mark as deleted
    await ArtDetails.findByIdAndUpdate(artId, {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.id
      }
    });

    res.status(200).json({
      success: true,
      message: 'Artwork deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting painting:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete painting',
      error: error.message
    });
  }
};

// Export Paintings
exports.exportPaintings = async (req, res) => {
  try {
    const { format = 'excel', status, category, approved, artist } = req.query;

    // Build query
    const query = { isDeleted: { $ne: true } };
    
    if (status) {
      if (status === 'Sold') {
        query.isOriginalSold = true;
      } else if (status === 'Available') {
        query.isOriginalSold = false;
      } else if (status === 'Hidden') {
        query.isPublished = false;
      }
    }
    
    if (category) query.category = category;
    if (approved !== undefined) query.isPublished = approved === 'true';

    const paintings = await ArtDetails.aggregate([
      { $match: query },
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
        $match: artist ? {
          $or: [
            { "artistInfo.firstName": { $regex: artist, $options: 'i' } },
            { "artistInfo.lastName": { $regex: artist, $options: 'i' } }
          ]
        } : {}
      },
      {
        $project: {
          title: 1,
          artist: {
            $concat: [
              { $ifNull: ["$artistInfo.firstName", ""] },
              " ",
              { $ifNull: ["$artistInfo.lastName", ""] }
            ]
          },
          category: 1,
          price: "$priceDetails.price",
          commission: "$commissionAmount",
          totalPrice: { $add: ["$priceDetails.price", { $ifNull: ["$commissionAmount", 0] }] },
          status: {
            $cond: {
              if: { $eq: ["$isOriginalSold", true] },
              then: "Sold",
              else: { $cond: { if: { $eq: ["$isPublished", false] }, then: "Hidden", else: "Available" } }
            }
          },
          approved: "$isPublished",
          uploadDate: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          medium: { $arrayElemAt: ["$medium", 0] },
          style: { $arrayElemAt: ["$styles", 0] },
          dimensions: {
            $concat: [
              { $toString: { $ifNull: ["$dimensions.height", ""] } },
              " x ",
              { $toString: { $ifNull: ["$dimensions.width", ""] } },
              " ",
              { $ifNull: ["$dimensions.unit", ""] }
            ]
          }
        }
      }
    ]);

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Paintings Report');

      // Add headers
      worksheet.columns = [
        { header: 'Title', key: 'title', width: 25 },
        { header: 'Artist', key: 'artist', width: 20 },
        { header: 'Category', key: 'category', width: 15 },
        { header: 'Price', key: 'price', width: 12 },
        { header: 'Commission', key: 'commission', width: 12 },
        { header: 'Total Price', key: 'totalPrice', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Approved', key: 'approved', width: 10 },
        { header: 'Upload Date', key: 'uploadDate', width: 15 },
        { header: 'Medium', key: 'medium', width: 15 },
        { header: 'Style', key: 'style', width: 15 },
        { header: 'Dimensions', key: 'dimensions', width: 15 }
      ];

      // Add data
      paintings.forEach(painting => {
        worksheet.addRow({
          title: painting.title,
          artist: painting.artist.trim(),
          category: painting.category,
          price: painting.price || 0,
          commission: painting.commission || 0,
          totalPrice: painting.totalPrice || 0,
          status: painting.status,
          approved: painting.approved ? 'Yes' : 'No',
          uploadDate: painting.uploadDate,
          medium: painting.medium || '',
          style: painting.style || '',
          dimensions: painting.dimensions
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
      res.setHeader('Content-Disposition', `attachment; filename="paintings-export-${new Date().toISOString().split('T')[0]}.xlsx"`);
      
      await workbook.xlsx.write(res);
      res.end();

    } else {
      // CSV format
      const csvData = paintings.map(painting => ({
        'Title': painting.title,
        'Artist': painting.artist.trim(),
        'Category': painting.category,
        'Price': painting.price || 0,
        'Commission': painting.commission || 0,
        'Total Price': painting.totalPrice || 0,
        'Status': painting.status,
        'Approved': painting.approved ? 'Yes' : 'No',
        'Upload Date': painting.uploadDate,
        'Medium': painting.medium || '',
        'Style': painting.style || '',
        'Dimensions': painting.dimensions
      }));

      const csvContent = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="paintings-export-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    }

  } catch (error) {
    console.error('Export paintings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export paintings',
      error: error.message
    });
  }
};

// Get Painting Analytics
exports.getPaintingAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    const today = new Date();
    let startDate;
    
    switch (period) {
      case '7d':
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const [
      totalPaintings,
      approvedPaintings,
      soldPaintings,
      recentUploads,
      categoryBreakdown,
      artistStats,
      revenueData
    ] = await Promise.all([
      // Total paintings
      ArtDetails.countDocuments({ isDeleted: { $ne: true } }),
      
      // Approved paintings
      ArtDetails.countDocuments({ isPublished: true, isDeleted: { $ne: true } }),
      
      // Sold paintings
      ArtDetails.countDocuments({ isOriginalSold: true, isDeleted: { $ne: true } }),
      
      // Recent uploads
      ArtDetails.countDocuments({ 
        createdAt: { $gte: startDate },
        isDeleted: { $ne: true }
      }),
      
      // Category breakdown
      ArtDetails.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Top artists by artwork count
      ArtDetails.aggregate([
        { $match: { isDeleted: { $ne: true } } },
        { $group: { _id: '$artist', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'artistInfo'
          }
        },
        { $unwind: '$artistInfo' },
        {
          $project: {
            name: {
              $concat: ['$artistInfo.firstName', ' ', '$artistInfo.lastName']
            },
            count: 1
          }
        }
      ]),
      
      // Revenue data
      ArtDetails.aggregate([
        { 
          $match: { 
            isOriginalSold: true, 
            isDeleted: { $ne: true },
            soldDate: { $gte: startDate }
          } 
        },
        { 
          $group: { 
            _id: null, 
            totalRevenue: { 
              $sum: { 
                $add: ['$priceDetails.price', { $ifNull: ['$commissionAmount', 0] }] 
              } 
            },
            avgPrice: { $avg: '$priceDetails.price' }
          } 
        }
      ])
    ]);

    const analytics = {
      overview: {
        totalPaintings,
        approvedPaintings,
        soldPaintings,
        recentUploads,
        approvalRate: totalPaintings > 0 ? ((approvedPaintings / totalPaintings) * 100).toFixed(1) : 0,
        salesRate: approvedPaintings > 0 ? ((soldPaintings / approvedPaintings) * 100).toFixed(1) : 0
      },
      categoryBreakdown: categoryBreakdown.reduce((acc, cat) => {
        acc[cat._id] = cat.count;
        return acc;
      }, {}),
      topArtists: artistStats,
      revenue: {
        total: revenueData[0]?.totalRevenue || 0,
        average: revenueData[0]?.avgPrice || 0
      }
    };

    res.status(200).json({
      success: true,
      data: { analytics }
    });

  } catch (error) {
    console.error('Get painting analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get painting analytics',
      error: error.message
    });
  }
};

// Bulk Approve Paintings
exports.bulkApprovePaintings = async (req, res) => {
  try {
    const { artIds } = req.body;
    
    if (!artIds || !Array.isArray(artIds) || artIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Art IDs array is required'
      });
    }

    const result = await ArtDetails.updateMany(
      { 
        _id: { $in: artIds },
        isDeleted: { $ne: true }
      },
      { 
        $set: { 
          isPublished: true, 
          approvedAt: new Date(),
          approvedBy: req.user.id
        } 
      }
    );

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} paintings approved successfully`,
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });

  } catch (error) {
    console.error('Bulk approve paintings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk approve paintings',
      error: error.message
    });
  }
};

// Get Painting Details
exports.getPaintingDetails = async (req, res) => {
  try {
    const { artId } = req.params;

    const painting = await ArtDetails.findById(artId)
      .populate('artist', 'firstName lastName email avatar')
      .lean();

    if (!painting) {
      return res.status(404).json({
        success: false,
        message: 'Painting not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { painting }
    });

  } catch (error) {
    console.error('Get painting details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get painting details',
      error: error.message
    });
  }
};

exports.getAllArtists = async (req, res) => {
  try {
    const {
      search,
      status,
      verified,
      artApprovalReq,
      page = 1,
      limit = 10,
      commissionRange,
      artworksRange
    } = req.query;

    // Build filter query - using your schema fields
    let filter = { isArtist: true };

    // Search filter - using firstName, lastName, email
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter - using isActive field
    if (status) {
      if (status === 'Active') {
        filter.isActive = true;
      } else if (status === 'Inactive') {
        filter.isActive = false;
      }
      // Note: Your schema doesn't have 'Suspended', you might need to add this field
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch artists with aggregation to include artwork counts
    const artists = await User.aggregate([
      { $match: filter },
      // Join with artistDetails collection
      {
        $lookup: {
          from: 'artistdetails',
          localField: '_id',
          foreignField: 'userId',
          as: 'artistDetails'
        }
      },
      { $unwind: { path: '$artistDetails', preserveNullAndEmptyArrays: true } },
      // Join with artDetails collection to get artworks
      {
        $lookup: {
          from: 'artdetails',
          localField: '_id',
          foreignField: 'artist',
          as: 'artworks'
        }
      },
      // Filter artworks based on additional filters if needed
      {
        $addFields: {
          // Create name field by combining firstName and lastName
          name: { $concat: ['$firstName', ' ', '$lastName'] },
          // Map your schema fields to expected frontend fields
          verified: '$artistDetails.isVerified',
          isArtApprovalReq: '$artistDetails.isArtApprovalReq',
          originalCommission: '$artistDetails.originalPercent',
          status: {
            $cond: {
              if: '$isActive',
              then: 'Active',
              else: 'Inactive'
            }
          },
          profileImage: '$artistDetails.profileImage.secure_url',
          // Calculate artwork statistics
          totalArtworks: { $size: '$artworks' },
          approvedArtworks: {
            $size: {
              $filter: {
                input: '$artworks',
                cond: { $eq: ['$$this.isPublished', true] }
              }
            }
          },
          totalArtSold: {
            $size: {
              $filter: {
                input: '$artworks',
                cond: { $eq: ['$$this.isOriginalSold', true] }
              }
            }
          },
          totalRevenue: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$artworks',
                    cond: { $eq: ['$$this.isOriginalSold', true] }
                  }
                },
                in: '$$this.totalPrice'
              }
            }
          }
        }
      },
      // Apply additional filters after aggregation
      {
        $match: {
          ...(verified !== undefined && verified !== '' && {
            verified: verified === 'true'
          }),
          ...(artApprovalReq !== undefined && artApprovalReq !== '' && {
            isArtApprovalReq: artApprovalReq === 'true'
          }),
          ...(commissionRange && (() => {
            const [min, max] = commissionRange.split('-').map(Number);
            return { originalCommission: { $gte: min, $lte: max } };
          })()),
          ...(artworksRange && (() => {
            const [min, max] = artworksRange.split('-').map(Number);
            return { totalArtworks: { $gte: min, $lte: max } };
          })())
        }
      },
      {
        $project: {
          password: 0,
          artworks: 0,
          refresh_token: 0,
          forgotPasswordToken: 0,
          forgotPasswordExpiry: 0
        }
      },
      { $skip: skip },
      { $limit: parseInt(limit) },
      { $sort: { createdAt: -1 } }
    ]);

    // Get total count for pagination
    const totalCountPipeline = await User.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'artistdetails',
          localField: '_id',
          foreignField: 'userId',
          as: 'artistDetails'
        }
      },
      { $unwind: { path: '$artistDetails', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          ...(verified !== undefined && verified !== '' && {
            'artistDetails.isVerified': verified === 'true'
          }),
          ...(artApprovalReq !== undefined && artApprovalReq !== '' && {
            'artistDetails.isArtApprovalReq': artApprovalReq === 'true'
          })
        }
      },
      { $count: 'total' }
    ]);

    const totalCount = totalCountPipeline[0]?.total || 0;

    // Calculate analytics
    const analytics = await User.aggregate([
      { $match: { isArtist: true } },
      {
        $lookup: {
          from: 'artistdetails',
          localField: '_id',
          foreignField: 'userId',
          as: 'artistDetails'
        }
      },
      { $unwind: { path: '$artistDetails', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          totalArtists: { $sum: 1 },
          activeArtists: {
            $sum: { $cond: ['$isActive', 1, 0] }
          },
          verifiedArtists: {
            $sum: { $cond: ['$artistDetails.isVerified', 1, 0] }
          },
          averageCommission: { $avg: '$artistDetails.originalPercent' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      artists,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        hasNext: skip + parseInt(limit) < totalCount,
        hasPrev: parseInt(page) > 1
      },
      analytics: analytics[0] || {
        totalArtists: 0,
        activeArtists: 0,
        verifiedArtists: 0,
        averageCommission: 0
      }
    });
  } catch (error) {
    console.error('Error fetching artists:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch artists',
      error: error.message
    });
  }
};

// Get artist details
exports.getArtistDetails = async (req, res) => {
  try {
    const { artistId } = req.params;

    const artist = await User.findById(artistId).select('-password -refresh_token -forgotPasswordToken');
    if (!artist || !artist.isArtist) {
      return res.status(404).json({
        success: false,
        message: 'Artist not found'
      });
    }

    // Get artist details
    const artistDetails = await ArtistDetails.findOne({ userId: artistId });

    // Get artist's artworks
    const artworks = await ArtDetails.find({ artist: artistId });
    
    // Calculate additional stats
    const stats = {
      totalArtworks: artworks.length,
      approvedArtworks: artworks.filter(art => art.isPublished).length,
      pendingArtworks: artworks.filter(art => !art.isPublished && !art.isDeleted).length,
      featuredArtworks: artworks.filter(art => art.isFeatured).length,
      soldOriginals: artworks.filter(art => art.isOriginalSold).length,
      totalRevenue: artworks
        .filter(art => art.isOriginalSold)
        .reduce((sum, art) => sum + (art.totalPrice || 0), 0),
      printSales: artworks.reduce((sum, art) => {
        return sum + (art.printCopies?.reduce((printSum, copy) => printSum + (copy.totalSales || 0), 0) || 0);
      }, 0)
    };

    res.status(200).json({
      success: true,
      artist: {
        ...artist.toObject(),
        name: `${artist.firstName} ${artist.lastName}`,
        artistDetails
      },
      stats,
      recentArtworks: artworks.slice(0, 5)
    });
  } catch (error) {
    console.error('Error fetching artist details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch artist details',
      error: error.message
    });
  }
};

// Verify artist
exports.verifyArtist = async (req, res) => {
  try {
    const { artistId } = req.params;

    const artist = await User.findById(artistId);
    if (!artist || !artist.isArtist) {
      return res.status(404).json({
        success: false,
        message: 'Artist not found'
      });
    }

    // Update verification in artistDetails collection
    const artistDetails = await ArtistDetails.findOne({ userId: artistId });
    if (artistDetails) {
      artistDetails.isVerified = !artistDetails.isVerified;
      await artistDetails.save();
    }

    res.status(200).json({
      success: true,
      message: `Artist ${artistDetails?.isVerified ? 'verified' : 'unverified'} successfully`,
      verified: artistDetails?.isVerified || false
    });
  } catch (error) {
    console.error('Error verifying artist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify artist',
      error: error.message
    });
  }
};

// Update artist status
exports.updateArtistStatus = async (req, res) => {
  try {
    const { artistId } = req.params;
    const { status } = req.body;

    const artist = await User.findById(artistId);
    if (!artist || !artist.isArtist) {
      return res.status(404).json({
        success: false,
        message: 'Artist not found'
      });
    }

    // Update isActive based on status
    if (status === 'Active') {
      artist.isActive = true;
    } else if (status === 'Inactive') {
      artist.isActive = false;
    }
    // Note: You might want to add a 'suspended' field to your schema for 'Suspended' status

    await artist.save();

    res.status(200).json({
      success: true,
      message: 'Artist status updated successfully',
      status: artist.isActive ? 'Active' : 'Inactive'
    });
  } catch (error) {
    console.error('Error updating artist status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update artist status',
      error: error.message
    });
  }
};

// Toggle art approval permission
exports.toggleArtApprovalPermission = async (req, res) => {
  try {
    const { artistId } = req.params;
    const { isArtApprovalReq } = req.body;

    const artistDetails = await ArtistDetails.findOne({ userId: artistId });
    if (!artistDetails) {
      return res.status(404).json({
        success: false,
        message: 'Artist details not found'
      });
    }

    artistDetails.isArtApprovalReq = isArtApprovalReq;
    await artistDetails.save();

    res.status(200).json({
      success: true,
      message: 'Art approval permission updated successfully',
      isArtApprovalReq: artistDetails.isArtApprovalReq
    });
  } catch (error) {
    console.error('Error updating art approval permission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update art approval permission',
      error: error.message
    });
  }
};

// Update artist commission
exports.updateArtistCommission = async (req, res) => {
  try {
    const { artistId } = req.params;
    const { originalPercent } = req.body;

    if (originalPercent < 0 || originalPercent > 100) {
      return res.status(400).json({
        success: false,
        message: 'Commission percentage must be between 0 and 100'
      });
    }

    const artistDetails = await ArtistDetails.findOne({ userId: artistId });
    if (!artistDetails) {
      return res.status(404).json({
        success: false,
        message: 'Artist details not found'
      });
    }

    artistDetails.originalPercent = originalPercent;
    await artistDetails.save();

    res.status(200).json({
      success: true,
      message: 'Artist commission updated successfully',
      originalPercent: artistDetails.originalPercent
    });
  } catch (error) {
    console.error('Error updating artist commission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update artist commission',
      error: error.message
    });
  }
};

// Get artist analytics
exports.getArtistAnalytics = async (req, res) => {
  try {
    const analytics = await User.aggregate([
      { $match: { isArtist: true } },
      {
        $lookup: {
          from: 'artistdetails',
          localField: '_id',
          foreignField: 'userId',
          as: 'artistDetails'
        }
      },
      { $unwind: { path: '$artistDetails', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'artdetails',
          localField: '_id',
          foreignField: 'artist',
          as: 'artworks'
        }
      },
      {
        $group: {
          _id: null,
          totalArtists: { $sum: 1 },
          activeArtists: {
            $sum: { $cond: ['$isActive', 1, 0] }
          },
          verifiedArtists: {
            $sum: { $cond: ['$artistDetails.isVerified', 1, 0] }
          },
          totalArtworks: { $sum: { $size: '$artworks' } },
          totalRevenue: {
            $sum: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: '$artworks',
                      cond: { $eq: ['$$this.isOriginalSold', true] }
                    }
                  },
                  in: '$$this.totalPrice'
                }
              }
            }
          },
          averageCommission: { $avg: '$artistDetails.originalPercent' }
        }
      }
    ]);

    const monthlyStats = await User.aggregate([
      { $match: { isArtist: true } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          newArtists: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.status(200).json({
      success: true,
      analytics: analytics[0] || {
        totalArtists: 0,
        activeArtists: 0,
        verifiedArtists: 0,
        totalArtworks: 0,
        totalRevenue: 0,
        averageCommission: 0
      },
      monthlyStats
    });
  } catch (error) {
    console.error('Error fetching artist analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch artist analytics',
      error: error.message
    });
  }
};

// Export artists to Excel
exports.exportArtists = async (req, res) => {
  try {
    const { format = 'excel', filters = {} } = req.query;

    // Build filter query
    let filter = { isArtist: true };
    
    if (filters.status) {
      if (filters.status === 'Active') {
        filter.isActive = true;
      } else if (filters.status === 'Inactive') {
        filter.isActive = false;
      }
    }

    // Fetch artists with artwork data
    const artists = await User.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'artistdetails',
          localField: '_id',
          foreignField: 'userId',
          as: 'artistDetails'
        }
      },
      { $unwind: { path: '$artistDetails', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'artdetails',
          localField: '_id',
          foreignField: 'artist',
          as: 'artworks'
        }
      },
      {
        $addFields: {
          name: { $concat: ['$firstName', ' ', '$lastName'] },
          verified: '$artistDetails.isVerified',
          isArtApprovalReq: '$artistDetails.isArtApprovalReq',
          originalCommission: '$artistDetails.originalPercent',
          status: {
            $cond: {
              if: '$isActive',
              then: 'Active',
              else: 'Inactive'
            }
          },
          totalArtworks: { $size: '$artworks' },
          approvedArtworks: {
            $size: {
              $filter: {
                input: '$artworks',
                cond: { $eq: ['$$this.isPublished', true] }
              }
            }
          },
          totalArtSold: {
            $size: {
              $filter: {
                input: '$artworks',
                cond: { $eq: ['$$this.isOriginalSold', true] }
              }
            }
          },
          totalRevenue: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$artworks',
                    cond: { $eq: ['$$this.isOriginalSold', true] }
                  }
                },
                in: '$$this.totalPrice'
              }
            }
          }
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          status: 1,
          verified: 1,
          isArtApprovalReq: 1,
          originalCommission: 1,
          totalArtworks: 1,
          approvedArtworks: 1,
          totalArtSold: 1,
          totalRevenue: 1,
          createdAt: 1,
          country: '$artistDetails.country',
          city: '$artistDetails.city'
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Artists');

      // Define columns
      worksheet.columns = [
        { header: 'Name', key: 'name', width: 20 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Country', key: 'country', width: 15 },
        { header: 'City', key: 'city', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Verified', key: 'verified', width: 10 },
        { header: 'Art Approval Required', key: 'isArtApprovalReq', width: 20 },
        { header: 'Commission %', key: 'originalCommission', width: 15 },
        { header: 'Total Artworks', key: 'totalArtworks', width: 15 },
        { header: 'Approved Artworks', key: 'approvedArtworks', width: 18 },
        { header: 'Total Art Sold', key: 'totalArtSold', width: 15 },
        { header: 'Total Revenue', key: 'totalRevenue', width: 15 },
        { header: 'Joined Date', key: 'createdAt', width: 15 }
      ];

      // Style the header row
      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
      });

      // Add data rows
      artists.forEach((artist) => {
        worksheet.addRow({
          name: artist.name || '',
          email: artist.email || '',
          country: artist.country || '',
          city: artist.city || '',
          status: artist.status || 'Active',
          verified: artist.verified ? 'Yes' : 'No',
          isArtApprovalReq: artist.isArtApprovalReq ? 'Yes' : 'No',
          originalCommission: artist.originalCommission || 20,
          totalArtworks: artist.totalArtworks || 0,
          approvedArtworks: artist.approvedArtworks || 0,
          totalArtSold: artist.totalArtSold || 0,
          totalRevenue: artist.totalRevenue || 0,
          createdAt: artist.createdAt ? new Date(artist.createdAt).toLocaleDateString() : ''
        });
      });

      // Set response headers
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=artists_export_${new Date().toISOString().split('T')[0]}.xlsx`
      );

      // Write to response
      await workbook.xlsx.write(res);
      res.end();
    } else {
      // Return JSON format
      res.status(200).json({
        success: true,
        data: artists,
        count: artists.length
      });
    }
  } catch (error) {
    console.error('Error exporting artists:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export artists',
      error: error.message
    });
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
    if (approvedArtworks >= 20 || artistDetails.isVerified) {
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