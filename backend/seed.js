#!/usr/bin/env node
/**
 * Database Seeding Script
 * Creates demo users and initial data for testing
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const User = require("./src/models/User");

const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/secure_encryption_db";

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);

    // Drop existing users collection for clean seed
    await User.deleteMany({});

    // Create demo admin user
    const demoAdmin = new User({
      email: "admin@example.com",
      password: "password123",
      role: "admin",
      firstName: "Admin",
      lastName: "User",
      isActive: true,
    });

    await demoAdmin.save();

    // Create demo analyst user
    const demoAnalyst = new User({
      email: "analyst@example.com",
      password: "password123",
      role: "analyst",
      firstName: "John",
      lastName: "Analyst",
      isActive: true,
    });

    await demoAnalyst.save();

    // Create demo viewer user
    const demoViewer = new User({
      email: "viewer@example.com",
      password: "password123",
      role: "viewer",
      firstName: "Jane",
      lastName: "Viewer",
      isActive: true,
    });

    await demoViewer.save();

    process.exit(0);
  } catch (error) {
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seedDatabase();
