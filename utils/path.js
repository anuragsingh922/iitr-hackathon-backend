const path = require("path");
require("dotenv").config({ path: "../config.env" });

exports.getFilePathMp3 = (id, filename) => {
  const audioFilePathMP3 = (process.env.operatingSys = "mac"
    ? `./${id}/${filename}`
    : path.join(id, filename));

  return audioFilePathMP3;
};
exports.getFilePathWav = (id, filename) => {
  const audioFilePathWav = (process.env.operatingSys = "mac"
    ? `./${id}/${filename}`
    : path.join(id, filename));

  return audioFilePathWav;
};
