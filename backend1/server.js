

require('dotenv').config();

const mongoose = require('mongoose')
const Document = require("./DocumentExcel")

mongoose.connect(process.env.DB_Mongo)
    .then(() => console.log("connection success"))
    .catch((err) => console.log(err))


const cors = require('cors');

const express = require("express")
const app = express();
const http = require('http').Server(app)
//const io = require('socket.io')(http) 

var corsOptions = {
    origin: [`${process.env.HOST}`, "http://localhost:3000"]
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/workbook/:id", async (req, res) => {
    res.json(await findDocumentByObjectId(req.params.id));
});

const PORT = 3002;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});


console.log(`turning on cors on ${process.env.HOST}`)
const io = require('socket.io')(3001, {
    cors: {
        origin: [`${process.env.HOST}`, "http://localhost:3000"],
        methods: ['GET', 'POST']
    },

})

const defaultValue = ""

io.on("connection", socket => {
    socket.on('get-document', async (documentId, documentObjectId) => {
        const document = await findOrCreateDocument(documentId, documentObjectId)
        socket.join(documentId)
        socket.emit('load-document', document.data)

        socket.on('send-changes', delta => {
            socket.broadcast.to(documentId).emit("receive-changes", delta)
        })

        socket.on("save-document", async data => {
            await Document.findByIdAndUpdate(documentId, { data })
        })
    })
})

async function findOrCreateDocument(id, documentObjectId) {
    if (id == null) return
    const document = await Document.findById(id)
    if (document) return document
    return await Document.create({ _id: id, data: defaultValue, documentId: documentObjectId })
}


async function findDocumentByObjectId(objectId) {
    if (objectId === null) return
    const document = await Document.find({ documentId: objectId }).select('__id')
    return document
}

