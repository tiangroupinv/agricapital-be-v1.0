# Cycle Management API Documentation

This document describes the cycle management endpoints and workflow for the AgriCapital Rwanda backend.

---

## Table of Contents

1. [Overview](#overview)
2. [Status Workflow](#status-workflow)
3. [API Endpoints](#api-endpoints)
   - [Create Cycle](#create-cycle)
   - [List Cycles](#list-cycles)
   - [Get Cycle](#get-cycle)
   - [Update Cycle](#update-cycle)
   - [Set Off-Taker Agreement](#set-off-taker-agreement)
   - [Submit for Review](#submit-for-review)
   - [Approve Cycle](#approve-cycle)
   - [Reject Cycle](#reject-cycle)
   - [Publish for Funding](#publish-for-funding)
   - [Cancel Cycle](#cancel-cycle)
   - [Complete Cycle](#complete-cycle)
   - [List Investable Cycles](#list-investable-cycles)
4. [Authorization Matrix](#authorization-matrix)
5. [Validation Rules](#validation-rules)
6. [Usage Examples](#usage-examples)
7. [Error Responses](#error-responses)
8. [Related Documentation](#related-documentation)

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

Get a single cycle by ID. Response shape varies by viewer role.

**Access:** All authenticated users

**Role-Based Response:**

| Role | Response Type | Status Visibility |
|------|---------------|-------------------|
| Investor | Investor Detail View | `funding`, `funded`, `in_progress`, `completed`, `closed` only |
| Farmer | Full Document | All statuses |
| Field Agent | Full Document | All statuses |
| Admin | Full Document | All statuses |

**Investor Visibility:** Investors receive a 404 for cycles in `draft`, `under_review`, `approved`, or `cancelled` status. This prevents leaking internal cycle existence.

---

#### Investor Detail Response

When an investor accesses a cycle in an investor-visible status, the response is optimized for the investor cycle detail page:

**Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "_id": "6789abcdef...",
    "type": "livestock",
    "purpose": "feeds",
    "status": "funding",
    "location": "Musanze District",
    "targetAmount": 2000000,
    "fundedAmount": 500000,
    "fundingProgress": {
      "fundedAmount": 500000,
      "targetAmount": 2000000,
      "percent": 25,
      "investorCount": 2,
      "isFullyFunded": false
    },
    "farmer": {
      "fullName": "Alice Mukamana",
      "farmLocation": "Musanze District",
      "farmType": "livestock",
      "cooperativeName": "Musanze Dairy Cooperative"
    },
    "offTakerAgreement": {
      "buyerName": "Kigali Serena Hotel",
      "buyerType": "hotel",
      "product": "Fresh milk",
      "pricePerUnit": 400,
      "quantity": 5000,
      "contractReference": "AGR-OT-2026-014"
    },
    "insurance": {
      "naisCovered": true,
      "insurerName": "SORAS Insurance",
      "coverageStartDate": "2026-11-01",
      "coverageEndDate": "2027-02-01",
      "activeClaims": 0
    },
    "expectedReturns": {
      "proceedsAmount": 2000000,
      "proceedsSource": "off_taker_estimate",
      "platformFeeRate": { "min": 0.10, "max": 0.15 },
      "brokerageFeeRate": { "min": 0.03, "max": 0.05 },
      "netReturnRange": { "min": 1640000, "max": 1740000 }
    },
    "timeline": [
      { "date": "2026-09-01", "type": "cycle_created", "description": "Cycle created" },
      { "date": "2026-09-05", "type": "approved", "description": "Cycle approved by platform" },
      { "date": "2026-09-15", "type": "progress_update", "description": "Health check completed", "updateType": "health_check" }
    ],
    "expectedStartDate": "2026-11-01",
    "expectedEndDate": "2027-02-01",
    "createdAt": "2026-09-01T10:30:00.000Z"
  }
}
```

**Investor Detail Fields:**

| Field | Description |
|-------|-------------|
| `fundingProgress` | Calibrated from confirmed investments only; `percent` (0–100), `investorCount`, `isFullyFunded` |
| `farmer` | Summary only — `fullName`, `farmLocation`, `farmType`, `cooperativeName` (no PII) |
| `offTakerAgreement` | Buyer details — `buyerName`, `buyerType`, `product`, `pricePerUnit`, `quantity`, `contractReference` (no `contractDocumentUrl`) |
| `insurance` | Coverage status — `naisCovered`, `insurerName`, coverage dates, `activeClaims` count (no claim details or `policyReference`) |
| `expectedReturns` | Fee-adjusted return range using platform (10–15%) and brokerage (3–5%) rates |
| `timeline` | Merged cycle dates + progress updates, sorted ascending |

**Excluded from Investor View:**

- Farmer `email`, `phone`, `idDocumentNumber`, `kycStatus`, `paymentDetails`
- `fieldAgentIds` (internal assignment)
- `insurance.claims`, `insurance.policyReference`
- `offTakerAgreement.contractDocumentUrl`
- `cancellationReason`

---

#### Full Document Response (Non-Investor)

For farmer, field agent, and admin roles, the full cycle document is returned:

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
      "phone": "+250788000000",
      "farmerProfile": { "location": "Musanze", "farmType": "crop" }
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

#### Error Responses

```json
// 404 Not Found (Investor accessing non-visible status)
{
  "status": "error",
  "message": "Cycle not found"
}

// 404 Not Found (Invalid ID)
{
  "status": "error",
  "message": "Cycle not found"
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

### Set Off-Taker Agreement

**PUT** `/api/cycles/:id/off-taker-agreement`

Set or update the off-taker agreement for a cycle. This agreement is required before a cycle can be approved.

**Access:** Admin only

**Request Body:**

```json
{
  "buyerName": "Rwanda Trading Company",
  "buyerType": "exporter",
  "product": "Maize",
  "pricePerUnit": 350,
  "quantity": 1000,
  "contractReference": "RTC-2024-001",
  "contractDocumentUrl": "https://example.com/contracts/RTC-2024-001.pdf"
}
```

**Field Definitions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `buyerName` | string | Yes | Name of the buying company/individual |
| `buyerType` | string | Yes | One of: `hotel`, `school`, `factory`, `exporter`, `supermarket`, `other` |
| `product` | string | Yes | Product being sold |
| `pricePerUnit` | number | No | Price per unit in RWF (must be ≥ 0) |
| `quantity` | number | No | Quantity agreed (must be ≥ 0) |
| `contractReference` | string | No | Contract reference number |
| `contractDocumentUrl` | string | No | URL to the signed contract document |

**Response (200 OK):**

```json
{
  "status": "success",
  "message": "Off-taker agreement updated",
  "data": {
    "_id": "6789abcdef...",
    "offTakerAgreement": {
      "buyerName": "Rwanda Trading Company",
      "buyerType": "exporter",
      "product": "Maize",
      "pricePerUnit": 350,
      "quantity": 1000,
      "contractReference": "RTC-2024-001",
      "contractDocumentUrl": "https://example.com/contracts/RTC-2024-001.pdf"
    }
  }
}
```

**Error Responses:**

```json
// 400 Bad Request - Missing required field
{
  "status": "error",
  "message": "buyerName is required"
}

// 400 Bad Request - Invalid buyerType
{
  "status": "error",
  "message": "Invalid buyerType. Must be one of: hotel, school, factory, exporter, supermarket, other"
}

// 400 Bad Request - Negative value
{
  "status": "error",
  "message": "pricePerUnit must be non-negative"
}

// 403 Forbidden
{
  "message": "You do not have permission to perform this action."
}
```

**Audit Logging:**

All agreement changes are logged to the `auditLogs` collection with:
- `action`: `cycle.agreement_updated`
- `actorId`: Admin user ID
- `entityType`: `cycle`
- `entityId`: Cycle ID
- `oldValue`: Previous agreement (or null)
- `newValue`: New agreement data

---

### List Investable Cycles

**GET** `/api/cycles/investable`

List cycles available for investor discovery. Returns only cycles in investor-visible statuses with filtering, pagination, and sorting support.

**Access:** Investor, Admin

**Investor-Visible Statuses:** `funding`, `funded`, `in_progress`, `completed`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | - | Filter by cycle type: `crop`, `livestock` |
| `purpose` | string | - | Filter by purpose: `seeds`, `feeds`, `vaccines`, `fertilizer`, `other` |
| `minTarget` | integer | - | Minimum funding target (RWF) |
| `maxTarget` | integer | - | Maximum funding target (RWF) |
| `location` | string | - | Filter by location (case-insensitive partial match) |
| `buyerType` | string | - | Filter by off-taker type: `hotel`, `school`, `factory`, `exporter`, `supermarket`, `other` |
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |
| `sortBy` | string | `createdAt` | Sort field: `targetAmount`, `fundedAmount`, `createdAt` |
| `sortOrder` | string | `desc` | Sort order: `asc`, `desc` |

**Request Example:**

```bash
curl -X GET "http://localhost:5000/api/cycles/investable?type=crop&minTarget=100000&location=Musanze&page=1&limit=10" \
  -H "Authorization: Bearer $INVESTOR_TOKEN"
```

**Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "cycles": [
      {
        "_id": "6789abcdef...",
        "type": "crop",
        "purpose": "seeds",
        "targetAmount": 500000,
        "fundedAmount": 350000,
        "fundingProgress": 70,
        "location": "Musanze District",
        "expectedStartDate": "2024-03-01T00:00:00.000Z",
        "expectedEndDate": "2024-07-31T00:00:00.000Z",
        "status": "funding",
        "farmerId": {
          "_id": "123abc...",
          "fullName": "Jean Claude Niyonzima",
          "farmerProfile": {
            "location": "Musanze District"
          }
        },
        "offTakerAgreement": {
          "buyerName": "Rwanda Trading Company",
          "buyerType": "exporter",
          "product": "Maize"
        },
        "insurance": true,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

**Response Fields (Summary Data):**

| Field | Description |
|-------|-------------|
| `type` | Cycle type (`crop`, `livestock`) |
| `purpose` | Funding purpose |
| `targetAmount` | Funding target in RWF |
| `fundedAmount` | Currently funded amount |
| `fundingProgress` | Percentage funded (0-100) |
| `location` | Farm location |
| `expectedStartDate` | Expected start date |
| `expectedEndDate` | Expected end date |
| `status` | Current status |
| `farmerId` | Farmer summary (name, location) |
| `offTakerAgreement` | Buyer info (buyerName, buyerType, product) |
| `insurance` | Whether cycle has insurance |

**Error Responses:**

```json
// 401 Unauthorized
{
  "status": "error",
  "message": "Not authenticated"
}

// 403 Forbidden
{
  "message": "You do not have permission to perform this action."
}
```

**Filter Combination Examples:**

```bash
# Crop cycles between 200k and 500k RWF
curl -X GET "http://localhost:5000/api/cycles/investable?type=crop&minTarget=200000&maxTarget=500000" \
  -H "Authorization: Bearer $INVESTOR_TOKEN"

# Livestock cycles with exporter off-takers
curl -X GET "http://localhost:5000/api/cycles/investable?type=livestock&buyerType=exporter" \
  -H "Authorization: Bearer $INVESTOR_TOKEN"

# Sort by target amount ascending, paginated
curl -X GET "http://localhost:5000/api/cycles/investable?sortBy=targetAmount&sortOrder=asc&page=2&limit=20" \
  -H "Authorization: Bearer $INVESTOR_TOKEN"
```

---

## Authorization Matrix

| Endpoint | Investor | Farmer | Field Agent | Admin |
|----------|----------|--------|-------------|-------|
| `POST /api/cycles` | ❌ | ❌ | ✅ | ✅ |
| `GET /api/cycles` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/cycles/investable` | ✅ | ❌ | ❌ | ✅ |
| `GET /api/cycles/:id` | ✅ | ✅ | ✅ | ✅ |
| `PATCH /api/cycles/:id` | ❌ | ❌ | Owner only | ✅ |
| `PUT /api/cycles/:id/off-taker-agreement` | ❌ | ❌ | ❌ | ✅ |
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
| `pricePerUnit` | Must be non-negative (≥ 0) |
| `quantity` | Must be non-negative (≥ 0) |
| `contractReference` | Optional string |
| `contractDocumentUrl` | Optional string (URL format) |

**Note:** Off-taker agreements can be set via:
1. `PUT /api/cycles/:id/off-taker-agreement` — Admin only endpoint (recommended)
2. `PATCH /api/cycles/:id` — Embedded in update (field agent, draft only)

The dedicated endpoint includes audit logging and is recommended for compliance purposes.

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

# 2. Admin sets off-taker agreement (recommended)
curl -X PUT http://localhost:5000/api/cycles/:id/off-taker-agreement \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "buyerName": "Rwanda Trading Co",
    "buyerType": "exporter",
    "product": "Maize",
    "pricePerUnit": 350,
    "quantity": 1000,
    "contractReference": "RTC-2024-001"
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

### Investor Discovery

```bash
# List all investable cycles
curl -X GET http://localhost:5000/api/cycles/investable \
  -H "Authorization: Bearer $INVESTOR_TOKEN"

# Filter by crop type in Musanze
curl -X GET "http://localhost:5000/api/cycles/investable?type=crop&location=Musanze" \
  -H "Authorization: Bearer $INVESTOR_TOKEN"

# Find cycles with target between 200k and 500k RWF
curl -X GET "http://localhost:5000/api/cycles/investable?minTarget=200000&maxTarget=500000" \
  -H "Authorization: Bearer $INVESTOR_TOKEN"

# Paginated results sorted by target amount
curl -X GET "http://localhost:5000/api/cycles/investable?page=1&limit=20&sortBy=targetAmount&sortOrder=desc" \
  -H "Authorization: Bearer $INVESTOR_TOKEN"
```

```javascript
// Fetch investable cycles with JavaScript
const response = await fetch(
  '/api/cycles/investable?type=crop&minTarget=100000&location=Musanze',
  {
    headers: { 'Authorization': `Bearer ${investorToken}` }
  }
);

const { data } = await response.json();
console.log(`Found ${data.pagination.total} cycles`);
data.cycles.forEach(cycle => {
  console.log(`${cycle.purpose}: ${cycle.fundingProgress}% funded`);
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
