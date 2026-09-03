# NexusBank — AI-Powered Digital Banking & Fraud Detection Platform

<p align="center">
  <strong>Modern Digital Banking • AI/ML Fraud Detection • Behavioural Risk Intelligence</strong>
</p>

<p align="center">
  A full-stack banking platform built with MERN, FastAPI, and scikit-learn, combining secure digital banking workflows with explainable multi-signal fraud detection.
</p>

---

## Overview

NexusBank is a full-stack digital banking portfolio project designed to demonstrate how modern banking applications can combine everyday financial services with intelligent transaction-risk analysis.

The platform brings together:

- Digital banking and account management
- Secure authentication and OTP verification
- Beneficiary management
- Money transfers with verification
- Transaction history and statements
- Fixed Deposits
- PPF
- Rewards
- Alerts and notifications
- Nexus Prime premium membership
- Behavioural transaction analysis
- Rule-based fraud detection
- Machine-learning fraud probability prediction
- Explainable fraud-risk visualization
- Admin fraud monitoring and investigation

The project is structured as three independently runnable services:

    NexusBank
    │
    ├── Frontend
    │     React + Vite
    │
    ├── Backend
    │     Node.js + Express + MongoDB
    │
    └── ML Service
          Python + FastAPI + scikit-learn

---

# Why NexusBank?

Traditional banking applications often expose transaction history and account information without showing users why a transaction may be considered risky.

NexusBank focuses on the complete experience:

    Banking Transaction
            │
            ▼
    Transaction Validation
            │
            ▼
    Rule Analysis
            │
            ▼
    Behavioural Analysis
            │
            ▼
    ML Fraud Probability
            │
            ▼
    Risk Scoring
            │
            ▼
    Explainable Decision
            │
            ▼
    Customer / Admin Experience

Instead of relying on a single fraud signal, NexusBank combines multiple independent signals into a unified risk-analysis pipeline.

---

# Core Features

## Digital Banking

- Customer registration and login
- OTP-based verification
- Account overview
- Multiple customer accounts
- Account balances
- Beneficiary management
- Transaction history
- Money transfers
- Transfer verification
- Idempotent transaction handling
- Fixed Deposits
- PPF management
- Rewards
- Alerts
- Notifications
- Statements
- Statement sharing
- PDF receipts
- Nexus Prime premium membership

---

# AI & Fraud Detection

The fraud-detection system is one of the core technical components of NexusBank.

It combines three major signals:

    Rule-based Risk
          +
    Behavioural Risk
          +
    ML Fraud Probability
          |
          ▼
    Final Risk Score

The backend uses:

    Rule Score       → 55%
    Behavioural     → 30%
    ML Probability  → 15%

The final score is mapped into:

    0 – 29   → LOW
    30 – 59  → MEDIUM
    60 – 100 → HIGH

This architecture allows the ML model to enhance fraud detection without becoming the only source of truth.

---

# Fraud Detection Pipeline

A transaction can pass through the following analysis stages:

### 1. Transaction Validation

The backend validates:

- Sender account
- Beneficiary
- Amount
- Account state
- Transfer limits
- Idempotency
- Authentication requirements

### 2. Rule Engine

The rule engine evaluates deterministic transaction-risk conditions.

Examples include:

- Large transaction amount
- New beneficiary
- New device
- Unusual transaction timing
- High transaction velocity
- Suspicious transaction history
- Other configured risk signals

### 3. Behavioural Analyzer

The behavioural layer compares the transaction with the user's historical activity.

It considers signals such as:

- Historical transaction amount
- Amount deviation
- Transaction frequency
- Device familiarity
- Beneficiary familiarity
- Previous suspicious activity
- Behavioural deviation

### 4. ML Prediction

The Node.js backend sends engineered features to the Python ML service.

The ML service returns:

    fraud_probability

The backend never fabricates an ML probability when the ML service is unavailable.

### 5. Risk Scoring

The individual signals are combined into a final risk score.

Conceptually:

    Final Risk =
        Rule Score × 0.55
      + Behavioural Score × 0.30
      + ML Score × 0.15

### 6. Decision Engine

The final risk level is used by the transaction decision engine to determine the appropriate transaction state and verification requirements.

---

# Explainable Fraud Detection

NexusBank is designed so that a fraud decision is not just a number.

The frontend can present:

- Fraud risk score
- Risk level
- Triggered rules
- Behavioural signals
- ML contribution
- Risk explanation

This makes the fraud system easier to understand during demonstrations and investigations.

---

# Machine Learning Service

The ML service is an independent Python application located in:

    ml-service/

Technology:

- Python
- FastAPI
- Pydantic
- pandas
- NumPy
- scikit-learn
- joblib

The current model uses:

    GradientBoostingClassifier

with a preprocessing pipeline based on:

    ColumnTransformer
    StandardScaler
    passthrough features

