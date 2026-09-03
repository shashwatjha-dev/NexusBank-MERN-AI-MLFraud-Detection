# NexusBank — Backend

Node.js + Express + MongoDB backend for **NexusBank**, a portfolio-grade digital banking application with an explainable fraud-detection engine.

This backend is one of three services in the full NexusBank project:

- `frontend/` — React + Vite client
- `backend/` — Node.js + Express + MongoDB API
- `ml-service/` — Python + FastAPI fraud-prediction service

---

## Demo / Portfolio Disclaimer

NexusBank is a **portfolio and demonstration banking application**.

It does not connect to real bank accounts, payment networks, government financial infrastructure, or external banking systems. Demo transactions do not move real funds.

Banking, authentication, fraud detection, rewards, fixed deposits, PPF, premium subscriptions, and account-management features are implemented for software demonstration and evaluation purposes.

The PPF functionality is a **simulation** and is not a real Government of India PPF account.

---

## Requirements

- Node.js **18.17+**
- npm (or yarn)
- MongoDB **6.x or compatible version**

The default local configuration uses:

    mongodb://localhost:27017

Install MongoDB Community Edition from the official MongoDB documentation if you do not already have it installed.

---

## 1. Install

From the project root:

    cd backend
    npm install

---

## 2. Configure environment

Create your local environment file from the example:

    cp .env.example .env

On Windows PowerShell:

    Copy-Item .env.example .env

Then open `.env` and configure the required values.

At minimum:

    MONGO_URL=mongodb://localhost:27017
    DB_NAME=nexusbank
    JWT_SECRET=your-secure-secret

Generate a strong JWT secret with:

    node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

Copy the generated value into `JWT_SECRET`.

### ML service

The fraud engine supports a separate Python FastAPI ML service.

If the ML service is not running, leave:

    ML_SERVICE_URL=

empty.

The fraud engine has an explicit safe fallback for an unavailable ML service and does not invent an ML probability.

---

## 3. Seed the database

Run:

    npm run seed

If the database is empty, the seed process creates the complete NexusBank demo dataset, including:

- 1 administrator
- 3 demo customers
- Primary and secondary accounts
- Beneficiaries
- Devices
- Historical transactions
- Fraud logs
- Alerts
- Security events
- Rewards
- Fixed deposit data
- PPF-related demo data where applicable
- Fraud-analysis data generated through the fraud engine

Fraud-related transaction analysis is produced by the backend fraud pipeline rather than simply storing arbitrary display values.

### Fresh seed

If you intentionally want to recreate the demo dataset from scratch:

    npm run seed -- --fresh

A normal seed run is designed to handle an already-seeded database without blindly destroying existing data.

> **Warning:** A fresh seed recreates the demo dataset and should only be used when resetting the local development database is intended.

---

## 4. Start the server

### Development

Start the server with automatic reload:

    npm run dev

### Production-style start

For a one-shot Node.js process:

    npm start

The backend listens on:

    http://localhost:5000

by default.

The port can be configured through the `PORT` environment variable.

---

## 5. Health check

Once the server is running:

    curl http://localhost:5000/api/health

The health endpoint can be used to verify that the API process is reachable.

---

## 6. Run tests

Run the backend test suite with:

    npm test

The project uses Node.js' built-in `node:test` runner.

No external test framework is required.

Current test coverage includes areas such as:

- Behavioural analysis
- Decision engine
- Money calculations
- Risk scoring
- Fraud rules
- Transfer idempotency

---

# Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@nexusbank.dev` | `Admin@12345` |
| Customer | `aisha@nexusbank.dev` | `Aisha@12345` |
| Customer | `rohan@nexusbank.dev` | `Rohan@12345` |
| Customer | `meera@nexusbank.dev` | `Meera@12345` |

### Authentication flow

Login is a two-step process:

1. `POST /api/auth/login` initiates authentication and issues a one-time password.
2. The OTP is delivered through the configured email flow.
3. `POST /api/auth/verify-otp` verifies the OTP.
4. A successful verification returns a JWT used for authenticated API requests.

The raw OTP should not be exposed to the frontend as part of the normal production-style authentication flow.

---

