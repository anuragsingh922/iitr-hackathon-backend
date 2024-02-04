const { Vonage } = require("@vonage/server-sdk");
const axios = require("axios");
require("dotenv").config({ path: "./config.env" });
const fs = require("fs");
const wav = require("wav");
const path = require("path");
const Mp32Wav = require("mp3-to-wav");
const WaveFile = require("wavefile").WaveFile;
const mongo = require("./providers/database_handler");
const { Deepgram } = require("@deepgram/sdk");
const silence_provider = require("./providers/silence_check_provider");

const CampaignSave = require("./model/campaignModel");

const { getFilePathMp3, getFilePathWav } = require("./utils/path");
const { convertMP3toWav } = require("./utils/mp3toWav");
const campaignSave = require("./model/campaignModel");

const CallTime = require("./model/callTimeModel");
const IncomingCall = require("./model/incomingCallModel");

const vonage = new Vonage(
  {
    apiKey: process.env.VONAGE_API_KEY,
    apiSecret: process.env.VONAGE_API_SECRET,
    applicationId: process.env.VONAGE_APPLICATION_ID,
    privateKey: "private.key",
  },
  { debug: true }
);

const sampleRate = 16000;
const numChannels = 1; // Mono audio
const bitDepth = 16;
const endianness = "LE"; // Little Endian
const outputFilePath = "output.wav";
const outputStream = fs.createWriteStream(outputFilePath);
const clients = {};

function sendWebSocketMessage(room, message) {
  if (clients[room]) {
    clients[room].forEach((client) => {
      client.send(message);
    });
  }
}

const wavWriter = new wav.FileWriter(outputFilePath, {
  channels: numChannels,
  sampleRate: sampleRate,
  bitDepth: bitDepth,
  endianness: endianness,
});

wavWriter.pipe(outputStream);

function chunkArray(array, chunkSize) {
  var chunkedArray = [];
  for (var i = 0; i < array.length; i += chunkSize)
    chunkedArray.push(array.slice(i, i + chunkSize));
  return chunkedArray;
}

const getUserData = async (id, rowId) => {
  try {
    const campaignData = await CampaignSave.findById(id);

    const row = campaignData.clients.find((data) => data.id === rowId);

    return row;
  } catch (error) {
    console.error(error);
  }
};

