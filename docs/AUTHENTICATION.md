# Authentication API Documentation

This document describes the authentication and authorization system for the AgriCapital Rwanda backend.

---

## Table of Contents

1. [Overview](#overview)
2. [User Roles](#user-roles)
3. [Authentication Endpoints](#authentication-endpoints)
4. [User Management Endpoints](#user-management-endpoints)
5. [Authorization](#authorization)
6. [Error Responses](#error-responses)
7. [Usage Examples](#usage-examples)

---

## Overview

The API uses **JWT (JSON Web Token)** based authentication:

1. User registers or logs in
2. Server returns a JWT token
3. Client includes token in `Authorization` header for protected requests
4. Server validates token and attaches user to request

### Token Format

```
Authorization: Bearer <token>
```

### Token Payload

```json
{
  "userId": "6789abcdef...",
  "role": "investor",
  "iat": 1234567890,
  "exp": 1234578890
}
```

---

## User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `investor` | Urban/diaspora individual funding cycles | Create investments, view funded cycles |
| `farmer` | Smallholder receiving capital | View own cycles and disbursements |
| `field_agent` | AgriCapital staff visiting farms | Create cycles, post progress updates |
| `admin` | AgriCapital internal staff | Full access to all resources |

---

## Authentication Endpoints

### Register New User

**POST** `/api/auth/signup`

Register a new user account.

**Request Body:**

```json
{
  "role": "investor",
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+250788000001",
  "password": "SecurePassword123",
  "idDocumentNumber": "1198012345678001"
}
```

**Required Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `role` | string | One of: `investor`, `farmer`, `field_agent`, `admin` |
| `fullName` | string | User's full name |
| `email` | string | Unique email address |
| `phone` | string | Unique phone number with country code |
| `password` | string | Minimum 8 characters recommended |
| `idDocumentNumber` | string | National ID or passport number |

**Farmer-Only Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `farmerProfile.location` | string | Farm location (required for farmers) |
| `farmerProfile.farmType` | string | One of: `crop`, `livestock`, `mixed` |
| `farmerProfile.cooperativeName` | string | Cooperative name (optional) |

**Response (201 Created):**

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "6789abcdef...",
      "role": "investor",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+250788000001",
      "kycStatus": "not_required"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### Login

**POST** `/api/auth/login`

Authenticate user and receive token.

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "SecurePassword123"
}
```

**Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "6789abcdef...",
      "role": "investor",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+250788000001",
      "kycStatus": "not_required"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### Get Current User

**GET** `/api/auth/me`

Get the authenticated user's profile.

**Headers:**

```
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "_id": "6789abcdef...",
    "role": "investor",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+250788000001",
    "kycStatus": "not_required",
    "idDocumentNumber": "1198012345678001",
    "paymentDetails": {
      "momoNumber": null,
      "bankAccount": null
    },
    "isActive": true,
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-15T10:00:00.000Z"
  }
}
```

---

## User Management Endpoints

### List All Users

**GET** `/api/users`

Get all users (Admin only).

**Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `role` | string | - | Filter by role |
| `isActive` | boolean | - | Filter by active status |
| `page` | number | 1 | Page number |
| `limit` | number | 20 | Items per page |

**Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "users": [
      { "_id": "...", "role": "investor", "fullName": "..." }
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

### Get User by ID

**GET** `/api/users/:id`

Get a single user.

**Access Control:**
- Users can view their own profile
- Admins can view any user

**Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "_id": "6789abcdef...",
    "role": "investor",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+250788000001"
  }
}
```

---

### Update User

**PATCH** `/api/users/:id`

Update user profile.

**Access Control:**
- Users can update own profile (limited fields)
- Admins can update any user

**Request Body:**

```json
{
  "fullName": "John Updated",
  "phone": "+250788000002",
  "paymentDetails": {
    "momoNumber": "+250788000002"
  }
}
```

**Non-Admin Allowed Fields:** `fullName`, `phone`, `paymentDetails`, `farmerProfile` (farmers only)

**Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "_id": "6789abcdef...",
    "fullName": "John Updated",
    "phone": "+250788000002"
  }
}
```

---

### Deactivate User

**DELETE** `/api/users/:id`

Deactivate a user account (soft delete). Admin only.

**Response (200 OK):**

```json
{
  "status": "success",
  "message": "User deactivated successfully",
  "data": {
    "id": "6789abcdef...",
    "isActive": false
  }
}
```

---

### Reactivate User

**PATCH** `/api/users/:id/reactivate`

Reactivate a deactivated user. Admin only.

**Response (200 OK):**

```json
{
  "status": "success",
  "message": "User reactivated successfully",
  "data": {
    "id": "6789abcdef...",
    "isActive": true
  }
}
```

---

## Authorization

### Protected Routes

All routes except `/api/auth/signup` and `/api/auth/login` require authentication.

Include the JWT token in the Authorization header:

```javascript
fetch('/api/users', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Role-Based Access

| Endpoint | Investor | Farmer | Field Agent | Admin |
|----------|----------|--------|-------------|-------|
| `POST /api/auth/signup` | ✅ | ✅ | ✅ | ✅ |
| `POST /api/auth/login` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/auth/me` | ✅ | ✅ | ✅ | ✅ |
| `GET /api/users` | ❌ | ❌ | ❌ | ✅ |
| `GET /api/users/:id` | Own only | Own only | Own only | ✅ |
| `PATCH /api/users/:id` | Own only | Own only | Own only | ✅ |
| `DELETE /api/users/:id` | ❌ | ❌ | ❌ | ✅ |

---

## Error Responses

### 400 Bad Request

```json
{
  "status": "fail",
  "message": "Missing required fields: password, email"
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
  "message": "You do not have permission to perform this action."
}
```

### 404 Not Found

```json
{
  "status": "error",
  "message": "User not found"
}
```

### 409 Conflict

```json
{
  "message": "Email already registered"
}
```

---

## Usage Examples

### JavaScript/TypeScript

```javascript
// Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'john@example.com', password: 'Secret123' })
});

const { data } = await loginResponse.json();
const token = data.token;
const user = data.user;

// Store token
localStorage.setItem('token', token);
localStorage.setItem('user', JSON.stringify(user));

// Make authenticated request
const profileResponse = await fetch('/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### cURL

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"Secret123"}'

# Get profile (replace TOKEN with actual token)
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer TOKEN"

# List users (admin only)
curl http://localhost:5000/api/users \
  -H "Authorization: Bearer TOKEN"
```

---

## Security Notes

1. **Passwords** are hashed with bcrypt using 12 salt rounds
2. **JWT tokens** should be stored securely (httpOnly cookies recommended for production)
3. **JWT_SECRET** must be a strong, random string in production
4. **HTTPS** is required in production to protect tokens in transit
5. **Token expiration** defaults to 7 days but should be configured based on security requirements
