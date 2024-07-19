const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const morgan = require("morgan");
const bodyParser = require("body-parser");
const cloudinary = require("cloudinary");
const fileUpload = require("express-fileupload");
const connectWithMongodb = require("./config/db");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

// logger
app.use(morgan("tiny"));

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

connectWithMongodb();

const allowedDomains = [
  "*",
  // "http://localhost:5174",
  // "http://localhost:5173",
  // "http://localhost:5175",
];

app.use(cors())
// app.use(
//   cors({
//     origin: function (origin, callback) {
//       if (!origin) return callback(null, true);
//       if (allowedDomains.indexOf(origin) === -1) {
//         var msg =
//           "The CORS policy for this site does not " +
//           "allow access from the specified Origin.";
//         return callback(new Error(msg), false);
//       }
//       return callback(null, true);
//     },
//     credentials: true,
//     methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
//     preflightContinue: false,
//     optionsSuccessStatus: 200,
//   })
// );


// import routes
app.use("/api/v1/user", require("./routes/user"));
app.use("/api/v1/art", require("./routes/art"));
app.use("/api/v1/cart", require("./routes/cart"));
// app.use("/api/v1/collection", require("./routes/collection"));
app.use("/api/v1/wishlist", require("./routes/wishlist"));



const PORT = process.env.PORT
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
