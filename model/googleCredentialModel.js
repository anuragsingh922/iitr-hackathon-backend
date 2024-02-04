const mongoose = require("mongoose");

const GoogleCredentialsSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
  },
  client_id: {
    type: String,
    required: true,
  },
  client_secret: {
    type: String,
    required: true,
  },
  refresh_token: {
    type: String,
    required: true,
  },
});

// Create the model
const GoogleCredential = mongoose.model(
  "GoogleCredential",
  GoogleCredentialsSchema
);

module.exports = GoogleCredential;
