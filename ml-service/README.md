# NexusBank — ML Fraud Prediction Service

Python + FastAPI based machine-learning service for estimating the fraud probability of individual NexusBank transactions.

The service is intentionally isolated from the Node.js backend. It communicates with the backend through a small HTTP contract:

    POST /predict
    GET  /health

The Node.js backend sends transaction features to this service, receives a fraud probability, and combines the ML result with NexusBank's rule-based and behavioural fraud signals.

> **Portfolio project:** This ML service is designed for demonstration and learning purposes. The training data is synthetic and does not represent production banking data.

---

## Overview

The NexusBank ML service provides:

- Transaction-level fraud probability prediction
- Binary `normal` / `suspicious` prediction
- Versioned scikit-learn model artifacts
- Deterministic synthetic training data
- Feature validation using Pydantic v2
- Reproducible training with a fixed random seed
- Model metadata and training provenance
- Model-version selection
- Safe model-unavailable behaviour
- Structured logging
- Request/transaction correlation IDs
- FastAPI Swagger documentation during development
- Automated unit and API tests

The ML service does **not** directly access MongoDB and does **not** perform the final banking transaction decision.

The Node.js fraud engine remains responsible for combining:

- Rule-based fraud signals
- Behavioural signals
- ML fraud probability
- Final risk scoring and transaction decision

---

## Architecture

    NexusBank Frontend
            |
            v
    Node.js / Express Backend
            |
            | POST /predict
            | transaction features
            v
    NexusBank ML Service
            |
            v
    Pydantic Validation
            |
            v
    Feature Engineering
            |
            v
    Scikit-learn Pipeline
            |
            v
    GradientBoostingClassifier
            |
            v
    fraud_probability
            |
            v
    Node.js Fraud Engine
            |
            +----------------------+
            |                      |
            v                      v
    Rule-based Score      Behavioural Score
            |                      |
            +----------+-----------+
                       |
                       v
                Final Fraud Risk
                       |
                       v
             Transaction Decision

The ML service is therefore a supporting intelligence layer rather than the final authorization layer.

---

## Requirements

Recommended environment:

- Python 3.11+
- Python 3.12 recommended
- pip

The project currently pins:

- FastAPI `0.115.0`
- Uvicorn `0.30.6`
- Pydantic `2.9.2`
- Pydantic Settings `2.5.2`
- scikit-learn `1.5.2`
- NumPy `2.1.1`
- pandas `2.2.3`
- joblib `1.4.2`
- pytest `8.3.3`
- httpx `0.27.2`

MongoDB and Node.js are not required to run the ML service by itself.

---

## Project Structure

    ml-service/
    ├── main.py
    ├── requirements.txt
    ├── .env.example
    ├── README.md
    │
    ├── app/
    │   ├── __init__.py
    │   ├── config.py
    │   ├── schemas.py
    │   ├── errors.py
    │   ├── logging_config.py
    │   │
    │   ├── routers/
    │   │   ├── __init__.py
    │   │   ├── health.py
    │   │   └── predict.py
    │   │
    │   └── ml/
    │       ├── __init__.py
    │       ├── feature_engineering.py
    │       ├── model_registry.py
    │       └── predictor.py
    │
    ├── training/
    │   ├── __init__.py
    │   ├── dataset.py
    │   ├── train.py
    │   └── evaluate.py
    │
    ├── models/
    │   ├── model-v1-YYYY-MM-DD.joblib
    │   └── model-v1-YYYY-MM-DD.metadata.json
    │
    └── tests/
        ├── __init__.py
        ├── conftest.py
        ├── test_dataset.py
        ├── test_model_behaviour.py
        └── test_predict_endpoint.py

---

## Installation

### macOS / Linux

    cd ml-service

    python -m venv .venv

    source .venv/bin/activate

    python -m pip install --upgrade pip

    pip install -r requirements.txt

    cp .env.example .env

---

### Windows PowerShell

    cd ml-service

    python -m venv .venv

    .\.venv\Scripts\Activate.ps1

    python -m pip install --upgrade pip

    python -m pip install -r requirements.txt

    copy .env.example .env

