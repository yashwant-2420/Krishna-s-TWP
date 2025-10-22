// server.js
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");

let users = {}; // { socket.id: username }
let messages = {}; // { id: { text, userId } }

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Default route
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// Socket.IO connection
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  let currentUser = "";

  // --- User joins ---
  socket.on("join", (username) => {
    if (Object.values(users).includes(username)) {
      socket.emit("duplicate");
    } else {
      currentUser = username;
      users[socket.id] = username;

      socket.emit("joined", username);
      io.emit("user list", Object.values(users));

      socket.broadcast.emit("server message", `${username} joined the chat`);
    }
  });

  // --- Chat text message ---
  socket.on("chat message", (msg) => {
    if (currentUser) {
      const messageId = Date.now().toString();
      messages[messageId] = { text: msg, userId: socket.id };

      io.emit("chat message", { id: messageId, user: currentUser, text: msg });
    }
  });

  // --- Chat image ---
  socket.on("chat image", (data) => {
    io.emit("chat image", { user: currentUser, data });
  });

  // --- Delete message ---
  socket.on("deleteMessage", (id) => {
    if (messages[id] && messages[id].userId === socket.id) {
      delete messages[id];
      io.emit("deleteMessage", id);
    }
  });

  // --- Edit message ---
  socket.on("editMessage", ({ id, newText }) => {
    if (messages[id] && messages[id].userId === socket.id) {
      messages[id].text = newText;
      io.emit("editMessage", { id, newText });
    }
  });

  // --- Disconnect ---
  socket.on("disconnect", () => {
    if (currentUser) {
      delete users[socket.id];
      io.emit("user list", Object.values(users));
      socket.broadcast.emit("server message", `${currentUser} left the chat`);
    }
  });
});

// Start server
const PORT = process.env.PORT || 4000;
http.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