const handleRealTimeStream = async (ws, req, res) => {
  const { callId } = req.params;

  const customer_number = req.params.number;

  const timeslots = req.params.timeslots.split(",");

  // console.log("\n\nTime slots inside handlerealtimestream  : "+JSON.stringify(timeslots));
  // console.log("\n\nTime slots inside handlerealtimestream first : "+JSON.stringify(timeslots[0]));

  console.log(formate.formatDate(timeslots[0]));
  console.log(formate.formatDate(timeslots[1]));
  console.log(formate.formatDate(timeslots[2]));
  console.log(formate.formatDate(timeslots[3]));

  // console.log(req);
  console.log("\n\n\nCustomer Number  :  " + customer_number);
  const userData = await getUserData(req.params.campaignId, req.params.id);
  // console.log("\n\n\n User Data  : " + JSON.stringify(userData) + "\n\n\n");
  // console.log(userData);
  const directoryPath = path.join(userData.id);

  if (!fs.existsSync(directoryPath)) {
    // Directory doesn't exist, create it
    fs.mkdirSync(directoryPath);
    console.log("Directory created successfully.");
  } else {
    console.log("Directory already exists.");
  }

  console.log("final_code");
  const deepgram = new Deepgram(process.env.DEEPGRAM_API_KEY);

  // Intilaising all parameter for deepgram connection
  const deepgramInstance = deepgram.transcription.live({
    punctuate: true,
    interim_results: true,
    encoding: "linear16",
    sample_rate: 16000,
    language: "en-US",
    model: "nova-2",
    speech_final: true,
    endpointing: 100,
    // tier: "enhanced",
    // model: "phonecall",
  });

  console.log("See Deepgram Req.    :     " + JSON.stringify(deepgramInstance));

  let deepgramTranscript = "";

  // Evenlistner for notifing when deepgram instance is closed.

  deepgramInstance.addListener("close", () => {
    console.log("Deepgram instance closed");
  });

  let chathistory = "";
  let filenumber = 0;

  let count = 0;
  let hasaudio = 0;
  let canrun = true;
  let canenter = true;
  let referpdf = false;
  let rawarray = [];
  let can_send_to_open_ai = false;
  let is_response_end = true;
  let sendBufferTimeout;
  let voice_mail_check_language = "en";
  let isvoicemail = false;
  let can_listen = true;
  let complete_duration = 0;
  let stop_flag = false;
  let fetch_text;
  let check_voicemail_count = 0;
  let first_audio_response = true;

  let can_increase_silence_count = true;

  let has_any_sound = false;

  let playfillerword = true;

  let has_killed = false;

  let prv_transcript = "";

  let beep_detected = false;

  let let_me_check = false;

  let play_voice_mail_silence_count = 0;

  let voicemail_message_played = false;

  let voicemail_message_any_sound = 0;

  let cc =
    "I apologize. At the moment, I do not have access to your individual healthcare plan document. I won't be able to answer this specific question. Do you have any other questions for me?";

  let audio_queue = {
    queue: [],
    playingg: false,
  };

  let silence = {
    count: 0,
  };

  let call_start_time = new Date();

  let calltype = {
    type: String,
  };

  let call_timing = {
    human_time: Number,
    voice_mail_time: Number,
    ivr_time: Number,
  };

  console.log("Call Start Time  :  " + Math.abs(call_start_time.getTime())) /
    1000;

  let uploaded = {
    status: false,
  };

  console.log("\n\n\nPlan Url  : " + JSON.stringify(userData));

  if (
    !uploaded.status &&
    userData.plan_url &&
    customer_number.includes("12136541105")
  ) {
    try {
      // uploaded.status = true;
      console.time("Upload_document");
      read_upload.read_upload(userData, uploaded);
      console.timeEnd("Upload_document");
    } catch (err) {
      console.log("Error in uploading  :  " + err);
    }
  }

  let check = true;
  let speech2 = "";
  let speech = "";

  // Deepgram Evenlistner for geting transcrition.

  deepgramInstance.addListener("transcriptReceived", async (message) => {
    const data = JSON.parse(message);
    if (data.channel) {
      const transcript = data.channel.alternatives[0].transcript;
      count = 0;

      // Code for checking time taken by deepgram for transcribing your speech.
      // console.log("Transcript  :  " + data.is_final + data.speech_final);
      // console.log("Duration  :  " + data.duration + "s");
      // if (check && transcript !== "") {
      //     console.time("Deepgram Processing Time");
      //     check = false;
      // }

      if (
        transcript !== "undefined" &&
        transcript !== "" &&
        transcript !== "you" &&
        transcript !== "you " &&
        transcript !== " you" &&
        transcript !== " You" &&
        transcript !== "You " &&
        transcript !== "You" &&
        transcript !== "You." &&
        transcript !== undefined &&
        transcript !== "You gotta do a " &&
        transcript &&
        !referpdf &&
        is_response_end
      ) {
        setTimeout(() => {
          stop_flag = true;
        }, 1000);
        hasaudio = 5;
      }

      if (transcript && data.is_final && !referpdf && is_response_end) {
        speech += transcript;
        count = 0;
        console.log("\n\n\nInside is_final  :  " + speech);
      }

      // console.log("Transcript  :  " + transcript);

      // We send the text only when is_final and speech_final both are true.
      // if (data.speech_final) {
      if (data.is_final && data.speech_final && !beep_detected) {
        // if (transcript && data.is_final && data.speech_final) {

        if (
          speech !== "undefined" &&
          speech !== "" &&
          speech !== "you" &&
          speech !== "you " &&
          speech !== " you" &&
          speech !== " You" &&
          speech !== "You " &&
          speech !== "You" &&
          speech !== "You." &&
          speech !== undefined &&
          speech !== "You gotta do a " &&
          speech
        ) {
          count = 0;
          speech2 = speech;
          speech = "";
          console.log(
            "\n\n\nDeepgram Responce Inside speech_final  :  " + speech2
          );
          can_send_to_open_ai = true;
          has_any_sound = true;
          // hasaudio = 0;
        }

        // console.timeEnd("Deepgram Processing Time");
        // check = true;
      }
    }
  });

  const database_user_id = ""; // Access the _id property of the 'user' document

  try {
    ws.on("message", function (msg) {
      try {
        try {
          let newarrbuffer = [];
          newarrbuffer.push(msg);
          // console.log("\n\n\nIs Response ended  :  " + is_response_end + "\n\n\n");
          // console.log("\n\n\n Has Killed  :  " + has_killed + "\n\n\n" + hasaudio + "\n\n\n");

          // if (fs.existsSync(callId) && !beep_detected) {
          //   let beep_file_read = fs.readFileSync(callId);

          //   console.log("\n\n\nBeep file read  :  " + beep_file_read);
          //   if (beep_file_read == "beep_detected") {
          //     beep_detected = true;
          //     console.log("\n\n\nBeep Detected inside ws.");
          //   }
          // }

          // if (
          //   (play_voice_mail_silence_count > 300 &&
          //     beep_detected &&
          //     !voicemail_message_played) ||
          //   (voicemail_message_any_sound>10 &&
          //     play_voice_mail_silence_count > 100 &&
          //     beep_detected &&
          //     !voicemail_message_played)
          // ) {
          //   console.log("\n\n\nCalling elevenlabs for voicemail.");

          //   voicemail_message_played = true;

          //   let voice_mail_index = -1;

          //   const voice_mail_message_player = async () => {
          //     console.log(
          //       "voicemail req   :   " + customer_number + "   " + ws
          //     );
          //     try {
          //       voice_mail_index++;

          //       let complete_duration = 0;

          //       console.log("\n\nvoice_mail_message_player.");

          //       let voicemail_text_array = [
          //         `Hi this is Jennifer with Insure Health Now.`,
          //         `I tried reaching you regarding your ${userData.plan_name} If you have any questions or need assistance, please feel free to give us at 888 283-3133  your convenience.`,
          //         `We're here to help ensure you have the information you need for peace of mind.`,
          //         `Thank you, and have a great day!`,
          //       ];

          //       let exapmle_voice_mail = `Hi this is Jennifer with Insure Health Now. I tried reaching you regarding your ${userData.plan_name} If you have any questions or need assistance, please feel free to give us at 888 283-3133  your convenience. We're here to help ensure you have the information you need for peace of mind. Thank you, and have a great day!`;

          //       const newtextt = voicemail_text_array[voice_mail_index];

          //       // Set options for the API request.
          //       const elevenlabs_options = {
          //         method: "POST",
          //         url: `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}?optimize_streaming_latency=4`,
          //         headers: {
          //           accept: "audio/mpeg", // Set the expected response type to audio/mpeg.
          //           "content-type": "application/json", // Set the content type to application/json.
          //           "xi-api-key": process.env.ELEVENLABS_API_KEY, // Set the API key in the headers.
          //         },
          //         data: {
          //           text: newtextt, // Pass in the inputText as the text to be converted to speech.
          //           model_id: "eleven_monolingual_v1",
          //           // voice_settings: {
          //           //     stability: 1,
          //           //     similarity_boost: 1,
          //           //     style: 1,
          //           //     use_speaker_boost: true
          //           // }
          //         },
          //         responseType: "arraybuffer", // Set the responseType to arraybuffer to receive binary data as response.
          //       };

          //       const elevenlabs_options_trubo = {
          //         method: "POST",
          //         url: `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}?optimize_streaming_latency=4`,
          //         headers: {
          //           accept: "audio/mpeg", // Set the expected response type to audio/mpeg.
          //           "content-type": "application/json", // Set the content type to application/json.
          //           "xi-api-key": process.env.ELEVENLABS_API_KEY, // Set the API key in the headers.
          //         },
          //         data: {
          //           text: newtextt, // Pass in the inputText as the text to be converted to speech.
          //           model_id: "eleven_turbo_v2",
          //           // voice_settings: {
          //           //     stability: 1,
          //           //     similarity_boost: 1,
          //           //     style: 1,
          //           //     use_speaker_boost: true
          //           // }
          //         },
          //         responseType: "arraybuffer", // Set the responseType to arraybuffer to receive binary data as response.
          //       };

          //       const rime_options = {
          //         method: "POST",
          //         // url: `https://api.rime.ai/functions/v1/rime-tts`,
          //         url: `http://rime-tts-mid-600de2bc2208321e.elb.us-west-1.amazonaws.com/rime-tts`,
          //         headers: {
          //           Authorization: process.env.RIME_API_KEY,
          //           "Content-Type": "application/json",
          //         },
          //         data: {
          //           text: newtextt, // Pass in the inputText as the text to be converted to speech.
          //           speaker:
          //             customer_number.includes("13072126556") ||
          //             customer_number.includes("12053504113")
          //               ? `sofia`
          //               : "daphne",
          //           // 'speaker': 'rose',
          //           // 'audioFormat': 'mp3',  // default value is 'wav'
          //           samplingRate: 16000, // Latency is increase to 3 sec on 16000
          //           speedAlpha: 1.6,
          //         },
          //       };

          //       let tts_options;

          //       if (customer_number.includes("13072126556")) {
          //         // console.log("\n\n\nEleven Labs Options");
          //         tts_options = elevenlabs_options;
          //       } else if (customer_number.includes("12053504113")) {
          //         // console.log("\n\n\nElevenlabs Turbo Options.");
          //         tts_options = elevenlabs_options_trubo;
          //       } else {
          //         // console.log("\n\n\nRimeOptions");
          //         tts_options = rime_options;
          //       }

          //       console.log(
          //         "\n\n\ntts_options outside if else ladder  :  " +
          //           JSON.stringify(tts_options)
          //       );

          //       // Send the API request using Axios and wait for the response.
          //       console.time("Eleven_Labs_API_inside_voicemail_response");
          //       const speechDetails = await axios.request(tts_options);
          //       console.timeEnd("Eleven_Labs_API_inside_voicemail_response");

          //       try {
          //         if (
          //           customer_number.includes("13072126556") ||
          //           customer_number.includes("12053504113")
          //         ) {
          //           console.time("Writting_Eleven_Labs_to_mp3_file");
          //           const filePath2 =
          //             process.env.operatingSys === "mac"
          //               ? `./${userData.id}/voice-mail-response-${voice_mail_index}.mp3`
          //               : path.join(
          //                   userData.id,
          //                   `voice-mail-response-${voice_mail_index}.mp3`
          //                 );
          //           fs.writeFileSync(filePath2, speechDetails.data, "binary");
          //           console.timeEnd("Writting_Eleven_Labs_to_mp3_file");
          //         } else {
          //           console.time("Writting_Eleven_Labs_to_wav_file");
          //           const filePath2 =
          //             process.env.operatingSys === "mac"
          //               ? `./${userData.id}/voice-mail-response-${voice_mail_index}.wav`
          //               : path.join(
          //                   userData.id,
          //                   `voice-mail-response-${voice_mail_index}.wav`
          //                 );
          //           fs.writeFileSync(
          //             filePath2,
          //             speechDetails.data.audioContent,
          //             "base64"
          //           );
          //           console.timeEnd("Writting_Eleven_Labs_to_wav_file");
          //         }

          //         const rootPath = path.resolve(`./${userData.id}`);
          //         let filename = `voice-mail-response-${voice_mail_index}`;

          //         if (
          //           fs.existsSync(`./${userData.id}/${filename}.wav`) ||
          //           fs.existsSync(`./${userData.id}/${filename}.mp3`)
          //         ) {
          //           if (
          //             customer_number.includes("13072126556") ||
          //             customer_number.includes("12053504113")
          //           ) {
          //             console.time(
          //               "Eleven_Labs_mp3_response_to_wav_file_writting"
          //             );

          //             process.env.operatingSys === "mac"
          //               ? await new Mp32Wav(
          //                   rootPath + "/" + filename + ".mp3",
          //                   rootPath
          //                 ).exec()
          //               : await convertMP3toWav(
          //                   getFilePathMp3(
          //                     userData.id,
          //                     `voice-mail-response-${voice_mail_index}.mp3`
          //                   ),
          //                   getFilePathWav(
          //                     userData.id,
          //                     `voice-mail-response-${voice_mail_index}.wav`
          //                   )
          //                 );

          //             console.timeEnd(
          //               "Eleven_Labs_mp3_response_to_wav_file_writting"
          //             );
          //           }

          //           console.time("Wav_File_to_Buffer");

          //           const wavFile = new WaveFile(
          //             fs.readFileSync(
          //               process.env.operatingSys === "mac"
          //                 ? `./${userData.id}/voice-mail-response-${voice_mail_index}.wav`
          //                 : path.join(
          //                     userData.id,
          //                     `voice-mail-response-${voice_mail_index}.wav`
          //                   )
          //             )
          //           );
          //           wavFile.toSampleRate(16000);
          //           wavFile.toBitDepth("16");
          //           const samples = chunkArray(wavFile.getSamples(), 320);
          //           console.timeEnd("Wav_File_to_Buffer");

          //           const sampleRate = 16000; // The sample rate you've set
          //           const totalSamples = samples.length * 320; // Assuming '320' is the size of each chunk

          //           const durationInSeconds = totalSamples / sampleRate;
          //           let positiveIntegerDuration = durationInSeconds;
          //           positiveIntegerDuration *= 1000;

          //           complete_duration += positiveIntegerDuration;

          //           console.time("Sending_buffer_to_user_voicemail_message");

          //           for (let index = 0; index < samples.length; index++) {
          //             ws.send(Uint16Array.from(samples[index]).buffer);
          //           }
          //           console.timeEnd("Sending_buffer_to_user_voicemail_message");

          //           if (voice_mail_index >= 3) {
          //             setTimeout(() => {
          //               console.log(
          //                 "Call hangup after voicemail message completes."
          //               );
          //               ws.close();
          //               // console.log("\n\n\nInside Settimeout  :  " + complete_duration + "\n\n\n");
          //             }, complete_duration + 25000);
          //           } else {
          //             voice_mail_message_player();
          //           }
          //         }
          //       } catch (err) {
          //         console.log(
          //           "Error in creating the file and sending to the user."
          //         );
          //       }

          //       console.log("\n\nvoice_mail_message_player. End");
          //     } catch (err) {
          //       console.log(
          //         "Error in voicemail message delivery :  " + err + err.message
          //       );
          //     }
          //   };

          //   // setTimeout(() => {
          //   voice_mail_message_player();
          //   // }, 2000);
          // } else {
          //   if (
          //     silence_provider.silence_check &&
          //     beep_detected &&
          //     !voicemail_message_played
          //   ) {
          //     play_voice_mail_silence_count++;
          //     console.log(
          //       "voicemail count  :  " + play_voice_mail_silence_count
          //     );
          //   } else {
          //     if (!voicemail_message_played) {
          //       voicemail_message_any_sound++;
          //       console.log(
          //         "voicemail sound count  :  " + voicemail_message_any_sound
          //       );
          //     }
          //   }
          // }

          if (
            silence_provider.silence_check(newarrbuffer) &&
            !referpdf &&
            is_response_end &&
            can_increase_silence_count
          ) {
            silence.count++;
            // console.log("Silence Count  :  " + silence.count);
            if (!has_any_sound) {
              if (silence.count >= 1000 && !beep_detected) {
                console.log(
                  "Call was hangup because user unresponded and has no any sound."
                );
                ws.close();
              }
            } else {
              if (silence.count >= 2500) {
                // console
                //     .log(
                //     // "\n\n\nIsresponce end  : " +
                //     // is_response_end +
                //     // "\n\n\n Refer PDF  :  " +
                //     // referpdf +
                //     // "\n\n\n"
                // );
                console.log("Call was cut down because user not responded.");
                ws.close();
              }
            }
          } else {
            silence.count = 0;
          }
        } catch (err) {
          console.log("Error in silence detection.");
        }
        // console.log("Count  :  " + count);
        // console.log(referpdf);
        // console.log(canenter + "  " + canrun);

        if (typeof msg === "string") {
          try {
            const data = JSON.parse(msg);
            if (deepgramInstance.getReadyState() == 1) {
              // console.log("Sending data to deepgram");
              deepgramInstance.send(data);
            }
          } catch (err) {}
        } else {
          if (deepgramInstance.getReadyState() == 1) {
            deepgramInstance.send(msg);
          }
        }

        if (can_send_to_open_ai && !referpdf && is_response_end) {
          can_send_to_open_ai = false;
          canrun = false;
          can_listen = false;

          const run_open_ai_elevenlabs = async () => {
            is_response_end = false;
            can_increase_silence_count = false;
            playfillerword = true;
            first_audio_response = true;

            // Call the Whisper API
            try {
              // if(stop_flag){
              //     return;
              // }
              if (has_killed) {
                console.log("Previous Transcript  :  " + prv_transcript);
                speech_text = prv_transcript + ". " + speech2;
                console.log("Speech test inside has killed :  " + speech_text);
              } else {
                speech_text = speech2;
                console.log("\n\n\nSpeech Text  :  " + speech_text + "\n\n\n");
              }
              prv_transcript = speech2;

              has_killed = false;

              // setTimeout(async () => {
              //   console.log("\n\n\n Playing Filler words  : \n\n\n");
              //   // console.log("\n\n\n e_response  :  " + e_response + "\n\n\n");
              //   // if (!e_response && playfillerword) {
              //     // playfillerword = false;
              //     // console.log("Calling filler word player.");
              //     // await filler_word_player.filler_word_player(ws, speech_text, audio_queue);
              //   // }
              // }, 700);

              // setTimeout(() => {
              //   console.log("Calling filler word player.");
              //   filler_word_player.filler_word_player(ws , speech_text , audio_queue);
              // }, 1000);

              try {
                if (check_voicemail_count <= 1) {
                  check_voicemail_count++;
                  // console.log("Checking for IVR.");
                  // console.log("Checking for IVR Complete.");
                }
              } catch (err) {
                console.log("Error in check Mail  :  " + err);
              }

              chathistory = chathistory + `user: ${speech_text} \n`;
              // await collection.updateOne(
              //     { _id: new ObjectId(id) },
              //     { $set: { chat: chathistory } }
              // );
              // mongo.update_chat(userData, database_user_id, chathistory);
              // fs.appendFileSync(
              //   `chat-${userData.Name}-${userData.Number}`,
              //   `user: ${speech_text} \n`
              // );
              // console.time("Unlink_output.wav_file");
              // fs.unlinkSync("./output.wav");
              // console.timeEnd("Unlink_output.wav_file");

              if (
                speech_text !== "undefined" &&
                speech_text !== "" &&
                speech_text !== "you" &&
                speech_text !== "you " &&
                speech_text !== " you" &&
                speech_text !== " You" &&
                speech_text !== "You " &&
                speech_text !== "You" &&
                speech_text !== "You." &&
                speech_text !== undefined &&
                speech_text !== "You gotta do a " &&
                speech_text
              ) {
                try {
                  complete_duration = 0;
                  console.time("Openai_response");

                  // console.log("Chat history before sending to openai  :  " + chathistory);

                  let response = await openai_call.initialcall(
                    userData,
                    chathistory,
                    speech_text
                  );
                  hasaudio = 0;
                  is_response_end = true;
                  console.timeEnd("Openai_response");
                  let cont = "";
                  let chatt = "";
                  filenumber = 0;
                  // const folderPath = "./${userData.id}";
                  let processing = false;
                  const requestQueue = [];

                  // console.time("Deleting_all_files");

                  // fs.readdir(folderPath, (err, files) => {
                  //     if (err) {
                  //         console.error('Error reading folder:', err);
                  //         return;
                  //     }

                  //     files.forEach(file => {
                  //         const filePath = path.join(folderPath, file);

                  //         fs.unlink(filePath, err => {
                  //             if (err) {
                  //                 console.error('Error deleting file:', err);
                  //             }
                  //         });
                  //     });
                  // });
                  // console.timeEnd("Deleting_all_files");

                  const elevenlab_api = async (textt) => {
                    try {
                      if (hasaudio >= 3) {
                        console.log(
                          "Has audio is greater than 3  :  " + hasaudio
                        );
                        has_killed = true;
                        return;
                      }

                      canenter = false;

                      let newtextt2 = textt.replace("Assistant:", "");
                      let newtextt = newtextt2.replace("assistant:", "");

                      // Set options for the API request.
                      const elevenlabs_options = {
                        method: "POST",
                        url: `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}?optimize_streaming_latency=4`,
                        headers: {
                          accept: "audio/mpeg", // Set the expected response type to audio/mpeg.
                          "content-type": "application/json", // Set the content type to application/json.
                          "xi-api-key": process.env.ELEVENLABS_API_KEY, // Set the API key in the headers.
                        },
                        data: {
                          text: newtextt, // Pass in the inputText as the text to be converted to speech.
                          model_id: "eleven_monolingual_v1",
                          // voice_settings: {
                          //     stability: 1,
                          //     similarity_boost: 1,
                          //     style: 1,
                          //     use_speaker_boost: true
                          // }
                        },
                        responseType: "arraybuffer", // Set the responseType to arraybuffer to receive binary data as response.
                      };

                      const elevenlabs_options_trubo = {
                        method: "POST",
                        url: `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}?optimize_streaming_latency=4`,
                        headers: {
                          accept: "audio/mpeg", // Set the expected response type to audio/mpeg.
                          "content-type": "application/json", // Set the content type to application/json.
                          "xi-api-key": process.env.ELEVENLABS_API_KEY, // Set the API key in the headers.
                        },
                        data: {
                          text: newtextt, // Pass in the inputText as the text to be converted to speech.
                          model_id: "eleven_turbo_v2",
                          // voice_settings: {
                          //     stability: 1,
                          //     similarity_boost: 1,
                          //     style: 1,
                          //     use_speaker_boost: true
                          // }
                        },
                        responseType: "arraybuffer", // Set the responseType to arraybuffer to receive binary data as response.
                      };

                      const rime_options = {
                        method: "POST",
                        // url: `https://api.rime.ai/functions/v1/rime-tts`,
                        url: `http://rime-tts-mid-600de2bc2208321e.elb.us-west-1.amazonaws.com/rime-tts`,
                        headers: {
                          Authorization: process.env.RIME_API_KEY,
                          "Content-Type": "application/json",
                        },
                        data: {
                          text: newtextt, // Pass in the inputText as the text to be converted to speech.
                          speaker:
                            customer_number.includes("13072126556") ||
                            customer_number.includes("12053504113")
                              ? `sofia`
                              : "daphne",
                          // 'speaker': 'rose',
                          // 'audioFormat': 'mp3',  // default value is 'wav'
                          samplingRate: 16000, // Latency is increase to 3 sec on 16000
                          speedAlpha: 1.6,
                        },
                      };

                      let tts_options;

                      if (customer_number.includes("13072126556")) {
                        console.log("\n\n\nEleven Labs Options");
                        tts_options = elevenlabs_options;
                      } else if (customer_number.includes("12053504113")) {
                        console.log("\n\n\nElevenlabs Turbo Options.");
                        tts_options = elevenlabs_options_trubo;
                      } else {
                        console.log("\n\n\nRimeOptions");
                        tts_options = rime_options;
                      }

                      console.log(
                        "\n\n\ntts_options outside if else ladder  :  " +
                          JSON.stringify(tts_options)
                      );

                      // Send the API request using Axios and wait for the response.
                      console.time("Eleven_Labs_API");
                      const speechDetails = await axios.request(tts_options);
                      console.timeEnd("Eleven_Labs_API");
                      canrun = false;

                      try {
                        if (
                          customer_number.includes("13072126556") ||
                          customer_number.includes("12053504113")
                        ) {
                          if (
                            process.env.operatingSys === "mac"
                              ? fs.existsSync(
                                  `./${userData.id}/response-${filenumber}.mp3`
                                )
                              : fs.existsSync(
                                  path.join(
                                    userData.id,
                                    `response-${filenumber}.mp3`
                                  )
                                )
                          ) {
                            filenumber += 1;
                          }
                        } else {
                          if (
                            process.env.operatingSys === "mac"
                              ? fs.existsSync(
                                  `./${userData.id}/response-${filenumber}.wav`
                                )
                              : fs.existsSync(
                                  path.join(
                                    userData.id,
                                    `response-${filenumber}.wav`
                                  )
                                )
                          ) {
                            filenumber += 1;
                          }
                        }

                        if (
                          customer_number.includes("13072126556") ||
                          customer_number.includes("12053504113")
                        ) {
                          console.time("Writting_Eleven_Labs_to_mp3_file");
                          const filePath2 =
                            process.env.operatingSys === "mac"
                              ? `./${userData.id}/response-${filenumber}.mp3`
                              : path.join(
                                  userData.id,
                                  `response-${filenumber}.mp3`
                                );
                          fs.writeFileSync(
                            filePath2,
                            speechDetails.data,
                            "binary"
                          );
                          console.timeEnd("Writting_Eleven_Labs_to_mp3_file");
                        } else {
                          console.time("Writting_Eleven_Labs_to_wav_file");
                          const filePath2 =
                            process.env.operatingSys === "mac"
                              ? `./${userData.id}/response-${filenumber}.wav`
                              : path.join(
                                  userData.id,
                                  `response-${filenumber}.wav`
                                );
                          fs.writeFileSync(
                            filePath2,
                            speechDetails.data.audioContent,
                            "base64"
                          );
                          console.timeEnd("Writting_Eleven_Labs_to_wav_file");
                        }

                        const rootPath = path.resolve(`./${userData.id}`);
                        let filename = `response-${filenumber}`;

                        if (
                          fs.existsSync(`./${userData.id}/${filename}.wav`) ||
                          fs.existsSync(`./${userData.id}/${filename}.mp3`)
                        ) {
                          if (
                            customer_number.includes("13072126556") ||
                            customer_number.includes("12053504113")
                          ) {
                            console.time(
                              "Eleven_Labs_mp3_response_to_wav_file_writting"
                            );

                            process.env.operatingSys === "mac"
                              ? await new Mp32Wav(
                                  rootPath + "/" + filename + ".mp3",
                                  rootPath
                                ).exec()
                              : await convertMP3toWav(
                                  getFilePathMp3(
                                    userData.id,
                                    `response-${filenumber}.mp3`
                                  ),
                                  getFilePathWav(
                                    userData.id,
                                    `response-${filenumber}.wav`
                                  )
                                );

                            console.timeEnd(
                              "Eleven_Labs_mp3_response_to_wav_file_writting"
                            );
                          }

                          console.time("Wav_File_to_Buffer");

                          const wavFile = new WaveFile(
                            fs.readFileSync(
                              process.env.operatingSys === "mac"
                                ? `./${userData.id}/response-${filenumber}.wav`
                                : path.join(
                                    userData.id,
                                    `response-${filenumber}.wav`
                                  )
                            )
                          );
                          wavFile.toSampleRate(16000);
                          wavFile.toBitDepth("16");
                          const samples = chunkArray(wavFile.getSamples(), 320);
                          console.timeEnd("Wav_File_to_Buffer");

                          const sampleRate = 16000; // The sample rate you've set
                          const totalSamples = samples.length * 320; // Assuming '320' is the size of each chunk

                          const durationInSeconds = totalSamples / sampleRate;
                          let positiveIntegerDuration = durationInSeconds;
                          positiveIntegerDuration *= 1000;

                          complete_duration += positiveIntegerDuration;

                          console.time("Sending_buffer_to_user");

                          if (hasaudio <= 3) {
                            for (
                              let index = 0;
                              index < samples.length;
                              index++
                            ) {
                              if (hasaudio <= 3 && !beep_detected) {
                                // if(first_audio_response){
                                //   first_audio_response = false;
                                //   is_response_end = true;
                                // }
                                canrun = false;
                                playing = true;
                                audio_queue.playingg = true;
                                can_increase_silence_count = false;
                                ws.send(
                                  Uint16Array.from(samples[index]).buffer
                                );
                              } else {
                                canenter = true;
                                canrun = true;
                                // requestQueue = [];
                                has_killed = true;
                              }
                            }
                            if (hasaudio > 3) {
                              canenter = true;
                              canrun = true;
                              has_killed = true;
                            }
                          } else {
                            has_killed = true;
                          }

                          console.timeEnd("Sending_buffer_to_user");
                          // console.log("_");
                          // console.log("_");
                          // console.log("_");

                          setTimeout(() => {
                            canrun = true;
                            playing = false;
                            audio_queue.playingg = false;
                            canenter = true;
                          }, positiveIntegerDuration);

                          setTimeout(() => {
                            if (
                              newtextt.includes("Goodbye") ||
                              newtextt.includes("Good bye") ||
                              newtextt.includes("Have a nice day") ||
                              newtextt.includes("bye bye") ||
                              newtextt.includes("Have a great day") ||
                              newtextt.includes("have a great day") ||
                              newtextt.includes("goodbye")
                            ) {
                              console.log("Call hangup because of Goodbye.");
                              ws.close();
                            }
                            // console.log("\n\n\nInside Settimeout  :  " + complete_duration + "\n\n\n");
                          }, complete_duration);

                          if (!referpdf) {
                            setTimeout(() => {
                              can_increase_silence_count = true;
                              count = 0;
                              console.log(
                                "Complete Duration for count  :  " +
                                  complete_duration
                              );
                            }, complete_duration + 10000);
                          }
                        }
                      } catch (err) {
                        console.log(
                          "Error in creating the file and sending to the user."
                        );
                      }

                      return speechDetails;
                    } catch (err) {
                      is_response_end = true;
                      can_send_to_open_ai = false;
                      referpdf = false;
                      console.log(
                        "Error in Eleven Labs/ Sending buffer  :  " +
                          err +
                          err.message
                      );
                    }
                  };

                  const processRequestQueue = async () => {
                    while (requestQueue.length > 0) {
                      const request = requestQueue.shift();
                      try {
                        let e_response;

                        if (hasaudio <= 3) {
                          // setTimeout(async() => {
                          //   console.log("\n\n\n e_response  :  " + e_response +"\n\n\n");
                          //   if (!e_response  && playfillerword) {
                          //     playfillerword = false;
                          //     console.log("Calling filler word player.");
                          //     await filler_word_player.filler_word_player(ws, speech_text, audio_queue);
                          //   }
                          // }, 2000);

                          e_response = await elevenlab_api(
                            request.contt,
                            request.filenumber
                          );
                        }

                        if (hasaudio > 3) {
                          canenter = true;
                          canrun = true;
                        }
                        // Continue processing the response or performing other actions

                        // console.log("Elevenlabs Status  :  " + r.message);

                        // requestCompleted = true;

                        // Set processing to false to indicate completion of this request
                        processing = false;

                        // console.log("\n\n\nHasaudio :: " + hasaudio + "\n\n\n");

                        // Process the next request in the queue
                        if (requestQueue.length > 0 && hasaudio <= 3) {
                          processing = true;
                          canrun = false;
                          playing = true;
                          audio_queue.playingg = true;
                          canenter = false;
                          if (hasaudio <= 3) {
                            await processRequestQueue();
                          }
                        }
                      } catch (error) {
                        is_response_end = true;
                        can_send_to_open_ai = false;
                        referpdf = false;
                        processing = false;
                        canrun = true;
                        hasaudio = 0;
                        count = 0;
                        canenter = true;
                        playing = true;
                        audio_queue.playingg = true;
                        rawarray = [];
                        console.error(
                          "Error in Eeven labs api in request queue  : ",
                          error
                        );
                      }
                    }
                  };

                  let is_done_found = false;

                  try {
                    for await (const chunk of response) {
                      // response.data.on("data", async (chunk) => {
                      // Send each chunk individually
                      // const payloads = chunk.toString().split("\n\n");

                      // console.log("payloads: ", payloads);
                      // if (payload.includes("[DONE]")) {
                      //   continue;
                      // }

                      // if (!payload.startsWith("data:")) {
                      //   continue;
                      // }
                      // // remove 'data: ' and parse the corresponding object
                      // const data = JSON.parse(payload.replace("data: ", ""));

                      // const content = data.choices[0].delta?.content;

                      // console.log("_");
                      // console.log("_");
                      // console.log("_");
                      // console.log("Content   :   " + content);

                      let content = chunk.choices[0]?.delta?.content;

                      if (content) {
                        // console.log(content);
                        if (
                          content.includes(".") ||
                          content.includes("?") ||
                          content.includes("!")
                        ) {
                          cont += content;
                          chatt += content;
                          let contt = cont;
                          cont = "";
                          console.log(contt);

                          try {
                            if (
                              contt.includes(
                                "Let me check the details and revert."
                              ) ||
                              contt.includes(
                                "let me check the details and revert"
                              ) ||
                              contt.includes("check the details and revert") ||
                              contt.includes("let me check the details") ||
                              contt.includes("let me check")
                            ) {
                              let_me_check = true;

                              requestQueue.push({ contt, filenumber });
                              audio_queue.queue.push({ contt, filenumber });
                              // Process the queue if not already processing
                              if (!processing) {
                                processing = true;
                                try {
                                  await processRequestQueue();
                                } catch (err) {
                                  is_response_end = true;
                                  can_send_to_open_ai = false;
                                  referpdf = false;
                                  console.log(
                                    "Error in Process queue  :  " + err.message
                                  );
                                }
                              }

                              // canenter = false;
                              // canrun = false;
                              // referpdf = true;
                              // can_listen = false;
                              // if (userData.plan_url) {
                              //   count = 0;
                              //   console.log("Yes String has been obtained");

                              //   requestQueue.push({ contt, filenumber });
                              //   audio_queue.queue.push({ contt, filenumber });
                              //   // Process the queue if not already processing
                              //   if (!processing) {
                              //     processing = true;
                              //     try {
                              //       await processRequestQueue();
                              //     } catch (err) {
                              //       is_response_end = true;
                              //       can_send_to_open_ai = true;
                              //       referpdf = false;
                              //       console.log(
                              //         "Error in Process queue  :  " +
                              //           err.message
                              //       );
                              //     }
                              //   }

                              //   let chattt = "";

                              //   try {
                              //     console.time("Openai_response");

                              //     // console.log("Chat history before sending to openai  :  " + chathistory);

                              //     const qresponse =
                              //       await openai_call.rephrase_question(
                              //         speech_text,
                              //         chathistory
                              //       );
                              //     console.timeEnd("Openai_response");

                              //     let search_q =
                              //       qresponse.data.choices[0].message.content;
                              //     let newsearch_q = search_q.replace(
                              //       "Search Query:",
                              //       ""
                              //     );

                              //     const question = newsearch_q;
                              //     console.log("Question  :  " + question);

                              //     if (!uploaded.status && userData.plan_url) {
                              //       try {
                              //         console.time("Upload_document");
                              //         await read_upload.read_upload(
                              //           userData,
                              //           uploaded
                              //         );
                              //         console.timeEnd("Upload_document");
                              //       } catch (err) {
                              //         console.log(
                              //           "Error in uploading  :  " + err
                              //         );
                              //       }
                              //     }

                              //     try {
                              //       console.time("Fetch_doc");
                              //       fetch_text = await fetch_para.fetch(
                              //         question,
                              //         userData
                              //       );
                              //       console.timeEnd("Fetch_doc");
                              //     } catch (err) {
                              //       console.log(
                              //         "Error in langchain implementation."
                              //       );
                              //     }

                              //     console.time("PDF_First");
                              //     const final_response =
                              //       await openai_call.pdf_answer3(
                              //         question,
                              //         fetch_text
                              //       );
                              //     const final_responsee =
                              //       final_response.data.choices[0].message
                              //         .content;
                              //     console.timeEnd("PDF_First");

                              //     // console.log("Call open AI for final answer.");

                              //     console.time("Final_Pdf");

                              //     const newresponse =
                              //       await openai_call.final_pdf_answer(
                              //         question,
                              //         final_responsee
                              //       );

                              //     console.timeEnd("Final_Pdf");
                              //     // console.log("Called open AI for final answer.");

                              //     let cont = "";

                              //     // fs.unlinkSync("./output.txt");

                              //     cont = "";

                              //     try {
                              //       // newresponse.data.on(
                              //       //   "data",
                              //       //   async (chunk) => {
                              //       //     // Send each chunk individually
                              //       //     const decoder = new TextDecoder(
                              //       //       "utf-8"
                              //       //     );
                              //       //     const decodedchunk =
                              //       //       decoder.decode(chunk);
                              //       //     const line = decodedchunk.split("\n");
                              //       //     const parsedlines = line
                              //       //       .map((line) =>
                              //       //         line.replace(/^data: /, "").trim()
                              //       //       )
                              //       //       .filter(
                              //       //         (line) =>
                              //       //           line !== "" && line !== "[DONE]"
                              //       //       )
                              //       //       .map((line) => JSON.parse(line));

                              //       for await (const chunk of newresponse) {
                              //         let content =
                              //           chunk.choices[0]?.delta?.content;
                              //         if (content) {
                              //           // console.log(content);
                              //           if (
                              //             content.includes(".") ||
                              //             content.includes("?") ||
                              //             content.includes("!") ||
                              //             cont.split(" ").length >= 15
                              //             // content.includes(",")
                              //           ) {
                              //             // console.timeEnd("Openai_response_text_decoding");
                              //             cont += content;
                              //             chattt += content;
                              //             let contt = cont;
                              //             console.log(contt);
                              //             // console.log("Text which is to be sent to Rime for speech (inside if(content))   :  " + contt);
                              //             cont = "";
                              //             try {
                              //               if (hasaudio > 3) {
                              //                 canenter = true;
                              //                 canrun = true;
                              //               }
                              //               if (hasaudio <= 3) {
                              //                 requestQueue.push({
                              //                   contt,
                              //                   filenumber,
                              //                 });
                              //                 audio_queue.queue.push(
                              //                   contt,
                              //                   filenumber
                              //                 );
                              //               }
                              //               // Process the queue if not already processing
                              //               if (!processing) {
                              //                 processing = true;
                              //                 try {
                              //                   await processRequestQueue();
                              //                 } catch (err) {
                              //                   is_response_end = true;
                              //                   can_send_to_open_ai = true;
                              //                   referpdf = false;
                              //                   console.log(
                              //                     "Error in Process queue  :  " +
                              //                       err.message
                              //                   );
                              //                 }
                              //               }
                              //             } catch (err) {
                              //               is_response_end = true;
                              //               can_send_to_open_ai = true;
                              //               referpdf = false;
                              //               hasaudio = 0;
                              //               rawarray = [];
                              //               count = 0;
                              //               canrun = true;
                              //               canenter = true;
                              //               console.log(
                              //                 "Error in elevenlabs api  :  " +
                              //                   err.message
                              //               );
                              //             }
                              //           } else {
                              //             cont += content;
                              //             chattt += content;
                              //           }
                              //         }
                              //       }
                              //     } catch (err) {
                              //       console.log("Error OPENAI." + err.message);
                              //       is_response_end = true;
                              //       can_send_to_open_ai = true;
                              //       referpdf = false;
                              //     }
                              //     const chatCompletion =
                              //       await newresponse.finalChatCompletion();
                              //     if (
                              //       chatCompletion.choices[0].finish_reason ==
                              //       "stop"
                              //     ) {
                              //       console.log("Response is stoped.");
                              //       // End the response stream
                              //       let withoutassistant_chat = chattt.replace(
                              //         "assistant:",
                              //         ""
                              //       );
                              //       chathistory =
                              //         chathistory +
                              //         `assistant: ${withoutassistant_chat}\n`;
                              //       chattt = "";
                              //       referpdf = false;
                              //       can_listen = true;
                              //     }
                              //   } catch (err) {
                              //     is_response_end = true;
                              //     can_send_to_open_ai = false;
                              //     referpdf = false;
                              //     hasaudio = 0;
                              //     rawarray = [];
                              //     count = 0;
                              //     canrun = true;
                              //     console.log(
                              //       "Chat api not working  :  " + err.message
                              //     );
                              //   }
                              // } else {
                              //   if (hasaudio <= 3) {
                              //     requestQueue.push({ cc, filenumber });
                              //     audio_queue.queue.push(cc, filenumber);
                              //   }

                              //   chathistory =
                              //     chathistory +
                              //     `assistant: I apologize. At the moment, I do not have access to your individual healthcare plan document. I won't be able to answer this specific question. Do you have any other questions for me?\n`;

                              //   referpdf = false;
                              // }
                            } else {
                              if (hasaudio <= 3) {
                                requestQueue.push({ contt, filenumber });
                                audio_queue.queue.push(contt, filenumber);
                              }
                              // Process the queue if not already processing
                              if (!processing) {
                                processing = true;
                                try {
                                  await processRequestQueue();
                                } catch (err) {
                                  is_response_end = true;
                                  can_send_to_open_ai = false;
                                  referpdf = false;
                                  console.log(
                                    "Error in Process queue  :  " + err.message
                                  );
                                }
                              }
                            }
                          } catch (err) {
                            is_response_end = true;
                            can_send_to_open_ai = false;
                            referpdf = false;
                            hasaudio = 0;
                            rawarray = [];
                            count = 0;
                            canrun = true;
                            console.log(
                              "Error in elevenlabs api  :  " + err.message
                            );
                          }
                        } else {
                          cont += content;
                          chatt += content;
                        }
                      }
                    }
                    // });
                  } catch (err) {
                    is_response_end = true;
                    is_response_end = true;
                    can_send_to_open_ai = false;
                    referpdf = false;
                    console.log("Error OPENAI." + err.message);
                  }

                  const chatCompletion = await response.finalChatCompletion();
                  if (chatCompletion.choices[0].finish_reason == "stop") {
                    console.log("Response is stoped.");
                    let withoutassistant_chat = chatt.replace("assistant:", "");

                    chathistory =
                      chathistory + `assistant: ${withoutassistant_chat}\n`;
                    can_listen = true;
                    // is_response_end = true;
                    // can_send_to_open_ai = true;

                    if (let_me_check) {
                      let_me_check = false;
                      canenter = false;
                      canrun = false;
                      referpdf = true;
                      can_listen = false;
                      if (userData.plan_url) {
                        count = 0;
                        console.log("Yes String has been obtained");

                        let chattt = "";

                        try {
                          console.time("Openai_response");

                          // console.log("Chat history before sending to openai  :  " + chathistory);

                          // Rephrasing the question asked by the user

                          const qresponse = await openai_call.rephrase_question(
                            speech_text,
                            chathistory
                          );
                          console.timeEnd("Openai_response");

                          let search_q =
                            qresponse.data.choices[0].message.content;
                          let newsearch_q = search_q.replace(
                            "Search Query:",
                            ""
                          );

                          const question = newsearch_q;
                          console.log("Question  :  " + question);

                          // Reading and Embedding the pdf text

                          if (!uploaded.status && userData.plan_url) {
                            try {
                              console.time("Upload_document");
                              await read_upload.read_upload(userData, uploaded);
                              console.timeEnd("Upload_document");
                            } catch (err) {
                              console.log("Error in uploading  :  " + err);
                            }
                          }

                          try {
                            console.time("Fetch_doc");
                            fetch_text = await fetch_para.fetch(
                              question,
                              userData
                            );
                            console.timeEnd("Fetch_doc");
                          } catch (err) {
                            console.log("Error in langchain implementation.");
                          }

                          console.time("PDF_First");
                          const final_response = await openai_call.pdf_answer3(
                            question,
                            fetch_text
                          );
                          const final_responsee =
                            final_response.data.choices[0].message.content;
                          console.timeEnd("PDF_First");

                          // console.log("Call open AI for final answer.");

                          console.time("Final_Pdf");

                          const newresponse =
                            await openai_call.final_pdf_answer(
                              question,
                              final_responsee
                            );

                          console.timeEnd("Final_Pdf");
                          // console.log("Called open AI for final answer.");

                          let cont = "";

                          // fs.unlinkSync("./output.txt");

                          cont = "";

                          try {
                            // newresponse.data.on(
                            //   "data",
                            //   async (chunk) => {
                            //     // Send each chunk individually
                            //     const decoder = new TextDecoder(
                            //       "utf-8"
                            //     );
                            //     const decodedchunk =
                            //       decoder.decode(chunk);
                            //     const line = decodedchunk.split("\n");
                            //     const parsedlines = line
                            //       .map((line) =>
                            //         line.replace(/^data: /, "").trim()
                            //       )
                            //       .filter(
                            //         (line) =>
                            //           line !== "" && line !== "[DONE]"
                            //       )
                            //       .map((line) => JSON.parse(line));

                            for await (const chunk of newresponse) {
                              let content = chunk.choices[0]?.delta?.content;
                              if (content) {
                                // console.log(content);
                                if (
                                  content.includes(".") ||
                                  content.includes("?") ||
                                  content.includes("!")
                                  // cont.split(" ").length >= 15
                                  // content.includes(",")
                                ) {
                                  // console.timeEnd("Openai_response_text_decoding");
                                  cont += content;
                                  chattt += content;
                                  let contt = cont;
                                  console.log(contt);
                                  // console.log("Text which is to be sent to Rime for speech (inside if(content))   :  " + contt);
                                  cont = "";
                                  try {
                                    if (hasaudio > 3) {
                                      canenter = true;
                                      canrun = true;
                                    }
                                    if (hasaudio <= 3) {
                                      requestQueue.push({
                                        contt,
                                        filenumber,
                                      });
                                      audio_queue.queue.push(contt, filenumber);
                                    }
                                    // Process the queue if not already processing
                                    if (!processing) {
                                      processing = true;
                                      try {
                                        await processRequestQueue();
                                      } catch (err) {
                                        is_response_end = true;
                                        can_send_to_open_ai = false;
                                        referpdf = false;
                                        console.log(
                                          "Error in Process queue  :  " +
                                            err.message
                                        );
                                      }
                                    }
                                  } catch (err) {
                                    is_response_end = true;
                                    can_send_to_open_ai = false;
                                    referpdf = false;
                                    hasaudio = 0;
                                    rawarray = [];
                                    count = 0;
                                    canrun = true;
                                    canenter = true;
                                    console.log(
                                      "Error in elevenlabs api  :  " +
                                        err.message
                                    );
                                  }
                                } else {
                                  cont += content;
                                  chattt += content;
                                }
                              }
                            }
                          } catch (err) {
                            console.log("Error OPENAI." + err.message);
                            is_response_end = true;
                            can_send_to_open_ai = false;
                            referpdf = false;
                          }
                          const chatCompletion =
                            await newresponse.finalChatCompletion();
                          if (
                            chatCompletion.choices[0].finish_reason == "stop"
                          ) {
                            console.log("Response is stoped.");
                            // End the response stream
                            let withoutassistant_chat = chattt.replace(
                              "assistant:",
                              ""
                            );
                            chathistory =
                              chathistory +
                              `assistant: ${withoutassistant_chat}\n`;
                            chattt = "";
                            referpdf = false;
                            can_listen = true;
                          }
                        } catch (err) {
                          is_response_end = true;
                          can_send_to_open_ai = false;
                          referpdf = false;
                          hasaudio = 0;
                          rawarray = [];
                          count = 0;
                          canrun = true;
                          console.log(
                            "Chat api not working  :  " + err.message
                          );
                        }
                      } else {
                        if (hasaudio <= 3) {
                          requestQueue.push({ cc, filenumber });
                          audio_queue.queue.push(cc, filenumber);
                        }

                        chathistory =
                          chathistory +
                          `assistant: I apologize. At the moment, I do not have access to your individual healthcare plan document. I won't be able to answer this specific question. Do you have any other questions for me?\n`;

                        referpdf = false;
                      }
                    }
                  }

                  // response.on("end", () => {
                  // End the response stream

                  // let withoutassistant_chat = chatt.replace("assistant:", "");

                  // chathistory =
                  //   chathistory + `assistant: ${withoutassistant_chat}\n`;
                  // can_listen = true;
                  // // is_response_end = true;
                  // // can_send_to_open_ai = true;

                  // if (customer_number === "13072126556") {
                  //   try {
                  //     openai_call.meeting_booking(userData, chatt);
                  //   } catch (err) {
                  //     console.log("Error in metting booking  :  " + err);
                  //   }
                  // }

                  // if (customer_number === "12053504113") {
                  //   try {
                  //     openai_call.meeting_booking(userData, chatt);
                  //   } catch (err) {
                  //     console.log("Error in metting booking  :  " + err);
                  //   }
                  // }
                  // });
                } catch (err) {
                  is_response_end = true;
                  can_send_to_open_ai = false;
                  referpdf = false;
                  hasaudio = 0;
                  rawarray = [];
                  count = 0;
                  canrun = true;
                  console.log("Chat api not working  :  " + err.message);
                }
              }
              // else {
              //     count = 0;
              //     hasaudio = 0;
              //     rawarray = [];
              //     console.log("Please speak again.");
              //     canrun = true;
              //     can_listen = true;
              // }
              // rawarray = [];
              // count = 0;
            } catch (error) {
              is_response_end = true;
              can_send_to_open_ai = false;
              referpdf = false;
              console.error(
                "Error calling Whisper API:",
                error + error.message
              );
              can_listen = true;
              referpdf = false;
              hasaudio = 0;
              rawarray = [];
            }
          };
          run_open_ai_elevenlabs();
        }
        // if (canenter) {
        if (can_listen && !referpdf) {
          count++;
        }
      } catch (err) {
        console.log("Websocket onmessage is not working  :  " + err.message);
      }
    });

    ws.on("close", async () => {
      console.log("Complete Chat  :  " + chathistory);
      await mongo.update_chat(userData, database_user_id, chathistory, callId);
      chathistory = "";
      console.log("Websocket Closed");
      console.log("Call Ended.");
      clearTimeout(sendBufferTimeout);

      if (
        calltype.type !== "" &&
        typeof calltype.type === "string" &&
        calltype.type &&
        calltype.type !== null &&
        calltype.type !== undefined
      ) {
        if (calltype.type.includes("IVR")) {
          const call_end_time = new Date();
          const complete_time =
            Math.abs(call_end_time.getTime() - call_start_time.getTime()) /
            1000;
          call_timing.ivr_time = complete_time;
          console.log(
            "\n\n\nCall Time  'IVR' :  " +
              call_timing.ivr_time +
              " second\n\n\n"
          );

          await mongo.save_call_timing(
            userData,
            "IVR",
            complete_time,
            callId,
            req.params.campaignId,
            req.params.id
          );
          const messageData = JSON.stringify({
            id: userData.id,
            response: "IVR",
            time: complete_time,
            type: "timing",
          });
          sendWebSocketMessage(req.params.campaignId, messageData);
        }

        if (calltype.type.includes("Voicemail")) {
          const call_end_time = new Date();
          const complete_time =
            Math.abs(call_end_time.getTime() - call_start_time.getTime()) /
            1000;
          call_timing.voice_mail_time = complete_time;
          console.log(
            "\n\n\nCall Time  'Voicemail' :  " +
              call_timing.voice_mail_time +
              " second\n\n\n"
          );
          await mongo.save_call_timing(
            userData,
            "Voicemail",
            complete_time,
            callId,
            req.params.campaignId,
            req.params.id
          );

          const messageData = JSON.stringify({
            id: userData.id,
            response: "Voicemail",
            time: complete_time,
            type: "timing",
          });
          sendWebSocketMessage(req.params.campaignId, messageData);
        }

        if (calltype.type.includes("Human")) {
          const call_end_time = new Date();
          const complete_time =
            Math.abs(call_end_time.getTime() - call_start_time.getTime()) /
            1000;
          call_timing.human_time = complete_time;
          console.log(
            "\n\n\nCall Time  'Human' :  " +
              call_timing.human_time +
              " second\n\n\n"
          );
          await mongo.save_call_timing(
            userData,
            "Human",
            complete_time,
            callId,
            req.params.campaignId,
            req.params.id
          );
          const messageData = JSON.stringify({
            id: userData.id,
            response: "Human",
            time: complete_time,
            type: "timing",
          });
          sendWebSocketMessage(req.params.campaignId, messageData);
        }
      } else {
        const call_end_time = new Date();
        const complete_time =
          Math.abs(call_end_time.getTime() - call_start_time.getTime()) / 1000;

        console.log(
          "Complete call time of unresponded call  :  " + complete_time
        );

        await mongo.save_call_timing(
          userData,
          "Unresponded",
          complete_time,
          callId,
          req.params.campaignId,
          req.params.id
        );

        const messageData = JSON.stringify({
          id: userData.id,
          response: "Unresponded",
          time: complete_time,
          type: "timing",
        });

        sendWebSocketMessage(req.params.campaignId, messageData);
      }

      const folderPath =
        process.env.operatingSys === "mac"
          ? `./${userData.id}`
          : path.join(userData.id);

      if (fs.existsSync(folderPath)) {
        fs.rm(folderPath, { recursive: true }, (err) => {
          if (err) {
            console.error("Error deleting directory:", err);
          } else {
            console.log("Directory deleted successfully.");
          }
        });
      } else {
        console.log("Directory does not exist.");
      }
    });
  } catch (err) {
    console.log("Unable to process real time stream : " + err.message);
  }
};