If PowerShell blocks the activation script:

    Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

Then activate again:

    .\.venv\Scripts\Activate.ps1

For Command Prompt:

    .venv\Scripts\activate.bat

---

## Environment Configuration

Copy the example environment file:

    cp .env.example .env

Windows:

    copy .env.example .env

Current configuration:

    ENV=development

    HOST=0.0.0.0
    PORT=8000

    CORS_ORIGINS=http://localhost:5000

    MODEL_DIR=./models
    MODEL_VERSION=

    PREDICTION_THRESHOLD=0.5

    TRAIN_DATASET_SIZE=50000
    TRAIN_FRAUD_RATE=0.08
    TRAIN_RANDOM_SEED=42
    TRAIN_TEST_SPLIT=0.2

### Configuration Explanation

`ENV`

Controls the runtime environment.

The default is:

    development

Swagger/OpenAPI documentation is available outside production.

---

`HOST`

Default:

    0.0.0.0

---

`PORT`

Default:

    8000

---

`CORS_ORIGINS`

Comma-separated list of allowed origins.

Example:

    CORS_ORIGINS=http://localhost:5000,http://localhost:3000

---

`MODEL_DIR`

Directory containing trained model artifacts.

Default:

    ./models

---

`MODEL_VERSION`

Optional model version override.

If left empty, the service automatically selects the newest valid model artifact.

Example:

    MODEL_VERSION=model-v1-2026-09-01

---

`PREDICTION_THRESHOLD`

Probability threshold used to convert the ML probability into:

    normal
    suspicious

Default:

    PREDICTION_THRESHOLD=0.5

---

### Training Configuration

Default dataset size:

    TRAIN_DATASET_SIZE=50000

Default fraud rate:

    TRAIN_FRAUD_RATE=0.08

Random seed:

    TRAIN_RANDOM_SEED=42

Test split:

    TRAIN_TEST_SPLIT=0.2

---

## Training the Model

The ML service uses a deterministic synthetic dataset.

Run:

    python -m training.train

The training process:

1. Loads configuration from `.env`.
2. Seeds Python and NumPy using the configured seed.
3. Generates the synthetic transaction dataset.
4. Separates features and labels.
5. Performs a stratified 80/20 train/test split.
6. Builds the scikit-learn preprocessing pipeline.
7. Trains the Gradient Boosting classifier.
8. Evaluates the model on the held-out dataset.
9. Saves the model artifact.
10. Saves a metadata sidecar.
11. Prints a machine-readable JSON training summary.

---

## Synthetic Dataset

The default training configuration generates:

    50,000 transactions

with:

    8% fraud/suspicious transactions

The generated dataset contains both legitimate and suspicious transaction patterns.

The dataset intentionally includes overlap between legitimate and suspicious transactions.

For example:

- Legitimate users can make large transfers.
- Fraudulent transactions can occur below ₹1 lakh.
- Legitimate transactions can occur at unusual times.
- Fraud can occur during normal hours.
- Not every suspicious transaction uses a new device.
- Not every legitimate transaction uses an old beneficiary.

This prevents a single feature such as transaction amount from becoming a perfect fraud indicator.

---

## ML Features

The prediction contract contains nine features:

    amount

    amount_to_average_ratio

    beneficiary_age_days

    is_new_beneficiary

    is_new_device

    hour_of_day

    transactions_last_5_minutes

    previous_suspicious_count

    behavioural_deviation

### Feature Meaning

`amount`

Transaction amount in rupees.

---

`amount_to_average_ratio`

Current transaction amount relative to the user's historical average amount.

A value around:

    1.0

means the transaction is approximately equal to the historical average.

---

`beneficiary_age_days`

Number of days since the beneficiary was added.

---

`is_new_beneficiary`

Binary flag:

    0 = established beneficiary
    1 = new / untrusted beneficiary

---

`is_new_device`

Binary flag:

    0 = previously known device
    1 = new device

---

`hour_of_day`

