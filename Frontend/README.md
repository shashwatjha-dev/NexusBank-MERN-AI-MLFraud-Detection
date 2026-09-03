# NexusBank — Frontend

React + Vite frontend for **NexusBank**, a portfolio-grade digital banking application with an explainable fraud-detection experience, customer banking workflows, premium banking features, and an administrative fraud-monitoring interface.

The frontend communicates with the NexusBank Node.js + Express backend and can work with the separate Python FastAPI ML fraud-prediction service through the backend.

---

## Demo / Portfolio Disclaimer

NexusBank is a **portfolio and demonstration banking application**.

It does not connect to real bank accounts, real payment networks, government financial infrastructure, or external banking systems. Demo transactions do not move real funds.

Banking, authentication, fraud detection, rewards, fixed deposits, PPF, premium subscriptions, card management, statements, and other financial workflows are implemented for software demonstration and evaluation purposes.

The PPF functionality is a **simulation** and is not a real Government of India PPF account.

Premium payments are also simulated and do not charge real money.

---

## Tech Stack

- React 18
- Vite 5
- React Router DOM 6
- Axios
- Bootstrap 5
- Framer Motion
- Lucide React
- Recharts
- UUID
- JavaScript / JSX
- CSS

The frontend uses a component-based architecture with dedicated:

- Pages
- Reusable UI components
- Context providers
- Hooks
- API services
- Utility functions
- Responsive styles

---

## Requirements

- Node.js **18.17+**
- npm
- NexusBank backend running locally or at a configured API URL

The frontend is configured to communicate with the backend through:

    VITE_API_BASE_URL

The default development configuration is:

    http://localhost:5000/api

---

## 1. Install

From the project root:

    cd Frontend
    npm install

---

## 2. Configure environment

Create a local `.env` file from the provided example.

On Windows PowerShell:

    Copy-Item .env.example .env

The default configuration is:

    VITE_API_BASE_URL=http://localhost:5000/api
    VITE_APP_ENV=development

If the backend is running somewhere else, update:

    VITE_API_BASE_URL

For example:

    VITE_API_BASE_URL=http://localhost:5000/api

The `.env` file should remain local and should not be committed to Git.

---

## 3. Start the development server

Run:

    npm run dev

Vite will start the frontend development server.

The development server normally runs on:

    http://localhost:5173

The exact address is shown in the terminal when Vite starts.

---

## 4. Create a production build

Run:

    npm run build

This generates the production-ready frontend build in:

    dist/

---

## 5. Preview the production build

After building:

    npm run preview

The preview server is configured to use port:

    5173

---

# Application Architecture

The frontend follows a layered React architecture:

    App
     │
     ├── ThemeProvider
     │
     ├── AuthProvider
     │
     ├── ToastProvider
     │
     └── AppRouter
            │
            ├── Public Routes
            │
            ├── Customer Application
            │
            └── Admin Application

API communication is separated into dedicated service modules:

    React Pages / Components
             ↓
       Service Layer
             ↓
          Axios
             ↓
       Express Backend
             ↓
           MongoDB

Fraud-related information returned by the backend is presented through dedicated explainability components such as:

    FraudMeter
    TriggeredRulesList
    ExplainPanel
    RiskChip

---

# Authentication

The frontend supports the NexusBank authentication workflow.

Available authentication screens include:

- Login
- Registration
- OTP verification
- Forgot password

Authentication state is managed through:

    src/context/AuthContext.jsx

Authentication-related API operations are handled through:

    src/services/authService.js

The application uses protected and role-based routing.

---

## Protected Routes

Customer application routes are protected using:

    ProtectedRoute.jsx

Administrative routes use:

    RoleRoute.jsx

This keeps customer and administrator application areas separated.

---

# Customer Application

The customer application is available under:

    /app

The customer home page is:

    /app/dashboard

The frontend currently provides the following customer-facing sections.

---

## Dashboard

Route:

    /app/dashboard

The dashboard provides an overview of the customer's banking activity.

Dashboard components include:

- Balance information
- Cash-flow visualization
- Category-based financial visualization
- Quick actions
- Recent transactions

Relevant components include:

    BalanceCard
    CashFlowChart
    CategoryChart
    QuickActions
    RecentTransactions

Charts are powered by Recharts.

---

# My Accounts

Route:

    /app/accounts

The Accounts page provides the customer's account overview and account-management experience.

The page includes functionality for:

- Total balance
- Active accounts
- Individual account cards
- Account details
- Account-related actions
- Fixed Deposit information
- PPF information
- Smart insights
- Opening a new account
- Premium banking / Nexus Prime upgrade flow

The Accounts experience uses reusable account components and dedicated styling.

Relevant files include:

    src/pages/customer/AccountsPage.jsx
    src/pages/customer/AccountsPage.css
    src/components/accounts/AccountCard.jsx
    src/components/accounts/AccountCard.css

---

# Nexus Prime / Premium Banking

The frontend includes a premium banking experience integrated into the customer application.

Premium functionality includes:

- Premium upgrade flow
- Premium subscription state
- Premium checkout experience
- Premium benefits
- Premium account-related UI
- Nexus Prime navigation experience

Premium API communication is handled through:

    src/services/premiumService.js

The current demonstration subscription is:

    ₹499
    Annual subscription

This is a simulated portfolio payment flow and does not charge real money.

---

# Card Management

Route:

    /app/cards

The Card Management page provides the customer-facing card-control experience.

Route component:

    CardManagementPage.jsx

---

# Transfers

Route:

    /app/transfer

The transfer workflow provides customer-to-customer banking transfer functionality through the backend API.

The transfer experience includes:

- Account selection
- Beneficiary selection
- Transfer amount
- Transfer details
- Transaction validation
- Idempotency support
- Fraud analysis
- Risk information
- Verification when required
- Transfer result handling

Relevant files include:

    src/pages/customer/TransferPage.jsx
    src/pages/customer/TransferPage.css
    src/pages/customer/TransferVerifyPage.jsx
    src/pages/customer/TransferVerifyPage.css
    src/components/transfer/TransferForm.jsx
    src/components/transfer/TransferForm.css
    src/services/transferService.js

---

## Transfer Verification

Route:

    /app/transfer/:id/verify

Transactions that require additional verification can continue through the dedicated transfer verification page.

This works with the backend fraud decision and OTP verification flow.

---

# Beneficiaries

Route:

    /app/beneficiaries

Customers can manage beneficiaries through the dedicated beneficiary interface.

API communication is handled through:

    src/services/beneficiaryService.js

---

# Transactions

Route:

    /app/transactions

The Transactions page provides access to the customer's transaction history.

Transaction information can include transaction status and fraud/risk-related information returned by the backend.

---

# Statements

Route:

    /app/statements

The Statements page provides customer-facing transaction reporting and statement functionality.

Frontend services include:

    src/services/statementsService.js

The interface also includes functionality related to:

- Statement filtering
- Category insights
- Statement sharing
- Statement-related modal workflows

Relevant components include:

    CategoryInsights.jsx
    SmartFilters.jsx
    ShareStatementModal.jsx

---

# Fixed Deposits

Route:

    /app/fd

The Fixed Deposits page provides the customer-facing simulated FD workflow.

Frontend API communication is handled through:

    src/services/fixedDepositService.js

The feature is part of the NexusBank portfolio demonstration and does not represent a real bank deposit.

---

# PPF

Route:

    /app/ppf

The frontend includes a simulated PPF experience.

API communication is handled through:

    src/services/ppfService.js

The PPF feature is for portfolio demonstration only.

It is not a real Government of India PPF account and does not connect to government financial infrastructure.

---

# Rewards

Route:

    /app/rewards

The Rewards page provides the customer-facing rewards experience.

API communication is handled through:

    src/services/rewardService.js

---

# Alerts

Route:

    /app/alerts

The Alerts page provides customer-facing banking alerts.

API communication is handled through:

    src/services/alertService.js

---

# Security

Route:

    /app/security

The Security page provides customer-facing security information and controls.

The application also uses security-related backend functionality such as sessions, devices, and security events.

---

# Fraud Logs

Route:

    /app/fraud

The Fraud Logs page provides customers with access to fraud-related historical information.

Fraud data is retrieved through:

    src/services/fraudService.js

The frontend is designed to expose explainable fraud information rather than only displaying a generic risk label.

---

# Fraud Explainability

Fraud analysis is presented through dedicated reusable components.

## Fraud Meter

    src/components/fraud/FraudMeter.jsx

Displays a visual representation of fraud/risk scoring.

## Triggered Rules

    src/components/fraud/TriggeredRulesList.jsx

Displays the fraud rules that were triggered for a transaction.

Examples can include:

- High amount
- New beneficiary
- New device
- Unusual time
- High velocity
- Previous suspicious activity

## Explain Panel

    src/components/fraud/ExplainPanel.jsx