const getIncomingCallData = async (callId) => {
  try {
    const callData = await IncomingCall.findById(callId);
    return callData;
  } catch (error) {
    console.error(error);
  }
};

const handleIncomingRealTimeStream = async (ws, req, res) => {};

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
let ringing = 0;

const makeOutboundCall = async (userDetails, campaignId, number, email) => {
  console.log("Making the outbound call...");
  let timeslots;
  try {
    console.time("Timeslots");
    timeslots = await metting_timeslots.listEvents(
      "UTC+05:30",
      "UTC+05:30",
      email
    );
    console.timeEnd("Timeslots");
  } catch (err) {
    console.log("Error in fatching timeslots. " + err);
  }
  // const formate = require("./providers/data_formate_provider");
  // console.log(formate.formatDate(timeslots[0]));
  // console.log(formate.formatDate(timeslots[1]));
  // console.log(formate.formatDate(timeslots[2]));
  // console.log(formate.formatDate(timeslots[3]));
  console.log("calling from number", number);
  const messageData = JSON.stringify({
    status: false,
    type: "makeCallsBtn",
  });
  sendWebSocketMessage(campaignId, messageData);
  let camp = await CampaignSave.findById(campaignId);

  if (camp.callsPause) {
    userDetails.splice(0, camp.callsMade);
  }
  camp.callBtn = false;
  camp.callsPause = false;
  camp.pauseBtn = true;
  await camp.save();
  const messageData2 = JSON.stringify({
    status: true,
    type: "pauseCallsBtn",
  });
  sendWebSocketMessage(campaignId, messageData2);
  for (let record of userDetails) {
    const callData = await CallTime.create({ id: record.id });
    let camp = await CampaignSave.findById(campaignId);
    if (camp.callsPause === true) {
      const messageData = JSON.stringify({
        status: false,
        type: "pauseCallsBtn",
      });
      sendWebSocketMessage(campaignId, messageData);
      const messageData2 = JSON.stringify({
        status: true,
        type: "makeCallsBtn",
      });
      sendWebSocketMessage(campaignId, messageData2);
      return;
    }
    camp.callsMade += 1;
    await camp.save();
    const response = await vonage.voice.createOutboundCall({
      to: [
        {
          type: "phone",
          number: record.Number,
        },
      ],
      from: {
        type: "phone",
        number: number,
      },
      record: true,
      answer_url: [
        `https://${process.env.HOSTNAME}/vonage/voice/answer/${record.id}/${campaignId}/${callData._id}/${number}/${timeslots}`,
      ],
      event_url: [
        `https://${process.env.HOSTNAME}/vonage/voice/events/${record.id}/${campaignId}/${callData._id}/${number}/${timeslots}`,
      ],
      // event_method: "POST",
      // advanced_machine_detection: {
      //   behavior: "continue",
      //   mode: "detect_beep",
      //   beep_timeout: 120,
      // },
      // length_timer: 7200,
      // ringing_timer: 60,
    });

    console.log("Response : ", response);
    let callStatus;
    ringing = 0;
    while (
      callStatus !== "completed" &&
      callStatus !== "failed" &&
      callStatus !== "busy" &&
      callStatus !== "cancelled" &&
      callStatus !== "rejected" &&
      callStatus !== "timeout" &&
      ringing < 15
    ) {
      try {
        const res = await vonage.voice.getCall(response.uuid);
        console.log("\n", `${record.Name}-`, res.status, "\n");
        callStatus = res.status;
        if (callStatus === "ringing") {
          ringing += 1;
        }
        await sleep(4000);
      } catch (error) {
        console.log(error);
      }
    }
  }
  camp.callsMade = 0;
  camp.callBtn = true;
  camp.callsPause = false;
  camp.pauseBtn = false;
  await camp.save();
  const messageData3 = JSON.stringify({
    status: true,
    type: "makeCallsBtn",
  });
  sendWebSocketMessage(campaignId, messageData3);
  const messageData4 = JSON.stringify({
    status: false,
    type: "pauseCallsBtn",
  });
  sendWebSocketMessage(campaignId, messageData4);
};