# Project Structure

    backend/
    │
    ├── app.js
    ├── server.js
    ├── package.json
    ├── .env.example
    │
    ├── config/
    │   ├── database.js
    │   ├── environment.js
    │   └── riskConfig.js
    │
    ├── models/
    │   ├── User
    │   ├── Account
    │   ├── Beneficiary
    │   ├── Transaction
    │   ├── LedgerEntry
    │   ├── FraudLog
    │   ├── Device
    │   ├── SecurityEvent
    │   ├── FixedDeposit
    │   ├── Reward
    │   ├── Alert
    │   ├── AuditLog
    │   ├── Notification
    │   ├── PPF
    │   ├── PPFContribution
    │   ├── PremiumPayment
    │   ├── PremiumSubscription
    │   ├── Session
    │   └── StatementShare
    │
    ├── middleware/
    │   ├── requestContext
    │   ├── response
    │   ├── auth
    │   ├── role
    │   ├── validate
    │   ├── errorMiddleware
    │   └── notFound
    │
    ├── validators/
    │   ├── auth
    │   ├── banking
    │   └── admin
    │
    ├── utils/
    │   ├── enums
    │   ├── errors
    │   ├── jwt
    │   ├── password
    │   └── money
    │
    ├── services/
    │   ├── otpService.js
    │   ├── auditService.js
    │   ├── deviceService.js
    │   ├── idempotencyService.js
    │   ├── transferService.js
    │   ├── analyticsService.js
    │   ├── csvService.js
    │   ├── emailService.js
    │   ├── notificationService.js
    │   ├── pdfService.js
    │   ├── ppfService.js
    │   ├── premiumService.js
    │   ├── rewardService.js
    │   ├── sessionService.js
    │   ├── statementShareService.js
    │   │
    │   └── fraud/
    │       ├── featureBuilder.js
    │       ├── ruleEngine.js
    │       ├── behaviouralAnalyzer.js
    │       ├── mlClient.js
    │       ├── riskScorer.js
    │       ├── decisionEngine.js
    │       ├── fraudOrchestrator.js
    │       └── demoScenarios.js
    │
    ├── controllers/
    │   ├── authController.js
    │   ├── accountController.js
    │   ├── beneficiaryController.js
    │   ├── transferController.js
    │   ├── transactionController.js
    │   ├── fixedDepositController.js
    │   ├── rewardController.js
    │   ├── alertController.js
    │   ├── fraudController.js
    │   ├── adminController.js
    │   ├── demoController.js
    │   ├── notificationController.js
    │   ├── ppfController.js
    │   ├── premiumController.js
    │   ├── receiptController.js
    │   └── statementController.js
    │
    ├── routes/
    │   ├── resource-specific route files
    │   └── index.js
    │
    ├── seed/
    │   └── seed.js
    │
    └── tests/
        ├── behaviouralAnalyzer.test.js
        ├── decisionEngine.test.js
        ├── money.test.js
        ├── riskScorer.test.js
        ├── ruleEngine.test.js
        └── transferIdempotency.test.js

---

# Fraud Detection Engine

Every transfer passes through an explainable fraud-analysis pipeline.

    Transfer request
           │
           ▼
    featureBuilder
           │
           ├── Last 100 completed transactions
           ├── Transaction velocity
           ├── Device history
           ├── Beneficiary trust
           └── Hour-of-day statistics
           │
           ▼
    ruleEngine
           │
           ├── HIGH_AMOUNT
           ├── NEW_BENEFICIARY
           ├── NEW_DEVICE
           ├── UNUSUAL_TIME
           ├── HIGH_VELOCITY
           └── PREVIOUS_SUSPICIOUS_ACTIVITY
           │
           ▼
    behaviouralAnalyzer
           │
           └── Statistical deviation signals
               ├── AMOUNT
               ├── TIME
               └── VELOCITY
           │
           ▼
    mlClient
           │
           └── Python FastAPI /predict
               ├── fraud_probability
               └── model_version
           │
           ▼
    riskScorer
           │
           ├── Rule contribution:         55%
           ├── Behavioural contribution: 30%
           └── ML contribution:           15%
           │
           ▼
    decisionEngine
           │
           ├── LOW
           │     └── COMPLETED
           │
           ├── MEDIUM
           │     └── VERIFICATION_REQUIRED
           │
           └── HIGH
                 └── BLOCKED
           │
           ▼
    fraudOrchestrator
           │
           └── Complete explainable analysis object

---

## Risk Levels

The final fraud risk score is normalized to a range of `0..100`.

| Score | Risk Level |
|------:|------------|
| `0–29` | LOW |
| `30–59` | MEDIUM |
| `60–100` | HIGH |

The configured risk components are:

    Rule-based risk        → 55%
    Behavioural risk       → 30%
    ML risk                → 15%

The risk configuration is maintained centrally in:

    config/riskConfig.js

---

## Rule Engine

The rule engine evaluates categorical fraud indicators.

Current rule categories include:

- `HIGH_AMOUNT`
- `NEW_BENEFICIARY`
- `NEW_DEVICE`
- `UNUSUAL_TIME`
- `HIGH_VELOCITY`
- `PREVIOUS_SUSPICIOUS_ACTIVITY`

Each triggered rule carries explainable information such as:

    code
    label
    contribution
    evidence

This allows the frontend and administrative fraud views to show **why** a transaction was considered risky instead of exposing only a single score.

