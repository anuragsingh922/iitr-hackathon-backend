// const mongoose = require("mongoose");

// const campaignSaveSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: [true, "A campaign must have a name."],
//   },
//   date: {
//     type: String,
//     required: [true, "A campaign must have creation date."],
//   },
//   userId: {
//     type: String,
//     required: [true, "User Id is required to save the campaign."],
//   },
//   callBtn: Boolean,
//   clients: [
//     {
//       Name: String,
//       Email: String,
//       Customer_Address: String,
//       Number: String,
//       id: String,
//       plan_name: String,
//       plan_url: String,
//       Status: String,
//       duration: Number,
//       typee: String,
//       timesCalled: { type: Number, default: 0 },
//       recordingUrl: String,
//       chat: String,
//       humanDuration: { type: Number, default: 0 },
//       machineDuration: { type: Number, default: 0 },
//       unrespondedDuration: { type: Number, default: 0 },
//       humanCalls: { type: Number, default: 0 },
//       machineCalls: { type: Number, default: 0 },
//       unrespondedCalls: { type: Number, default: 0 },
//     },
//   ],
// });

// const campaignSave = new mongoose.model("campaignSave", campaignSaveSchema);
// module.exports = campaignSave;

const mongoose = require("mongoose");

const campaignSaveSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "A campaign must have a name."],
  },
  date: {
    type: String,
    required: [true, "A campaign must have creation date."],
  },
  userId: {
    type: String,
    required: [true, "User Id is required to save the campaign."],
  },
  callBtn: Boolean,
  callsMade: Number,
  callsPause: Boolean,
  pauseBtn: Boolean,
  clients: [
    {
      Name: String,
      Email: String,
      Customer_Address: String,
      Number: String,
      id: String,
      plan_name: String,
      plan_url: String,
      Status: String,
      duration: Number,
      typee: String,
      timesCalled: { type: Number, default: 0 },
      recordingUrl: String,
      chat: String,
      time_zone1: String,
      time_zone2: String,
    },
  ],
});

const campaignSave = new mongoose.model("campaignSave", campaignSaveSchema);
module.exports = campaignSave;
