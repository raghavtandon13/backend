# Loan Lead Management System

A comprehensive TypeScript backend system for ingesting, deduplicating, and
distributing loan leads to multiple lenders via their APIs. Features
intelligent lead routing, deduplication with retry logic, and complete audit
trails.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture & Tech Stack](#architecture--tech-stack)
3. [Getting Started](#getting-started)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [Project Structure](#project-structure)
7. [Core Concepts](#core-concepts)
8. [Lender Integration Guide](#lender-integration-guide)
9. [Configuration Guide](#configuration-guide)
10. [Error Handling](#error-handling)
11. [Logging & Monitoring](#logging--monitoring)
12. [Testing](#testing)
13. [Deployment](#deployment)
14. [Troubleshooting](#troubleshooting)
15. [FAQ](#faq)

---

## Project Overview

### What This System Does

This system acts as a centralized hub for managing loan leads from multiple sources:

1. **Ingest Leads**: Accepts lead data (customer information) from various sources
2. **Deduplicate**: Identifies when the same person is submitted multiple times via different sources
3. **Route Intelligently**: Determines which lenders are eligible to receive each lead based on customer criteria
4. **Distribute**: Sends leads to all eligible lenders simultaneously via their APIs
5. **Track Responses**: Records lender responses (Accepted, Rejected, Deduped) with full audit trail
6. **Retry Deduped**: Automatically retries leads that were marked as duplicates after a cooldown period

### Key Business Rules

| Rule | Description |
|------|-------------|
| **Deduplication** | Leads are deduplicated by phone or email. The same person from different sources = 1 lead with multiple sources |
| **Maximize Distribution** | Send to ALL eligible lenders simultaneously to maximize acceptance chances |
| **Response Types** | **Accepted**: Lead accepted by lender<br>**Rejected**: Lead rejected<br>**Deduped**: Duplicate at lender's end (retry after 30 days) |
| **Retry Logic** | Deduped leads are automatically retried after 30 days via background job |
| **Eligibility Rules** | Each lender has specific rules (income, age, employment type, state) |
| **Source Tracking** | Every submission source is tracked for complete lineage |

### Lead Lifecycle

```
[Source A] ──┐
[Source B] ──┼──> [Deduplication] ──> [Eligibility Check] ──> [Lender A] ──> Accepted/Rejected/Deduped
[Source C] ──┘                                    │
                                                  ├──> [Lender B] ──> Accepted/Rejected/Deduped
                                                  │
                                                  └──> [Lender C] ──> Accepted/Rejected/Deduped
                                                                           ↓
                                                                    [Retry after 30 days if Deduped]
```

---

## Architecture & Tech Stack

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Runtime** | Node.js 18+ | JavaScript runtime |
| **Language** | TypeScript 5.3+ | Type-safe development |
| **Web Framework** | Express.js 4.18 | HTTP server and routing |
| **Database** | PostgreSQL 14+ | Primary data storage |
| **ORM** | TypeORM 0.3.19 | Database abstraction |
| **Validation** | Zod 3.22 | Input validation |
| **HTTP Client** | Axios 1.6 | External API calls |
| **Logging** | Winston 3.11 | Structured logging |
| **Security** | Helmet 7.1 | HTTP security headers |
| **Testing** | Jest 29.7 | Unit and integration tests |
| **Linting** | ESLint 8.56 | Code quality |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Source)                          │
└────────────────────┬────────────────────────────────────────────┘
                     │ POST /api/v1/leads
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Express Application                         │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │   Routes    │─>│   Services   │─>│     Repositories        │ │
│  │  /api/v1/*  │  │  Business    │  │   Data Access Layer     │ │
│  │             │  │    Logic     │  │                         │ │
│  └─────────────┘  └──────────────┘  └─────────────────────────┘ │
│          │                                    │                 │
│          ▼                                    ▼                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Lender Client Factory                       │  │
│  │  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐   │  │
│  │  │KarroFin  │  │PocketCredit  │  │     Zype         │   │  │
│  │  │ Client   │  │   Client     │  │   Client         │   │  │
│  │  └──────────┘  └──────────────┘  └──────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                     │                                          │
│                     ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Background Job (RetryService + RetryJob)         │  │
│  │              Runs every hour to retry deduped            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PostgreSQL Database                         │
│  ┌──────────┐  ┌─────────────┐  ┌────────────────────────────┐ │
│  │  leads   │  │lead_sources │  │    lender_responses        │ │
│  └──────────┘  └─────────────┘  └────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              lender_routing_logs                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                     │
                     ▼
          ┌─────────────────────┐
          │   Lender APIs       │
          │ (KarroFin, Zype,    │
          │  PocketCredit, ...) │
          └─────────────────────┘
```

---

## Getting Started

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **PostgreSQL**: Version 14.0 or higher
- **Git**: For cloning the repository
- **npm**: Comes with Node.js

### Installation

1. **Clone the repository**:
```bash
git clone <repository-url>
cd loan-lead-management
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up environment variables**:
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database (Required)
DATABASE_URL=postgresql://username:password@localhost:5432/loan_leads_db

# KarroFin Lender Configuration
KARROFIN_BASE_URL=https://api.karrofin.com
KARROFIN_API_KEY=your_api_key_here
KARROFIN_PARTNER_CODE=your_partner_code
KARROFIN_PASSKEY=your_passkey

# PocketCredit Lender Configuration
POCKETCREDIT_BASE_URL=https://api.pocketcredit.com
POCKETCREDIT_CLIENT_ID=your_client_id
POCKETCREDIT_CLIENT_SECRET=your_client_secret

# Zype Lender Configuration
ZYPE_BASE_URL=https://api.zype.com
ZYPE_API_KEY=your_api_key_here
```

### Database Setup

1. **Create the database**:
```bash
# Using psql
psql -U postgres -c "CREATE DATABASE loan_leads_db;"

# Or use your preferred database management tool
```

2. **Run the application** (database tables will be created automatically in development):
```bash
npm run dev
```

### Running the Application

**Development mode** (with hot reload):
```bash
npm run dev
```

**Production build**:
```bash
npm run build
npm start
```

The server will start on `http://localhost:3000` (or the port specified in your `.env`).

### Verify Installation

Test the API with curl:
```bash
# Health check (create a simple health endpoint or test lead creation)
curl -X POST http://localhost:3000/api/v1/leads \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "email": "test@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-05-15",
    "monthlyIncome": 50000,
    "employmentType": "salaried",
    "panNumber": "ABCDE1234F",
    "address": "123 Main Street",
    "city": "Mumbai",
    "state": "MH",
    "pincode": "400001",
    "source": "landing_page"
  }'
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                               leads                                     │
├─────────────────────────────────────────────────────────────────────────┤
│ PK │ id              │ uuid        │ Unique identifier                    │
│    │ phone           │ varchar(20) │ 10-digit phone, UNIQUE               │
│    │ email           │ varchar(255)│ Email address, UNIQUE                │
│    │ first_name      │ varchar(100)│ Customer first name                  │
│    │ last_name       │ varchar(100)│ Customer last name                   │
│    │ date_of_birth   │ date        │ Date of birth                        │
│    │ monthly_income  │ decimal     │ Monthly salary/income                │
│    │ employment_type │ enum        │ salaried/self_employed/business...   │
│    │ pan_number      │ varchar(10) │ PAN card number                      │
│    │ address         │ text        │ Full address                         │
│    │ city            │ varchar(100)│ City                                 │
│    │ state           │ varchar(100)│ State code                           │
│    │ pincode         │ varchar(10) │ 6-digit pincode                      │
│    │ status          │ enum        │ new/processing/completed/error       │
│    │ created_at      │ timestamp   │ Record creation time                 │
│    │ updated_at      │ timestamp   │ Last update time                     │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ 1:N
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          lead_sources                                   │
├─────────────────────────────────────────────────────────────────────────┤
│ PK │ id              │ uuid        │ Unique identifier                    │
│ FK │ lead_id         │ uuid        │ References leads.id                  │
│    │ source_name     │ varchar(100)│ Name of source (e.g., "facebook")    │
│    │ received_at     │ timestamp   │ When this source submitted           │
│    │ raw_data        │ jsonb       │ Original payload from source         │
│    │ created_at      │ timestamp   │ Record creation time                 │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ 1:N
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         lender_responses                                │
├─────────────────────────────────────────────────────────────────────────┤
│ PK │ id              │ uuid        │ Unique identifier                    │
│ FK │ lead_id         │ uuid        │ References leads.id                  │
│    │ lender_id       │ varchar(100)│ Lender identifier                    │
│    │ lender_name     │ varchar(100)│ Lender name                          │
│    │ status          │ enum        │ Accepted/Rejected/Deduped/Error      │
│    │ response_data   │ jsonb       │ Full lender response                 │
│    │ sent_at         │ timestamp   │ When lead was sent to lender         │
│    │ responded_at    │ timestamp   │ When response received               │
│    │ retry_after     │ timestamp   │ When to retry (for Deduped)          │
│    │ created_at      │ timestamp   │ Record creation time                 │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                          ┌────────┴────────┐
                          ▼                 ▼
┌─────────────────────────────────┐  ┌─────────────────────────────────────────┐
│    lender_routing_logs          │  │  (Independent audit table)              │
├─────────────────────────────────┤  ├─────────────────────────────────────────┤
│ PK │ id              │ uuid     │  │ PK │ id              │ uuid            │
│ FK │ lead_id         │ uuid     │  │    │ lead_id         │ uuid            │
│    │ lender_name     │ varchar  │  │    │ lender_name     │ varchar         │
│    │ decision        │ enum     │  │    │ decision        │ enum            │
│    │ reason          │ text     │  │    │ reason          │ text            │
│    │ lead_data       │ jsonb    │  │    │ lead_data       │ jsonb           │
│    │ created_at      │ timestamp│  │    │ created_at      │ timestamp       │
└─────────────────────────────────┘  └─────────────────────────────────────────┘
```

### Tables Description

#### `leads`
Main table storing customer information. Each unique person (by phone or email) has exactly one lead record.

**Indexes:**
- `phone` (UNIQUE): Fast lookup by phone number
- `email` (UNIQUE): Fast lookup by email

#### `lead_sources`
Tracks every submission of a lead, even duplicates from different sources.

**Relationship:** Many-to-One with `leads`

#### `lender_responses`
Records every interaction with lenders, including success, failure, and deduplication.

**Indexes:**
- `(lead_id, lender_id)`: Find all responses for a lead
- `status`: Filter by response status
- `retry_after`: Find deduped leads ready for retry

#### `lender_routing_logs`
Audit trail of routing decisions (why a lead was/wasn't sent to a lender).

**Purpose:** Compliance, debugging, and business intelligence

### Useful SQL Queries

```sql
-- Get all leads with their sources and responses
SELECT 
    l.id,
    l.phone,
    l.email,
    l.status,
    array_agg(DISTINCT ls.source_name) as sources,
    jsonb_agg(DISTINCT jsonb_build_object(
        'lender', lr.lender_name,
        'status', lr.status,
        'sent_at', lr.sent_at
    )) FILTER (WHERE lr.id IS NOT NULL) as lender_responses
FROM leads l
LEFT JOIN lead_sources ls ON l.id = ls.lead_id
LEFT JOIN lender_responses lr ON l.id = lr.lead_id
GROUP BY l.id
ORDER BY l.created_at DESC
LIMIT 10;

-- Find deduped leads ready for retry (cooldown period passed)
SELECT 
    lr.lead_id,
    lr.lender_name,
    lr.retry_after,
    l.phone,
    l.email
FROM lender_responses lr
JOIN leads l ON lr.lead_id = l.id
WHERE lr.status = 'Deduped'
    AND lr.retry_after <= NOW()
ORDER BY lr.retry_after;

-- Get acceptance rate by lender
SELECT 
    lender_name,
    COUNT(*) as total_sent,
    COUNT(*) FILTER (WHERE status = 'Accepted') as accepted,
    COUNT(*) FILTER (WHERE status = 'Rejected') as rejected,
    COUNT(*) FILTER (WHERE status = 'Deduped') as deduped,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'Accepted') * 100.0 / COUNT(*), 
        2
    ) as acceptance_rate
FROM lender_responses
GROUP BY lender_name;

-- Find leads by source with their status
SELECT 
    ls.source_name,
    COUNT(DISTINCT l.id) as unique_leads,
    COUNT(*) as total_submissions
FROM leads l
JOIN lead_sources ls ON l.id = ls.lead_id
GROUP BY ls.source_name;

-- Get routing decisions (why leads were skipped)
SELECT 
    lender_name,
    decision,
    COUNT(*) as count,
    reason
FROM lender_routing_logs
WHERE decision = 'SKIPPED_INELIGIBLE'
GROUP BY lender_name, decision, reason
ORDER BY count DESC;
```

---

## API Reference

### Base URL
```
http://localhost:3000/api/v1
```

### Response Format
All responses follow this structure:

**Success (2xx)**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Error (4xx/5xx)**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

### Endpoints

#### Create Lead
Creates a new lead or adds a source to an existing lead (deduplication by phone/email).

```http
POST /api/v1/leads
Content-Type: application/json
```

**Request Body**:
```json
{
  "phone": "9876543210",
  "email": "john.doe@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-05-15",
  "monthlyIncome": 50000,
  "employmentType": "salaried",
  "panNumber": "ABCDE1234F",
  "address": "123 Main Street, Apt 4B",
  "city": "Mumbai",
  "state": "MH",
  "pincode": "400001",
  "source": "facebook_ads"
}
```

**Field Descriptions**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone` | string | Yes | 10-digit phone number (digits only) |
| `email` | string | Yes | Valid email address |
| `firstName` | string | Yes | Customer first name |
| `lastName` | string | Yes | Customer last name |
| `dateOfBirth` | string | Yes | Date in YYYY-MM-DD format |
| `monthlyIncome` | number | Yes | Monthly income in INR (min: 15000) |
| `employmentType` | string | Yes | One of: `salaried`, `self_employed`, `business`, `student`, `unemployed` |
| `panNumber` | string | Yes | 10-character PAN (format: ABCDE1234F) |
| `address` | string | Yes | Full residential address |
| `city` | string | Yes | City name |
| `state` | string | Yes | State code (e.g., MH, DL, KA) |
| `pincode` | string | Yes | 6-digit postal code |
| `source` | string | Yes | Source identifier (e.g., "google_ads", "landing_page") |

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "phone": "9876543210",
    "email": "john.doe@example.com",
    "status": "completed",
    "sources": ["facebook_ads"],
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses**:

**400 Bad Request** - Validation Error:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed: phone: Phone must be 10 digits, panNumber: Invalid PAN format"
  }
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/v1/leads \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "9876543210",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-05-15",
    "monthlyIncome": 50000,
    "employmentType": "salaried",
    "panNumber": "ABCDE1234F",
    "address": "123 Main Street",
    "city": "Mumbai",
    "state": "MH",
    "pincode": "400001",
    "source": "facebook_ads"
  }'
```

#### Get Lead by ID
```http
GET /api/v1/leads/:id
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": null
}
```

*Note: This endpoint is currently a placeholder and returns null.*

---

### Admin Endpoints

#### Trigger Retry Manually
Manually triggers the retry job for deduped leads.

```http
POST /api/v1/admin/retry-deduped
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "retriedCount": 5
  }
}
```

**cURL Example**:
```bash
curl -X POST http://localhost:3000/api/v1/admin/retry-deduped
```

---

## Project Structure

```
loan-lead-management/
├── src/
│   ├── api/                      # HTTP layer
│   │   ├── middleware/           # Express middleware
│   │   │   └── error.middleware.ts   # Error handling, security
│   │   ├── routes/               # Route definitions
│   │   │   ├── index.ts              # Route aggregation
│   │   │   ├── lead.routes.ts        # Lead CRUD endpoints
│   │   │   └── admin.routes.ts       # Admin endpoints
│   │   └── index.ts              # API exports
│   │
│   ├── clients/                  # Lender API clients
│   │   ├── lenders/              # Individual lender implementations
│   │   │   ├── karrofin.client.ts    # KarroFin integration
│   │   │   ├── pocketcredit.client.ts # PocketCredit integration
│   │   │   └── zype.client.ts        # Zype integration
│   │   ├── base-lender.client.ts     # Abstract base class
│   │   ├── lender-client.factory.ts  # Factory pattern for clients
│   │   └── index.ts
│   │
│   ├── config/                   # Configuration
│   │   └── index.ts              # Environment config, validation
│   │
│   ├── jobs/                     # Background jobs
│   │   ├── retry.job.ts          # Scheduled retry job
│   │   └── index.ts
│   │
│   ├── models/                   # TypeScript types/interfaces
│   │   ├── lead.model.ts         # Lead-related types
│   │   ├── lender.model.ts       # Lender-related types
│   │   ├── routing.model.ts      # Routing types
│   │   └── index.ts
│   │
│   ├── repositories/             # Data access layer
│   │   ├── entities/             # TypeORM entities
│   │   │   ├── lead.entity.ts
│   │   │   ├── lead-source.entity.ts
│   │   │   ├── lender-response.entity.ts
│   │   │   └── lender-routing-log.entity.ts
│   │   ├── lead.repository.ts
│   │   ├── lender-response.repository.ts
│   │   ├── lender-routing-log.repository.ts
│   │   ├── data-source.ts        # TypeORM configuration
│   │   └── index.ts
│   │
│   ├── services/                 # Business logic
│   │   ├── lead-processing.service.ts  # Main lead processing
│   │   ├── retry.service.ts            # Retry logic
│   │   └── index.ts
│   │
│   ├── utils/                    # Utilities
│   │   ├── errors.ts             # Custom error classes
│   │   └── logger.ts             # Winston logger setup
│   │
│   └── index.ts                  # Application entry point
│
├── tests/                        # Test files (mirrors src/)
├── .env                          # Environment variables (not in git)
├── .env.example                  # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

### File Descriptions

#### Entry Point (`src/index.ts`)
Bootstraps the application:
1. Validates configuration
2. Initializes database connection
3. Sets up Express with middleware
4. Configures routes
5. Starts background job
6. Handles graceful shutdown

#### Services (`src/services/`)
Contain all business logic:
- **LeadProcessingService**: Main orchestrator - validation, deduplication, routing, distribution
- **RetryService**: Handles retry of deduped leads

#### Repositories (`src/repositories/`)
Data access layer using TypeORM:
- Abstract database operations
- Entity definitions with relationships
- Custom query methods

#### Clients (`src/clients/`)
External API integrations:
- Each lender has its own client
- Extends `BaseLenderClient` for common functionality
- Factory pattern for instantiation

---

## Core Concepts

### Lead Lifecycle

```
┌─────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│   NEW   │───>│ PROCESSING│───>│ COMPLETED │    │   ERROR   │
└─────────┘    └───────────┘    └───────────┘    └───────────┘
     │               │                 ▲
     │               │                 │
     │               ▼                 │
     │         ┌───────────────────────────────┐
     │         │                               │
     │    ┌────▼────┐  ┌──────────┐  ┌───────▼───────┐
     │    │Validate │  │Deduplicate│  │ Distribute to │
     │    │  Input  │──│  Check    │──│   Lenders     │
     │    └─────────┘  └──────────┘  └───────────────┘
     │
     └───────────────────────────────────────────────> (on error)
```

**States:**
- **NEW**: Initial state when lead is created
- **PROCESSING**: Currently being processed (validation, routing, distribution)
- **COMPLETED**: Successfully processed
- **ERROR**: Processing failed

### Deduplication Logic

```typescript
// Pseudocode of deduplication logic
async function processIncomingLead(leadData) {
  // 1. Check if lead exists by phone OR email
  const existingLead = await findByPhoneOrEmail(
    leadData.phone, 
    leadData.email
  );

  if (existingLead) {
    // 2. Add new source to existing lead
    await addSource(existingLead.id, leadData.source, leadData);
    
    // 3. Try sending to lenders again
    await distributeToLenders(existingLead);
    
    return existingLead;
  }

  // 4. Create new lead
  const newLead = await createLead(leadData);
  
  // 5. Distribute to eligible lenders
  await distributeToLenders(newLead);
  
  return newLead;
}
```

**Key Points:**
- Same person (phone or email match) = 1 lead record
- Multiple sources tracked in `lead_sources` table
- Each source submission triggers redistribution

### Eligibility Calculation

Each lender has eligibility rules configured in `config.lenders`:

```typescript
interface EligibilityRules {
  minIncome: number;           // Minimum monthly income
  maxIncome?: number;          // Maximum monthly income (optional)
  minAge: number;              // Minimum age
  maxAge: number;              // Maximum age
  allowedEmploymentTypes: string[];  // e.g., ["salaried", "self_employed"]
  allowedStates?: string[];    // State whitelist (optional)
  excludedStates?: string[];   // State blacklist (optional)
}
```

**Example Configurations:**

| Lender | Min Income | Age Range | Employment Types | States |
|--------|------------|-----------|------------------|--------|
| **KarroFin** | 20,000 | 21-58 | salaried, self_employed | All |
| **PocketCredit** | 15,000 | 21-60 | salaried, self_employed, business | All |
| **Zype** | 25,000 | 23-55 | salaried | MH, DL, KA, TN, TG |

**Eligibility Check Flow:**

```
Lead Data
    │
    ▼
┌─────────────────────────────────────┐
│ Check Income                        │
│ Income >= Min && Income <= Max?     │
└──────────────┬──────────────────────┘
               │ No
               ▼
        ┌─────────────┐
        │ Skip Lender │
        └─────────────┘
               │ Yes
               ▼
┌─────────────────────────────────────┐
│ Check Age                           │
│ Age >= Min && Age <= Max?           │
└──────────────┬──────────────────────┘
               │
               ▼ (continues...)
┌─────────────────────────────────────┐
│ Check Employment Type               │
│ Type in allowed list?               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Check State Restrictions            │
│ State in whitelist? NOT in blacklist│
└──────────────┬──────────────────────┘
               │
               ▼
        ┌─────────────┐
        │ ELIGIBLE    │
        │ Send Lead   │
        └─────────────┘
```

### Retry Logic for Deduped Leads

**When a lead is marked as "Deduped":**
1. Response recorded with `status = 'Deduped'`
2. `retry_after` set to current date + 30 days
3. Background job runs hourly to find eligible retries

**Retry Process:**
```typescript
// Background job (runs every hour)
async function retryDedupedLeads() {
  // 1. Find responses where:
  //    - status = 'Deduped'
  //    - retry_after <= NOW()
  const responses = await findDedupedResponsesReadyForRetry();
  
  // 2. Retry each lead with its lender
  for (const response of responses) {
    const lead = await findLeadById(response.leadId);
    const lender = getLenderClient(response.lenderName);
    
    // 3. Send lead again
    const result = await lender.sendLead(lead);
    
    // 4. Record new response
    await recordResponse(lead.id, lender.name, result);
  }
}
```

---

## Lender Integration Guide

This section provides a comprehensive guide for integrating new lenders into the system.

### Overview

Adding a new lender involves:
1. Understanding the lender's API
2. Adding configuration
3. Creating a client class
4. Registering in the factory
5. Testing

### Step 1: Understanding the Lender API

Before writing code, gather this information:

**Required Documentation:**
- API base URL
- Authentication method
- Request/response formats
- Error codes and handling
- Rate limits

**Questions to Answer:**
```
□ What authentication method do they use? (API key, OAuth, Basic Auth, etc.)
□ Do they require a separate auth endpoint?
□ What fields are required in the request?
□ How do they indicate success/failure/duplicate?
□ What are their eligibility criteria?
□ What is their rate limit?
□ Do they have a sandbox environment?
```

### Step 2: Adding Configuration

Add the lender to `src/config/index.ts`:

```typescript
import { type LenderConfig, LenderName } from "@/models";

// Add to LenderName enum in src/models/lender.model.ts
export enum LenderName {
  KARROFIN = "KarroFin",
  POCKETCREDIT = "PocketCredit",
  ZYPE = "Zype",
  QUICKLOAN = "QuickLoan",  // <-- Add new lender
}

// Add configuration in src/config/index.ts
export const config = {
  // ... existing config
  
  lenders: {
    // ... existing lenders
    
    [LenderName.QUICKLOAN]: {
      id: "quickloan-001",
      name: LenderName.QUICKLOAN,
      baseUrl: process.env.QUICKLOAN_BASE_URL || "",
      apiKey: process.env.QUICKLOAN_API_KEY || "",
      // Add other auth fields as needed:
      // clientId: process.env.QUICKLOAN_CLIENT_ID || "",
      // clientSecret: process.env.QUICKLOAN_CLIENT_SECRET || "",
      timeout: 30000,  // 30 seconds
      enabled: Boolean(process.env.QUICKLOAN_API_KEY),
      eligibilityRules: {
        minIncome: 20000,
        maxIncome: 100000,
        minAge: 21,
        maxAge: 60,
        allowedEmploymentTypes: ["salaried", "self_employed"],
        allowedStates: ["MH", "DL", "KA"],  // Optional
        // excludedStates: ["JK"],  // Optional
      },
      rateLimitPerMinute: 60,
    } as LenderConfig,
  },
};
```

**Add environment variables to `.env`:**
```bash
QUICKLOAN_BASE_URL=https://api.quickloan.com/v1
QUICKLOAN_API_KEY=your_api_key_here
# Add other required credentials
```

### Step 3: Creating the Client Class

Create a new file: `src/clients/lenders/quickloan.client.ts`

```typescript
import type { LenderApiResponse, LenderRequest, LenderResponseStatus } from "@/models";
import { logger } from "@/utils/logger";
import { BaseLenderClient } from "../base-lender.client";

// Define response types based on lender's API documentation
interface QuickLoanResponse {
  success: boolean;
  data?: {
    application_id: string;
    status: string;
  };
  error?: {
    code: string;
    message: string;
    is_duplicate?: boolean;
  };
}

export class QuickLoanClient extends BaseLenderClient {
  async sendLead(lead: LenderRequest): Promise<LenderApiResponse> {
    try {
      // 1. Transform lead data to lender's format
      const payload = {
        personal_info: {
          first_name: lead.firstName,
          last_name: lead.lastName,
          mobile: lead.phone,
          email: lead.email,
          date_of_birth: this.formatDate(lead.dateOfBirth),
          pan: lead.panNumber,
        },
        employment: {
          type: this.mapEmploymentType(lead.employmentType),
          monthly_income: lead.monthlyIncome,
        },
        address: {
          line1: lead.address,
          city: lead.city,
          state: lead.state,
          pincode: lead.pincode,
        },
      };

      // 2. Make API call
      // Note: BaseLenderClient already sets Content-Type and baseURL
      const response = await this.httpClient.post<QuickLoanResponse>(
        "/applications",
        payload,
        {
          headers: {
            // Add authentication headers
            "X-API-Key": this.config.apiKey,
          },
        }
      );

      const data = response.data;

      // 3. Map lender response to our standard format
      if (!data.success) {
        // Handle error/duplicate case
        const isDuplicate = data.error?.is_duplicate ?? false;
        const status: LenderResponseStatus = isDuplicate
          ? ("Deduped" as LenderResponseStatus)
          : ("Rejected" as LenderResponseStatus);

        return {
          success: false,
          status,
          message: data.error?.message,
          data: {
            error_code: data.error?.code,
          } as Record<string, unknown>,
        };
      }

      // Handle success case
      const status: LenderResponseStatus =
        data.data?.status === "approved"
          ? ("Accepted" as LenderResponseStatus)
          : ("Rejected" as LenderResponseStatus);

      return {
        success: true,
        status,
        data: data.data as unknown as Record<string, unknown>,
      };
    } catch (error) {
      // 4. Handle errors using base class method
      return this.handleError(error);
    }
  }

  // Helper method to map employment types
  private mapEmploymentType(type: string): string {
    const mapping: Record<string, string> = {
      salaried: "Salaried",
      self_employed: "SelfEmployed",
      business: "BusinessOwner",
    };
    return mapping[type] || type;
  }

  // Optional: Override health check if lender has specific endpoint
  async isHealthy(): Promise<boolean> {
    try {
      await this.httpClient.get("/health", { 
        timeout: 5000,
        headers: {
          "X-API-Key": this.config.apiKey,
        }
      });
      return true;
    } catch {
      return false;
    }
  }
}
```

### Step 4: Handling Different Authentication Patterns

#### Pattern 1: Static API Key (Simplest)

Used by: Zype

```typescript
// In sendLead():
const response = await this.httpClient.post("/applications", payload, {
  headers: {
    "X-API-Key": this.config.apiKey,
  },
});
```

#### Pattern 2: Bearer Token

Used by: Generic OAuth2

```typescript
async sendLead(lead: LenderRequest): Promise<LenderApiResponse> {
  const token = await this.getAuthToken();
  
  const response = await this.httpClient.post("/applications", payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  // ...
}

private async getAuthToken(): Promise<string> {
  const response = await this.httpClient.post("/auth/token", {
    client_id: this.config.clientId,
    client_secret: this.config.clientSecret,
    grant_type: "client_credentials",
  });
  
  return response.data.access_token;
}
```

#### Pattern 3: Basic Auth

Used by: Legacy systems

```typescript
async sendLead(lead: LenderRequest): Promise<LenderApiResponse> {
  const credentials = Buffer.from(
    `${this.config.clientId}:${this.config.clientSecret}`
  ).toString("base64");
  
  const response = await this.httpClient.post("/applications", payload, {
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });
  // ...
}
```

#### Pattern 4: OAuth2 with Refresh Token

Used by: PocketCredit

```typescript
export class OAuthLenderClient extends BaseLenderClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: Date | null = null;

  async sendLead(lead: LenderRequest): Promise<LenderApiResponse> {
    await this.ensureAuthenticated();
    
    const response = await this.httpClient.post("/applications", payload, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });
    // ...
  }

  private async ensureAuthenticated(): Promise<void> {
    // Check if token exists and is not expired (5 min buffer)
    if (this.accessToken && this.tokenExpiry && 
        new Date() < new Date(this.tokenExpiry.getTime() - 5 * 60 * 1000)) {
      return;
    }

    // Try refresh first if we have a refresh token
    if (this.refreshToken) {
      try {
        await this.refreshAccessToken();
        return;
      } catch {
        // Refresh failed, do full auth
      }
    }

    await this.authenticate();
  }

  private async authenticate(): Promise<void> {
    const response = await this.httpClient.post("/oauth/token", {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: "client_credentials",
    });

    this.accessToken = response.data.access_token;
    this.refreshToken = response.data.refresh_token;
    this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);
  }

  private async refreshAccessToken(): Promise<void> {
    const response = await this.httpClient.post("/oauth/refresh", {
      refresh_token: this.refreshToken,
    });

    this.accessToken = response.data.access_token;
    this.refreshToken = response.data.refresh_token;
    this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);
  }
}
```

#### Pattern 5: Multi-Step Authentication (like KarroFin)

Used by: KarroFin

```typescript
export class MultiStepAuthClient extends BaseLenderClient {
  private authToken: string | null = null;
  private tokenExpiry: Date | null = null;

  async sendLead(lead: LenderRequest): Promise<LenderApiResponse> {
    await this.ensureAuthenticated();
    
    const response = await this.httpClient.post("/leads", payload, {
      headers: {
        Authorization: `Bearer ${this.authToken}`,
      },
    });
    // ...
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.authToken && this.tokenExpiry && 
        new Date() < new Date(this.tokenExpiry.getTime() - 5 * 60 * 1000)) {
      return;
    }

    await this.authenticate();
  }

  private async authenticate(): Promise<void> {
    const response = await this.httpClient.post("/auth", {
      partner_code: this.config.partnerCode,
      passkey: this.config.passkey,
    });

    this.authToken = response.data.result;  // JWT token

    // Parse JWT to get expiry
    try {
      interface JwtPayload {
        exp?: number;
      }
      const payload = JSON.parse(
        Buffer.from(this.authToken.split(".")[1], "base64").toString()
      ) as JwtPayload;
      
      if (payload.exp) {
        this.tokenExpiry = new Date(payload.exp * 1000);
      } else {
        this.tokenExpiry = new Date(Date.now() + 3600 * 1000);  // Default 1 hour
      }
    } catch {
      this.tokenExpiry = new Date(Date.now() + 3600 * 1000);
    }
  }
}
```

### Step 5: Registering in Factory

Add your client to `src/clients/lender-client.factory.ts`:

```typescript
import { config } from "@/config";
import { type LenderClient, LenderName } from "@/models";
import { KarroFinClient } from "./lenders/karrofin.client";
import { PocketCreditClient } from "./lenders/pocketcredit.client";
import { ZypeClient } from "./lenders/zype.client";
import { QuickLoanClient } from "./lenders/quickloan.client";  // <-- Import

export class LenderClientFactory {
  private static clients: Map<LenderName, LenderClient> = new Map();

  static getClient(lenderName: LenderName): LenderClient | null {
    if (LenderClientFactory.clients.has(lenderName)) {
      return LenderClientFactory.clients.get(lenderName)!;
    }

    const lenderConfig = config.lenders[lenderName];
    if (!lenderConfig || !lenderConfig.enabled) {
      return null;
    }

    let client: LenderClient;
    switch (lenderName) {
      case LenderName.KARROFIN:
        client = new KarroFinClient(lenderName, lenderConfig);
        break;
      case LenderName.POCKETCREDIT:
        client = new PocketCreditClient(lenderName, lenderConfig);
        break;
      case LenderName.ZYPE:
        client = new ZypeClient(lenderName, lenderConfig);
        break;
      case LenderName.QUICKLOAN:  // <-- Add case
        client = new QuickLoanClient(lenderName, lenderConfig);
        break;
      default:
        return null;
    }

    LenderClientFactory.clients.set(lenderName, client);
    return client;
  }

  static getAllEnabledClients(): LenderClient[] {
    return Object.values(LenderName)
      .map((name) => LenderClientFactory.getClient(name))
      .filter((client): client is LenderClient => client !== null);
  }

  static clearClients(): void {
    LenderClientFactory.clients.clear();
  }
}
```

### Step 6: Testing

Create a test file: `tests/clients/lenders/quickloan.client.spec.ts`

```typescript
import { QuickLoanClient } from "@/clients/lenders/quickloan.client";
import { LenderName, type LenderConfig } from "@/models";

const mockConfig: LenderConfig = {
  id: "quickloan-test",
  name: LenderName.QUICKLOAN,
  baseUrl: "https://api.quickloan.com/v1",
  apiKey: "test-api-key",
  timeout: 30000,
  enabled: true,
  eligibilityRules: {
    minIncome: 20000,
    minAge: 21,
    maxAge: 60,
    allowedEmploymentTypes: ["salaried", "self_employed"],
  },
  rateLimitPerMinute: 60,
};

describe("QuickLoanClient", () => {
  let client: QuickLoanClient;

  beforeEach(() => {
    client = new QuickLoanClient(LenderName.QUICKLOAN, mockConfig);
  });

  describe("sendLead", () => {
    it("should successfully send lead and return accepted status", async () => {
      // Mock axios response
      // Test implementation
    });

    it("should handle duplicate lead response", async () => {
      // Test deduplication handling
    });

    it("should handle API errors", async () => {
      // Test error handling
    });
  });

  describe("isHealthy", () => {
    it("should return true when API is healthy", async () => {
      // Test health check
    });

    it("should return false when API is down", async () => {
      // Test health check failure
    });
  });
});
```

Run tests:
```bash
npm test -- quickloan.client.spec.ts
```

### Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| **Not handling token expiry** | Always implement token caching with buffer time (e.g., 5 min) |
| **Missing field mappings** | Create a mapping table for all fields, especially enums |
| **Not logging requests** | Use the base class interceptors or add explicit logging |
| **Hardcoding values** | Never hardcode; use config and pass as parameters |
| **Ignoring error cases** | Test all error scenarios: network, auth, validation, duplicate |
| **Not validating response** | Always validate response structure before accessing properties |
| **Blocking on auth** | Cache auth tokens to avoid calling auth endpoint every time |

### Complete Example: QuickLoan Integration

Here's the complete implementation for a fictional "QuickLoan" lender:

**1. Configuration (`src/config/index.ts`):**
```typescript
[LenderName.QUICKLOAN]: {
  id: "quickloan-001",
  name: LenderName.QUICKLOAN,
  baseUrl: process.env.QUICKLOAN_BASE_URL || "",
  apiKey: process.env.QUICKLOAN_API_KEY || "",
  timeout: 30000,
  enabled: Boolean(process.env.QUICKLOAN_API_KEY),
  eligibilityRules: {
    minIncome: 20000,
    maxIncome: 100000,
    minAge: 21,
    maxAge: 60,
    allowedEmploymentTypes: ["salaried", "self_employed"],
    allowedStates: ["MH", "DL", "KA", "TN", "TG"],
  },
  rateLimitPerMinute: 60,
} as LenderConfig,
```

**2. Client (`src/clients/lenders/quickloan.client.ts`):**
```typescript
import type { LenderApiResponse, LenderRequest, LenderResponseStatus } from "@/models";
import { logger } from "@/utils/logger";
import { BaseLenderClient } from "../base-lender.client";

interface QuickLoanLeadResponse {
  status: string;
  message?: string;
  application_id?: string;
  duplicate?: boolean;
}

export class QuickLoanClient extends BaseLenderClient {
  async sendLead(lead: LenderRequest): Promise<LenderApiResponse> {
    try {
      const payload = {
        name: `${lead.firstName} ${lead.lastName}`,
        phone: lead.phone,
        email: lead.email,
        dob: this.formatDate(lead.dateOfBirth),
        pan: lead.panNumber,
        employment_type: lead.employmentType,
        monthly_income: lead.monthlyIncome,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        pincode: lead.pincode,
      };

      const response = await this.httpClient.post<QuickLoanLeadResponse>(
        "/applications",
        payload,
        {
          headers: {
            "X-API-Key": this.config.apiKey,
          },
        }
      );

      const data = response.data;

      let status: LenderResponseStatus;
      if (data.duplicate) {
        status = "Deduped" as LenderResponseStatus;
      } else if (data.status === "approved") {
        status = "Accepted" as LenderResponseStatus;
      } else if (data.status === "rejected") {
        status = "Rejected" as LenderResponseStatus;
      } else {
        status = "Error" as LenderResponseStatus;
      }

      return {
        success: status !== ("Error" as LenderResponseStatus),
        status,
        message: data.message,
        data: {
          application_id: data.application_id,
        } as Record<string, unknown>,
      };
    } catch (error) {
      return this.handleError(error);
    }
  }
}
```

**3. Factory Registration (`src/clients/lender-client.factory.ts`):**
```typescript
import { QuickLoanClient } from "./lenders/quickloan.client";
// ... other imports

case LenderName.QUICKLOAN:
  client = new QuickLoanClient(lenderName, lenderConfig);
  break;
```

**4. Environment Variables (`.env`):**
```bash
QUICKLOAN_BASE_URL=https://api.quickloan.com/v1
QUICKLOAN_API_KEY=ql_live_key_xxxxxxxx
```

---

## Configuration Guide

### Environment-Specific Configuration

The system uses environment variables for configuration. Create different `.env` files for different environments:

**`.env.development`**:
```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://dev_user:dev_pass@localhost:5432/loan_leads_dev
KARROFIN_BASE_URL=https://sandbox-api.karrofin.com
# ... other sandbox credentials
```

**`.env.production`**:
```bash
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://prod_user:prod_pass@prod-db:5432/loan_leads_prod
KARROFIN_BASE_URL=https://api.karrofin.com
# ... production credentials
```

**Loading different configs:**
```bash
# Development
npm run dev

# Production
NODE_ENV=production npm start
```

### Lender Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier for the lender |
| `name` | LenderName | Yes | Enum value identifying the lender |
| `baseUrl` | string | Yes | Base URL for the lender's API |
| `apiKey` | string | Depends | API key for authentication (if applicable) |
| `clientId` | string | Depends | OAuth client ID |
| `clientSecret` | string | Depends | OAuth client secret |
| `partnerCode` | string | Depends | Partner identifier (KarroFin specific) |
| `passkey` | string | Depends | Authentication passkey (KarroFin specific) |
| `timeout` | number | Yes | Request timeout in milliseconds |
| `enabled` | boolean | Yes | Whether the lender is active |
| `rateLimitPerMinute` | number | Yes | API rate limit for this lender |

### Eligibility Rules Reference

| Rule | Type | Description |
|------|------|-------------|
| `minIncome` | number | Minimum monthly income in INR |
| `maxIncome` | number | Maximum monthly income in INR (optional) |
| `minAge` | number | Minimum age in years |
| `maxAge` | number | Maximum age in years |
| `allowedEmploymentTypes` | string[] | List of accepted employment types |
| `allowedStates` | string[] | Whitelist of state codes (optional) |
| `excludedStates` | string[] | Blacklist of state codes (optional) |

### Retry Configuration

Located in `config.retry`:

| Setting | Default | Description |
|---------|---------|-------------|
| `dedupCooldownDays` | 30 | Days to wait before retrying deduped leads |
| `maxRetries` | 3 | Maximum retry attempts per lead |
| `retryDelayMs` | 5000 | Delay between retries in milliseconds |

---

## Error Handling

### Custom Error Classes

The system uses custom error classes for different scenarios:

```typescript
// Base error class
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly isOperational: boolean = true,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// Validation errors (400)
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400, true);
  }
}

// Not found errors (404)
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(`${resource} not found`, "NOT_FOUND", 404, true);
  }
}

// Lender API errors (502)
export class LenderError extends AppError {
  constructor(
    message: string,
    public readonly lenderName: string,
    public readonly originalError?: Error,
  ) {
    super(message, "LENDER_ERROR", 502, true);
  }
}

// Duplicate lead errors (409)
export class DuplicateLeadError extends AppError {
  constructor(phone: string, email: string) {
    super(`Lead exists`, "DUPLICATE_LEAD", 409, true);
  }
}
```

### Error Code Reference

| Code | HTTP Status | Description | When It Occurs |
|------|-------------|-------------|----------------|
| `VALIDATION_ERROR` | 400 | Input validation failed | Request body doesn't match schema |
| `NOT_FOUND` | 404 | Resource not found | Lead ID doesn't exist |
| `DUPLICATE_LEAD` | 409 | Lead already exists | Attempt to create duplicate lead |
| `LENDER_ERROR` | 502 | Lender API error | External API call failed |
| `INTERNAL_ERROR` | 500 | Unexpected error | Unhandled exception |

### Error Handling Flow

```
Request comes in
      │
      ▼
┌──────────────────────┐
│ Validation (Zod)     │
│ ValidationError?     │
└──────────┬───────────┘
           │ No
           ▼
┌──────────────────────┐
│ Business Logic       │
│ AppError?            │
└──────────┬───────────┘
           │ No
           ▼
┌──────────────────────┐
│ Lender API Call      │
│ LenderError?         │
└──────────┬───────────┘
           │ No
           ▼
┌──────────────────────┐
│ Success Response     │
└──────────────────────┘
           │
           ▼ (Yes from any check)
┌──────────────────────┐
│ Error Middleware     │
│ Formats response     │
└──────────────────────┘
           │
           ▼
    JSON Error Response
```

---

## Logging & Monitoring

### Log Levels

| Level | Usage |
|-------|-------|
| `error` | Errors that need immediate attention |
| `warn` | Warnings, potential issues |
| `info` | General information, business events |
| `debug` | Detailed debugging information |

### Key Events Logged

**Application Startup:**
```typescript
logger.info("Configuration validated");
logger.info("Database initialized");
logger.info({ message: "Server started", port, environment });
```

**Lead Processing:**
```typescript
logger.info({ message: "Created new lead", leadId });
logger.info({ message: "Added new source to existing lead", leadId, newSource });
logger.info({ message: "Distributing lead to lenders", leadId, lenderCount, lenderNames });
```

**Lender Interactions:**
```typescript
logger.info({ message: "Sending lead to lender API", leadId, lender, lenderUrl });
logger.error({ message: "Failed to send lead to lender", lender, leadId, error });
```

**Background Jobs:**
```typescript
logger.info({ message: "Running retry job for deduped leads" });
logger.info({ message: "Retry job completed", retriedCount });
```

### Audit Trail Queries

```sql
-- Get complete audit trail for a lead
SELECT 
    l.id as lead_id,
    l.phone,
    l.email,
    l.created_at as lead_created,
    ls.source_name,
    ls.received_at as source_received,
    lr.lender_name,
    lr.status as lender_response,
    lr.sent_at,
    lr.responded_at,
    lr.response_data,
    lrl.decision as routing_decision,
    lrl.reason as routing_reason
FROM leads l
LEFT JOIN lead_sources ls ON l.id = ls.lead_id
LEFT JOIN lender_responses lr ON l.id = lr.lead_id
LEFT JOIN lender_routing_logs lrl ON l.id = lrl.lead_id AND lrl.lender_name = lr.lender_name
WHERE l.id = 'your-lead-uuid'
ORDER BY ls.received_at, lr.sent_at;

-- Find all errors in last 24 hours
SELECT 
    lr.lender_name,
    lr.status,
    lr.response_data->>'error' as error_message,
    lr.sent_at
FROM lender_responses lr
WHERE lr.status = 'Error'
    AND lr.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY lr.created_at DESC;

-- View routing decisions (why leads were skipped)
SELECT 
    DATE(lrl.created_at) as date,
    lrl.lender_name,
    lrl.decision,
    COUNT(*) as count,
    lrl.reason
FROM lender_routing_logs lrl
WHERE lrl.decision = 'SKIPPED_INELIGIBLE'
GROUP BY DATE(lrl.created_at), lrl.lender_name, lrl.decision, lrl.reason
ORDER BY date DESC, count DESC;
```

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- lead-processing.service.spec.ts

# Run tests matching pattern
npm test -- --grep "should process lead"

# Run tests in watch mode
npm test -- --watch
```

### Test Structure

```
tests/
├── clients/
│   └── lenders/
│       ├── karrofin.client.spec.ts
│       ├── pocketcredit.client.spec.ts
│       └── zype.client.spec.ts
├── services/
│   ├── lead-processing.service.spec.ts
│   └── retry.service.spec.ts
├── api/
│   └── routes/
│       └── lead.routes.spec.ts
└── setup.ts
```

### Mocking Lender Clients

```typescript
import { LenderClientFactory } from "@/clients";
import { type LenderClient, LenderName, type LenderApiResponse } from "@/models";

// Mock factory
jest.mock("@/clients/lender-client.factory");

describe("LeadProcessingService", () => {
  const mockLenderClient: jest.Mocked<LenderClient> = {
    name: LenderName.ZYPE,
    config: {
      id: "zype-001",
      name: LenderName.ZYPE,
      baseUrl: "https://api.zype.com",
      apiKey: "test-key",
      timeout: 30000,
      enabled: true,
      eligibilityRules: {
        minIncome: 25000,
        minAge: 23,
        maxAge: 55,
        allowedEmploymentTypes: ["salaried"],
      },
      rateLimitPerMinute: 50,
    },
    sendLead: jest.fn(),
    isHealthy: jest.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (LenderClientFactory.getAllEnabledClients as jest.Mock).mockReturnValue([
      mockLenderClient,
    ]);
  });

  it("should send lead to eligible lenders", async () => {
    const mockResponse: LenderApiResponse = {
      success: true,
      status: "Accepted",
      data: { application_id: "app-123" },
    };

    mockLenderClient.sendLead.mockResolvedValue(mockResponse);

    const result = await service.processIncomingLead(validLeadData);

    expect(mockLenderClient.sendLead).toHaveBeenCalled();
    expect(result.status).toBe("completed");
  });

  it("should handle lender errors gracefully", async () => {
    const mockError: LenderApiResponse = {
      success: false,
      status: "Error",
      error: "Network error",
    };

    mockLenderClient.sendLead.mockResolvedValue(mockError);

    const result = await service.processIncomingLead(validLeadData);

    expect(result.status).toBe("completed");
    // Service should continue even if one lender fails
  });
});
```

### Writing Integration Tests

```typescript
describe("Lead API Integration", () => {
  let app: Application;

  beforeAll(async () => {
    app = await createTestApp();
  });

  it("POST /api/v1/leads should create a lead", async () => {
    const leadData = {
      phone: "9876543210",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: "1990-05-15",
      monthlyIncome: 50000,
      employmentType: "salaried",
      panNumber: "ABCDE1234F",
      address: "123 Main Street",
      city: "Mumbai",
      state: "MH",
      pincode: "400001",
      source: "test",
    };

    const response = await request(app)
      .post("/api/v1/leads")
      .send(leadData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.phone).toBe(leadData.phone);
    expect(response.body.data.status).toBe("completed");
  });

  it("should return 400 for invalid data", async () => {
    const invalidData = {
      phone: "invalid",
      email: "not-an-email",
    };

    const response = await request(app)
      .post("/api/v1/leads")
      .send(invalidData)
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
```

---

## Deployment

### Docker Deployment

**Dockerfile**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/loan_leads
      - KARROFIN_API_KEY=${KARROFIN_API_KEY}
      # ... other env vars
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=loan_leads
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

**Deploy commands**:
```bash
# Build and run
docker-compose up -d --build

# View logs
docker-compose logs -f app

# Scale (if needed)
docker-compose up -d --scale app=3
```

### AWS EC2 Deployment

1. **Launch EC2 Instance**:
   - Amazon Linux 2 or Ubuntu 20.04
   - t3.medium or larger
   - Security group: open port 3000

2. **Install dependencies**:
```bash
# SSH into instance
ssh -i key.pem ec2-user@your-instance-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

3. **Deploy application**:
```bash
# Clone repository
git clone <your-repo>
cd loan-lead-management

# Install dependencies
npm ci --only=production

# Build
npm run build

# Setup environment
sudo nano .env

# Start with PM2
npm install -g pm2
pm2 start dist/index.js --name "loan-leads"
pm2 save
pm2 startup
```

### PM2 Configuration

**ecosystem.config.js**:
```javascript
module.exports = {
  apps: [
    {
      name: 'loan-lead-management',
      script: './dist/index.js',
      instances: 'max',  // Use all CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '500M',
      restart_delay: 3000,
      max_restarts: 5,
      min_uptime: '10s',
    },
  ],
};
```

**PM2 commands**:
```bash
# Start
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Logs
pm2 logs

# Restart
pm2 restart loan-lead-management

# Zero-downtime reload
pm2 reload loan-lead-management
```

### Production Environment Variables

```bash
# Server
NODE_ENV=production
PORT=8080

# Database (use connection pooler for production)
DATABASE_URL=postgresql://user:pass@prod-db-host:5432/loan_leads?sslmode=require

# Security
# Generate strong secrets
SESSION_SECRET=your-strong-random-string

# Lenders (production endpoints)
KARROFIN_BASE_URL=https://api.karrofin.com
KARROFIN_API_KEY=live_key_xxxxxxxx
# ... other lenders

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Database connection failed"

**Symptoms:**
```
Error connecting to database: Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**
1. Check if PostgreSQL is running:
   ```bash
   sudo systemctl status postgresql
   sudo systemctl start postgresql
   ```

2. Verify connection string in `.env`:
   ```bash
   DATABASE_URL=postgresql://username:password@localhost:5432/loan_leads_db
   ```

3. Test connection manually:
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```

#### Issue: "No lenders configured"

**Symptoms:**
```
WARN: No lenders configured - check environment variables
```

**Solutions:**
1. Check if lender env vars are set:
   ```bash
   echo $KARROFIN_API_KEY
   echo $ZYPE_API_KEY
   ```

2. Verify `.env` file is loaded:
   ```bash
   # In config/index.ts, add logging:
   console.log('Lenders config:', config.lenders);
   ```

3. Check if `enabled` flag is true:
   ```typescript
   enabled: Boolean(process.env.KARROFIN_API_KEY)
   ```

#### Issue: "Lender API timeout"

**Symptoms:**
```
Error: timeout of 30000ms exceeded
```

**Solutions:**
1. Increase timeout in config:
   ```typescript
   timeout: 60000,  // 60 seconds
   ```

2. Check lender API status
3. Verify network connectivity:
   ```bash
   curl -I https://api.lender.com/health
   ```

#### Issue: "Validation errors"

**Symptoms:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "phone: Phone must be 10 digits"
  }
}
```

**Solutions:**
1. Check request format:
   ```bash
   # Phone should be 10 digits, no country code
   "phone": "9876543210"  // ✓
   "phone": "+919876543210"  // ✗
   ```

2. Verify PAN format:
   ```
   Format: ABCDE1234F (5 letters, 4 numbers, 1 letter)
   ```

3. Check date format:
   ```
   Format: YYYY-MM-DD
   Example: "1990-05-15"
   ```

#### Issue: "Duplicate lead not detected"

**Symptoms:** Same person creates multiple lead records

**Solutions:**
1. Check if phone/email matches exactly:
   ```sql
   SELECT phone, email FROM leads 
   WHERE phone IN ('9876543210', '9876543211');
   ```

2. Verify deduplication logic in service
3. Check for leading/trailing spaces

#### Issue: "Background job not running"

**Symptoms:** Deduped leads are not being retried

**Solutions:**
1. Check if job is started:
   ```typescript
   // In index.ts, verify:
   const retryJob = new RetryJob(retryService, 60);
   retryJob.start();  // Should be called
   ```

2. Check job interval:
   ```bash
   # Default is 60 minutes, check if it's too long
   ```

3. Manually trigger retry:
   ```bash
   curl -X POST http://localhost:3000/api/v1/admin/retry-deduped
   ```

### Debugging Tips

**Enable debug logging:**
```bash
# Set log level
LOG_LEVEL=debug npm run dev
```

**Check database state:**
```sql
-- Recent leads
SELECT * FROM leads ORDER BY created_at DESC LIMIT 10;

-- Recent responses
SELECT * FROM lender_responses ORDER BY created_at DESC LIMIT 10;

-- Job status (check retry_after dates)
SELECT lead_id, lender_name, status, retry_after 
FROM lender_responses 
WHERE status = 'Deduped';
```

**Test lender connectivity:**
```bash
# Test health endpoint
curl http://localhost:3000/api/v1/admin/health

# Or manually test lender
curl -H "Authorization: Bearer TOKEN" \
  https://api.lender.com/health
```

---

## FAQ

### General Questions

**Q: What is the difference between "Deduped" and "Duplicate"?**

A: 
- **Duplicate** (our system): When the same person is submitted multiple times. We consolidate them into one lead with multiple sources.
- **Deduped** (lender response): When a lender already has this lead in their system and rejects it as a duplicate. We retry these after 30 days.

**Q: Can a lead be sent to multiple lenders?**

A: Yes! That's the core feature. We send leads to ALL eligible lenders simultaneously to maximize acceptance chances.

**Q: How do I add a new lead source?**

A: Just submit a lead with a new `source` value. The system will automatically track it. No code changes needed.

### Technical Questions

**Q: Why use TypeORM over raw SQL?**

A: TypeORM provides:
- Type safety with TypeScript
- Migration support
- Entity relationships
- Query builder
- Database abstraction (can switch DBs easily)

**Q: How do I handle lender API changes?**

A:
1. Update the client code in `src/clients/lenders/`
2. Update tests
3. Test in sandbox environment
4. Deploy to production

**Q: Can I disable a lender without removing code?**

A: Yes! Set the `enabled` flag to `false` in config or remove the environment variables. The lender will be skipped.

**Q: How do I change the retry cooldown period?**

A: Update in `src/config/index.ts`:
```typescript
retry: {
  dedupCooldownDays: 30,  // Change to desired days
}
```

**Q: What happens if a lender is down?**

A: The lead processing continues with other lenders. The error is logged, and you can monitor via logs or the `lender_responses` table.

### Data Questions

**Q: How long is data retained?**

A: By default, indefinitely. Implement a data retention policy based on your compliance requirements.

**Q: Can I export lead data?**

A: Use SQL queries to export:
```bash
psql $DATABASE_URL -c "COPY (SELECT * FROM leads) TO STDOUT WITH CSV HEADER" > leads.csv
```

**Q: How do I find leads from a specific source?**

A:
```sql
SELECT l.* FROM leads l
JOIN lead_sources ls ON l.id = ls.lead_id
WHERE ls.source_name = 'facebook_ads';
```

### Integration Questions

**Q: What authentication methods are supported?**

A: We support:
- Static API Keys
- Bearer Tokens
- Basic Auth
- OAuth2 (with refresh tokens)
- Multi-step authentication (like KarroFin)

See [Lender Integration Guide](#lender-integration-guide) for examples.

**Q: How do I test a new lender integration?**

A:
1. Get sandbox credentials from the lender
2. Add configuration with sandbox URLs
3. Create client class
4. Write unit tests
5. Test manually with curl/Postman
6. Deploy to staging
7. Test with real data
8. Deploy to production

**Q: Can lenders have different eligibility criteria?**

A: Absolutely! Each lender has their own `eligibilityRules` in the config. The system automatically filters leads based on these rules.

### Performance Questions

**Q: How many leads can the system handle?**

A: Depends on infrastructure, but with proper scaling:
- Database: 1000+ leads/minute with PostgreSQL
- API: 1000+ concurrent requests with Node.js cluster
- Lenders: Parallel requests to all lenders

**Q: How do I scale horizontally?**

A:
1. Use PM2 cluster mode or Docker Swarm/Kubernetes
2. Move database to separate server/RDS
3. Use connection pooling
4. Add load balancer

**Q: What about rate limiting?**

A: Configure `rateLimitPerMinute` per lender. The system respects these limits.

### Security Questions

**Q: How are API keys stored?**

A: API keys are stored in environment variables. Never commit them to git!

**Q: Is data encrypted?**

A:
- In transit: HTTPS/TLS
- At rest: PostgreSQL supports encryption
- Database connections: Use SSL in production

**Q: How do I rotate API keys?**

A:
1. Generate new keys with the lender
2. Update environment variables
3. Restart application
4. Old keys will be automatically replaced

### Troubleshooting Questions

**Q: Lead is not being sent to any lender**

A: Check:
1. Are lenders configured and enabled?
2. Does lead meet eligibility criteria?
3. Check `lender_routing_logs` table for skip reasons
4. Check logs for errors

**Q: Deduplication is not working**

A: Verify:
1. Phone/email match exactly (check for spaces)
2. Database unique constraints are present
3. Repository query is correct

**Q: Retry job is not running**

A: Check:
1. Is the job started in `index.ts`?
2. Is the interval set correctly?
3. Are there deduped leads with `retry_after` in the past?
4. Check logs for job errors

---

## Contributing

When contributing to this project:

1. Follow the existing code style
2. Add tests for new features
3. Update this README for significant changes
4. Run linting before committing: `npm run lint`
5. Run type checking: `npm run typecheck`

---

## License

MIT License - See LICENSE file for details.

---

## Support

For questions or issues:
- Check the [Troubleshooting](#troubleshooting) section
- Review [FAQ](#faq)
- Create an issue in the repository
- Contact the development team

---

**Last Updated:** 2024
**Version:** 1.0.0