---

## Behavioural Analysis

The behavioural analyzer looks for statistical deviations from the customer's historical activity.

Signals include:

- Transaction amount deviation
- Time-of-day deviation
- Transaction velocity deviation

These behavioural signals complement categorical fraud rules and provide a more personalized risk assessment based on the customer's previous activity.

---

# ML Service Integration

The backend can communicate with the separate Python FastAPI ML service through:

    ML_SERVICE_URL

The ML client sends a feature vector to the prediction endpoint.

A valid ML response contains:

    fraud_probability
    model_version

The probability must be within:

    0..1

The backend converts the probability into its ML risk contribution.

---

## Safe ML Fallback

The backend never invents an ML probability when the ML service is unavailable.

If `ML_SERVICE_URL` is empty, the service times out, returns a non-2xx response, or returns an invalid response:

    mlProbability = null

and the service status records the appropriate unavailable or invalid state.

The ML client uses a **2.5 second timeout**.

When ML is unavailable:

- ML contribution is treated as zero by the risk scorer.
- Rule and behavioural signals remain available.
- Elevated rule/behavioural signals can still cause a transaction to require verification.
- The system does not fabricate an ML score.

This ensures that the fraud engine remains usable while making the ML service's availability explicit.

---

# Decision Engine

The decision engine maps the calculated risk level to a transaction decision.

    LOW
     ↓
    COMPLETED

    MEDIUM
     ↓
    VERIFICATION_REQUIRED
     ↓
    OTP verification

    HIGH
     ↓
    BLOCKED

When the ML service is unavailable, the backend can still use rule and behavioural evidence to prevent elevated transactions from being silently treated as low risk.

---

# Historical Fraud Preservation

The fraud engine produces a complete analysis object at transaction decision time.

Historical fraud information can include:

- Rule score
- Behavioural score
- ML score
- ML probability
- ML service status
- Triggered rules
- Behavioural signals
- Model version
- Risk configuration version
- Decision
- Decision reason
- Feature snapshot

The analysis is preserved with the transaction/fraud record so that historical decisions remain explainable even if fraud rules, thresholds, or weights change later.

---

# Idempotency

Every transfer requires an `idempotencyKey`.

The backend uses database-level uniqueness to prevent accidental duplicate transfer processing.

The transaction collection uses a unique constraint based on the authenticated user and idempotency key.

This allows safe retries when a client does not know whether a previous request succeeded.

If a request is retried with the same idempotency key, the backend can return the already-created transaction rather than processing the transfer again.

---

# Atomic Money Handling

All monetary values are represented as **integer paise** rather than floating-point rupees.

For example:

    ₹499.00

is represented internally as:

    49900 paise

This avoids floating-point rounding problems in financial calculations.

Balance debits use a conditional database update guarded by the available balance.

Conceptually:

    availableBalancePaise >= requested amount

If the condition cannot be satisfied, the debit does not proceed.

This prevents the transfer path from taking an account balance below zero because of a concurrent debit race.

---

# Transfer Architecture

`transferService.js` is the authoritative transfer path.

The transfer flow combines:

    Authentication
          ↓
    Validation
          ↓
    Idempotency
          ↓
    Account / beneficiary checks
          ↓
    Fraud feature construction
          ↓
    Rule analysis
          ↓
    Behavioural analysis
          ↓
    Optional ML prediction
          ↓
    Risk scoring
          ↓
    Decision
          ↓
    OTP verification when required
          ↓
    Atomic balance update
          ↓
    Transaction / fraud history
          ↓
    Audit information

Keeping the transfer operation behind a single authoritative service helps prevent different routes from implementing inconsistent money-moving logic.

---

# Fixed Deposits

The backend supports a simulated Fixed Deposit workflow.

Fixed Deposit functionality includes dedicated persistence and service/controller layers and is intended for the NexusBank banking demonstration.

It does not represent an actual deposit with a real financial institution.

---

# PPF

NexusBank includes a simulated PPF workflow.

The backend contains dedicated models and services for:

- PPF accounts
- PPF contributions
- PPF-related account operations

The PPF feature is provided for portfolio demonstration only.

It is **not a real Government of India PPF account** and does not connect to government financial infrastructure.

---

# Rewards

The backend supports a rewards system associated with customer activity.

Rewards are persisted independently and can be surfaced through the customer banking experience.

---

# Nexus Prime / Premium Banking

The backend includes a simulated premium subscription system.

Premium functionality is backed by dedicated:

    premiumService.js
    premiumController.js
    PremiumPayment
    PremiumSubscription

The current demonstration plan is:

    ₹499
    Annual subscription

The premium flow supports subscription state and payment records for the portfolio application.

It is a **demo subscription flow** and does not charge real money.

