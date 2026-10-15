# Investor KYC Profile API Documentation

This document describes the KYC (Know Your Customer) profile management endpoints for the AgriCapital Rwanda backend.

---

## Table of Contents

1. [Overview](#overview)
2. [KYC Status](#kyc-status)
3. [API Endpoints](#api-endpoints)
4. [Error Responses](#error-responses)
5. [Audit Logging](#audit-logging)
6. [KYC Gate for Investment Confirmation](#kyc-gate-for-investment-confirmation)

---

## Overview

The KYC module provides endpoints for:
- Investors to submit and update their KYC profile data
- Admins to review and update investor KYC status
- Investment confirmation with KYC verification gate

All KYC changes are logged to the `auditLogs` collection for compliance with Rwanda's Data Protection Law (Law n°058/2021).

---

## KYC Status

An investor's `kycStatus` can be one of:

| Status | Description |
|--------|-------------|
| `not_required` | Default for new users (non-investor roles) |
| `pending` | Investor has submitted KYC data, awaiting review |
| `verified` | Admin has verified the investor's KYC data |
| `rejected` | Admin has rejected the investor's KYC data |

---

## API Endpoints

### Submit/Update Investor KYC Profile

**PATCH** `/api/kyc/:id`

Submit or update KYC profile data. Investor-only endpoint.

**Access:** Private (investor only, must be own profile)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | User ID of the investor |

**Request Body:**

```json
{
  "fullName": "Amina Uwase",
  "idDocumentNumber": "1199780123456789",
  "phone": "+250788123456",
  "paymentDetails": {
    "momoNumber": "+250788123456",
    "bankAccount": null
  }
}
```

**Allowed Fields:**
- `fullName` — non-empty string, max 100 characters
- `idDocumentNumber` — non-empty string, max 50 characters
- `phone` — E.164 format (e.g., `+250788123456`)
- `paymentDetails` — object with `momoNumber` and/or `bankAccount`

**Forbidden Fields** (will return 400):
- `role`, `passwordHash`, `kycStatus`, `email`, `isActive`

**Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "_id": "6789abcdef...",
    "fullName": "Amina Uwase",
    "idDocumentNumber": "1199780123456789",
    "phone": "+250788123456",
    "paymentDetails": {
      "momoNumber": "+250788123456",
      "bankAccount": null
    },
    "kycStatus": "pending"
  }
}
```

**Behavior:**
- If `kycStatus` is `not_required`, transitions to `pending`
- If `kycStatus` is `pending` or `rejected`, updates fields without changing status
- If `kycStatus` is `verified`, rejects with 409

---

### Get Investor KYC Profile

**GET** `/api/kyc/:id`

Retrieve an investor's KYC profile.

**Access:** Private (owner or admin)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | User ID of the investor |

**Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "_id": "6789abcdef...",
    "fullName": "Amina Uwase",
    "idDocumentNumber": "1199780123456789",
    "phone": "+250788123456",
    "paymentDetails": {
      "momoNumber": "+250788123456",
      "bankAccount": null
    },
    "kycStatus": "pending"
  }
}
```

**Note:** Fields that have never been set are returned as `null`. The response never includes `passwordHash`, `email`, `role`, or `isActive`.

---

### Update Investor KYC Status (Admin Review)

**PATCH** `/api/kyc/:id/status`

Update an investor's KYC status after review.

**Access:** Private (admin only)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | User ID of the investor |

**Request Body:**

```json
{
  "kycStatus": "verified"
}
```

**Allowed Values:** `pending`, `verified`, `rejected`

**Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "_id": "6789abcdef...",
    "role": "investor",
    "fullName": "Amina Uwase",
    "email": "amina@example.com",
    "phone": "+250788123456",
    "kycStatus": "verified"
  }
}
```

---

### Confirm Investment (KYC Gate)

**POST** `/api/investments/:id/confirm`

Confirm an investment. Enforces KYC verification gate.

**Access:** Private (admin only)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Investment ID |

**Response (200 OK):**

```json
{
  "status": "success",
  "message": "Investment confirmed",
  "data": {
    "_id": "6789abcdef...",
    "investorId": "6789abcdef...",
    "cycleId": "6789abcdef...",
    "amount": 500000,
    "status": "confirmed",
    "confirmedAt": "2026-01-15T10:00:00.000Z"
  }
}
```

**KYC Gate Behavior:**
- Investment must have `status: "pending"`
- Linked investor must have `kycStatus: "verified"`
- If KYC not verified, returns 422

---

## Error Responses

### 400 Bad Request

```json
{
  "status": "fail",
  "message": "At least one KYC field must be provided."
}
```

```json
{
  "status": "fail",
  "message": "Field 'role' cannot be updated through this endpoint."
}
```

```json
{
  "status": "fail",
  "message": "phone must be in E.164 format (e.g. +250788123456)."
}
```

### 401 Unauthorized

```json
{
  "message": "You are not logged in. Please log in to access this resource."
}
```

### 403 Forbidden

```json
{
  "message": "This endpoint is for investors only."
}
```

```json
{
  "message": "You do not have permission to update this profile."
}
```

### 404 Not Found

```json
{
  "message": "User not found."
}
```

### 409 Conflict

```json
{
  "message": "KYC already verified. Contact support to update your profile."
}
```

```json
{
  "message": "Phone number already registered."
}
```

### 422 Unprocessable Entity

```json
{
  "message": "Investor KYC is not verified. Investment cannot be confirmed."
}
```

```json
{
  "message": "Investment status must be 'pending' to confirm. Current status: confirmed."
}
```

---

## Audit Logging

All KYC changes are recorded in the `auditLogs` collection:

### KYC Profile Submission

```json
{
  "actorId": "ObjectId (investor)",
  "action": "kyc.submitted",
  "entityType": "user",
  "entityId": "ObjectId (investor)",
  "oldValue": "not_required",
  "newValue": "pending"
}
```

### KYC Profile Update

```json
{
  "actorId": "ObjectId (investor)",
  "action": "kyc.profile_updated",
  "entityType": "user",
  "entityId": "ObjectId (investor)",
  "oldValue": { "fullName": "Old Name" },
  "newValue": { "fullName": "New Name" }
}
```

### KYC Status Update (Admin)

```json
{
  "actorId": "ObjectId (admin)",
  "action": "kyc.status_updated",
  "entityType": "user",
  "entityId": "ObjectId (investor)",
  "oldValue": "pending",
  "newValue": "verified"
}
```

Audit log writes are fire-and-forget (failures logged to `console.error`, never bubble to caller).

---

## KYC Gate for Investment Confirmation

Investments can only be confirmed if:
1. Investment `status` is `pending`
2. Linked investor's `kycStatus` is `verified`

This gate is enforced in the `confirmInvestment` service function and is non-negotiable per the PRD and Rwanda's KYC compliance requirements.
