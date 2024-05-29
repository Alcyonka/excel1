/* eslint-disable no-console */
//import queryString from "query-string";

const express = require("express");
const { MongoClient } = require("mongodb");
const SocketServer = require("ws").Server;
const uuid = require("uuid");
const _ = require("lodash");
const { applyOp } = require("./op");


const defaultData = {
  name: "Demo",
  id: uuid.v4(),
  celldata: [{ r: 0, c: 0, v: null }],
  order: 0,
  row: 84,
  column: 60,
  config: {},
  pivotTable: null,
  isPivotTable: false,
  status: 0,
};

const dbName = "fortune-sheet";
const collectionName = "workbook";
const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);
let presences = [];

async function initMongoDB() {
    
 await client.connect();
    await client.db("admin").command({ ping: 1 });
}

initMongoDB();

const app = express();
const port = process.env.PORT || 8081;

async function getData() {
  const db = client.db(dbName);
    const data = await db.collection(collectionName).find().toArray();

    const result = await db.command({ ping: 1 });

  data.forEach((sheet) => {
      if (!_.isUndefined(sheet._id)) delete sheet._id;
  });
  return data;
}

// get current workbook data
app.get("/", async (req, res) => {
  res.json(await getData());
});

// drop current data and initialize a new one
app.get("/init", async (req, res) => {
    console.log("init")
  const db = client.db(dbName);
  const coll = db.collection(collectionName);
  await coll.deleteMany();
  await db.collection(collectionName).insertOne(defaultData);
  res.json({
    ok: true,
  });

});

app.get("/workbook/:objectId", async (req, res) => {
    console.log("AAAAAAA ", req.params.objectId)
   // res.json(await findDocumentByObjectId(req.params.objectId));
});

async function findOrCreateDocument(id, documentObjectId) {
    console.log("creating");
    if (id == null) return
    const db = client.db(dbName);
    console.log("creating new");
    const newData = {
        name: id,
        id: id,
        celldata: [{ r: 0, c: 0, v: null }],
        order: 0,
        row: 84,
        column: 60,
        config: {},
        pivotTable: null,
        isPivotTable: false,
        status: 0,
        documentId: documentObjectId
    };
    console.log("created");
    await db.collection(collectionName).insertOne(newData);

}


const server = app.listen(port, () => {
  console.info(`running on port ${port}`);
});

const connections = {};

const broadcastToOthers = (selfId, data) => {
  Object.values(connections).forEach((ws) => {
    if (ws.id !== selfId) {
      ws.send(data);
    }
  });
};

const wss = new SocketServer({ server, path: "/workbook/:objectId" });

//const url = require('url')

wss.on("connection", (ws, req) => {
 
   //const [_path, params] = connectionRequest?.url?.split("?");
  //  const connectionParams = queryString.parse(params);
    //console.log(connectionParams);
    
 
  ws.id = uuid.v4();
  connections[ws.id] = ws;

  
  ws.on("message", async (data) => {
    const msg = JSON.parse(data.toString());

     /* ws.id = msg.sheetId;
      connections[ws.id] = ws;
      console.log("ws.id " + ws.id)*/

    if (msg.req === "getData") {
      ws.send(
        JSON.stringify({
          req: msg.req,
          data: await getData(),
        })
      );
        ws.send(JSON.stringify({ req: "addPresences", data: presences }));
 
        await findOrCreateDocument(msg.documentId, msg.documentObjectId)


    } else if (msg.req === "op") {
      await applyOp(client.db(dbName).collection(collectionName), msg.data);
        broadcastToOthers(ws.id, data.toString());

    } else if (msg.req === "addPresences") {
      ws.presences = msg.data;
      broadcastToOthers(ws.id, data.toString());
      presences = _.differenceBy(presences, msg.data, (v) =>
        v.userId == null ? v.username : v.userId
        ).concat(msg.data);
  
    } else if (msg.req === "removePresences") {
      broadcastToOthers(ws.id, data.toString());
    }
  });

  ws.on("close", () => {
    broadcastToOthers(
      ws.id,
      JSON.stringify({
        req: "removePresences",
        data: ws.presences,
      })
    );
    presences = _.differenceBy(presences, ws.presences, (v) =>
      v.userId == null ? v.username : v.userId
    );
    delete connections[ws.id];
  });
});