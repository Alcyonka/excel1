/* eslint-disable no-console */
//import queryString from "query-string";
const mongoose = require('mongoose')
const cors = require('cors');
const express = require("express");
const { MongoClient } = require("mongodb");
//const SocketServer = require("ws").Server;
const uuid = require("uuid");
const _ = require("lodash");
const { applyOp } = require("./op");


mongoose.connect('mongodb://localhost:27017/google-docs-clone')
    .then(() => console.log("connection success"))
    .catch((err) => console.log(err))


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

const dbName = "google-docs-clone";
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

var corsOptions = {
    origin: [`${process.env.HOST}`, "http://localhost:3001"]
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
/*
app.get("/workbook/:objectId", async (req, res) => {
    console.log("AAAAAAA ", req.params.objectId)
    //res.json(await findOrCreateDocument(req.params.objectId, ""));
});*/

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



const http = require('http').Server(app)
const server = http.listen(port, () => {
  console.info(`running on port ${port}`);
});

const connections = {};
/*
const broadcastToOthers = (selfId, data) => {
  Object.values(connections).forEach((ws) => {
    if (ws.id !== selfId) {
      ws.send(data);
    }
  });
};*/

//const wss = new SocketServer({ server, path: "/workbook/:objectId" });


//const io = require("socket.io")(8081, { path: '/workbook' });
/*const io = require('socket.io')(http, {
    cors: {
        origin: [`${process.env.HOST}`, "http://localhost:3001"],
        methods: ['GET', 'POST']
    }}); */
const io = require("socket.io")(http, {
    cors: {
        origin: [`${process.env.HOST}`, "http://localhost:3001"],
        methods: ['GET', 'POST']
    }});
//app.listen(8081);
/*
io.on('connection', (socket) => {
    socket.on('message', (message) => {
        console.log(message);
    });
    socket.emit('message', 'Hello, my name is Server');
});*/

const workbook = io.of("/workbook");

workbook.on("connection", socket => {
  console.log("1")
    socket.id = uuid.v4();
    connections[socket.id] = socket;

    console.log("Client connected " + socket.id)

    socket.on("message", async (data) => {
        const msg = JSON.parse(data.toString());

        console.log("msg.req " + msg.req)
        console.log(JSON.stringify(msg, null, 2));

        if (msg.req === "getData") {
            const getdat = await getData();

            console.log("getdat ", getdat);

            socket.emit(`[${socket.id}]`,
            JSON.stringify({
                req: msg.req,
                data: getdat,
        })
      );
        socket.emit(JSON.stringify({ req: "addPresences", data: presences }));
            console.log("presences " + JSON.stringify(presences, null, 2));
        // findOrCreateDocument(msg.documentId, msg.documentObjectId)


    } else if (msg.req === "op") {
      await applyOp(client.db(dbName).collection(collectionName), msg.data);
            socket.broadcast.emit(`[${socket.id}]`, data.toString());
            console.log("op data.toString " + data.toString());
            console.log("op msg.data " + JSON.stringify(msg.data, null, 2));

    } else if (msg.req === "addPresences") {
        socket.presences = msg.data;
            socket.broadcast.emit(`[${socket.id}]`, data.toString());
      presences = _.differenceBy(presences, msg.data, (v) =>
        v.userId == null ? v.username : v.userId
            ).concat(msg.data);
            console.log("addPresences concat " + JSON.stringify(presences, null, 2));
  
    } else if (msg.req === "removePresences") {
            socket.broadcast.emit(`[${socket.id}]`, data.toString());
    }
  });

    socket.on("close", () => {
        socket.broadcast.emit(
            `[${socket.id}]`,
      JSON.stringify({
        req: "removePresences",
          data: socket.presences,
      })
    );
        presences = _.differenceBy(presences, socket.presences, (v) =>
      v.userId == null ? v.username : v.userId
    );
        delete connections[socket.id];
  });
});