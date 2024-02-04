require("dotenv").config({ path: "./config.env" });
const express = require("express");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const app = express();
require("express-ws")(app);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());

const db = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

const dbconnect = async () => {
  try {
    mongoose
      .connect(db, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
      })
      .then(() => console.log("Connection Successful!"));
  } catch (err) {
    console.log(err);
  }
};

dbconnect();
const vonageRoutes = require("./routes/vonageRoutes");
const campaignRoutes = require("./routes/campaignRoutes");
const userRoutes = require("./routes/userRoutes");

// const controller = require("./elevenlabs_streaming");
const controller = require("./final_code_with_both_elevenlabs_and_rime");
// const controller = require("./transfer_call_test");
// const controller = require("./aman_silence");



const campaignSave = require("./model/campaignModel");

app.use("/audio", express.static(path.join(__dirname, "audio")));

app.get("/", (req, res) => {
  res.send("Vonage Server is running...");
});

app.use("/vonage", vonageRoutes);
app.use("/campaign", campaignRoutes);
app.use("/user", userRoutes);
app.ws(
  "/socket/:id/:campaignId/:callId/:number/:timeslots",
  controller.handleRealTimeStream
);

app.ws(
  "/socket/:callId/:number/:timeslots",
  controller.handleIncomingRealTimeStream
);

app.ws("/ws/:room", controller.webSocket);

app.post("/socket/events", (req, res) => {
  console.log(req.body);
  res.send(200);
});

//Image Server

// app.post("/replicate", controller.replicate);
// app.post("/product_detail", controller.product_detail);
// app.post("/openai", controller.openai_calll);
// app.post("/search_query", controller.provide_search_query);
// app.post("/get_image_url", controller.provide_url_based_on_image);

const PORT = 8080;
app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));
