const { Client, Environment, ApiError } = require("square");
const crypto = require("crypto");

const squareClient = new Client({
  environment:
    process.env.SQUARE_ENVIRONMENT === "production"
      ? Environment.Production
      : Environment.Sandbox,
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

const generateIdempotencyKey = () =>
  `payment_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

exports.payment = async (req, res) => {
  try {
    const { sourceId, amount, currency = "USD", billingAddress } = req.body;

    // Validate required fields
    if (!sourceId || !amount) {
      return res.status(400).json({
        success: false,
        message: "sourceId and amount are required",
      });
    }

    const paymentRequest = {
      sourceId: sourceId,
      amountMoney: {
        amount: parseInt(amount),
        currency: currency,
      },
      idempotencyKey: generateIdempotencyKey(),
      location_id: process.env.SQUARE_LOCATION_ID,
    };

    // Add billing address if provided
    if (billingAddress) {
      paymentRequest.billing_address = billingAddress;
    }

    const { paymentsApi } = squareClient;
    const response = await paymentsApi.createPayment(paymentRequest);

    console.log("Square Response:========>", response);

    return res.json({
      success: true,
      paymentId: response.result.payment.id,
      status: response.result.payment.status,
      receiptUrl: response.result.payment.receipt_url,
      orderId: response.result.payment.order_id,
    });
  } catch (error) {
    console.error("Payment Error:", error);
    if (error instanceof ApiError) {
      console.error("Square API Error:", error.result);
      return res.status(400).json({
        success: false,
        errors: error.result.errors || [error.result],
        message: "Payment failed",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
};

// Refund Endpoint
exports.refund = async (req, res) => {
  const { paymentId, amount, currency = "USD" } = req.body;

  try {
    const response = await squareClient.refundsApi.refundPayment({
      idempotencyKey: generateIdempotencyKey(),
      paymentId,
      amountMoney: {
        amount: Math.round(amount * 100), // Convert to cents
        currency,
      },
    });

   return res.json({
      success: true,
      refundId: response.result.refund.id,
      status: response.result.refund.status,
    });
  } catch (error) {
    console.error("Refund Error:", error);

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
};