Transaction hour using the 24-hour format.

Valid range:

    0 - 23

---

`transactions_last_5_minutes`

Number of completed transactions during the previous five minutes.

---

`previous_suspicious_count`

Number of previous suspicious/fraud-related records associated with the user.

---

`behavioural_deviation`

Signed percentage deviation from the user's historical transaction behaviour.

---

## Feature Order

The service maintains one canonical feature order:

    amount
    amount_to_average_ratio
    beneficiary_age_days
    is_new_beneficiary
    is_new_device
    hour_of_day
    transactions_last_5_minutes
    previous_suspicious_count
    behavioural_deviation

This order is defined in:

    app/ml/feature_engineering.py

The same contract is used by:

- Node.js `mlClient`
- ML request schema
- Training pipeline
- Inference pipeline
- Model metadata

This prevents accidental feature-order drift between training and prediction.

---

## Model Architecture

The current model is a scikit-learn pipeline:

    Input
      |
      v
    Pydantic validation
      |
      v
    pandas DataFrame
      |
      v
    ColumnTransformer
      |
      +--> StandardScaler
      |       |
      |       +--> amount
      |       +--> amount_to_average_ratio
      |       +--> behavioural_deviation
      |
      +--> passthrough
              |
              +--> beneficiary_age_days
              +--> is_new_beneficiary
              +--> is_new_device
              +--> hour_of_day
              +--> transactions_last_5_minutes
              +--> previous_suspicious_count
      |
      v
    GradientBoostingClassifier
      |
      v
    predict_proba()
      |
      v
    Fraud probability
      |
      v
    Threshold = 0.5
      |
      +--> normal
      |
      +--> suspicious

The classifier uses:

    sklearn.ensemble.GradientBoostingClassifier

with:

    random_state=42

---

## Model Decision Threshold

The default probability threshold is:

    0.5

Therefore:

    probability >= 0.5
        → suspicious

    probability < 0.5
        → normal

The threshold is configurable using:

    PREDICTION_THRESHOLD

The threshold-based prediction is informational for the Node.js fraud engine. The backend still combines the ML signal with its own fraud rules and behavioural analysis.

---

## Training Results

A trained model artifact is already included in the project.

The latest available artifact in this project is:

    model-v1-2026-09-01

Training configuration:

    Dataset size: 50,000
    Fraud rate: 8%
    Random seed: 42
    Test split: 20%
    Prediction threshold: 0.5

The latest recorded held-out evaluation metrics are:

    ROC-AUC: 0.901685
    PR-AUC:  0.837250
    F1:      0.878924
    Precision: 0.964330
    Recall:    0.807415

These values come from the saved model metadata generated during training.

They should be treated as evaluation results for the synthetic dataset, not as evidence of production banking fraud-detection performance.

---

## Model Artifacts

Each trained model is stored as two files:

    model-v1-YYYY-MM-DD.joblib

and:

    model-v1-YYYY-MM-DD.metadata.json

The `.joblib` file contains the trained scikit-learn pipeline.

The metadata file records information such as:

- Model version
- Training timestamp
- Random seed
- Dataset size
- Fraud rate
- Dataset SHA-256 checksum
- Python version
- NumPy version
- scikit-learn version
- Pipeline configuration
- Prediction threshold
- ROC-AUC
- PR-AUC
- F1
- Precision
- Recall
- Confusion matrix
- Feature order
- Artifact save timestamp

---

## Model Versioning

The model registry is implemented in:

    app/ml/model_registry.py

The service validates model metadata before loading an artifact.

A model is rejected when:

- Its metadata is missing.
- Its metadata cannot be parsed.
- The metadata version does not match the filename.
- The feature order does not match the canonical feature order.

If multiple valid models exist, the service loads the newest valid artifact.

The optional:

    MODEL_VERSION

setting can be used to prefer a particular model version.

---

## Atomic Model Saving

Model artifacts are written using temporary files followed by an atomic rename.

This prevents the service from seeing a partially-written model file if the training process is interrupted during saving.

Both the `.joblib` artifact and metadata sidecar are persisted.

