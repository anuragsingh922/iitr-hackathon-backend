// const mongoose = require("mongoose");

// const Schema = mongoose.Schema;

// const callTimeSchema = new Schema({
//   id: String,
//   typee: String,
//   duration: Number,
//   status: String,
//   recordingUrl: String,
//   chat: String,
// });

// const CallTime = mongoose.model("call_time", callTimeSchema);

// module.exports = CallTime;

const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const callTimeSchema = new Schema(
  {
    id: String,
    typee: String,
    duration: Number,
    status: String,
    recordingUrl: String,
    chat: String,
  },
  { timestamps: true }
);

const CallTime = mongoose.model("call_time", callTimeSchema);

module.exports = CallTime;
