// User Model - Authentication & RBAC
const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: () => require("crypto").randomUUID(),
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 255;
        },
        message: "Invalid email format or length exceeds 255 characters",
      },
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
      validate: {
        validator: function (v) {
          // Accept passwords with at least 6 characters for development
          // Production should use stricter validation
          return v && v.length >= 6;
        },
        message: "Password must be at least 6 characters long",
      },
    },
    role: {
      type: String,
      enum: ["admin", "analyst", "viewer"],
      default: "viewer",
    },
    firstName: String,
    lastName: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "users",
    timestamps: true,
  },
);

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isActive: 1 });

// Hash password before saving
userSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) return next();

    console.info(`[User] Password change initiated for: ${this.email}`);

    const salt = await bcryptjs.genSalt(10);
    this.password = await bcryptjs.hash(this.password, salt);
    this.updatedAt = Date.now();

    console.info(`[User] Password hashing completed for: ${this.email}`);
    next();
  } catch (error) {
    console.error(
      `[User] Password hashing failed for: ${this.email}`,
      error.message,
    );
    next(new Error("Password hashing failed"));
  }
});

// Compare passwords
/**
 * Compare provided password with stored hash
 * @param {string} candidatePassword - Password to compare
 * @returns {Promise<boolean>} True if passwords match
 * @example
 * const isMatch = await user.comparePassword('password123');
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcryptjs.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("Password comparison failed");
  }
};

// Generate JWT token
/**
 * Generate JWT authentication token
 * @returns {string} JWT token with 1-hour expiration
 * @example
 * const token = user.generateJWT();
 */
userSchema.methods.generateJWT = function () {
  return jwt.sign(
    {
      id: this.id,
      email: this.email,
      role: this.role,
    },
    process.env.JWT_SECRET || "default-secret-key",
    { expiresIn: "1h" },
  );
};

// Generate refresh token
/**
 * Generate refresh token for token renewal
 * @returns {string} Refresh token with 7-day expiration
 * @example
 * const refreshToken = user.generateRefreshToken();
 */
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { id: this.id },
    process.env.JWT_REFRESH_SECRET || "default-refresh-secret",
    { expiresIn: "7d" },
  );
};

// Safe JSON serialization (exclude password)
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.loginAttempts;
  delete obj.lockUntil;
  delete obj.__v;
  return obj;
};

// Check if account is locked
userSchema.methods.isAccountLocked = function () {
  return this.lockUntil && this.lockUntil > Date.now();
};

// Increment login attempts
userSchema.methods.incLoginAttempts = async function () {
  // Reset attempts if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  // Lock account after 5 attempts
  const updates = { $inc: { loginAttempts: 1 } };
  const maxAttempts = 5;
  const lockTimeMinutes = 30;

  if (this.loginAttempts + 1 >= maxAttempts && !this.isAccountLocked()) {
    updates.$set = { lockUntil: Date.now() + lockTimeMinutes * 60 * 1000 };
  }

  return this.updateOne(updates);
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 },
  });
};

module.exports = mongoose.model("User", userSchema);
