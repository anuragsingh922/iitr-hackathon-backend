// const express = require("express");
// const router = express();

// const campaignController = require("../controllers/campaignController");

// router.post("/save", campaignController.campaignStore);
// router.post("/fetch", campaignController.campaignFetch);
// router.post("/get", campaignController.getCampaign);
// router.post("/get-stats", campaignController.getCampaignStats);
// router.post("/get-row", campaignController.getCampaignRow);
// router.post("/delete", campaignController.deleteCampaign);
// router.get("/stats/:campaignId", campaignController.getIndividualCampaignStats);
// router.get("/user-data/:id", campaignController.getIndividualCampaignData);
// router.get("/get-calldata/:id", campaignController.getCallData);

// module.exports = router;




const express = require("express");
const router = express();

const campaignController = require("../controllers/campaignController");

router.post("/save", campaignController.campaignStore);
router.post("/fetch", campaignController.campaignFetch);
router.post("/get", campaignController.getCampaign);
router.post("/get-stats", campaignController.getCampaignStats);
router.post("/get-row", campaignController.getCampaignRow);
router.post("/delete", campaignController.deleteCampaign);
router.get("/stats/:campaignId", campaignController.getIndividualCampaignStats);
router.get("/user-data/:id", campaignController.getIndividualCampaignData);
router.get("/get-calldata/:id", campaignController.getCallData);

module.exports = router;
