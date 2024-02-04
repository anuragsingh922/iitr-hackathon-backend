const ffmpeg = require("fluent-ffmpeg");
const path = require("path");

// Output WAV file path
exports.convertMP3toWav = (mp3FilePath, wavFilePath) => {
  console.log("mp3path", mp3FilePath, "   wavpath", wavFilePath);
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(mp3FilePath)
      .toFormat("wav")
      .on("end", () => {
        console.log("MP3 to WAV conversion completed.");
        resolve();
      })
      .on("error", (err) => {
        console.error("Error:", err);
        reject(err);
      })
      .save(wavFilePath);
  });
};