const event_url = "https://" + process.env.HOSTNAME + "/vonage/voice/events";

const answerCall = async (req, res) => {
  console.log(req.params);
  console.log("answer");
  const { id, campaignId, callId, number, timeslots } = req.params;
  if (!id || !campaignId) return;
  try {
    return res.json([
      // {
      //     "action": "stream",
      //     "streamUrl": [`https://${process.env.HOSTNAME}/audio/hello.mp3`]
      // },
      {
        action: "connect",
        from: process.env.VONAGE_NUMBER,
        endpoint: [
          {
            type: "websocket",
            uri: `wss://${process.env.HOSTNAME}/socket/${id}/${campaignId}/${callId}/${number}/${timeslots}`,
            "content-type": "audio/l16;rate=16000",
          },
        ],
      },
      {
        action: "record",
        eventUrl: [
          `https://${process.env.HOSTNAME}/vonage/voice/recording/${id}/${campaignId}/${callId}`,
        ],
      },
      // {
      //     "action": "stream",
      //     "streamUrl": [`https://${process.env.HOSTNAME}/audio/silence.mp3`],
      //     "loop": 0,
      //     "bargeIn": "true"
      // },
      // {
      //     "action": "input",
      //     "type": ['dtmf'],
      //     "eventUrl": [`https://${process.env.HOSTNAME}/vonage/voice/ivr`],
      //     "dtmf": {
      //         "maxDigits": 1,
      //         "submitOnHash": true,
      //         "timeOut": 3
      //     }
      // }
    ]);
  } catch (err) {
    console.log(
      "An error occurred while trying to answer call : " + err.message
    );
    return res.json([
      {
        action: "talk",
        text: "An error occurred while answering call.",
      },
    ]);
  }
};