---

# Notifications

The backend contains dedicated notification functionality for customer-facing banking events.

Notifications are handled through:

    notificationService.js
    notificationController.js

and corresponding persistence models and routes.

---

# Statements, Receipts & Sharing

The backend supports customer statement and receipt functionality.

Relevant services include:

    pdfService.js
    csvService.js
    statementShareService.js

The API also exposes dedicated statement and receipt routes.

These features are intended to demonstrate document generation, transaction reporting, and controlled statement-sharing workflows.

---

# Security & Middleware

The backend includes middleware for:

- Authentication
- Role-based access
- Request context
- Request validation
- Standardized responses
- Error handling
- Not-found handling

Authentication uses JWT-based authorization.

Passwords are handled through dedicated password utility logic rather than being stored as plaintext.

Security-related activity is represented through dedicated models such as:

    Device
    SecurityEvent
    AuditLog
    Session

---

# API Surface

The backend exposes the following primary API groups:

| Group | Base Path |
|-------|-----------|
| Auth | `/api/auth` |
| Accounts | `/api/accounts` |
| Beneficiaries | `/api/beneficiaries` |
| Transfers | `/api/transfers` |
| Transactions | `/api/transactions` |
| Fixed Deposits | `/api/fd` |
| Rewards | `/api/rewards` |
| Alerts | `/api/alerts` |
| Fraud | `/api/fraud` |
| Admin | `/api/admin` |
| Demo Mode | `/api/demo` |
| Statements | `/api/statements` |
| Notifications | `/api/notifications` |
| Receipts | `/api/receipts` |
| PPF | `/api/ppf` |
| Health | `/api/health` |

Routes are organized by resource under:

    routes/

and mounted through the application's central API router.

---

# Response Format

The API uses a standardized response envelope.

### Successful response

    {
      "success": true,
      "data": {},
      "message": "Request completed successfully",
      "requestId": "..."
    }

### Error response

    {
      "success": false,
      "error": {
        "code": "...",
        "message": "..."
      },
      "requestId": "..."
    }

The `requestId` helps correlate API responses with backend logs and request context.

---

# Troubleshooting

## `Missing required environment variables`

Make sure `.env` exists and required values such as:

    MONGO_URL
    DB_NAME
    JWT_SECRET

are configured.

---

## `JWT_SECRET must be at least 24 characters`

Generate a secure secret:

    node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

Then place the generated value in:

    JWT_SECRET=...

---

## Seed takes a long time per transaction

If `ML_SERVICE_URL` is configured but the Python ML service is not running, the fraud engine may wait for the ML client timeout.

For backend-only development, leave:

    ML_SERVICE_URL=

empty.

---

## `E11000 duplicate key error` for `idempotencyKey`

This can occur when a client intentionally or accidentally retries a transfer using the same idempotency key.

The idempotency mechanism is designed to prevent duplicate processing.

Use a new idempotency key for a genuinely new transfer.

---

## MongoDB connection errors

Verify that MongoDB is running and that your `.env` configuration points to the correct instance.

For the default local setup:

    mongodb://localhost:27017

---

# Development Notes

The backend is designed around a separation of responsibilities:

    Routes
      ↓
    Controllers
      ↓
    Services
      ↓
    Models / Database

Fraud detection has its own service pipeline:

    Feature Builder
          ↓
    Rule Engine
          ↓
    Behavioural Analyzer
          ↓
    ML Client
          ↓
    Risk Scorer
          ↓
    Decision Engine
          ↓
    Fraud Orchestrator

This separation keeps fraud analysis explainable and makes individual components easier to test and evolve.

---

# Testing Philosophy

The backend tests focus on important financial and fraud-detection invariants rather than only testing HTTP responses.

Examples include:

- Fraud rule triggering
- Behavioural signal calculation
- Risk-score calculation
- Decision thresholds
- Monetary calculations
- Transfer idempotency

The goal is to protect the parts of the system where incorrect behaviour could have the greatest impact on the banking simulation.

---

# Important Security Note

Never commit your local `.env` file or real credentials to Git.

The repository should contain:

    .env.example

but not:

    .env

Make sure the backend `.gitignore` excludes at least:

    node_modules/
    .env
    *.log
    .DS_Store

If a real secret has ever been committed to Git history, rotate that secret before publishing the repository.

---

# License / Usage

NexusBank is a portfolio and educational software project.

The application is intended to demonstrate:

- Full-stack banking application architecture
- Secure API design
- Explainable fraud detection
- Behavioural risk analysis
- ML service integration
- Transaction safety
- Idempotency
- Financial data handling
- Role-based access
- Banking-style workflows

It should not be used as production banking infrastructure without substantial additional security, compliance, infrastructure, monitoring, testing, and regulatory work.