---

## Running the API

Start the service with Uvicorn:

    uvicorn main:app --host 0.0.0.0 --port 8000 --reload

Or use:

    python main.py

The service will:

1. Load configuration.
2. Configure logging.
3. Create the FastAPI application.
4. Attempt to load the latest valid model.
5. Keep the model in memory.
6. Serve `/health` and `/predict`.

---

## Health Check

Open:

    http://localhost:8000/health

Example response when a model is loaded:

    {
      "status": "ok",
      "service": "nexusbank-ml-service",
      "model_loaded": true,
      "model_version": "model-v1-2026-09-01"
    }

If the service is running but no valid model is available:

    {
      "status": "degraded",
      "service": "nexusbank-ml-service",
      "model_loaded": false,
      "model_version": null
    }

The service can therefore start without an artifact, but `/predict` will not fabricate a probability.

---

## Root Endpoint

The root endpoint provides a minimal service banner:

    GET /

Example:

    {
      "service": "nexusbank-ml-service",
      "docs": "/docs",
      "health": "/health",
      "predict": "/predict"
    }

---

## Swagger Documentation

During development, FastAPI exposes interactive API documentation at:

    http://localhost:8000/docs

Open it in a browser after starting the service.

In production mode the application disables the interactive documentation endpoints.

---

# Prediction API

## POST /predict

The endpoint accepts a single transaction feature vector.

### Request

    POST /predict

Optional correlation headers:

    x-request-id
    x-transaction-id

Example request:

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

### Successful Response

    {
      "fraud_probability": 0.03,
      "prediction": "normal",
      "model_version": "model-v1-2026-09-01",
      "request_id": "req-example-001",
      "transaction_id": "txn-example-001"
    }

The actual probability is produced by the loaded model and can vary depending on the input and model artifact.

---

## Suspicious Transaction Example

Example feature vector:

    {
      "amount": 75000.0,
      "amount_to_average_ratio": 10.0,
      "beneficiary_age_days": 0.0,
      "is_new_beneficiary": 1,
      "is_new_device": 1,
      "hour_of_day": 3,
      "transactions_last_5_minutes": 6,
      "previous_suspicious_count": 2,
      "behavioural_deviation": 280.0
    }

This combination represents several suspicious signals:

- High transaction amount
- Large deviation from historical average
- New beneficiary
- New device
- Unusual hour
- High transaction velocity
- Previous suspicious activity
- Large behavioural deviation

The model is expected to assign a higher fraud probability to this type of feature vector.

---

## cURL Example

### Health

    curl http://localhost:8000/health

### Prediction

    curl -X POST http://localhost:8000/predict \
      -H "Content-Type: application/json" \
      -H "x-request-id: req-example-001" \
      -H "x-transaction-id: txn-example-001" \
      -d '{
        "amount": 2500.0,
        "amount_to_average_ratio": 1.05,
        "beneficiary_age_days": 210.0,
        "is_new_beneficiary": 0,
        "is_new_device": 0,
        "hour_of_day": 13,
        "transactions_last_5_minutes": 0,
        "previous_suspicious_count": 0,
        "behavioural_deviation": 5.0
      }'

---

## Windows PowerShell Example

    $body = @{
      amount = 2500
      amount_to_average_ratio = 1.05
      beneficiary_age_days = 210
      is_new_beneficiary = 0
      is_new_device = 0
      hour_of_day = 13
      transactions_last_5_minutes = 0
      previous_suspicious_count = 0
      behavioural_deviation = 5
    } | ConvertTo-Json

    Invoke-RestMethod `
      -Method POST `
      -Uri "http://localhost:8000/predict" `
      -ContentType "application/json" `
      -Body $body

---

# Validation

The request schema is implemented with Pydantic v2.

The service rejects:

- Missing fields
- Unknown/extra fields
- Negative amounts
- Invalid hour values
- Invalid binary flags
- Invalid feature types
- Invalid values outside configured ranges

For example:

    hour_of_day = 25

is rejected.

Likewise:

    is_new_beneficiary = 2