---

# ML Features

The prediction model uses nine transaction features:

    amount
    amount_to_average_ratio
    beneficiary_age_days
    is_new_beneficiary
    is_new_device
    hour_of_day
    transactions_last_5_minutes
    previous_suspicious_count
    behavioural_deviation

The model uses:

    0 = legitimate
    1 = suspicious / fraud

The default prediction threshold is:

    0.5

---

# Current ML Model

The repository contains versioned model artifacts.

Latest model:

    model-v1-2026-09-01

Training configuration:

    Dataset size: 50,000 transactions
    Fraud rate: 8%
    Random seed: 42
    Test split: 20%
    Prediction threshold: 0.5

Recorded held-out evaluation:

    ROC-AUC:    0.901685
    PR-AUC:     0.837250
    F1:         0.878924
    Precision:  0.964330
    Recall:     0.807415

These metrics are based on the project's synthetic dataset and should not be interpreted as production banking fraud-detection performance.

---

# ML Service API

The Python service exposes:

    GET  /health
    GET  /
    POST /predict

Swagger documentation is available during development at:

    http://localhost:8000/docs

Example prediction request:

    {
      "amount": 2500.0,
      "amount_to_average_ratio": 1.05,
      "beneficiary_age_days": 210.0,
      "is_new_beneficiary": 0,
      "is_new_device": 0,
      "hour_of_day": 13,
      "transactions_last_5_minutes": 0,
      "previous_suspicious_count": 0,
      "behavioural_deviation": 5.0
    }

The response contains the model-generated fraud probability and prediction state together with request/transaction correlation information.

---

# Backend ↔ ML Architecture

The Node.js backend communicates with the Python service over HTTP.

    Node.js Backend
          │
          │ POST /predict
          ▼
    FastAPI ML Service
          │
          ▼
    Feature Validation
          │
          ▼
    Feature Engineering
          │
          ▼
    Scikit-learn Pipeline
          │
          ▼
    fraud_probability
          │
          ▼
    Node.js Fraud Engine

The ML service is intentionally isolated from MongoDB and does not directly authorize banking transactions.

---

# Safe ML Fallback

ML availability is treated as a dependency rather than a reason to invent a result.

If the ML service is unavailable:

    No fabricated probability
    No fake ML score
    No silent replacement with a random value

The Node.js fraud engine can continue using its rule-based and behavioural signals according to its configured safety logic.

This keeps the banking workflow more resilient while maintaining transparency around ML availability.

---

# Security-Oriented Design

The project includes several security-focused mechanisms.

### Authentication

- JWT-based authentication
- OTP verification
- Password hashing
- Role-based access control
- Protected routes

### Transaction Security

- Transfer verification
- Idempotency handling
- Account validation
- Beneficiary validation
- Transaction state management
- Fraud analysis before final transaction processing

### Application Security

- Helmet
- CORS configuration
- Request validation
- Centralized error handling
- Request correlation IDs
- Audit logging
- Session handling
- Device tracking

### Data Handling

- Monetary values handled using paise-based integer representation where applicable
- Controlled environment configuration
- No raw OTP returned by the OTP service
- Environment secrets excluded from Git

---

# Banking Features

## Accounts

Customers can view:

- Total balance
- Active accounts
- Account details
- Account-specific activity

---

## Transfers

The transfer workflow supports:

- Beneficiary selection
- Amount validation
- Transaction validation
- Fraud analysis
- Risk scoring
- Verification
- Idempotency
- Transaction processing
- Receipt generation

---

## Beneficiaries

Customers can:

- Add beneficiaries
- View beneficiaries
- Use beneficiaries during transfers
- Receive additional fraud scrutiny for newly added beneficiaries

---

## Transactions

The platform provides:

- Transaction history
- Transaction details
- Fraud-analysis information
- Risk indicators
- Transaction status
- Receipt access

---

# Fixed Deposits

NexusBank includes a Fixed Deposit workflow for demonstrating banking-product functionality.

Customers can manage:

- Deposit creation
- Deposit information
- Maturity information
- Interest-related data
- Deposit status

---

# PPF

The PPF module demonstrates long-term savings functionality.

It supports:

- PPF account management
- Contributions
- Contribution history
- PPF-related calculations
- Account information

---

# Rewards

The rewards system supports:

- Reward balances
- Reward transactions
- Reward history
- Customer reward activity

---

# Notifications & Alerts

NexusBank provides:

- Customer notifications
- Security alerts
- Transaction alerts
- Fraud-related alerts
- Notification history

The backend includes dedicated notification and alert services.

---

# Statements & Receipts

Customers can work with:

- Transaction statements
- Statement filters
- Statement insights
- Statement sharing
- PDF receipts

The backend contains dedicated services for PDF generation, statements, and statement sharing.