Provides additional explainability around fraud decisions and supporting evidence.

## Risk Chip

    src/components/common/RiskChip.jsx

Provides a reusable visual risk-level indicator.

These components allow the frontend to communicate not only whether a transaction is risky, but also the evidence and signals behind the decision.

---

# Demo / Fraud Scenarios

Route:

    /app/demo

The Demo page provides a dedicated interface for demonstrating fraud-detection scenarios.

Frontend communication is handled through:

    src/services/demoService.js

This allows the portfolio project to demonstrate different fraud-analysis behaviours without requiring real banking activity.

---

# Notifications

The frontend includes a notification system integrated into the application layout.

Relevant files include:

    src/components/notifications/NotificationBell.jsx
    src/components/notifications/NotificationList.jsx
    src/components/notifications/notifications.css
    src/services/notificationsApi.js

Notifications can be accessed through the application's notification interface.

---

# Settings

Route:

    /app/settings

The Settings page provides customer-facing application settings and preferences.

---

# Customer Route Map

The customer application currently exposes:

| Feature | Route |
|---------|-------|
| Dashboard | `/app/dashboard` |
| Accounts | `/app/accounts` |
| Cards | `/app/cards` |
| Transfer | `/app/transfer` |
| Transfer Verification | `/app/transfer/:id/verify` |
| Beneficiaries | `/app/beneficiaries` |
| Transactions | `/app/transactions` |
| Statements | `/app/statements` |
| Fixed Deposits | `/app/fd` |
| PPF | `/app/ppf` |
| Rewards | `/app/rewards` |
| Alerts | `/app/alerts` |
| Security | `/app/security` |
| Fraud Logs | `/app/fraud` |
| Settings | `/app/settings` |
| Demo | `/app/demo` |

---

# Admin Application

The administrative application is available under:

    /admin

Administrator access is protected by:

    RoleRoute.jsx

The admin application provides fraud monitoring, user management, transaction oversight, and audit functionality.

---

## Admin Overview

Route:

    /admin/overview

Provides the main administrative overview.

---

## Users

Route:

    /admin/users

Provides administrator-facing user management.

---

## User Details

Route:

    /admin/users/:id

Provides detailed information for an individual customer.

---

## Admin Transactions

Route:

    /admin/transactions

Provides administrator-facing transaction monitoring.

---

## Fraud Monitoring

Route:

    /admin/fraud

Provides fraud-monitoring functionality for administrators.

The page is designed to surface fraud activity and risk information returned by the backend.

---

## Fraud Investigation

Route:

    /admin/fraud/:id

Provides detailed fraud investigation for an individual fraud-related transaction or record.

---

## Audit Logs

Route:

    /admin/audit

Provides access to administrative audit information.

---

# Admin Route Map

| Feature | Route |
|---------|-------|
| Overview | `/admin/overview` |
| Users | `/admin/users` |
| User Details | `/admin/users/:id` |
| Transactions | `/admin/transactions` |
| Fraud Monitoring | `/admin/fraud` |
| Fraud Investigation | `/admin/fraud/:id` |
| Audit Logs | `/admin/audit` |

---

# Public Routes

The frontend also provides the following public authentication routes:

| Feature | Route |
|---------|-------|
| Login | `/login` |
| Registration | `/register` |
| OTP | `/otp` |
| Forgot Password | `/forgot-password` |

The root route:

    /

redirects the user to the appropriate application area depending on authentication and role.

---

# Layout System

The main authenticated application uses a reusable layout system.

Relevant components include:

    AppLayout
    Sidebar
    Topbar
    MobileNav

The layout supports separate customer and administrator application scopes.

---

# Navigation

The sidebar provides the primary desktop navigation.

The mobile application uses:

    MobileNav.jsx

The layout is responsive and includes dedicated responsive styles.

---

# Theme System

The frontend uses a dedicated theme context:

    src/context/ThemeContext.jsx

The application also has centralized theme and design-token files:

    src/styles/theme.css
    src/styles/tokens.css
    src/styles/base.css
    src/styles/utilities.css
    src/styles/responsive.css
    src/styles/a11y.css

This provides a consistent visual system across the application.

---

# Toast & UI State

Global toast functionality is managed through:

    src/context/ToastContext.jsx

and:

    src/components/common/Toaster.jsx

The application also includes reusable UI state components for:

- Loading states
- Empty states
- Error states
- Skeleton loaders

Relevant components include:

    EmptyState.jsx
    ErrorState.jsx
    Skeleton.jsx

---

