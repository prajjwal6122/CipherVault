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
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Drop existing users collection for clean seed
    await User.deleteMany({});
    console.log("🗑️  Cleared existing users");

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
    console.log("✅ Created demo admin user:");
    console.log("   Email: admin@example.com");
    console.log("   Password: password123");
    console.log("   Role: admin");

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
    console.log("✅ Created demo analyst user:");
    console.log("   Email: analyst@example.com");
    console.log("   Password: password123");
    console.log("   Role: analyst");

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
    console.log("✅ Created demo viewer user:");
    console.log("   Email: viewer@example.com");
    console.log("   Password: password123");
    console.log("   Role: viewer");

    console.log("\n🌱 Database seeding completed!");
    console.log("\n📝 Demo Credentials for Testing:");
    console.log("   Admin:   admin@example.com / password123");
    console.log("   Analyst: analyst@example.com / password123");
    console.log("   Viewer:  viewer@example.com / password123");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

seedDatabase();
