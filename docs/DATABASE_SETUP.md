# Database Setup Guide

This guide explains how to set up and configure the MongoDB database for the AgriCapital Rwanda backend.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Local Development Setup](#local-development-setup)
4. [MongoDB Atlas Setup](#mongodb-atlas-setup)
5. [Database Connection](#database-connection)
6. [Schema Validators](#schema-validators)
7. [Indexes](#indexes)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js v18+ installed
- MongoDB Atlas account (recommended) or local MongoDB instance
- npm or yarn package manager

---

## Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` or `production` |
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/agricapital_dev` |
| `JWT_SECRET` | Secret for JWT tokens | `your-secure-secret-here` |

### Example `.env` File

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster0.mongodb.net/agricapital_dev
JWT_SECRET=your-jwt-secret-here
```

---

## Local Development Setup

### Option 1: MongoDB Atlas (Recommended)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster (free tier is sufficient for development)
3. Create a database user with read/write permissions
4. Whitelist your IP address (or use `0.0.0.0/0` for development)
5. Get your connection string from the Atlas dashboard
6. Add the connection string to your `.env` file as `MONGODB_URI`

### Option 2: Local MongoDB Installation

1. Install MongoDB Community Edition:
   - **macOS**: `brew install mongodb-community`
   - **Ubuntu**: `sudo apt-get install mongodb`
   - **Windows**: Download from [MongoDB website](https://www.mongodb.com/try/download/community)

2. Start MongoDB:
   ```bash
   # macOS
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongodb
   
   # Windows
   net start MongoDB
   ```

3. Update your `.env`:
   ```env
   MONGODB_URI=mongodb://localhost:27017/agricapital_dev
   ```

---

## MongoDB Atlas Setup

### Creating a Cluster

1. Log in to [MongoDB Atlas](https://cloud.mongodb.com)
2. Click **Build a Database**
3. Choose **M0 FREE** tier for development
4. Select a cloud provider and region close to you
5. Name your cluster (e.g., `agricapital-cluster`)

### Creating a Database User

1. Go to **Database Access** in the left sidebar
2. Click **Add New Database User**
3. Choose **Password** authentication
4. Enter a username and secure password
5. Set privileges to **Read and write to any database**
6. Click **Add User**

### Whitelisting IP Addresses

1. Go to **Network Access** in the left sidebar
2. Click **Add IP Address**
3. For development, click **Allow Access from Anywhere** (or add your specific IP)
4. Click **Confirm**

### Getting the Connection String

1. Go to **Database** in the left sidebar
2. Click **Connect** on your cluster
3. Choose **Connect your application**
4. Select your Node.js version
5. Copy the connection string
6. Replace `<password>` with your database user password
7. Add to your `.env` file

---

## Database Connection

The database connection is handled by `src/database/index.js`.

### How It Works

1. **Connection**: Connects to MongoDB using `MONGODB_URI`
2. **Validators**: Applies JSON Schema validators to all collections
3. **Indexes**: Syncs Mongoose schema indexes in non-production environments

### Starting the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

### Expected Output

```
✅ MongoDB connected successfully
  ✓ Created collection with validator: users
  ✓ Created collection with validator: cycles
  ✓ Created collection with validator: investments
  ✓ Created collection with validator: disbursements
  ✓ Created collection with validator: progressupdates
  ✓ Created collection with validator: payouts
  ✓ Created collection with validator: auditlogs
  ✓ Created collection with validator: notifications
✅ All validators applied successfully
  ✓ Synced indexes for: User
  ✓ Synced indexes for: Cycle
  ✓ Synced indexes for: Investment
  ✓ Synced indexes for: Disbursement
  ✓ Synced indexes for: ProgressUpdate
  ✓ Synced indexes for: Payout
  ✓ Synced indexes for: AuditLog
  ✓ Synced indexes for: Notification
✅ All indexes synced successfully
Server running on port 5000
```

---

## Schema Validators

MongoDB schema validators enforce data integrity at the database level using `$jsonSchema`.

### Location

Validators are defined in `src/database/validators/`:

```
src/database/validators/
├── users.validator.js
├── cycles.validator.js
├── investments.validator.js
├── disbursements.validator.js
├── progressUpdates.validator.js
├── payouts.validator.js
├── auditLogs.validator.js
├── notifications.validator.js
└── index.js
```

### How Validators Are Applied

Validators are applied when the server starts in `database/index.js`:

1. Check if collection exists
2. If exists: modify with `collMod` command
3. If not exists: create with `createCollection` command

### Validation Rules

| Collection | Key Validations |
|------------|-----------------|
| `users` | Role enum, KYC status enum, required fields |
| `cycles` | Type/purpose/status enums, embedded schemas |
| `investments` | Payment method/status enums, min amount |
| `disbursements` | Method/status enums, min amount |
| `progressUpdates` | Update type enum, required fields |
| `payouts` | Status enum, min values on all financial fields |
| `auditLogs` | Append-only structure |
| `notifications` | Type/channel/status enums |

---

## Indexes

Indexes are defined in each Mongoose schema and synced on startup in non-production environments.

### Available Indexes

| Collection | Index | Type | Purpose |
|------------|-------|------|---------|
| `users` | `email` | Unique | Login, duplicate prevention |
| `users` | `phone` | Unique | Login, duplicate prevention |
| `cycles` | `status` | Single | Filter cycles |
| `cycles` | `farmerId` | Single | Cycles per farmer |
| `investments` | `cycleId` | Single | Investments per cycle |
| `investments` | `investorId` | Single | Investments per investor |
| `disbursements` | `cycleId` | Single | Disbursements per cycle |
| `progressUpdates` | `cycleId` | Single | Updates per cycle |
| `progressUpdates` | `cycleId + visitDate` | Compound | Sorted timeline |
| `payouts` | `cycleId` | Single | Payouts per cycle |
| `payouts` | `investorId` | Single | Payouts per investor |
| `auditLogs` | `entityType + entityId` | Compound | Compliance lookups |
| `notifications` | `userId` | Single | Notifications per user |

### Manual Index Sync

If you need to manually sync indexes:

```javascript
// In a script or REPL
const mongoose = require('mongoose');
const { syncIndexes } = require('./src/database');

await mongoose.connect(process.env.MONGODB_URI);
await syncIndexes();
```

---

## Testing

Tests use `mongodb-memory-server` for isolated test runs without a live database connection.

### Running Tests

```bash
# Run all tests
npm test

# Run with verbose output
npm test -- --verbose

# Run specific test file
npm test -- test/models/users.test.js

# Run with coverage
npm test -- --coverage
```

### Test Database Configuration

Test database setup is in `test/setup/`:

- `testDatabase.js` - MongoMemoryServer connection/disconnect
- `globalSetup.js` - Jest beforeAll/afterAll hooks

---

## Troubleshooting

### Connection Errors

**Error**: `MONGODB_URI environment variable is not defined`
- **Solution**: Ensure `.env` file exists and `MONGODB_URI` is set

**Error**: `MongoServerError: Authentication failed`
- **Solution**: Check username and password in connection string

**Error**: `MongoServerError: connection refused`
- **Solution**: Ensure MongoDB is running (local) or IP is whitelisted (Atlas)

### Validator Errors

**Error**: `Document failed validation`
- **Solution**: Check document matches the JSON Schema validator for that collection
- Use MongoDB Compass to view validator rules

### Index Errors

**Error**: `E11000 duplicate key error`
- **Solution**: Document with same unique field value already exists
- Check `email` or `phone` uniqueness for users

### Resetting the Database

**Warning**: This will delete all data!

```javascript
// In a script or REPL
const mongoose = require('mongoose');

await mongoose.connect(process.env.MONGODB_URI);
await mongoose.connection.dropDatabase();
await mongoose.disconnect();
```

### Viewing Data in MongoDB Compass

1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Connect using your `MONGODB_URI`
3. Navigate to your database (`agricapital_dev`)
4. Browse collections, view documents, and check indexes

---

## Additional Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [MongoDB Schema Validation](https://www.mongodb.com/docs/manual/core/schema-validation/)
- [AgriCapital Database Design](./AgriCapital_DB_Design_and_Workflow.md)
