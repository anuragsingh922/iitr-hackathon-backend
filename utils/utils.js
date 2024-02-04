const path = require("path");
let keepAlive;

let chathistory = "";
let chatt = "";
let speech = "";
let requestQueue = [];
let audioNum = 0;

let msg;
let streamId = "";
let contentToSend = "";

const clearAudioFolder = () => {
  const fs = require("fs");

  const folderPath = path.join("audioo");

  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.error("Error reading folder:", err);
      return;
    }

    files.forEach((file) => {
      const filePath = path.join(folderPath, file);

      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error("Error deleting file:", unlinkErr);
        } else {
          console.log(`Deleted file: ${filePath}`);
        }
      });
    });
  });
};

module.exports = {
  keepAlive,
  chathistory,
  chatt,
  speech,
  requestQueue,
  audioNum,
  msg,
  contentToSend,
  clearAudioFolder,
  streamId,
};