const send = (req, res) => {
  // const data = {
  //   id: "61cda1d0-6851-11ee-83f0-9fd4b98083b4",
  //   status: "rr",
  // };
  const messageData = JSON.stringify({
    id: "61cda1d0-6851-11ee-83f0-9fd4b98083b4",
    response: "Human",
    time: 10,
    type: "timing",
  });
  sendWebSocketMessage("6526ca1ba16b188aa473eee9", messageData);
  // const messageData = JSON.stringify(data);

  // sendWebSocketMessage("6526ca1ba16b188aa473eee9", messageData);
  // sendWebSocketMessage("111", "calllll");
  res.json("ok");
};

let flag = 0;
let lastStatus = "";
const handleAllEvents = async (req, res) => {
  // console.log(req.body);

  // console.log("\n\n\nReq handleallevents   :    " + JSON.stringify(req.body));

  const { id, campaignId, callId } = req.params;
  const { status, sub_state } = req.body;

  // if (sub_state === "beep_start") {
  //   if (!fs.existsSync(callId)) {
  //     // Directory doesn't exist, create it
  //     fs.writeFileSync(callId, "beep_detected");
  //     console.log("Beep File created successfully.");
  //   } else {
  //     console.log("Beep File already exists.");
  //   }
  // }

  if (lastStatus === status) {
    return;
  } else {
    lastStatus = status;
  }

  // if (status === "completed") {
  //   if (fs.existsSync(callId)) {
  //     fs.unlinkSync(callId);
  //   }
  // }

  if (status === "completed" || status === "started") return;
  // console.log(campaignId);
  const messageData = JSON.stringify({ id, status, type: "status" });
  console.log("status sent", status);

  // let { status, id } = req.body;
  if (
    status === "answered" ||
    status === "failed" ||
    status === "cancelled" ||
    status === "rejected" ||
    status === "busy" ||
    status === "timeout" ||
    status === "ringing" ||
    status === "unanswered"
  ) {
    try {
      const campaignData = await CampaignSave.findById(campaignId);
      const row = await campaignData.clients.find((data) => data.id === id);
      row.Status = status;
      await campaignData.save();

      const callData = await CallTime.findById(callId);
      callData.status = status;
      await callData.save();
      sendWebSocketMessage(campaignId, messageData);
      console.log(`Status saved for ${row.Name}`);
    } catch (error) {
      console.error(error);
    }
  } else {
    res.json({ err: "Status not accepted" });
  }
};

