# Paylinq - Payroll Management Platform

Enterprise-grade payroll management system built with React, TypeScript, and Tailwind CSS.

## Features

- 📊 **Dashboard** - Overview of payroll operations
- 👥 **Workers Management** - Employee payroll records with compensation, deductions, and tax configuration
- 💰 **Tax Rules** - Multi-jurisdictional tax calculation engine
- 🧮 **Pay Components** - Flexible earnings and deduction components
- ⏱️ **Time & Attendance** - Time tracking and approval workflows
- 📅 **Scheduling** - Employee schedule management
- 💳 **Payroll Processing** - Complete payroll run workflow
- 📄 **Payslips** - Automated payslip generation and distribution
- ⚖️ **Reconciliation** - Discrepancy detection and resolution
- 📈 **Reports** - Comprehensive payroll analytics
- ⚙️ **Settings** - Organization and payroll configuration

## Tech Stack

- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite 6
- **Routing:** React Router 7
- **Styling:** Tailwind CSS 3.4
- **Data Fetching:** TanStack Query (React Query)
- **Form Management:** React Hook Form + Zod
- **UI Components:** @recruitiq/ui (shared component library)
- **API Client:** @recruitiq/api-client (unified API client)

## Design System

Paylinq uses a **blue accent** color scheme (`#3b82f6`) to emphasize financial data and transactions, while maintaining the shared emerald primary color for brand consistency.

### Color Usage
- **Primary:** emerald-500 (#10b981) - Brand elements
- **Accent:** blue-500 (#3b82f6) - Paylinq-specific CTAs and highlights
- **Success:** green-500 - Approved, completed states
- **Warning:** yellow-500 - Pending, draft states
- **Danger:** red-500 - Errors, rejected states

### Typography
- **Font Family:** Inter (Google Fonts)
- **Financial Values:** `tabular-nums` for alignment

## Development

### Prerequisites
- Node.js 18+
- pnpm 8+

### Installation

```bash
# From the monorepo root
pnpm install

# From this directory
cd apps/paylinq
pnpm install
```

### Run Development Server

```bash
pnpm dev
```

The app will be available at `http://localhost:5174`

### Build for Production

```bash
pnpm build
```

### Preview Production Build

```bash
pnpm preview
```

## Project Structure

```
paylinq/
├── src/
│   ├── components/       # Reusable components
│   │   └── layout/      # Layout components (sidebar, header)
│   ├── contexts/        # React contexts (theme, etc.)
│   ├── pages/           # Page components (routes)
│   │   ├── Dashboard.tsx
│   │   ├── workers/
│   │   ├── tax-rules/
│   │   ├── pay-components/
│   │   ├── time-attendance/
│   │   ├── scheduling/
│   │   ├── payroll/
│   │   ├── payslips/
│   │   ├── reconciliation/
│   │   ├── reports/
│   │   └── settings/
│   ├── services/        # API service calls
│   ├── utils/           # Utility functions
│   ├── App.tsx          # Root app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── public/              # Static assets
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Shared Packages

Paylinq leverages shared packages from the monorepo:

### @recruitiq/ui
Provides base UI components:
- `Button` - 5 variants, 3 sizes, loading states
- `Card` - Container with Header/Content/Footer
- `Input` / `TextArea` - Form inputs with validation
- `Modal` - Dialog component with 5 sizes

### @recruitiq/api-client
Unified API client with authentication and product-specific endpoints:
- Core client with token management
- Auth module (login, register, MFA)
- Paylinq API methods (workers, payroll, time entries, etc.)

## Development Roadmap

### Phase 1: MVP (Current)
- ✅ App structure and routing
- ✅ Layout with navigation
- ✅ Theme support (light/dark mode)
- ⏳ Core components (Task 7)
- ⏳ Pages with mock data (Task 8)

### Phase 2: Backend Integration
- API integration with @recruitiq/api-client
- Real data fetching with React Query
- Form submissions and validation
- Error handling and loading states

### Phase 3: Advanced Features
- Real-time updates (WebSockets)
- Advanced charts and visualizations
- PDF generation for payslips
- Excel export functionality
- Email integration

## Contributing

This is part of the RecruitIQ monorepo. See the root README for contribution guidelines.

## License

Proprietary - All rights reserved
