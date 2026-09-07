# Cycle Management API Documentation

This document describes the cycle management endpoints and workflow for the AgriCapital Rwanda backend.

---

## Table of Contents

1. [Overview](#overview)
2. [Status Workflow](#status-workflow)
3. [API Endpoints](#api-endpoints)
4. [Authorization Matrix](#authorization-matrix)
5. [Validation Rules](#validation-rules)
6. [Usage Examples](#usage-examples)

---

## Overview

Cycles represent agricultural funding cycles for farmers. Each cycle goes through a defined status workflow from creation to completion.

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Cycle** | An agricultural funding cycle for a farmer |
| **Field Agent** | Creates and manages cycles on behalf of farmers |
| **Admin** | Reviews, approves, and manages cycle lifecycle |
| **Off-Taker Agreement** | Buyer contract required for cycle approval |
| **Target Amount** | Funding goal in Rwandan Francs (RWF) |

---

## Status Workflow

```
draft → under_review → approved → funding → funded → in_progress → completed → closed
            ↓            ↓         ↓
        cancelled    cancelled  cancelled
```

### Status Definitions

| Status | Description | Entry Conditions |
|--------|-------------|------------------|
| `draft` | Initial state, being created | Field agent starts cycle |
| `under_review` | Submitted for admin review | Field agent submits |
| `approved` | Approved by admin | Admin approves with off-taker agreement |
| `funding` | Open for investor funding | Admin publishes |
| `funded` | Fully funded by investors | System (auto) when target reached |
| `in_progress` | Active farming cycle | System (auto) on first disbursement |
| `completed` | Harvest completed, sale recorded | Admin records final sale amount |
| `closed` | All payouts processed | System (auto) |
| `cancelled` | Abandoned | Admin cancels with reason |

### Transition Rules

| From | To | Who Can Trigger | Prerequisites |
|------|-----|-----------------|---------------|
| `draft` | `under_review` | Field Agent (owner) | All required fields filled |
| `under_review` | `approved` | Admin | Off-taker agreement complete |
| `under_review` | `cancelled` | Admin | Reason required |
| `approved` | `funding` | Admin | — |
| `approved` | `cancelled` | Admin | Reason required |
| `funding` | `funded` | System | fundedAmount >= targetAmount |
| `funding` | `cancelled` | Admin | Reason required, investments refunded |
| `funded` | `in_progress` | System | First disbursement created |
| `in_progress` | `completed` | Admin | Final sale amount entered |
| `completed` | `closed` | System | All payouts processed |

---

## API Endpoints

### Create Cycle

**POST** `/api/cycles`

Create a new cycle in draft status.

**Access:** Field Agent, Admin

**Request Body:**

```json
{
  "farmerId": "6789abcdef...",
  "type": "crop",
  "purpose": "seeds",
  "targetAmount": 500000,
  "location": "Musanze District",
  "expectedStartDate": "2026-02-01T00:00:00.000Z",
  "expectedEndDate": "2026-07-01T00:00:00.000Z",
  "offTakerAgreement": {
    "buyerName": "Rwanda Trading Company",
    "buyerType": "exporter",
    "product": "Maize",
    "pricePerUnit": 350,
    "quantity": 1000,
    "contractReference": "RTC-2024-001"
  }
}
```

**Response (201 Created):**

```json
{
  "status": "success",
  "data": {
    "_id": "6789abcdef...",
    "farmerId": "6789abcdef...",
    "fieldAgentIds": ["6789abcdef..."],
    "type": "crop",
    "purpose": "seeds",
    "targetAmount": 500000,
    "fundedAmount": 0,
    "status": "draft",
    "location": "Musanze District",
    "createdAt": "2026-01-15T10:00:00.000Z"
  }
}
```

---

### List Cycles

**GET** `/api/cycles`

List all cycles with filtering and pagination.

**Access:** All authenticated users

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `farmerId` | string | Filter by farmer ID |
| `fieldAgentId` | string | Filter by field agent ID |
| `type` | string | Filter by type (`crop`, `livestock`) |
| `purpose` | string | Filter by purpose |
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Items per page (default: 20) |

**Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "cycles": [
      {
        "_id": "6789abcdef...",
        "farmerId": { "_id": "...", "fullName": "Farmer Joe" },
        "type": "crop",
        "status": "draft",
        "targetAmount": 500000
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "pages": 3
    }
  }
}
```

---

### Get Cycle

**GET** `/api/cycles/:id`

Get a single cycle by ID.

**Access:** All authenticated users

**Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "_id": "6789abcdef...",
    "farmerId": {
      "_id": "6789abcdef...",
      "fullName": "Farmer Joe",
      "email": "farmer@example.com",
      "farmerProfile": { "location": "Musanze" }
    },
    "fieldAgentIds": [{ "_id": "...", "fullName": "Agent Smith" }],
    "type": "crop",
    "purpose": "seeds",
    "targetAmount": 500000,
    "fundedAmount": 0,
    "status": "draft",
    "location": "Musanze District",
    "offTakerAgreement": { ... },
    "insurance": { ... }
  }
}
```

---

### Update Cycle

**PATCH** `/api/cycles/:id`

Update a cycle. Only draft cycles can be updated.

**Access:** Field Agent (owner), Admin

**Request Body:**

```json
{
  "targetAmount": 600000,
  "location": "Updated Location"
}
```

**Response (200 OK):**

```json
{
  "status": "success",
  "data": { /* updated cycle */ }
}
```

**Error (400 Bad Request):**

```json
{
  "status": "fail",
  "message": "Cannot update cycle with status 'under_review'. Only drafts can be updated."
}
```

---

### Submit for Review

**POST** `/api/cycles/:id/submit`

Submit a draft cycle for admin review.

**Access:** Field Agent (owner only)

**Response (200 OK):**

```json
{
  "status": "success",
  "message": "Cycle submitted for review",
  "data": {
    "status": "under_review"
  }
}
```

---

### Approve Cycle

**POST** `/api/cycles/:id/approve`

Approve a cycle that is under review.

**Access:** Admin only

**Prerequisites:** Off-taker agreement must be complete (buyerName, buyerType, product, pricePerUnit, quantity).

**Response (200 OK):**

```json
{
  "status": "success",
  "message": "Cycle approved",
  "data": {
    "status": "approved",
    "approvedAt": "2026-01-15T12:00:00.000Z"
  }
}
```

---

### Reject Cycle

**POST** `/api/cycles/:id/reject`

Reject a cycle that is under review.

**Access:** Admin only

**Request Body:**

```json
{
  "reason": "Farmer documentation incomplete"
}
```

**Response (200 OK):**

```json
{
  "status": "success",
  "message": "Cycle rejected",
  "data": {
    "status": "cancelled",
    "cancellationReason": "Farmer documentation incomplete"
  }
}
```

---

### Publish for Funding

**POST** `/api/cycles/:id/publish`

Publish an approved cycle for investor funding.

**Access:** Admin only

**Response (200 OK):**

```json
{
  "status": "success",
  "message": "Cycle published for funding",
  "data": {
    "status": "funding"
  }
}
```

---

### Cancel Cycle

**POST** `/api/cycles/:id/cancel`

Cancel a cycle from any cancellable status.

**Access:** Admin only

**Request Body:**

```json
{
  "reason": "Farmer withdrew from program"
}
```

**Response (200 OK):**

```json
{
  "status": "success",
  "message": "Cycle cancelled",
  "data": {
    "status": "cancelled",
    "cancellationReason": "Farmer withdrew from program"
  }
}
```

---

### Complete Cycle

**POST** `/api/cycles/:id/complete`

Mark a cycle as completed with final sale amount.

**Access:** Admin only

**Request Body:**

```json
{
  "finalSaleAmount": 850000
}
```

**Response (200 OK):**

```json
{
  "status": "success",
  "message": "Cycle completed",
  "data": {
    "status": "completed",
    "finalSaleAmount": 850000,
    "completedAt": "2026-07-15T10:00:00.000Z"
  }
}
```

---

## Authorization Matrix

| Endpoint | Investor | Farmer | Field Agent | Admin |
|----------|----------|--------|-------------|-------|
| `POST /api/cycles` | ❌ | ❌ | ✅ | ✅ |
| `GET /api/cycles` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/cycles/:id` | ✅ | ✅ | ✅ | ✅ |
| `PATCH /api/cycles/:id` | ❌ | ❌ | Owner only | ✅ |
| `POST /api/cycles/:id/submit` | ❌ | ❌ | Owner only | ❌ |
| `POST /api/cycles/:id/approve` | ❌ | ❌ | ❌ | ✅ |
| `POST /api/cycles/:id/reject` | ❌ | ❌ | ❌ | ✅ |
| `POST /api/cycles/:id/publish` | ❌ | ❌ | ❌ | ✅ |
| `POST /api/cycles/:id/cancel` | ❌ | ❌ | ❌ | ✅ |
| `POST /api/cycles/:id/complete` | ❌ | ❌ | ❌ | ✅ |

---

## Validation Rules

### Cycle Creation

| Field | Rule |
|-------|------|
| `farmerId` | Required, must reference a user with `farmer` role |
| `type` | Required, one of: `crop`, `livestock` |
| `purpose` | Required, one of: `feeds`, `vaccines`, `seeds`, `fertilizer`, `other` |
| `targetAmount` | Required, minimum 10,000 RWF |
| `location` | Required |
| `expectedStartDate` | Cannot be in the past |
| `expectedEndDate` | Must be after `expectedStartDate` |

### Off-Taker Agreement (for approval)

| Field | Rule |
|-------|------|
| `buyerName` | Required |
| `buyerType` | Required, one of: `hotel`, `school`, `factory`, `exporter`, `supermarket`, `other` |
| `product` | Required |
| `pricePerUnit` | Required, must be positive |
| `quantity` | Required, must be positive |

---

## Usage Examples

### Complete Cycle Lifecycle

```bash
# 1. Field agent creates cycle
curl -X POST http://localhost:5000/api/cycles \
  -H "Authorization: Bearer $FIELD_AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "farmerId": "6789abc...",
    "type": "crop",
    "purpose": "seeds",
    "targetAmount": 500000,
    "location": "Musanze District"
  }'

# 2. Field agent adds off-taker agreement via update
curl -X PATCH http://localhost:5000/api/cycles/:id \
  -H "Authorization: Bearer $FIELD_AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "offTakerAgreement": {
      "buyerName": "Rwanda Trading Co",
      "buyerType": "exporter",
      "product": "Maize",
      "pricePerUnit": 350,
      "quantity": 1000
    }
  }'

# 3. Field agent submits for review
curl -X POST http://localhost:5000/api/cycles/:id/submit \
  -H "Authorization: Bearer $FIELD_AGENT_TOKEN"

# 4. Admin approves
curl -X POST http://localhost:5000/api/cycles/:id/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 5. Admin publishes for funding
curl -X POST http://localhost:5000/api/cycles/:id/publish \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# ... investors fund the cycle ...

# 6. Admin records completion
curl -X POST http://localhost:5000/api/cycles/:id/complete \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"finalSaleAmount": 850000}'
```

### JavaScript/TypeScript

```javascript
// Create cycle
const createResponse = await fetch('/api/cycles', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    farmerId: '6789abc...',
    type: 'crop',
    purpose: 'seeds',
    targetAmount: 500000,
    location: 'Musanze District'
  })
});

const { data: cycle } = await createResponse.json();

// Submit for review
await fetch(`/api/cycles/${cycle._id}/submit`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## Error Responses

### 400 Bad Request

```json
{
  "status": "fail",
  "message": "Target amount must be at least 10,000 RWF"
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
  "message": "Only field agents or admins can create cycles"
}
```

### 404 Not Found

```json
{
  "status": "error",
  "message": "Cycle not found"
}
```

---

## Related Documentation

- [Authentication API](./AUTHENTICATION.md) — Auth endpoints and RBAC
- [Database Setup](./DATABASE_SETUP.md) — Environment configuration
- [Database Design](./AgriCapital_DB_Design_and_Workflow.md) — Schema details
