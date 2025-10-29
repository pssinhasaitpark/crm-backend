import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import http from "http";
import { Server as SocketIO } from "socket.io";

import connectDB from "./app/dbConfig/dbConfig.js";
import setupRoutes from "./app/routes/index.js";
import mediasetup from "./app/routes/media.js";
import { initializeSocket } from "./app/utils/socketHandler.js";
import { attachSocket } from "./app/middlewares/attachSocket.js";

dotenv.config();

const app = express();
const host = process.env.HOST || "localhost";
const port = process.env.PORT || 8080;

app.use(
  cors({
    origin: [
      "http://localhost:5174",
      "http://localhost:5173",
      "http://localhost:8081",
      "http://localhost:8082",
      "http://192.168.0.147:5173",
      "http://192.168.0.131:5173",
      "http://192.168.0.164:5173",
      "http://192.168.0.164:5174",
      "http://192.168.0.144:5173",
      "http://192.168.0.144:8081",
      "http://192.168.0.144:8082",
      "https://crm-cp-admin.vercel.app",
      "https://crm-portal-five.vercel.app",
      "http://127.0.0.1:5500"
    ],
    methods: ["GET", "POST", "HEAD", "PUT", "PATCH", "DELETE"],
    optionsSuccessStatus: 200,
    credentials: true,
  })
);

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

connectDB();

const server = http.createServer(app);


const io = new SocketIO(server, {
  cors: {
    origin: [
      "http://localhost:5174",
      "http://localhost:5173",
      "http://localhost:8081",
      "http://localhost:8082",
      "http://192.168.0.147:5173",
      "http://192.168.0.131:5173",
      "http://192.168.0.164:5173",
      "http://192.168.0.164:5174",
      "http://192.168.0.144:5173",
      "http://192.168.0.144:8081",
      "http://192.168.0.144:8082",
      "https://crm-cp-admin.vercel.app",
      "http://127.0.0.1:5500",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});
initializeSocket(io);

app.use(attachSocket(io));

setupRoutes(app);
mediasetup(app);

app.get("/", (req, res) => {
  res.status(200).send({
    error: false,
    message: "Welcome to the CRM Project....",
  });
});

server.listen(port, () =>
  console.log(`🚀 Server is Running at http://${host}:${port}`)
);
