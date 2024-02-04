const express = require("express");
const router = express();

// const controller = require("../elevenlabs_streaming");
const controller = require("../final_code_with_both_elevenlabs_and_rime");
// const controller = require("../transfer_call_test");
// const controller = require("../aman_silence");

router.get(
  "/voice/answer/:id/:campaignId/:callId/:number/:timeslots",
  controller.answerCall
);

router.post(
  "/voice/handleCalls/:campaignId/:number/:email",
  controller.handleCalls
);

router.post("/voice/handleCallEvents", controller.handleCallEvents);

router.post(
  "/voice/events/:id/:campaignId/:callId/:number/:timeslots",
  controller.handleAllEvents
);

router.post("/voice/recording/:id/:campaignId/:callId", controller.onRecording);

router.post("/voice/recording/:callId", controller.onIncomingRecording);
router.post("/voice/ivr", controller.handleIVRFlow);
// router.post("/voice/embed_files", controller.embedFiles);

module.exports = router;
