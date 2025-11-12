// server.js
require("dotenv").config(); // Load env variables
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON request bodies
app.use(express.json());

// Connect to MongoDB using the connection string in .env file
mongoose
  .connect(process.env.MONGO_URI, {})
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Define schemas and models for User and Todo
const userSchema = new mongoose.Schema({
  secret: String,
  name: String,
});
const User = mongoose.model("Users", userSchema);

const todoSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  title: String,
  completed: Boolean,
});
const Todo = mongoose.model("Todo", todoSchema);

// Middleware to validate userId and secret from URL params
async function validateUser(req, res, next) {
  const { userId, secret } = req.params;
  try {
    // const objectId = mongoose.Types.ObjectId(userId);
    // const user = await User.findById(objectId);
    const users = await User.find();
    const user = await User.findById(new mongoose.Types.ObjectId(`${userId}`));

    if (!user || user.secret !== secret) {
      return res
        .status(401)
        .json({ error: "Unauthorized: Invalid user or secret" });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(400).json({ error: "Invalid userId format" });
  }
}

app.get("/me/:userId/:secret", validateUser, async (req, res) => {
  await User.find({ userId: req.user._id });
  res.json({ username: req.user.name });
});

// CRUD routes for Todos scoped to authenticated user
app.get("/todos/:userId/:secret", validateUser, async (req, res) => {
  const todos = await Todo.find({ userId: req.user._id });
  res.json(todos);
});

app.post("/todos/:userId/:secret", validateUser, async (req, res) => {
  const { title, completed = false } = req.body;
  const todo = new Todo({ userId: req.user._id, title, completed });
  await todo.save();
  res.status(201).json(todo);
});

app.put("/todos/:userId/:secret/:todoId", validateUser, async (req, res) => {
  const { todoId } = req.params;
  const { title, completed } = req.body;
  const todo = await Todo.findOneAndUpdate(
    { _id: todoId, userId: req.user._id },
    { title, completed },
    { new: true }
  );
  if (!todo) return res.status(404).json({ error: "Todo not found" });
  res.json(todo);
});

app.delete("/todos/:userId/:secret/:todoId", validateUser, async (req, res) => {
  const { todoId } = req.params;
  const todo = await Todo.findOneAndDelete({
    _id: todoId,
    userId: req.user._id,
  });
  if (!todo) return res.status(404).json({ error: "Todo not found" });
  res.json({ message: "Todo deleted" });
});

app.get("/", (req, res) => {
  res.send("Everything looks fine");
});

// Start the server
app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});
