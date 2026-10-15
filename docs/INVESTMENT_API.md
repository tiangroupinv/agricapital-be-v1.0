# Investment API Documentation

This document describes the investment endpoints and workflow for the AgriCapital Rwanda backend.

---

## Table of Contents

1. [Overview](#overview)
2. [Investment Lifecycle](#investment-lifecycle)
3. [API Endpoints](#api-endpoints)
   - [Initiate Investment](#initiate-investment)
   - [Confirm Investment](#confirm-investment)
4. [Authorization Matrix](#authorization-matrix)
5. [Validation Rules](#validation-rules)
6. [Usage Examples](#usage-examples)
7. [Error Responses](#error-responses)
8. [Related Documentation](#related-documentation)

---

## Overview

Investments represent financial contributions from investors to farming cycles. Each investment goes through a defined lifecycle from initiation to confirmation.

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Investment** | A financial contribution from an investor to a cycle |
| **Investor** | Individual or institution providing funds |
| **Cycle** | Agricultural funding cycle receiving the investment |
| **Payment Method** | How the investor pays (mobile money or bank transfer) |
| **Transaction Reference** | Unique identifier from payment provider |

### Investment Statuses

| Status | Description |
|--------|-------------|
| `pending` | Investment initiated, awaiting confirmation |
| `confirmed` | Investment verified and funds allocated to cycle |
| `failed` | Payment failed or transaction invalid |
| `refunded` | Investment was refunded to investor |

---

## Investment Lifecycle

```
pending → confirmed → (funds allocated to cycle)
         ↓
     failed → (payment issues, refund possible)
         ↓
    refunded → (funds returned to investor)
```

### Status Transition Rules

| From | To | Who Can Trigger | Prerequisites |
|------|-----|-----------------|---------------|
| `pending` | `confirmed` | Investor (own) or Admin (any) | Investor KYC verified/not_required, funding cap not exceeded |
| `pending` | `failed` | System/Payment Provider | Payment transaction fails validation |
| `confirmed` | `refunded` | Admin/Ops | Investment needs to be refunded (cycle cancelled, etc.) |

---

## API Endpoints

### Initiate Investment

**POST** `/api/investments`

Create a new investment in pending status.

**Access:** Investor only

**Request Body:**

```json
{
  "cycleId": "6789abcdef0123456789abcd",
  "amount": 500000,
  "paymentMethod": "momo",
  "transactionReference": "MTN-123456789"
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cycleId` | string (ObjectId) | Yes | Reference to the cycle being invested in |
| `amount` | number | Yes | Investment amount in RWF (must be > 0) |
| `paymentMethod` | string | Yes | One of: `momo`, `airtel_money`, `bank_transfer` |
| `transactionReference` | string | Yes | Unique transaction ID from payment provider (min 1 char) |

**Response (201 Created):**

```json
{
  "status": "success",
  "data": {
    "_id": "6789abcdef0123456789abce",
    "investorId": "1234567890abcdef12345678",
    "cycleId": "6789abcdef0123456789abcd",
    "amount": 500000,
    "paymentMethod": "momo",
    "transactionReference": "MTN-123456789",
    "status": "pending",
    "confirmedAt": null,
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-01-15T10:30:00.000Z"
  }
}
```

**Response Fields:**

| Field | Description |
|-------|-------------|
| `_id` | Investment ObjectId |
| `investorId` | Reference to the investor (User) |
| `cycleId` | Reference to the cycle being invested in |
| `amount` | Investment amount in RWF |
| `paymentMethod` | Payment method used |
| `transactionReference` | Transaction reference from payment provider |
| `status` | Current investment status (`pending`) |
| `confirmedAt` | Timestamp when investment was confirmed (null when pending) |
| `createdAt` | Investment creation timestamp |
| `updatedAt` | Last update timestamp |

---

### Confirm Investment

**POST** `/api/investments/:id/confirm`

Confirm a pending investment, moving it to confirmed status and allocating funds to the cycle.

**Access:** Investor (own investment) or Admin (any investment)

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string (ObjectId) | Yes | Investment ObjectId to confirm |

**Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "investment": {
      "_id": "6789abcdef0123456789abce",
      "investorId": "1234567890abcdef12345678",
      "cycleId": "6789abcdef0123456789abcd",
      "amount": 500000,
      "paymentMethod": "momo",
      "transactionReference": "MTN-123456789",
      "status": "confirmed",
      "confirmedAt": "2026-01-15T10:35:00.000Z",
      "createdAt": "2026-01-15T10:30:00.000Z",
      "updatedAt": "2026-01-15T10:35:00.000Z"
    },
    "cycleFunded": false
  }
}
```

**Response Fields:**

| Field | Description |
|-------|-------------|
| `investment` | The confirmed investment object (same fields as initiate response) |
| `investment.status` | Will be `confirmed` |
| `investment.confirmedAt` | Timestamp of confirmation |
| `cycleFunded` | Boolean indicating if the cycle is now fully funded (true/false) |

**When cycleFunded is true:**
- The cycle's status has automatically transitioned from `funding` to `funded`
- An audit log has been created for the cycle status change
- No additional action is needed from the investor

---

## Authorization Matrix

| Endpoint | Investor | Farmer | Field Agent | Admin |
|----------|----------|--------|-------------|-------|
| `POST /api/investments` | ✅ | ❌ | ❌ | ❌ |
| `POST /api/investments/:id/confirm` | ✅ (own only) | ❌ | ❌ | ✅ (any) |

**Notes:**
- Investors can only confirm their own investments
- Admins can confirm any investment (regardless of investor)
- Farmers and field agents cannot initiate or confirm investments

---

## Validation Rules

### Investment Initiation

| Field | Rule |
|-------|------|
| `cycleId` | Required, must be a valid 24-character hexadecimal string (ObjectId format), must reference an existing cycle |
| `amount` | Required, must be a positive number (> 0) |
| `paymentMethod` | Required, must be one of: `momo`, `airtel_money`, `bank_transfer` |
| `transactionReference` | Required, must be a non-empty string (trimmed, minimum 1 character) |

### Business Logic Validations (checked during initiation)

| Validation | Description |
|------------|-------------|
| **Investor Existence & Status** | Investor must exist and be active (`isActive: true`) |
| **Investor Role** | User must have `investor` role |
| **KYC Status** | Investor KYC must be `verified` or `not_required` |
| **Cycle Existence** | Referenced cycle must exist |
| **Cycle Status** | Cycle must be in `funding` or `funded` status (investable) |
| **Funding Cap** | Investment amount must not cause cycle to exceed targetAmount |
| **Duplicate Transaction** | TransactionReference must not be used by another pending or confirmed investment |

### Investment Confirmation Validations

| Validation | Description |
|------------|-------------|
| **Investment Existence** | Investment must exist |
| **Investment Status** | Investment must be in `pending` status |
| **Authorization** | Caller must be the investment's investor OR have `admin` role |
| **Investor KYC** | Investment's investor must have KYC status `verified` or `not_required` |
| **Funding Cap (Re-check)** | Investment amount must not cause cycle to exceed targetAmount (double-check) |

---

## Usage Examples

### Initiate an Investment

```bash
# Investor initiates investment using mobile money
curl -X POST http://localhost:5000/api/investments \
  -H "Authorization: Bearer $INVESTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cycleId": "6789abcdef0123456789abcd",
    "amount": 500000,
    "paymentMethod": "momo",
    "transactionReference": "MTN-123456789"
  }'

# Investor initiates investment using bank transfer
curl -X POST http://localhost:5000/api/investments \
  -H "Authorization: Bearer $INVESTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cycleId": "6789abcdef0123456789abcd",
    "amount": 1000000,
    "paymentMethod": "bank_transfer",
    "transactionReference": "BANK-20260115-001"
  }'
```

### Confirm an Investment (Investor)

```bash
# Investor confirms their own investment
curl -X POST http://localhost:5000/api/investments/6789abcdef0123456789abce/confirm \
  -H "Authorization: Bearer $INVESTOR_TOKEN"
```

### Confirm an Investment (Admin)

```bash
# Admin confirms any investment
curl -X POST http://localhost:5000/api/investments/6789abcdef0123456789abce/confirm \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### JavaScript/TypeScript Examples

```javascript
// Initiate investment
const initiateResponse = await fetch('/api/investments', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${investorToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    cycleId: '6789abcdef0123456789abcd',
    amount: 500000,
    paymentMethod: 'momo',
    transactionReference: 'MTN-123456789'
  })
});

const { data: investment } = await initiateResponse.json();
console.log(`Investment created: ${investment._id}`);

// Confirm investment (investor confirms own)
await fetch(`/api/investments/${investment._id}/confirm`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${investorToken}` }
});

// Confirm investment (admin confirms any)
await fetch(`/api/investments/${investment._id}/confirm`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
```

### Investor Workflow Example

```bash
# 1. Get investor token (login)
INVESTOR_TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "investor@example.com", "password": "password123"}' | jq -r .token)

# 2. List investable cycles to find opportunity
curl -X GET "http://localhost:5000/api/cycles/investable?type=crop&location=Musanze" \
  -H "Authorization: Bearer $INVESTOR_TOKEN"

# 3. Initiate investment in selected cycle
curl -X POST http://localhost:5000/api/investments \
  -H "Authorization: Bearer $INVESTOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cycleId": "6789abcdef0123456789abcd",
    "amount": 500000,
    "paymentMethod": "momo",
    "transactionReference": "MTN-123456789"
  }'

# 4. Confirm the investment (after payment processed)
INVESTMENT_ID="6789abcdef0123456789abce"  # From step 3 response
curl -X POST http://localhost:5000/api/investments/$INVESTMENT_ID/confirm \
  -H "Authorization: Bearer $INVESTOR_TOKEN"
```

---

## Error Responses

### 400 Bad Request

```json
{
  "status": "fail",
  "message": "amount must be greater than zero"
}
```

```json
{
  "status": "fail",
  "message": "paymentMethod must be one of: momo, airtel_money, bank_transfer"
}
```

```json
{
  "status": "fail",
  "message": "transactionReference cannot be empty"
}
```

```json
{
  "status": "fail",
  "message": "cycleId must be a valid ObjectId"
}
```

### 401 Unauthorized

```json
{
  "status": "error",
  "message": "Not authenticated"
}
```

### 403 Forbidden

```json
{
  "message": "You do not have permission to perform this action."
}
```

```json
{
  "message": "Only investors can make investments"
}
```

```json
{
  "message": "You do not have permission to confirm this investment."
}
```

### 404 Not Found

```json
{
  "status": "error",
  "message": "Investor not found"
}
```

```json
{
  "status": "error",
  "message": "Cycle not found"
}
```

```json
{
  "status": "error",
  "message": "Investment not found"
}
```

### 422 Unprocessable Entity

```json
{
  "status": "fail",
  "message": "Investment status must be 'pending' to confirm. Current status: confirmed."
}
```

```json
{
  "status": "fail",
  "message": "Investor KYC status is pending. Must be verified or not_required to invest."
}
```

```json
{
  "status": "fail",
  "message": "Investor KYC status is rejected. Must be verified or not_required to invest."
}
```

```json
{
  "status": "fail",
  "message": "Investment of 600000 would exceed cycle targetAmount of 500000 (fundedAmount: 0)"
}
```

```json
{
  "status": "fail",
  "message": "Transaction reference MTN-123456789 has already been used"
}
```

### 409 Conflict

```json
{
  "status": "fail",
  "message": "Transaction reference MTN-123456789 has already been used for a confirmed investment"
}
```

---

## Related Documentation

- [Authentication API](./AUTHENTICATION.md) — Auth endpoints and RBAC
- [Cycle Management API](./CYCLE_MANAGEMENT_API.md) — Cycle endpoints and workflow
- [Database Design](./AgriCapital_DB_Design_and_Workflow.md) — Schema details and validation rules
- [Swagger UI](./src/config/swagger.js) — OpenAPI/Swagger configuration source