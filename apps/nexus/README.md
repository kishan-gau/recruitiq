# Nexus HRIS Frontend

**Version:** 1.0.0  
**Product:** Nexus - Human Resource Information System  
**Tech Stack:** React 18 + TypeScript + Vite + TailwindCSS

---

## Overview

Nexus HRIS is the comprehensive human resource management application within the RecruitIQ monorepo. It provides employee lifecycle management, performance tracking, time-off management, benefits administration, and organizational structure management.

---

## Features

### Core Modules

- **Employee Management** - Complete employee records with personal and employment information
- **Contract Management** - Employment contract lifecycle with sequence-based progressions
- **Performance Management** - Reviews, goals, continuous feedback
- **Time Off Management** - Leave requests, approvals, balance tracking
- **Attendance Tracking** - Clock in/out, attendance records, summaries
- **Benefits Administration** - Benefits plans and employee enrollments
- **Organization Structure** - Departments, locations, org chart visualization
- **Document Management** - Employee documents with compliance tracking
- **Reports & Analytics** - Comprehensive HR analytics dashboard

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Backend API running on `http://localhost:3000`

### Installation

```bash
# From monorepo root
pnpm install

# From nexus app directory
cd apps/nexus
pnpm install
```

### Development

```bash
# Start development server (port 5174)
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Testing

```bash
# Run unit tests
pnpm test

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui
```

---

## Project Structure

```
src/
├── components/          # Reusable React components
│   ├── layout/         # Layout components (Header, Sidebar)
│   ├── employees/      # Employee-specific components
│   ├── contracts/      # Contract components
│   ├── performance/    # Performance components
│   ├── time-off/       # Time-off components
│   ├── attendance/     # Attendance components
│   ├── benefits/       # Benefits components
│   ├── departments/    # Department components
│   ├── documents/      # Document components
│   └── ui/             # Shared UI components
├── contexts/           # React contexts (Theme, Toast)
├── hooks/              # Custom React hooks
├── pages/              # Page components (routes)
├── services/           # API service layer
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── __tests__/          # Test files
```

---

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

### Key Patterns

- **Server State:** TanStack Query for data fetching and caching
- **Client State:** React Context for UI state
- **Form Management:** React Hook Form with Zod validation
- **Routing:** React Router DOM v7
- **Styling:** TailwindCSS with custom Nexus theme
- **Testing:** Vitest + React Testing Library + Playwright

---

## API Integration

The frontend integrates with the Nexus backend API at `/api/nexus`:

### Key Endpoints

- `GET /api/nexus/employees` - List employees
- `POST /api/nexus/employees` - Create employee
- `GET /api/nexus/employees/:id` - Get employee details
- `PATCH /api/nexus/employees/:id` - Update employee
- `GET /api/nexus/contracts` - List contracts
- `GET /api/nexus/time-off/requests` - Get time-off requests
- `GET /api/nexus/attendance/employee/:id` - Get attendance records
- `GET /api/nexus/departments` - List departments
- `GET /api/nexus/reports/dashboard` - Get dashboard metrics

See backend documentation for complete API reference.

---

## Design System

Nexus follows the RecruitIQ multi-product design system with:

- **Primary Color:** Emerald-500 (#10b981) - brand consistency
- **Accent Color:** Purple-500 (#a855f7) - product differentiation
- **Theme:** Support for light and dark modes
- **Typography:** Inter font family
- **Components:** Shared components from `@recruitiq/ui` package

---

## Configuration

### Environment Variables

Create `.env` file:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_NAME=Nexus HRIS
```

### Vite Proxy

API requests are proxied to the backend during development (configured in `vite.config.ts`).

---

## Development Guidelines

### Code Style

- Use TypeScript strict mode
- Follow React functional component patterns
- Use custom hooks for reusable logic
- Keep components small and focused
- Write tests for all new features

### Component Structure

```tsx
// 1. Imports
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Types
interface Props {
  employeeId: string;
}

// 3. Component
export default function EmployeeCard({ employeeId }: Props) {
  // 4. Hooks
  const { data, isLoading } = useQuery(/*...*/);
  
  // 5. Handlers
  const handleClick = () => {/*...*/};
  
  // 6. Render
  return (
    <div>...</div>
  );
}
```

### Testing Guidelines

- Write unit tests for utilities and hooks
- Write integration tests for API services
- Write component tests for complex UI logic
- Write E2E tests for critical user flows
- Aim for >80% code coverage

---

## Deployment

### Build

```bash
pnpm build
```

Output: `dist/` directory ready for deployment

### Docker

```bash
# Build Docker image
docker build -t nexus-frontend .

# Run container
docker run -p 5174:5174 nexus-frontend
```

---

## Performance

### Optimization Techniques

- Code splitting with React.lazy
- Query caching with TanStack Query
- Optimistic updates for mutations
- Virtual scrolling for large lists
- Image optimization
- Bundle size monitoring

### Performance Targets

- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Lighthouse Score: >90

---

## Accessibility

- WCAG 2.1 Level AA compliance
- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader friendly

---

## Browser Support

- Chrome/Edge (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Troubleshooting

### Common Issues

**Module not found errors:**
```bash
pnpm install
```

**API connection issues:**
- Verify backend is running on port 3000
- Check CORS configuration
- Verify API proxy in vite.config.ts

**Build errors:**
```bash
rm -rf node_modules dist
pnpm install
pnpm build
```

---

## Contributing

1. Follow coding standards from `docs/FRONTEND_STANDARDS.md`
2. Write tests for new features
3. Update documentation
4. Create pull request with detailed description
5. Code review required before merge

---

## Support

- **Team:** Frontend Team
- **Slack:** #nexus-frontend
- **Docs:** [Architecture](./ARCHITECTURE.md)
- **Issues:** GitHub Issues

---

**Status:** 🚀 Active Development  
**Last Updated:** November 7, 2025