is rejected because the field only accepts:

    0
    1

Extra fields are also forbidden.

This prevents accidental contract drift between the Node.js backend and the ML service.

---

# Error Handling

The ML service uses a consistent error structure.

Example validation response:

    {
      "success": false,
      "error": {
        "code": "VALIDATION_ERROR",
        "message": "..."
      },
      "request_id": "req-example-001"
    }

Important error codes include:

    VALIDATION_ERROR

    MODEL_UNAVAILABLE

    MODEL_INFERENCE_FAILED

---

## MODEL_UNAVAILABLE

If the service has no valid model loaded:

    POST /predict

returns:

    HTTP 503

with:

    {
      "success": false,
      "error": {
        "code": "MODEL_UNAVAILABLE",
        "message": "ML model is not loaded. Run `python -m training.train` first."
      }
    }

The service never generates a fake or fallback fraud probability.

---

## MODEL_INFERENCE_FAILED

If the loaded model raises an exception during inference, the service returns:

    HTTP 500

with:

    MODEL_INFERENCE_FAILED

The underlying exception is logged for debugging while the API returns a controlled error response.

---

# No Probability Fabrication

One of the important design rules of the ML service is:

> If the model is unavailable, do not invent a probability.

The predictor therefore refuses to score transactions when no model artifact is loaded.

The Node.js backend handles ML-service unavailability separately and uses its own fraud safety logic.

This makes ML availability a controlled dependency rather than a source of fabricated fraud scores.

---

# Node.js Backend Integration

The Node.js backend communicates with the ML service through:

    backend/services/fraud/mlClient.js

Set the backend environment variable:

    ML_SERVICE_URL=http://localhost:8000

Start the ML service first:

    cd ml-service

    uvicorn main:app --host 0.0.0.0 --port 8000 --reload

Then start the Node.js backend separately.

The integration flow is:

    Node.js Backend
          |
          v
    Fraud Analysis
          |
          v
    mlClient.js
          |
          | POST /predict
          v
    ML Service
          |
          v
    fraud_probability
          |
          v
    Node.js Fraud Engine

The request also supports:

    x-request-id

and:

    x-transaction-id

These IDs allow the Node.js and Python logs to be correlated.

---

## ML Service Unavailability

The ML service is not treated as the sole fraud decision-maker.

If the ML service is unavailable, the Node.js backend receives an unavailable state rather than a fabricated probability.

The backend can then continue using its rule-based and behavioural fraud signals according to its own safety logic.

This keeps the transaction risk engine resilient when the ML process is temporarily unavailable.

---

# Request Correlation

The ML service supports:

    x-request-id

and:

    x-transaction-id

When provided, the service:

1. Reads the headers.
2. Uses them in structured logs.
3. Includes them in the response body.
4. Echoes them through response headers.

This allows a transaction to be traced across:

    Frontend
        ↓
    Node.js Backend
        ↓
    Fraud Engine
        ↓
    ML Service
        ↓
    Fraud Result

---

# Testing

Run:

    pytest -q

The test suite covers:

- Health endpoint
- Healthy model state
- Degraded model state
- Prediction response schema
- Suspicious prediction behaviour
- Normal prediction behaviour
- Request ID correlation
- Transaction ID correlation
- Missing fields
- Extra fields
- Invalid hour
- Invalid binary flags
- Negative amount
- Model unavailable handling
- Predictor readiness
- Probability class selection
- Empty model directory behaviour

---

## Deterministic Test Model

The tests do not depend on the real production artifact.

The test suite creates a lightweight deterministic model using:

    2,000 synthetic transactions

and:

    random_state=42

The tests inject this model directly into a fresh FastAPI application.

This keeps the tests:

- Fast
- Isolated
- Reproducible
- Independent from the real `models/` directory

---

# Testing the Model Directly

The model-behaviour tests verify that:

- The predictor reports readiness when an artifact is attached.
- A normal-shaped feature vector receives a probability below 0.5.
- A suspicious-shaped feature vector receives a probability above 0.5.
- The model version is returned.
- Prediction fails safely when no model is available.
- Probability is taken from the `1 = fraud` class.