---

# Nexus Prime

Nexus Prime is the platform's premium membership experience.

The frontend includes a premium upgrade flow and premium-state UI.

The backend provides:

- Premium subscriptions
- Premium payments
- Premium service logic

The current portfolio implementation uses an annual premium price of:

    ₹499 / year

Premium functionality is implemented as a demonstration of subscription-based banking services.

---

# Admin & Fraud Monitoring

NexusBank also includes an administrative experience.

Admin capabilities include:

- Dashboard overview
- User management
- User details
- Transaction monitoring
- Fraud monitoring
- Fraud investigation
- Audit logs
- Security-related monitoring

The fraud-monitoring interface provides visibility into transaction risk and fraud-analysis information.

---

# Frontend

The frontend is built with:

- React
- Vite
- React Router
- CSS
- Context API
- Reusable components

Major areas include:

    src/
    ├── components/
    │   ├── accounts/
    │   ├── auth/
    │   ├── common/
    │   ├── dashboard/
    │   ├── fraud/
    │   ├── layout/
    │   ├── notifications/
    │   ├── statements/
    │   └── transfer/
    │
    ├── context/
    ├── hooks/
    ├── pages/
    │   ├── admin/
    │   └── customer/
    │
    ├── router/
    ├── services/
    ├── styles/
    └── utils/

The UI also includes responsive layouts, reusable design tokens, theme support, accessibility styles, loading states, error states, notifications, and fraud-risk visualization components.

---

# Frontend Customer Areas

The customer application includes routes/pages for:

- Dashboard
- Accounts
- Transactions
- Transfers
- Transfer verification
- Beneficiaries
- Cards
- Fixed Deposits
- PPF
- Rewards
- Alerts
- Fraud logs
- Statements
- Security
- Settings
- Demo

---

# Frontend Admin Areas

The admin application includes:

- Admin dashboard
- Overview
- Users
- User details
- Transactions
- Fraud monitoring
- Fraud investigation
- Audit logs

Role-protected routes prevent normal customers from accessing admin-only areas.

---

# Backend

The backend is built with:

- Node.js
- Express
- MongoDB
- Mongoose
- JWT
- Joi
- Nodemailer
- Helmet
- CORS
- PDFKit
- UUID

The backend is responsible for:

- Authentication
- Authorization
- Banking operations
- Account management
- Beneficiaries
- Transfers
- Transactions
- Fraud orchestration
- Risk scoring
- Notifications
- Statements
- Receipts
- Rewards
- FD
- PPF
- Premium membership
- Admin operations

---

# Backend Architecture

    HTTP Request
          │
          ▼
    Express Routes
          │
          ▼
    Middleware
          │
          ├── Authentication
          ├── Authorization
          ├── Validation
          ├── Request Context
          └── Error Handling
          │
          ▼
    Controllers
          │
          ▼
    Services
          │
          ├── Banking Services
          ├── Fraud Services
          ├── Notification Services
          ├── Statement Services
          └── Premium Services
          │
          ▼
    Mongoose Models
          │
          ▼
    MongoDB

---

# Backend Fraud Services

The fraud subsystem contains dedicated services for:

    behaviouralAnalyzer.js
    decisionEngine.js
    demoScenarios.js
    featureBuilder.js
    fraudOrchestrator.js
    mlClient.js
    riskScorer.js
    ruleEngine.js

This separation keeps fraud analysis modular and easier to test.

---

# API Surface

The backend exposes route groups covering:

    /api/auth
    /api/accounts
    /api/beneficiaries
    /api/transfers
    /api/transactions
    /api/fd
    /api/rewards
    /api/alerts
    /api/fraud
    /api/admin
    /api/demo
    /api/statements
    /api/notifications
    /api/receipts
    /api/ppf

Exact endpoint behaviour and configuration are documented inside the respective service README files.

---

# Project Structure

    NexusBank-MERN-AI-MLFraud-Detection/
    │
    ├── Backend/
    │   ├── config/
    │   ├── controllers/
    │   ├── middleware/
    │   ├── models/
    │   ├── routes/
    │   ├── seed/
    │   ├── services/
    │   ├── tests/
    │   ├── utils/
    │   ├── validators/
    │   ├── app.js
    │   ├── server.js
    │   ├── package.json
    │   └── README.md
    │
    ├── Frontend/
    │   ├── public/
    │   ├── src/
    │   ├── index.html
    │   ├── package.json
    │   └── README.md
    │
    ├── ml-service/
    │   ├── app/
    │   ├── models/
    │   ├── tests/
    │   ├── training/
    │   ├── main.py
    │   ├── requirements.txt
    │   └── README.md
    │
    ├── .gitignore
    └── README.md

---

# Local Setup