const handleIVRFlow = async (req, res) => {
  try {
    console.log("Received IVR Input: ");
    console.log(req.body.dtmf);

    if (req.body.dtmf.digits) {
      // if (req.body.dtmf.digits === '1') {
      flag = 1;
      console.log("Transferring the call...");
      return res.json([
        {
          action: "talk",
          text: "Hold on we are tranferring your call!",
        },
        {
          action: "connect",
          from: process.env.VONAGE_NUMBER,
          endpoint: [
            {
              type: "phone",
              number: "919022412143",
            },
          ],
        },
      ]);
    } else {
      res.json([
        {
          action: "talk",
          text: `You pressed ${req.body.dtmf.digits}`,
        },
      ]);
    }
  } catch (err) {
    console.log("[ERROR] An error occurred while handling IVR flow");
    console.log(err);
    res.json([
      {
        action: "talk",
        text: "Thank you, goodbye.",
      },
    ]);
  }
};

const handleEvents = async (uuid) => {
  let response;
  try {
    const res = await vonage.voice.getCall(uuid);
    response = res;
  } catch (error) {
    console.log(error);
  }

  return response;
};

const handleCalls = async (req, res) => {
  // userData = req.body;

  flag = 0;

  res.json("Calling");
  try {
    await makeOutboundCall(
      req.body,
      req.params.campaignId,
      req.params.number.replace("+", ""),
      req.params.email
    );
  } catch (err) {
    console.log("Error in calling makeoutbound call." + err);
  }
};