---

# Model Class Convention

The training dataset uses:

    0 = legitimate

    1 = suspicious / fraud

The prediction code explicitly attempts to locate class `1` before returning the probability.

This prevents a future model refactor from accidentally returning the probability of class `0` as the fraud probability.

---

# Security and Reliability Design

The ML service includes several defensive design decisions.

### Strict request validation

Pydantic rejects malformed feature payloads and unexpected fields.

### No fake probabilities

No model means no probability.

### Model metadata validation

Artifacts are not blindly loaded.

### Feature-order validation

The artifact metadata must match the canonical feature order.

### Versioned artifacts

Models are stored with explicit version identifiers.

### Atomic writes

Model and metadata files are written using temporary files and atomic replacement.

### Correlation IDs

Requests can be linked to backend transactions.

### Restricted CORS

Origins are controlled through environment configuration.

### Production documentation disabled

Swagger/OpenAPI documentation is disabled when:

    ENV=production

### Structured logging

The service has dedicated logging configuration for machine-readable application events.

---

# CORS

The service uses FastAPI's CORS middleware.

Default:

    CORS_ORIGINS=http://localhost:5000

Multiple origins can be specified:

    CORS_ORIGINS=http://localhost:5000,http://localhost:3000

Allowed methods include:

    GET
    POST
    OPTIONS

The service also exposes:

    x-request-id
    x-transaction-id

response headers to browser clients.

---

# Retraining

To retrain:

    cd ml-service

    python -m training.train

A new model artifact and metadata file are generated.

Example:

    models/
    ├── model-v1-2026-08-20.joblib
    ├── model-v1-2026-08-20.metadata.json
    ├── model-v1-2026-09-01.joblib
    └── model-v1-2026-09-01.metadata.json

The service selects the newest valid model by default.

A specific model can be preferred through:

    MODEL_VERSION=model-v1-2026-09-01

---

# Reproducibility

The training pipeline uses:

    random seed = 42

The seed is applied to:

- Python random generation
- NumPy random generation
- train/test splitting
- Gradient Boosting classifier

The generated dataset also receives a SHA-256 checksum which is stored in model metadata.

This provides useful provenance when comparing model artifacts.

---

# Evaluation Metrics

The training pipeline calculates:

### ROC-AUC

Measures ranking quality across probability thresholds.

### PR-AUC

Average precision and particularly useful when the positive class is relatively uncommon.

### F1

Balances precision and recall at the configured prediction threshold.

### Precision

Measures how many transactions classified as suspicious were actually suspicious in the held-out synthetic data.

### Recall

Measures how many suspicious transactions were detected.

### Confusion Matrix

The metadata also records:

- True negatives
- False positives
- False negatives
- True positives

No evaluation metric is hardcoded into the training process. Metrics are calculated from held-out predictions.

---

# Current Model Metadata

The latest checked-in model metadata corresponds to:

    model-v1-2026-09-01

Environment used for that artifact:

    Python 3.12.10
    NumPy 2.1.1
    scikit-learn 1.5.2

Training configuration:

    50,000 rows
    8% fraud rate
    random seed 42
    20% test split
    threshold 0.5

Recorded metrics:

    ROC-AUC    0.9016853692
    PR-AUC     0.8372500960
    F1         0.8789237668
    Precision  0.9643296433
    Recall     0.8074150360

Holdout confusion matrix:

    [
      [9000, 29],
      [187, 784]
    ]

Where:

    True negatives  = 9000
    False positives = 29
    False negatives = 187
    True positives  = 784

These metrics are specific to the synthetic training/evaluation dataset.

---

# Troubleshooting

## `MODEL_UNAVAILABLE`

If `/predict` returns:

    MODEL_UNAVAILABLE

train a model:

    python -m training.train

Then restart the service.

Check:

    http://localhost:8000/health

You should see:

    "model_loaded": true

---

## Model directory is empty

Make sure the command is being executed from:

    ml-service/

