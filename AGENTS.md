# AGENTS.md

Guidelines for agentic coding agents working on this loan lead management system.

## Project Overview

TypeScript backend that ingests loan leads from multiple sources, deduplicates them, and distributes to loan providers (lenders) via their APIs. Tracks responses (Accepted/Rejected/Deduped) and retries deduped leads after 30 days.

## Build/Lint/Test Commands

```bash
# Install dependencies
npm install

# Development server with hot reload
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Run linter with auto-fix
npm run lint:fix

# Run type checker
npm run typecheck

# Run all tests
npm test

# Run single test file
npm test -- path/to/test.spec.ts

# Run tests matching pattern
npm test -- --grep "test name pattern"

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm run test:coverage
```

## Code Style Guidelines

### TypeScript

- Use strict TypeScript configuration (`strict: true`)
- Always specify return types on public functions
- Use `interface` for object shapes, `type` for unions/aliases
- Avoid `any`; use `unknown` when type is uncertain
- Prefer `readonly` arrays and properties where applicable

### Imports

```typescript
// Order: external libs → internal modules → relative imports
import { Express } from 'express';
import { LeadService } from '@/services/lead.service';
import { logger } from '../utils/logger';

// Group by category with blank lines between
```

- Use path aliases (`@/`) for imports outside current directory
- No circular dependencies
- Barrel exports for modules with multiple exports

### Naming Conventions

- **Files**: kebab-case (e.g., `lead-service.ts`, `api-types.ts`)
- **Classes**: PascalCase (e.g., `LeadProcessor`, `LenderClient`)
- **Functions/Variables**: camelCase (e.g., `processLead`, `isEligible`)
- **Constants**: UPPER_SNAKE_CASE for true constants
- **Interfaces/Types**: PascalCase with descriptive names (e.g., `LeadResponse`, `LenderConfig`)
- **Enums**: PascalCase for name, PascalCase for members

### Error Handling

- Use custom error classes extending Error
- Always catch and log errors at service boundaries
- Return structured error responses from APIs
- Never leak internal error details to clients

```typescript
class LeadProcessingError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'LeadProcessingError';
  }
}
```

### Database/Storage

- Use migrations for schema changes
- Index fields used in queries (leadId, source, createdAt, status)
- Soft deletes where appropriate
- Store lender API responses in full for audit trail

### API Design

- RESTful endpoints with plural nouns: `POST /api/leads`
- Use HTTP status codes correctly (201 Created, 400 Bad Request, etc.)
- Request/Response DTOs with validation (Zod or class-validator)
- Version API from the start: `/api/v1/leads`

### Async Patterns

- Always use `async/await`, never callbacks
- Handle promise rejections properly
- Use Promise.all() for parallel operations only when safe
- Implement proper timeout handling for external API calls

### Testing

- Unit tests for business logic (`*.spec.ts`)
- Integration tests for API endpoints (`*.e2e-spec.ts`)
- Mock external API calls
- Test deduplication logic thoroughly
- Test retry logic for deduped leads

### Lender Integration

- Abstract lender clients behind common interface
- Store lender API credentials securely (env vars)
- Implement circuit breaker for failing lenders
- Log all requests/responses for debugging
- Handle rate limiting gracefully

### Security

- Validate all input data
- Sanitize data before storage
- Use HTTPS for all communications
- Implement rate limiting on ingest endpoint
- Never commit API keys or secrets

## Project Structure

```
src/
├── api/              # HTTP routes and controllers
├── services/         # Business logic
├── repositories/     # Database access
├── models/           # TypeScript interfaces/types
├── clients/          # Lender API clients
├── utils/            # Helper functions
├── config/           # Configuration
└── jobs/             # Background tasks (lead retry)
```

## Key Business Rules

1. Deduplicate leads by user identity (phone/email), track all sources
2. Send leads to ALL eligible lenders simultaneously
3. Accepted/Rejected = final state; Deduped = retry after 30 days
4. Maximize lead distribution - send new leads first, then retry deduped
5. Store complete lender response history for audit

## Environment Variables

```bash
# Required
DATABASE_URL=
REDIS_URL=

# Lender API configs (one per lender)
KARROFIN_API_KEY=
KARROFIN_BASE_URL=
POCKETCREDIT_API_KEY=
ZYPE_API_KEY=
```

## Documentation

- JSDoc for all public functions and classes
- Inline comments for complex business logic
- Update docs/ folder with API integration notes
