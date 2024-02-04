const CallTime = require("../model/callTimeModel");
const campaign = require("../model/campaignModel");
const jwt = require("jsonwebtoken");

const campaignStore = async (req, res) => {
  const { id } = jwt.verify(req.body.token, process.env.JWT_SECRET);
  try {
    await campaign.create({ userId: id, ...req.body });
    console.log("Campaign Saved");
  } catch (err) {
    console.log(err);
  }
  res.send("Stored");
};

const campaignFetch = async (req, res) => {
  const { id } = jwt.verify(req.body.token, process.env.JWT_SECRET);
  const campaigns = await campaign.find({ userId: id });
  res.json(campaigns);
};

const getCampaign = async (req, res) => {
  try {
    const campaignData = await campaign.findById(req.body.id);

    if (!campaignData) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    res.json(campaignData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
const getCampaignRow = async (req, res) => {
  const { id, rowId } = req.body; // Use req.params for route parameters

  try {
    const campaignData = await campaign.findById(id);

    if (!campaignData) {
      return res.status(404).json({ message: "Campaign not found" });
    }

    // Assuming campaignData is an array of rows
    const row = campaignData.clients.find((data) => data.id === rowId);

    if (!row) {
      return res.status(404).json({ message: "Row not found" });
    }

    res.json(row);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getCampaignStats = async (req, res) => {
  const { id } = jwt.verify(req.body.token, process.env.JWT_SECRET);
  const campaigns = await campaign.find({ userId: id });
  const ids = [];
  let pending = 0;

  for (data of campaigns) {
    for (const camp of data.clients) {
      if (camp.Status === "Pending") {
        pending++;
      }
      ids.push(camp.id);
    }
  }

  let callData = [];
  for (const id of ids) {
    const callDataFound = await CallTime.find({ id });
    for (const data of callDataFound) {
      if (data.status) {
        callData.push(data);
      }
    }
  }

  const statsData = [
    { content: "Calls Made", value: 0 },
    { content: "Pending", value: 0 },
    { content: "Ringing", value: 0 },
    { content: "Answered", value: 0 },
    { content: "Human", value: 0, duration: 0 },
    { content: "Machine/IVR", value: 0, duration: 0 },
    { content: "Unanswered", value: 0 },
    { content: "Timeout", value: 0 },
    { content: "Failed", value: 0 },
    { content: "Cancelled", value: 0 },
    { content: "Busy", value: 0 },
    { content: "Error", value: 0 },
    { content: "Unresponded", value: 0, duration: 0 },
  ];
  callData.forEach((item) => {
    const matchingStat = statsData.find(
      (stat) => item?.status?.toLowerCase() === stat.content.toLowerCase()
    );
    if (matchingStat) {
      matchingStat.value += 1;
    }

    if (item.typee === "Human") {
      statsData[4].value += 1;
      statsData[4].duration += item.duration;
    }

    if (item.typee === "Unresponded") {
      statsData[12].value += 1;
      statsData[12].duration += item.duration;
    }

    if (item.typee === "Voicemail" || item.typee === "IVR") {
      statsData[5].value += 1;
      statsData[5].duration += item.duration;
    }
  });
  statsData[0].value = callData.length;
  statsData[1].value = pending;
  res.json(statsData);
};

const getIndividualCampaignStats = async (req, res) => {
  const { campaignId } = req.params;
  try {
    const campaignData = await campaign.findById(campaignId);
    const ids = campaignData.clients.map((item) => item.id);
    let pending = 0;

    for (const camp of campaignData.clients) {
      if (camp.Status === "Pending") {
        pending++;
      }
    }
    let callData = [];
    for (const id of ids) {
      const callDataFound = await CallTime.find({ id });
      for (const data of callDataFound) {
        if (data.status) {
          callData.push(data);
        }
      }
    }

    const statsData = [
      { content: "Calls Made", value: 0 },
      { content: "Pending", value: 0 },
      { content: "Ringing", value: 0 },
      { content: "Answered", value: 0 },
      { content: "Human", value: 0, duration: 0 },
      { content: "Machine/IVR", value: 0, duration: 0 },
      { content: "Unanswered", value: 0 },
      { content: "Timeout", value: 0 },
      { content: "Failed", value: 0 },
      { content: "Cancelled", value: 0 },
      { content: "Busy", value: 0 },
      { content: "Error", value: 0 },
      { content: "Unresponded", value: 0, duration: 0 },
    ];
    statsData[1].value = pending;
    callData.forEach((item) => {
      const matchingStat = statsData.find(
        (stat) => item.status.toLowerCase() === stat.content.toLowerCase()
      );
      if (matchingStat) {
        matchingStat.value += 1;
      }

      if (item.typee === "Human") {
        statsData[4].value += 1;
        statsData[4].duration += item.duration;
      }

      if (item.typee === "Unresponded") {
        statsData[12].value += 1;
        statsData[12].duration += item.duration;
      }

      if (item.typee === "Voicemail" || item.typee === "IVR") {
        statsData[5].value += 1;
        statsData[5].duration += item.duration;
      }
    });
    statsData[0].value = callData.length || 0;
    res.json(statsData);
  } catch (error) {
    res.json(error);
  }
};
const getIndividualCampaignData = async (req, res) => {
  const { id } = req.params;
  try {
    const callData = await CallTime.find({ id });
    const refinedCallData = callData.filter((item) => item.status);
    res.json(refinedCallData);
  } catch (error) {
    res.json(error);
  }
};

const deleteCampaign = async (req, res) => {
  try {
    const campaignData = await campaign.findByIdAndDelete(req.body.id);

    if (!campaignData) {
      return res.status(404).json({ message: "Campaign not found" });
    }
    res.json(campaignData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getCallData = async (req, res) => {
  const { id } = req.params;
  try {
    const callData = await CallTime.findById(id);
    res.json(callData);
  } catch (error) {
    res.status(401);
    throw new Error(error);
  }
};

module.exports = {
  getIndividualCampaignData,
  getCallData,
  deleteCampaign,
  getCampaignRow,
  getCampaign,
  campaignStore,
  campaignFetch,
  getCampaignStats,
  getIndividualCampaignStats,
};
