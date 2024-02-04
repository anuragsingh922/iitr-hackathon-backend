const jwt = require("jsonwebtoken");
const User = require("../model/userModel.js");
const CallTime = require("../model/callTimeModel.js");
const CampaignSave = require("../model/campaignModel");

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    await User.findOne({ email }, async (err, user) => {
      if (user) {
        if (
          password === user.password ||
          (await user.correctPassword(password, user.password))
        ) {
          const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: 30 * 24 * 60 * 60,
          });

          res.send({
            message: "Signed in successfully!",
            success: true,
            user,
            token,
          });
        } else {
          res.send({ message: "Incorrect Email or Password!" });
        }
      } else {
        res.send({ message: "Incorrect Email or Password!" });
      }
    });
  } catch (err) {
    res.send({ message: "Something went wrong. Try again later!" });
    console.log(err);
  }
};

exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    await User.findOne({ email }, async (err, user) => {
      if (user) {
        res.send({ message: "User already exists!" });
      } else {
        try {
          const user = await User.create({ name, email, password });
          const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: 30 * 24 * 60 * 60,
          });

          res.send({
            message: "Signed up successfully!",
            success: true,
            user,
            token,
          });
        } catch (err) {
          res.send({ message: "Something went wrong. Try again later!" });
          console.log(err);
        }
      }
    });
  } catch (err) {
    res.send({ message: "Something went wrong. Try again later!" });
    console.log(err);
  }
};

exports.userVerification = (req, res) => {
  const token = req.body.token;
  if (!token) {
    return res.json({ status: false });
  }
  jwt.verify(token, process.env.JWT_SECRET, async (err, data) => {
    if (err) {
      return res.json({ status: false });
    } else {
      const user = await User.findById(data.id);
      if (user) return res.json({ status: true, user });
      else return res.json({ status: false });
    }
  });
};

exports.fetchAnswer = async (req, res) => {
  try {
    const id = req.body.id;

    const query = { id: id };
    const call = await CallTime.findOne(query)
      .sort({ _id: -1 }) // Sort by the "_id" field in descending order
      .exec();
    res.json(call);
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "An error occurred on the server." });
  }
};

exports.newCall = async (req, res) => {
  try {
    const campaign = await CampaignSave.findById(req.body.id);
    for (const data of campaign.clients) {
      data.Status = "Pending";
      data.typee = "";
      data.duration = 0;
      data.recordingUrl = "";
      data.timesCalled += 1;
      data.chat = "";
    }
    await campaign.save();
    res.json(campaign);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong. Try again later!" });
  }
};
