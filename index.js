const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const morgan = require("morgan");
const bodyParser = require("body-parser");
// const cloudinary = require("cloudinary");
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

connectWithMongodb();

const allowedDomains = [
  "http://localhost:5174",
  "http://localhost:5173",
  "http://localhost:5175",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedDomains.indexOf(origin) === -1) {
        var msg =
          "The CORS policy for this site does not " +
          "allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 200,
  })
);

const PORT = process.env.PORT
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