const handleCallEvents = async (req, res) => {
  const resp = await handleEvents(req.body.uuid);
  res.send(resp);
};

const onRecording = async (request, response) => {
  const recording_url = request.body.recording_url;
  const { id, campaignId, callId } = request.params;
  try {
    const campaignData = await CampaignSave.findById(campaignId);
    const row = await campaignData.clients.find((data) => data.id === id);
    row.recordingUrl = recording_url;
    await campaignData.save();
    console.log(`recording saved for user ${row.Name}`);

    const callData = await CallTime.findById(callId);
    callData.recordingUrl = recording_url;
    await callData.save();
    const messageData = JSON.stringify({
      id,
      type: "recording",
    });
    sendWebSocketMessage(campaignId, messageData);
  } catch (error) {
    console.error(error);
  }
};

const onIncomingRecording = async (request, response) => {
  const recording_url = request.body.recording_url;
  const { callId } = request.params;
  try {
    const callData = await IncomingCall.findById(callId);
    callData.recordingUrl = recording_url;
    await callData.save();
  } catch (error) {
    console.error(error);
  }
};

const webSocket = (wss, req) => {
  const room = req.params.room;
  if (!clients[room]) {
    clients[room] = [];
  }
  // console.log(`User joined room ${room}`);
  // console.log(clients);
  clients[room].push(wss);
  wss.on("message", async (message) => {
    // console.log(message);
    // console.log(clients);
    // Send the message only to clients in the same room
    // clients[room].forEach((client) => {
    //   // if (client !== wss) {
    //   client.send(message);
    //   // }
    // });
    const parsedData = JSON.parse(message);
    if (parsedData.type === "callPause") {
      const { id } = parsedData;
      const camp = await campaignSave.findById(id);
      if (camp) {
        camp.callsPause = true;
        camp.callBtn = true;
        camp.pauseBtn = false;
        await camp.save();
        console.log(camp);
      } else {
        console.log("No document found for the provided ID");
      }
    }
  });

  wss.on("close", () => {
    const index = clients[room].indexOf(wss);
    if (index > -1) {
      clients[room].splice(index, 1);
    }
  });
};

module.exports = {
  webSocket,
  onRecording,
  answerCall,
  handleCalls,
  handleCallEvents,
  handleRealTimeStream,
  handleAllEvents,
  makeOutboundCall,
  handleIVRFlow,
  handleIncomingRealTimeStream,
  onIncomingRecording,
};
