const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

// Routes
const authRoutes = require("./modules/auth/auth.routes");
const usersRoutes = require("./modules/users/users.routes");
const cyclesRoutes = require("./modules/cycles/cycles.routes");

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// API Documentation
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "AgriCapital API Docs",
  })
);
app.get("/api/docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/cycles", cyclesRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    status: "error",
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  // Mongoose validation error
  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      status: "fail",
      message: messages.join(". "),
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      status: "fail",
      message: `Invalid ${err.path}: ${err.value}`,
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      status: "fail",
      message: `${field} already exists`,
    });
  }

  // Operational errors (ApiError)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // Unexpected errors
  console.error("UNEXPECTED ERROR:", err);
  res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
});

module.exports = app;