and that:

    MODEL_DIR

points to the intended models directory.

---

## Port 8000 already in use

Run on another port:

    uvicorn main:app --port 8010

Then update the Node.js backend:

    ML_SERVICE_URL=http://localhost:8010

---

## CORS Error

Update:

    CORS_ORIGINS

For example:

    CORS_ORIGINS=http://localhost:5000,http://localhost:3000

Restart the ML service after changing `.env`.

---

## PowerShell Activation Error

If you receive an ExecutionPolicy error:

    Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

Then:

    .\.venv\Scripts\Activate.ps1

---

## Python Version Problems

The project is currently pinned around Python 3.11/3.12 compatible package versions.

Python 3.12 is recommended for reproducing the existing checked-in model environment.

---

## Dependency Installation Problems

Upgrade pip:

    python -m pip install --upgrade pip

Then reinstall:

    pip install -r requirements.txt

---

# Development Workflow

A typical local development workflow is:

    cd ml-service

    python -m venv .venv

    .\.venv\Scripts\Activate.ps1

    pip install -r requirements.txt

    copy .env.example .env

    python -m training.train

    uvicorn main:app --host 0.0.0.0 --port 8000 --reload

In another terminal:

    pytest -q

Then verify:

    http://localhost:8000/health

and:

    http://localhost:8000/docs

---

# Relationship With NexusBank Fraud Engine

The ML service is only one part of the NexusBank fraud-detection architecture.

The overall fraud analysis uses multiple signals.

Conceptually:

    Rule Signals
          +
    Behavioural Signals
          +
    ML Probability
          |
          v
    Fraud Risk Engine
          |
          v
    Final Transaction Decision

The ML model should therefore not be interpreted as an autonomous banking authorization system.

Its purpose in this portfolio project is to demonstrate how a machine-learning risk signal can be integrated into a broader transaction fraud-detection pipeline.

---

# Important Portfolio Disclaimer

This project uses synthetic transaction data.

It is not trained on real customer banking information and should not be used to make real financial, credit, banking, or fraud decisions.

The model metrics shown in this repository describe performance on the project's synthetic evaluation dataset only.

Real production fraud detection would require substantially more work, including:

- Real and representative transaction data
- Careful label construction
- Time-based validation
- Data leakage prevention
- Model calibration
- Monitoring
- Drift detection
- Explainability
- Privacy controls
- Security controls
- Human review processes
- Regulatory and compliance requirements
- Production-grade model governance

---

# Technology Stack

### API

- Python
- FastAPI
- Uvicorn

### Validation and Configuration

- Pydantic v2
- pydantic-settings

### Machine Learning

- scikit-learn
- GradientBoostingClassifier
- ColumnTransformer
- StandardScaler
- Pipeline

### Data

- pandas
- NumPy

### Model Persistence

- joblib

### Testing

- pytest
- FastAPI TestClient
- httpx

---

# Key Design Principles

The ML service follows a few important principles:

### Deterministic

Training and tests use explicit random seeds.

### Explicit

Feature names and ordering are centrally defined.

### Validated

Incoming requests are strictly validated.

### Versioned

Every trained artifact has a model version.

### Traceable

Metadata records training and evaluation provenance.

### Safe

The service never invents a fraud probability when the model is unavailable.

### Decoupled

The ML service is independently runnable from the Node.js backend.

### Replaceable

The Node.js fraud engine can treat the ML service as one scoring component rather than tightly coupling the complete transaction decision to Python.

---

# Quick Reference

Start ML service:

    uvicorn main:app --host 0.0.0.0 --port 8000 --reload

Train:

    python -m training.train

Run tests:

    pytest -q

Health:

    GET http://localhost:8000/health

Prediction:

    POST http://localhost:8000/predict

Swagger:

    http://localhost:8000/docs

Backend environment:

    ML_SERVICE_URL=http://localhost:8000

Default threshold:

    0.5

Default training dataset:

    50,000 transactions

Default fraud rate:

    8%

Default random seed:

    42

Latest model:

    model-v1-2026-09-01