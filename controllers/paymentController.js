const { Client, Environment, ApiError } = require("square");

const squareClient = new Client({
  // environment: process.env.SQUARE_ENVIRONMENT === 'production'
  //   ? Environment.Production
  //   : Environment.Sandbox,
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

const generateIdempotencyKey = () =>
  `payment_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

exports.payment = async (req, res) => {
  try {
    const { sourceId, amount, currency = "USD", billingAddress } = req.body;

    const response = await squareClient.paymentsApi.createPayment({
      idempotencyKey: generateIdempotencyKey,
      sourceId: sourceId,
      amountMoney: {
        currency: currency,
        amount: amount,
      },
    });
    console.log(result);

    return res.json({
      success: true,
      paymentId: response.result.payment.id,
      status: response.result.payment.status,
    })

  } catch (error) {
    console.error("Payment Error:", error);
    if (error instanceof ApiError) {
      res.status(400).json({
        success: false,
        errors: error.result,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}



// Refund Endpoint
exports.refund = async (req, res) => {
    const { 
      paymentId, 
      amount, 
      currency = 'USD' 
    } = req.body;
  
    try {
      const response = await squareClient.refundsApi.refundPayment({
        idempotencyKey: generateIdempotencyKey(),
        paymentId,
        amountMoney: {
          amount: Math.round(amount * 100), // Convert to cents
          currency
        }
      });
  
      res.json({
        success: true,
        refundId: response.result.refund.id,
        status: response.result.refund.status
      });
    } catch (error) {
      console.error('Refund Error:', error);
      
      if (error instanceof ApiError) {
        res.status(400).json({
          success: false,
          errors: error.result
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Internal server error'
        });
      }
    }
  }
