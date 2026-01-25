const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["admin", "analyst", "viewer"],
    default: "viewer",
  },
  firstName: String,
  lastName: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

async function createUsers() {
  try {
    await mongoose.connect("mongodb://localhost:27017/secure_encryption_db");
    console.log("Connected to MongoDB");

    // Clear existing users
    await User.deleteMany({});
    console.log("Cleared existing users");

    // Hash password
    const hashedPassword = await bcryptjs.hash("password123", 10);

    // Create users
    await User.create([
      {
        email: "admin@example.com",
        password: hashedPassword,
        role: "admin",
        firstName: "Admin",
        lastName: "User",
      },
      {
        email: "analyst@example.com",
        password: hashedPassword,
        role: "analyst",
        firstName: "John",
        lastName: "Analyst",
      },
      {
        email: "viewer@example.com",
        password: hashedPassword,
        role: "viewer",
        firstName: "Jane",
        lastName: "Viewer",
      },
    ]);

    console.log("Users created successfully!");
    const users = await User.find({}, { password: 0 });
    console.log("Existing users:", users);

    mongoose.connection.close();
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

createUsers();
