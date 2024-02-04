const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const incomingCallSchema = new Schema(
  {
    from: String,
    to: String,
    typee: String,
    duration: Number,
    status: String,
    recordingUrl: String,
    chat: String,
  },
  { timestamps: true }
);

const IncomingCall = mongoose.model("incoming_call", incomingCallSchema);

module.exports = IncomingCall;
