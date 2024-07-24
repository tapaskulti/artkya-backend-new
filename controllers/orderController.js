const OrderModel = require("../models/order")


exports.createUserOrderSet = async (req, res) => {
    try {
      const { userId } = req.query;
  
      const checkOrderAvailable = await OrderModel.findOne({ userId: userId });
  
      if (checkOrderAvailable) {
        return res.status(401).send({
          status: false,
          message: "Order For This User Is Already Present",
        });
      }
      req.body.userId = userId;
      const createOrder = await OrderModel.create(req.body);
  
      return res.status(201).send({
        success: true,
        message: "Order Set Created Successfully",
        data: createOrder,
      });
    } catch (error) {
      return res.status(500).send({ success: false, message: error.message });
    }
  };


//   order Items

