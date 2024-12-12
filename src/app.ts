import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { Server } from "socket.io";

type Sender = {
  firstName: string;
  middleName: string;
  lastName: string;
  birthdate: string;
  birthplace: string;
  gender: string;
  civilStatus: string;
  citizenship: string;
  religion: string | null;
  email: string;
  address: string;
  contactNumber: string | null;
  employeeId: string;
  dateHired: string;
  _id?: string; // Include _id if it's used for updates
};

type Message = {
  sender: Sender | string,
  content: string,
  timestamp: Date;
}

export type Chat = {
  userId: string;
  messages: Message[]
}

// In-memory storage for chats
const chats: Chat[] = [];

interface ChatMessage {
  userId: string;
  content: string;
  sender: string; // "admin" or "user"
}

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());


// Get user chat
app.get("/chat/:userId", (req, res) => {
  const chat = chats.find(chat => chat.userId === req.params.userId);
  if (chat) {
    res.json(chat);
  } else {
    res.json([]);
  }
});

// Get all chats for admin
app.get("/admin/chats", (req, res) => {
  res.json(chats);
});

// Update user chat (add message)
app.post("/chat/:userId", (req, res) => {
  const { content, sender } = req.body;
  let chat = chats.find(chat => chat.userId === req.params.userId);

  if (!chat) {
    chat = { userId: req.params.userId, messages: [] };
    chats.push(chat);
  }

  const newMessage = { content, sender, timestamp: new Date() };
  chat.messages.push(newMessage);

  res.json(chat);
});


// Start the server and initialize Socket.IO
const PORT = 8080;
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});


io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Handle user disconnection
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
  });

  // Handle incoming chat messages
  socket.on("message", async (data: ChatMessage) => {
    try {
      const { userId, content, sender } = data;

      console.log("chats", chats);
      // Find the existing chat or create a new one
      let chat = chats.find((chat) => chat.userId === userId);

      if (!chat) {
        chat = { userId, messages: [] };
        chats.push(chat);
      }

      // Add the new message to the chat
      const newMessage = { content, sender, timestamp: new Date() };
      chat.messages.push(newMessage);

      // Emit the updated chat to all connected clients
      io.emit("new_message", chat);
    } catch (error) {
      console.error("Error handling message:", error);
    }
  });
});