# Reusable Components

The frontend contains reusable components for common UI patterns.

Examples include:

- Button
- Card
- Input
- Risk Chip
- Skeleton
- Error State
- Empty State
- Toaster
- Account Card
- Fraud Meter
- Triggered Rules List
- Explain Panel
- Notification components
- Transfer form
- Statement sharing modal

This reduces duplication across pages and keeps the application structure maintainable.

---

# API Service Layer

API calls are separated from UI components through dedicated service modules.

Main service files include:

    src/services/apiClient.js
    src/services/authService.js
    src/services/accountService.js
    src/services/adminService.js
    src/services/alertService.js
    src/services/beneficiaryService.js
    src/services/demoService.js
    src/services/emailService.js
    src/services/fixedDepositService.js
    src/services/fraudService.js
    src/services/notificationsApi.js
    src/services/ppfService.js
    src/services/premiumService.js
    src/services/rewardService.js
    src/services/statementsService.js
    src/services/transferService.js

This keeps HTTP communication separate from page-level presentation logic.

---

# Utility Layer

Common frontend utilities are maintained under:

    src/utils/

Current utilities include:

    date.js
    enums.js
    idempotency.js
    money.js

The money utility helps keep financial display and conversion logic consistent across the frontend.

The idempotency utility supports unique transfer request keys.

---

# Frontend Project Structure

    Frontend/
    │
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── vite.config.js
    ├── .env.example
    ├── .gitignore
    │
    ├── public/
    │   └── favicon.svg
    │
    └── src/
        │
        ├── App.jsx
        ├── main.jsx
        │
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
        │   ├── AuthContext.jsx
        │   ├── ThemeContext.jsx
        │   └── ToastContext.jsx
        │
        ├── hooks/
        │   ├── useApi.js
        │   ├── useAuth.js
        │   ├── useTheme.js
        │   └── useToast.js
        │
        ├── pages/
        │   ├── admin/
        │   └── customer/
        │
        ├── router/
        │   ├── AppRouter.jsx
        │   ├── ProtectedRoute.jsx
        │   └── RoleRoute.jsx
        │
        ├── services/
        │   ├── accountService.js
        │   ├── adminService.js
        │   ├── alertService.js
        │   ├── apiClient.js
        │   ├── authService.js
        │   ├── beneficiaryService.js
        │   ├── demoService.js
        │   ├── emailService.js
        │   ├── fixedDepositService.js
        │   ├── fraudService.js
        │   ├── notificationsApi.js
        │   ├── ppfService.js
        │   ├── premiumService.js
        │   ├── rewardService.js
        │   ├── statementsService.js
        │   └── transferService.js
        │
        ├── styles/
        │   ├── a11y.css
        │   ├── base.css
        │   ├── responsive.css
        │   ├── theme.css
        │   ├── tokens.css
        │   └── utilities.css
        │
        └── utils/
            ├── date.js
            ├── enums.js
            ├── idempotency.js
            └── money.js

---

# Responsive Design

The frontend includes dedicated responsive styling for different screen sizes.

Responsive behavior is implemented through:

    src/styles/responsive.css

and component/page-specific CSS files.

The application also includes a dedicated mobile navigation component.

---

# Accessibility

Accessibility-related styles and utilities are maintained through:

    src/styles/a11y.css

The frontend aims to maintain usable focus states, readable controls, semantic structure, and responsive interactions throughout the banking interface.

---

# Animations & Visual Effects

The frontend uses:

    Framer Motion

for interactive motion and animated UI experiences.

Lucide React is used for consistent interface icons.

Charts and financial visualizations use:

    Recharts

These libraries are used across the application to provide a modern banking dashboard experience while keeping the UI component-based.

---

# Error Handling

The frontend provides reusable error-state handling and toast notifications.

API errors are handled through the centralized API/service layer and surfaced through appropriate page-level or global UI states.

Relevant components include:

    ErrorState.jsx
    Toaster.jsx

---

# Environment Variables

The frontend currently uses:

    VITE_API_BASE_URL

Default:

    VITE_API_BASE_URL=http://localhost:5000/api

Optional environment label:

    VITE_APP_ENV=development

Vite exposes only variables prefixed with:

    VITE_

to frontend code.

Do not place private secrets, passwords, database credentials, or server-only API keys in frontend environment variables.

---

# Connecting Frontend and Backend

The normal local development setup is:

    Browser
       │
       ▼
    React + Vite
    localhost:5173
       │
       │ HTTP API
       ▼
    Node.js + Express
    localhost:5000
       │
       ▼
    MongoDB

