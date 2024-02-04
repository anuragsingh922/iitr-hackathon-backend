const { MongoClient, ServerApiVersion } = require("mongodb");

const client = new MongoClient(
  process.env.DATABASE.replace("<PASSWORD>", process.env.DATABASE_PASSWORD),
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  }
);
// const client = new MongoClient(process.env.DATABASE.replace(
//     "<PASSWORD>",
//     process.env.DATABASE_PASSWORD), {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
// },
//     {
//         serverApi: {
//             version: ServerApiVersion.v1,
//             strict: true,
//             deprecationErrors: true,
//         }
//     }
// );

// const client = new MongoClient(process.env.DATABASE, {
//     serverApi: {
//       version: ServerApiVersion.v1,
//       strict: true,
//       deprecationErrors: true,
//     }});

module.exports = client;