## 1. Clone

    git clone https://github.com/shashwatjha-dev/NexusBank-MERN-AI-MLFraud-Detection.git

    cd NexusBank-MERN-AI-MLFraud-Detection

---

# 2. Backend Setup

    cd Backend

    npm install

Create:

    .env

using:

    .env.example

Configure your local MongoDB connection, JWT secret, CORS settings, ML service URL, and email/OTP settings as required.

Start development server:

    npm run dev

---

# 3. Frontend Setup

Open another terminal:

    cd Frontend

    npm install

Create:

    .env

using:

    .env.example

Start the frontend:

    npm run dev

---

# 4. ML Service Setup

Open another terminal:

    cd ml-service

Create and activate a virtual environment.

Windows:

    python -m venv .venv

    .\.venv\Scripts\Activate.ps1

Install dependencies:

    pip install -r requirements.txt

If a model artifact is not available, train one:

    python -m training.train

Start the API:

    uvicorn main:app --host 0.0.0.0 --port 8000 --reload

---

# Environment Flow

The three services communicate approximately as follows:

    Frontend
       │
       │ HTTP API
       ▼
    Backend :5000
       │
       │ POST /predict
       ▼
    ML Service :8000
       │
       ▼
    MongoDB

The actual ports can be changed through environment configuration.

---

# Seed Data

The backend contains a seed system for creating demonstration data.

From:

    Backend/

Run:

    npm run seed

The seed process supports normal migration behaviour and a fresh reset option.

For a fresh demonstration database:

    npm run seed -- --fresh

Only use the fresh option when you intentionally want to recreate the seed state.

---

# Testing

## Backend

From:

    Backend/

Run:

    npm test

Backend tests cover important fraud and transaction logic including:

- Behavioural analysis
- Decision engine
- Money handling
- Risk scoring
- Rule engine
- Transfer idempotency

---

## ML Service

From:

    ml-service/

Run:

    pytest -q

The ML test suite covers:

- Dataset generation
- Model behaviour
- Prediction endpoint
- Validation
- Model availability
- Prediction probability handling
- Request correlation

---

# Development Philosophy

NexusBank is intentionally structured as a modular full-stack system rather than a single monolithic application.

The main design principles are:

### Separation of Concerns

Frontend, backend, and ML responsibilities are separated.

### Explainability

Fraud analysis should expose useful signals instead of only displaying a final number.

### Defensive Design

Validation, idempotency, authentication, and controlled error handling are used throughout the application.

### ML as a Supporting Signal

The ML model contributes to risk analysis but does not independently control the complete banking workflow.

### Reproducibility

The ML training pipeline uses deterministic seeds and stores model metadata.

### Testability

Fraud logic and important transaction behaviour are separated into testable services.

---

# Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, React Router, CSS |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Authentication | JWT, OTP |
| Validation | Joi, Pydantic |
| Fraud Engine | Node.js services |
| ML API | FastAPI, Uvicorn |
| Machine Learning | scikit-learn |
| Data Processing | pandas, NumPy |
| Model Persistence | joblib |
| Email | Nodemailer |
| Documents | PDFKit |
| Testing | Jest, pytest |
| Version Control | Git, GitHub |

---

# What This Project Demonstrates

This project demonstrates practical implementation of:

- Full-stack MERN development
- REST API architecture
- MongoDB data modelling
- Authentication and authorization
- OTP workflows
- Transaction processing
- Idempotency
- Financial amount handling
- Fraud rule engines
- Behavioural analytics
- Machine-learning inference
- FastAPI microservices
- Model versioning
- Explainable risk analysis
- Admin monitoring
- Audit logging
- Responsive React UI
- Modular service architecture
- Automated testing

---

# Portfolio Notes

NexusBank is intended as a portfolio and educational project demonstrating the integration of:

    Full-Stack Development
            +
    Banking Workflows
            +
    Fraud Detection
            +
    Behavioural Analytics
            +
    Machine Learning
            +
    Microservice Architecture

It is not intended to represent a production banking infrastructure.

---

# Important Disclaimer

NexusBank is a portfolio/educational project.

The ML fraud-detection service uses synthetic data and is not trained on real customer banking information.

The project should not be used for:

- Real financial decisions
- Real banking authorization
- Production fraud detection
- Credit decisions
- Customer risk decisions

Production financial systems require significantly stronger controls around security, privacy, compliance, model governance, monitoring, data quality, reliability, and regulatory requirements.

---

# Repository

GitHub:

https://github.com/shashwatjha-dev/NexusBank-MERN-AI-MLFraud-Detection

---

# Author

## Shashwat Jha

Full-Stack Developer focused on:

- MERN Stack
- AI/ML Integration
- Fraud Detection Systems
- Backend Engineering
- Modern React Applications

---

## NexusBank

**A modern digital banking experience powered by full-stack engineering, behavioural intelligence, and machine-learning based fraud analysis.**