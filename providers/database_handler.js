// const client = require("./db_provider");
// const { ObjectId } = require("mongodb");
// const CallTime = require("../model/callTimeModel.js");
// const campaignSave = require("../model/campaignModel");

// const create_user = async (userData) => {
//   const database = client.db(process.env.DATABASE_NAME);
//   const collection = database.collection(process.env.DATABASE_CHAT_COLLECTION);

//   let user = await collection.findOne({ phoneno: userData.Number });

//   if (!user) {
//     console.log("User not found");
//     console.log(userData.Name, userData.Email, userData.Number);

//     // Insert the user data and get the acknowledgment object
//     const result = await collection.insertOne({
//       name: userData.Name,
//       email: userData.Email,
//       phoneno: userData.Number,
//       chat: "",
//     });

//     // Get the _id of the newly inserted document
//     const id = result.insertedId;
//     console.log("Inserted User with ID:", id);

//     // Now, you can use 'id' to look up the inserted document
//     user = await collection.findOne({ _id: new ObjectId(id) });
//   }

//   const idd = user._id; // Access the _id property of the 'user' document

//   // Do whatever you need with 'id'
//   console.log("Chat ID: " + idd);

//   return idd;
// };

// const update_chat = async (userData, id, chathistory, callId) => {
//   try {
//     const campaigns = await campaignSave.find({});
//     for (const campaign of campaigns) {
//       for (const data of campaign.clients) {
//         if (data.id === userData.id) {
//           data.chat = chathistory;
//           await campaign.save();
//         }
//       }
//     }

//     const callData = await CallTime.findById(callId);

//     callData.chat = chathistory;

//     await callData.save();
//     console.log("Call history saved successfully.");
//   } catch (error) {
//     console.error("Error:", error);
//   }
// };

// const save_status = async (userData, callStatus) => {
//   const database = client.db(process.env.DATABASE_NAME);
//   const collection = database.collection(
//     process.env.DATABASE_STATUS_COLLECTION
//   );

//   await collection.insertOne({
//     name: userData.Name,
//     email: userData.Email,
//     number: userData.Number,
//     status: callStatus,
//     date: new Date(),
//   });
// };

// const save_call_timing = async (userData, type, time, callId) => {
//   try {
//     const campaigns = await campaignSave.find({});
//     for (const campaign of campaigns) {
//       for (const data of campaign.clients) {
//         if (data.id === userData.id) {
//           data.typee = type;
//           data.duration = time;

//           await campaign.save();
//         }
//       }
//     }
//     const callData = await CallTime.findById(callId);

//     callData.typee = type;
//     callData.duration = time;

//     await callData.save();

//     console.log("Call Time data saved successfully.");
//   } catch (error) {
//     console.error("Error:", error);
//   }
// };

// module.exports = { create_user, update_chat, save_status, save_call_timing };

const client = require("./db_provider");
const { ObjectId } = require("mongodb");
const CallTime = require("../model/callTimeModel.js");
const campaignSave = require("../model/campaignModel");
const IncomingCall = require("../model/incomingCallModel.js");

const create_user = async (userData) => {
  const database = client.db(process.env.DATABASE_NAME);
  const collection = database.collection(process.env.DATABASE_CHAT_COLLECTION);

  let user = await collection.findOne({ phoneno: userData.Number });

  if (!user) {
    console.log("User not found");
    console.log(userData.Name, userData.Email, userData.Number);

    // Insert the user data and get the acknowledgment object
    const result = await collection.insertOne({
      name: userData.Name,
      email: userData.Email,
      phoneno: userData.Number,
      chat: "",
    });

    // Get the _id of the newly inserted document
    const id = result.insertedId;
    console.log("Inserted User with ID:", id);

    // Now, you can use 'id' to look up the inserted document
    user = await collection.findOne({ _id: new ObjectId(id) });
  }

  const idd = user._id; // Access the _id property of the 'user' document

  // Do whatever you need with 'id'
  console.log("Chat ID: " + idd);

  return idd;
};

const update_chat = async (userData, id, chathistory, callId) => {
  try {
    const campaigns = await campaignSave.find({});
    for (const campaign of campaigns) {
      for (const data of campaign.clients) {
        if (data.id === userData.id) {
          data.chat = chathistory;
          await campaign.save();
        }
      }
    }

    const callData = await CallTime.findById(callId);

    callData.chat = chathistory;

    await callData.save();
    console.log("Call history saved successfully.");
  } catch (error) {
    console.error("Error:", error);
  }
};
const update_Incomingchat = async (chathistory, callId) => {
  try {
    const callData = await IncomingCall.findById(callId);
    callData.chat = chathistory;
    await callData.save();
  } catch (error) {
    console.error(error);
  }
};

const save_status = async (userData, callStatus) => {
  const database = client.db(process.env.DATABASE_NAME);
  const collection = database.collection(
    process.env.DATABASE_STATUS_COLLECTION
  );

  await collection.insertOne({
    name: userData.Name,
    email: userData.Email,
    number: userData.Number,
    status: callStatus,
    date: new Date(),
  });
};

const save_call_timing = async (
  userData,
  type,
  time,
  callId,
  campaignId,
  id
) => {
  try {
    const campaign = await campaignSave.findById(campaignId);
    for (const data of campaign.clients) {
      if (data.id === id) {
        data.typee = type;
        data.duration = time;
        await campaign.save();
      }
    }
    const callData = await CallTime.findById(callId);

    callData.typee = type;
    callData.duration = time;

    await callData.save();

    console.log("Call Time data saved successfully.");
  } catch (error) {
    console.error("Error:", error);
  }
};
const save_incoming_call_timing = async (type, time, callId) => {
  try {
    const callData = await IncomingCall.findById(callId);
    callData.typee = type;
    callData.duration = time;
    await callData.save();
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  save_incoming_call_timing,
  update_Incomingchat,
  create_user,
  update_chat,
  save_status,
  save_call_timing,
};