The frontend API base URL should therefore normally be:

    VITE_API_BASE_URL=http://localhost:5000/api

Start the backend first, then start the frontend.

---

# Typical Development Workflow

From the backend directory:

    npm install
    npm run seed
    npm run dev

Then from the frontend directory:

    npm install
    npm run dev

Open the Vite development URL shown in the terminal.

---

# Production Build Checklist

Before publishing or deploying the frontend:

1. Confirm the backend API URL is correct.
2. Confirm `.env` is not committed.
3. Install dependencies.
4. Run the production build.
5. Check the browser console for errors.
6. Check authentication and OTP flow.
7. Check customer routes.
8. Check admin routes.
9. Test transfers.
10. Test fraud explainability.
11. Test statements and receipts.
12. Test premium banking.
13. Test responsive layouts.

Build command:

    npm run build

---

# Git & Security

The frontend `.gitignore` excludes local/generated files including:

    node_modules
    dist
    .env
    .env.local
    .DS_Store
    *.log
    .vite

Never commit:

- `.env`
- `.env.local`
- API secrets
- Private credentials
- Generated local configuration containing secrets
- `node_modules`
- `dist`

The repository should contain `.env.example` as the configuration template.

---

# Troubleshooting

## Backend connection errors

If the frontend cannot load data, verify that the backend is running.

Default backend API:

    http://localhost:5000/api

Then verify:

    VITE_API_BASE_URL=http://localhost:5000/api

---

## CORS errors

If API requests fail because of CORS, verify the backend CORS configuration and make sure the frontend origin matches the development environment.

The default Vite development origin is normally:

    http://localhost:5173

---

## Authentication problems

If login or protected pages do not work:

1. Verify the backend is running.
2. Verify MongoDB is running.
3. Verify the frontend API URL.
4. Check browser developer-console errors.
5. Check backend logs.
6. Verify the demo account credentials.
7. Complete the OTP verification flow.

---

## Blank or broken page after navigation

Check:

- Browser console
- Vite terminal
- Backend terminal
- Route path
- Authentication state
- API response

The application includes a catch-all 404 route for unknown paths.

---

## Build errors

Run:

    npm install

Then:

    npm run build

If dependency issues persist, remove local dependencies and reinstall:

    rm -rf node_modules package-lock.json
    npm install

On Windows, remove the `node_modules` directory and `package-lock.json` manually or use the appropriate PowerShell command before reinstalling.

---

# Browser Application Routes

## Public

    /
    /login
    /register
    /otp
    /forgot-password

## Customer

    /app/dashboard
    /app/accounts
    /app/cards
    /app/transfer
    /app/transfer/:id/verify
    /app/beneficiaries
    /app/transactions
    /app/statements
    /app/fd
    /app/ppf
    /app/rewards
    /app/alerts
    /app/security
    /app/fraud
    /app/settings
    /app/demo

## Admin

    /admin/overview
    /admin/users
    /admin/users/:id
    /admin/transactions
    /admin/fraud
    /admin/fraud/:id
    /admin/audit

---

# Frontend Feature Summary

The NexusBank frontend currently demonstrates:

- React + Vite application architecture
- Customer authentication
- OTP verification
- Protected routes
- Role-based admin routing
- Banking dashboard
- Account management
- Account creation workflow
- Premium / Nexus Prime experience
- Card management
- Beneficiary management
- Money transfers
- Transfer verification
- Transaction history
- Fraud detection visualization
- Fraud explainability
- Triggered fraud rules
- Behavioural fraud signals
- Fraud logs
- Admin fraud monitoring
- Fraud investigation
- Audit logs
- Fixed Deposits
- Simulated PPF
- Rewards
- Alerts
- Notifications
- Statements
- Statement sharing
- Receipt/document workflows
- Security management
- Settings
- Demo fraud scenarios
- Responsive navigation
- Theme support
- Toast notifications
- Loading and error states
- Animated UI
- Financial charts and visualizations

---

# License / Usage

NexusBank is a portfolio and educational software project.

The frontend is intended to demonstrate:

- Modern React application architecture
- Banking-style UI/UX
- API-driven application design
- Authentication and protected routing
- Role-based access
- Explainable fraud detection
- Financial transaction workflows
- Responsive design
- Reusable components
- Data visualization
- Premium banking experiences

It should not be used as production banking software without substantial additional security, compliance, infrastructure, monitoring, testing, accessibility validation, and regulatory work.