# Field Agent Farmer Onboarding API Documentation

This document describes the farmer profile management endpoints for the AgriCapital Rwanda backend. Field Agents can create, read, update, and list farmer profiles on behalf of farmers in their assigned region.

---

## Table of Contents

1. [Overview](#overview)
2. [Access Control](#access-control)
3. [Farmer Profile Structure](#farmer-profile-structure)
4. [API Endpoints](#api-endpoints)
5. [Error Responses](#error-responses)
6. [Audit Logging](#audit-logging)

---

## Overview

The Field Agent Farmer Onboarding module provides endpoints for Field Agents (and Admins) to:
- Create new farmer profiles with embedded `farmerProfile` data
- Update existing farmer profiles (full or partial updates)
- Retrieve individual farmer profiles by ID
- List all farmers with pagination

All farmer profile data is stored within the `users` collection with `role: "farmer"`. The `farmerProfile` object (containing `location`, `farmType`, and `cooperativeName`) is embedded directly within the user document, as defined in the MongoDB design.

---

## Access Control

All farmer management endpoints require:
1. **Authentication** - Valid JWT token in `Authorization: Bearer <token>` header
2. **Authorization** - User must have role `field_agent` or `admin`

| Role | Access |
|------|--------|
| `field_agent` | Full access (create, read, update, list) |
| `admin` | Full access |
| `investor` | 403 Forbidden |
| `farmer` | 403 Forbidden |
| Unauthenticated | 401 Unauthorized |

---

## Farmer Profile Structure

### Farmer Fields

When a farmer is created, the following fields are stored:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | string | Yes | Always `"farmer"` (set by system) |
| `fullName` | string | Yes | Full name, max 200 characters |
| `email` | string | Yes | Unique email address |
| `phone` | string | Yes | Unique phone in E.164 format (`+XXXXXXXXXXXXX`, 12-15 digits) |
| `idDocumentNumber` | string | Yes | National ID document number |
| `kycStatus` | string | Yes | Set to `"not_required"` by default |
| `farmerProfile.location` | string | Yes | Farm location, max 200 characters |
| `farmerProfile.farmType` | string | Yes | One of: `"crop"`, `"livestock"` |
| `farmerProfile.cooperativeName` | string | No | Cooperative name if applicable |
| `paymentDetails.momoNumber` | string | No | Mobile money number |
| `paymentDetails.bankAccount` | string | No | Bank account number |
| `isActive` | boolean | Yes | Default `true` |
| `createdAt` | Date | Yes | Auto-generated |
| `updatedAt` | Date | Yes | Auto-generated |

**Excluded from all responses:** `passwordHash`

---

## API Endpoints

### Create Farmer Profile

**POST** `/api/farmers`

Create a new farmer profile on behalf of a farmer.

**Access:** Private (Field Agent, Admin)

**Request Body:**

```json
{
  "fullName": "Jean Baptiste",
  "email": "jean.baptiste@example.com",
  "phone": "+250788123456",
  "password": "SecurePass123",
  "idDocumentNumber": "11987654321",
  "farmerProfile": {
    "location": "Musanze District, Rwanda",
    "farmType": "crop",
    "cooperativeName": "Musanze Farmers Cooperative"
  }
}
```

**Field Validation:**

| Field | Validation Rules |
|-------|-----------------|
| `fullName` | Non-empty string, max 200 characters |
| `email` | Valid email format |
| `phone` | Pattern: `^\+\d{12,15}$` (12-15 digits with country code) |
| `password` | Minimum 8 characters |
| `idDocumentNumber` | Non-empty string |
| `farmerProfile.location` | Non-empty string, max 200 characters |
| `farmerProfile.farmType` | Must be `"crop"` or `"livestock"` |
| `farmerProfile.cooperativeName` | Optional string |

**Response (201 Created):**

```json
{
  "status": "success",
  "data": {
    "_id": "6789abcdef0123456789efgh",
    "role": "farmer",
    "fullName": "Jean Baptiste",
    "email": "jean.baptiste@example.com",
    "phone": "+250788123456",
    "idDocumentNumber": "11987654321",
    "kycStatus": "not_required",
    "farmerProfile": {
      "location": "Musanze District, Rwanda",
      "farmType": "crop",
      "cooperativeName": "Musanze Farmers Cooperative"
    },
    "isActive": true,
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-15T10:00:00.000Z"
  }
}
```

---

### Get Farmer by ID

**GET** `/api/farmers/:id`

Retrieve a single farmer profile by user ID.

**Access:** Private (Field Agent, Admin)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | MongoDB ObjectId of the farmer user |

**Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "_id": "6789abcdef0123456789efgh",
    "role": "farmer",
    "fullName": "Jean Baptiste",
    "email": "jean.baptiste@example.com",
    "phone": "+250788123456",
    "idDocumentNumber": "11987654321",
    "kycStatus": "not_required",
    "farmerProfile": {
      "location": "Musanze District, Rwanda",
      "farmType": "crop",
      "cooperativeName": "Musanze Farmers Cooperative"
    },
    "isActive": true,
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-15T10:00:00.000Z"
  }
}
```

---

### Update Farmer Profile

**PATCH** `/api/farmers/:id`

Update an existing farmer profile. Supports partial updates — only the fields provided in the request body will be updated.

**Access:** Private (Field Agent, Admin)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | MongoDB ObjectId of the farmer user |

**Request Body:**

```json
{
  "fullName": "Jean Baptiste Updated",
  "phone": "+250788987654",
  "idDocumentNumber": "11987654321",
  "paymentDetails": {
    "momoNumber": "+250788987654",
    "bankAccount": "1234567890"
  },
  "farmerProfile": {
    "location": "Rubavu District, Rwanda",
    "farmType": "livestock",
    "cooperativeName": "Rubavu Livestock Co-op"
  }
}
```

**Allowed Fields for Update:**
- `fullName` — non-empty string, max 200 characters
- `phone` — E.164 format (`+XXXXXXXXXXXXX`)
- `idDocumentNumber` — non-empty string
- `paymentDetails` — object with `momoNumber` and/or `bankAccount`
- `farmerProfile` — object with `location`, `farmType`, and/or `cooperativeName`
  - `farmType` must be `"crop"` or `"livestock"`

**Forbidden Fields (will return 400):**
- `role` — role cannot be changed through this endpoint
- `passwordHash` — password cannot be set through this endpoint

**Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "_id": "6789abcdef0123456789efgh",
    "role": "farmer",
    "fullName": "Jean Baptiste Updated",
    "email": "jean.baptiste@example.com",
    "phone": "+250788987654",
    "idDocumentNumber": "11987654321",
    "kycStatus": "not_required",
    "farmerProfile": {
      "location": "Rubavu District, Rwanda",
      "farmType": "livestock",
      "cooperativeName": "Rubavu Livestock Co-op"
    },
    "paymentDetails": {
      "momoNumber": "+250788987654",
      "bankAccount": "1234567890"
    },
    "isActive": true,
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-15T10:05:00.000Z"
  }
}
```

---

### List Farmers

**GET** `/api/farmers`

List all farmers with pagination support.

**Access:** Private (Field Agent, Admin)

**Query Parameters:**

| Parameter | Type | Default | Constraints | Description |
|-----------|------|---------|-------------|-------------|
| `page` | integer | `1` | Minimum: 1 | Page number |
| `limit` | integer | `20` | Minimum: 1, Maximum: 100 | Items per page |

**Example:** `GET /api/farmers?page=2&limit=10`

**Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "farmers": [
      {
        "_id": "6789abcdef0123456789efgh",
        "role": "farmer",
        "fullName": "Farmer Two",
        "email": "farmer2@example.com",
        "phone": "+250788222222",
        "idDocumentNumber": "11987654322",
        "kycStatus": "not_required",
        "farmerProfile": {
          "location": "Musanze",
          "farmType": "crop"
        },
        "isActive": true,
        "createdAt": "2026-01-15T10:00:00.000Z",
        "updatedAt": "2026-01-15T10:00:00.000Z"
      },
      "..."
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "pages": 3
    }
  }
}
```

**Notes:**
- Results are sorted by `createdAt` in descending order (newest first)
- Only users with `role: "farmer"` are returned
- `passwordHash` is excluded from every farmer in the response

---

## Error Responses

All errors follow this format:

```json
{
  "status": "fail",
  "message": "Descriptive error message"
}
```

### 400 Bad Request

Returned when request data fails validation.

```json
{
  "status": "fail",
  "message": "fullName cannot be empty. email must be a valid email format."
}
```

Also returned for:
- Invalid MongoDB ObjectId format in URL parameter
- Requesting a user that exists but is not a farmer
- Attempting to update the `role` field

### 401 Unauthorized

Returned when authentication is missing or invalid.

```json
{
  "status": "fail",
  "message": "You are not logged in. Please log in to access this resource."
}
```

### 403 Forbidden

Returned when an authenticated user lacks the required role.

```json
{
  "status": "fail",
  "message": "You do not have permission to perform this action."
}
```

### 404 Not Found

Returned when the requested farmer ID does not exist.

```json
{
  "status": "fail",
  "message": "Farmer not found"
}
```

### 409 Conflict

Returned when creating or updating with an email or phone that already exists.

```json
{
  "status": "fail",
  "message": "Email already registered"
}
```

or

```json
{
  "status": "fail",
  "message": "Phone number already registered"
}
```

---

## Audit Logging

All farmer management operations create audit log entries in the `auditLogs` collection.

### Farmer Creation

```json
{
  "actorId": "ObjectId (field_agent)",
  "action": "farmer.created",
  "entityType": "user",
  "entityId": "ObjectId (new farmer)",
  "newValue": {
    "fullName": "Jean Baptiste",
    "email": "jean.baptiste@example.com",
    "phone": "+250788123456",
    "idDocumentNumber": "11987654321",
    "kycStatus": "not_required",
    "farmerProfile": {
      "location": "Musanze District, Rwanda",
      "farmType": "crop",
      "cooperativeName": "Musanze Farmers Cooperative"
    },
    "role": "farmer"
  }
}
```

### Farmer Update

```json
{
  "actorId": "ObjectId (field_agent)",
  "action": "farmer.updated",
  "entityType": "user",
  "entityId": "ObjectId (farmer)",
  "oldValue": {
    "fullName": "Original Name",
    "phone": "+250788123456",
    "idDocumentNumber": "11987654321",
    "paymentDetails": { "momoNumber": "+250788123456", "bankAccount": null },
    "farmerProfile": {
      "location": "Old Location",
      "farmType": "crop",
      "cooperativeName": "Old Cooperative"
    }
  },
  "newValue": {
    "fullName": "Updated Name",
    "phone": "+250788987654",
    "idDocumentNumber": "11987654321",
    "paymentDetails": { "momoNumber": "+250788987654", "bankAccount": "1234567890" },
    "farmerProfile": {
      "location": "New Location",
      "farmType": "livestock",
      "cooperativeName": "New Cooperative"
    }
  }
}
```

### Audit Log Immutability

- Audit log documents are immutable — all updates and deletions are prevented by Mongoose middleware (pre-hooks on `updateOne`, `updateMany`, `findOneAndUpdate`, `deleteOne`, `deleteMany`, `findOneAndDelete`)
- User creation and audit log insertion are wrapped in a **MongoDB session transaction** for atomicity
- If any step fails, the entire operation is rolled back

---

## Business Rules

1. **kycStatus** is always set to `"not_required"` for new farmers — no KYC process required for farmers
2. **role** is always set to `"farmer"` during creation — cannot be changed via update endpoint
3. **farmerProfile** is required during creation and must contain `location` and `farmType`
4. **Email and phone** are globally unique — duplicate values return 409 Conflict
5. **passwordHash** is never returned in any API response
6. **Audit trails** are mandatory for all create and update operations