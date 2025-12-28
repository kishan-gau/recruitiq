# Frontend Consolidation & Restructuring Plan

## Huidige Situatie

### Frontends (4 apps → consolideren naar 1)
1. **RecruitIQ** - Recruitment management (werving/selectie)
2. **PayLinQ** - Payroll management (salarisadministratie)
3. **Nexus** - HRIS management (HR kernfunctionaliteit)
4. **ScheduleHub** - Workforce scheduling (roosters) - EMBEDDED IN NEXUS

### Backend (blijft 1, maar producten blijven gescheiden)
- **Shared Backend** met 4 product modules:
  - `backend/src/products/paylinq/` - Payroll APIs
  - `backend/src/products/nexus/` - HRIS APIs  
  - `backend/src/products/schedulehub/` - Scheduling APIs
  - `backend/src/products/recruitiq/` - Recruitment APIs (niet in frontend gevonden!)

### Portal (blijft separaat)
- **Portal/Platform** - Admin interface voor cross-tenant management

---

## Analyse: Feature Overlapping

### Nexus Features (LEADING - meest robuust)
✅ **Employees** - Medewerker management (volledig HRIS)
✅ **Contracts** - Contract management met verlooptracking
✅ **Departments** - Afdelingen met hiërarchie
✅ **Locations** - Locaties management
✅ **Performance** - Reviews, goals (prestatiebeoordeling)
✅ **Time-Off** - Verlofaanvragen met kalendar
✅ **Attendance** - Aanwezigheidsregistratie
✅ **Benefits** - Secundaire arbeidsvoorwaarden
✅ **Documents** - Documentbeheer
✅ **Reports** - Diverse HRIS rapporten
✅ **ScheduleHub** - VOLLEDIG geïntegreerd in Nexus als submodule!

### PayLinQ Features
⚠️ **Payroll Runs** - Salarisverwerking (uniek)
⚠️ **Compensation** - Beloningsstructuren (overlap maar specifiek)
⚠️ **Tax Settings** - Belastinginstellingen (uniek)
⚠️ **Deductions** - Inhoudingen (uniek)
⚠️ **Pay Components** - Salaris componenten (uniek)
⚠️ **Timesheets** - Urenstaten (overlap met Nexus attendance)
⚠️ **Worker Types** - Medewerkertypes (overlap met Nexus)
⚠️ **Workers** - DUPLICAAT van Nexus Employees
⚠️ **Scheduling** - DUPLICAAT van ScheduleHub/Nexus

### RecruitIQ Features (UNIQUE - behouden)
✅ **Jobs** - Vacatures
✅ **Candidates** - Kandidaten
✅ **Pipeline** - Wervingspijplijn
✅ **Interviews** - Interviews
✅ **Flow Templates** - Workflow templates
✅ **Applicant Portal** - Kandidatenportaal

### Beslissing Matrix

| Feature | Nexus | PayLinQ | RecruitIQ | Actie |
|---------|-------|---------|-----------|-------|
| **Employees/Workers** | ✅ Volledig HRIS | ⚠️ Basic | - | **BEHOUD NEXUS** |
| **Scheduling** | ✅ ScheduleHub | ⚠️ Basic | - | **BEHOUD NEXUS** |
| **Time Tracking** | ✅ Attendance | ⚠️ Timesheets | - | **SKIP PAYLINQ - Nexus leading** |
| **Timesheets** | - | ⚠️ Basic | - | **SKIP - ScheduleHub heeft robuuster** |
| **Departments** | ✅ Hiërarchie | - | - | **BEHOUD NEXUS** |
| **Locations** | ✅ Volledig | - | - | **BEHOUD NEXUS** |
| **Payroll** | - | ✅ Volledig | - | **BEHOUD PAYLINQ** |
| **Compensation** | - | ✅ Volledig | - | **BEHOUD PAYLINQ** |
| **Tax Management** | - | ✅ Volledig | - | **BEHOUD PAYLINQ** |
| **Recruitment** | - | - | ✅ Volledig | **BEHOUD RECRUITIQ** |

---

## Nieuwe Architectuur: Industry Standard Monorepo

### Voorgestelde Structuur (volgt NX/Turborepo patterns)

```
recruitiq-platform/
├── apps/
│   ├── web/                    # 🆕 UNIFIED FRONTEND (React + Vite)
│   │   ├── src/
│   │   │   ├── features/       # Feature-based modules (DDD)
│   │   │   │   ├── recruitment/    # RecruitIQ features
│   │   │   │   │   ├── jobs/
│   │   │   │   │   ├── candidates/
│   │   │   │   │   ├── pipeline/
│   │   │   │   │   └── interviews/
│   │   │   │   ├── hris/          # Nexus features
│   │   │   │   │   ├── employees/
│   │   │   │   │   ├── contracts/
│   │   │   │   │   ├── departments/
│   │   │   │   │   ├── locations/
│   │   │   │   │   ├── performance/
│   │   │   │   │   ├── time-off/
│   │   │   │   │   ├── attendance/
│   │   │   │   │   └── benefits/
│   │   │   │   ├── payroll/       # PayLinQ features
│   │   │   │   │   ├── runs/
│   │   │   │   │   ├── compensation/
│   │   │   │   │   ├── tax/
│   │   │   │   │   └── deductions/
│   │   │   │   └── scheduling/    # ScheduleHub features (inclusief time tracking)
│   │   │   │       ├── schedules/
│   │   │   │       ├── shifts/
│   │   │   │       ├── workers/
│   │   │   │       ├── stations/
│   │   │   │       └── time-tracking/  # ScheduleHub heeft robuustere time tracking
│   │   │   ├── shared/         # Shared components
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   ├── layouts/
│   │   │   │   └── utils/
│   │   │   ├── core/           # Core infrastructure
│   │   │   │   ├── api/
│   │   │   │   ├── auth/
│   │   │   │   ├── routing/
│   │   │   │   └── store/
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   └── package.json
│   │
│   ├── admin/                  # Platform/Portal (blijft separaat)
│   │   └── ...
│   │
│   └── api/                    # 🔄 BACKEND (blijft zoals is)
│       └── ...
│
├── packages/                   # Shared libraries
│   ├── ui/                     # Design system
│   ├── api-client/             # API layer
│   ├── auth/                   # Authentication
│   ├── types/                  # TypeScript types
│   └── utils/                  # Utilities
│
├── package.json
└── pnpm-workspace.yaml
```

### Unified Frontend Routing Structure

```tsx
// apps/web/src/App.tsx
<Routes>
  {/* Main Navigation */}
  <Route path="/" element={<MainLayout />}>
    <Route index element={<Dashboard />} />
    
    {/* Recruitment Module */}
    <Route path="recruitment">
      <Route path="jobs" element={<JobsList />} />
      <Route path="jobs/:id" element={<JobDetails />} />
      <Route path="candidates" element={<CandidatesList />} />
      <Route path="pipeline" element={<Pipeline />} />
    </Route>
    
    {/* HRIS Module */}
    <Route path="hris">
      <Route path="employees" element={<EmployeesList />} />
      <Route path="departments" element={<DepartmentsList />} />
      <Route path="time-off" element={<TimeOffRequests />} />
      <Route path="performance" element={<ReviewsList />} />
    </Route>
    
    {/* Payroll Module */}
    <Route path="payroll">
      <Route path="runs" element={<PayrollRunsList />} />
      <Route path="compensation" element={<CompensationPage />} />
      <Route path="tax" element={<TaxSettingsPage />} />
      <Route path="deductions" element={<DeductionsList />} />
    </Route>
    
    {/* Scheduling Module (inclusief time tracking) */}
    <Route path="scheduling">
      <Route path="schedules" element={<SchedulesList />} />
      <Route path="shifts" element={<ShiftsList />} />
      <Route path="workers" element={<WorkersList />} />
      <Route path="time-tracking" element={<TimeTrackingList />} />
    </Route>
  </Route>
</Routes>
```

---

## Backend: GEEN Wijzigingen Nodig!

De backend blijft exact zoals deze is:
- ✅ Product-based architecture blijft intact
- ✅ Dynamic product loading blijft werken
- ✅ API routes blijven `/api/products/{slug}/*`
- ✅ Multi-tenant isolation blijft gehandhaafd

De unified frontend roept gewoon alle product APIs aan:
```typescript
// Unified frontend kan alle producten gebruiken
GET /api/products/recruitiq/jobs
GET /api/products/nexus/employees  
GET /api/products/paylinq/payroll-runs
GET /api/products/schedulehub/schedules
```

---

## Migratieplan

### Fase 1: Setup Unified Frontend ✅
1. Creëer nieuwe `apps/web/` directory
2. Setup Vite + React + TypeScript
3. Configureer routing met React Router v6
4. Setup TanStack Query voor API calls
5. Configureer TailwindCSS

### Fase 2: Migreer Core Infrastructure
1. Auth context & protected routes
2. API client configuratie
3. Theme & toast providers
4. Shared layouts (MainLayout, AuthLayout)
5. Navigation component met module switching

### Fase 3: Migreer Features (per module)

**3A. HRIS Module (vanuit Nexus)**
- Employees management
- Departments & locations
- Contracts
- Performance reviews
- Time-off & attendance
- Benefits
- Documents

**3B. Payroll Module (vanuit PayLinQ) ⚠️ SKIP TIMESHEETS**
- Payroll runs
- Compensation structures
- Tax settings
- Deductions
- Pay components
- ❌ **SKIP Timesheets** - ScheduleHub heeft robuustere time tracking

**3C. Recruitment Module (vanuit RecruitIQ)**
- Jobs & requisitions
- Candidates
- Pipeline & workflows
- Interviews
- Applicant portal

**3D. Scheduling Module (vanuit Nexus/ScheduleHub)**
- Schedule management
- Shift templates
- Worker assignments
- Station management
- Shift swaps
- ✅ **Time Tracking** - ScheduleHub's robuuste implementatie (niet PayLinQ's timesheets)

### Fase 4: Testing & Cleanup
1. E2E tests voor alle modules
2. Visual regression tests
3. Performance testing
4. Remove oude frontend apps
5. Update CI/CD pipelines

---

## Benefits van Deze Architectuur

### ✅ Technische Voordelen
1. **Single Build Pipeline** - 1 frontend build ipv 4
2. **Code Reuse** - Shared components tussen modules
3. **Consistent UX** - Uniforme navigatie en design
4. **Smaller Bundle** - Code splitting per feature
5. **Easier Maintenance** - 1 plaats voor frontend logic
6. **Type Safety** - Shared types tussen features

### ✅ Business Voordelen
1. **Integrated Experience** - Geen context switching tussen apps
2. **Cross-Module Features** - Bijv. employee vanuit recruitment naar payroll
3. **Unified Dashboard** - Overzicht van alle modules
4. **Single Authentication** - 1x inloggen voor alles
5. **Module-based Licensing** - Features aan/uit zetten per organisatie

### ✅ Developer Experience
1. **Feature-based Organization** - Domain-driven design
2. **Clear Boundaries** - Elk feature is zelfstandig
3. **Easier Onboarding** - Begrijpelijke structuur
4. **Parallel Development** - Teams werken onafhankelijk per feature
5. **Industry Standard** - Volgt NX/Turborepo best practices

---

## Folder Renaming: Backend → API

Om industry standards te volgen:
```bash
# Old structure
recruitiq-platform/
├── apps/
└── backend/

# New structure  
recruitiq-platform/
├── apps/
│   ├── web/        # Unified frontend
│   ├── admin/      # Admin portal
│   └── api/        # Backend (was: backend/)
└── packages/
```

Dit volgt het pattern van moderne monorepos (Vercel, Remix, etc.)

---

## Breaking Changes & Migratie Overwegingen

### ⚠️ URL Changes voor Gebruikers
- **Oud:** 4 separate domains/subpaths
  - recruitiq.example.com
  - paylinq.example.com  
  - nexus.example.com
  - portal.example.com

- **Nieuw:** 2 domains
  - app.example.com (unified)
  - admin.example.com (portal)

### ⚠️ Navigation Changes
Gebruikers moeten wennen aan nieuwe navigatie:
- **Top-level modules:** Recruitment | HRIS | Payroll | Scheduling
- **Sub-navigation:** Per module eigen menu

### ✅ Geen Breaking Changes
- API endpoints blijven hetzelfde
- Database schema ongewijzigd
- Authentication flow ongewijzigd
- Backend product modules intact

---

## Timeline Schatting

| Fase | Taken | Tijd |
|------|-------|------|
| **Fase 1** | Setup unified frontend | 2-3 dagen |
| **Fase 2** | Core infrastructure | 3-4 dagen |
| **Fase 3A** | HRIS module (Nexus) | 5-7 dagen |
| **Fase 3B** | Payroll module (PayLinQ) - SKIP timesheets | 4-6 dagen |
| **Fase 3C** | Recruitment module | 4-5 dagen |
| **Fase 3D** | Scheduling module + time tracking | 3-5 dagen |
| **Fase 4** | Testing & cleanup | 3-5 dagen |
| **Totaal** | | **24-35 dagen** |

**Note:** Timesheets van PayLinQ worden overgeslagen omdat ScheduleHub een robuustere time tracking implementatie heeft.

---

## Next Steps

1. ✅ Review dit plan
2. ⏳ Maak backup van huidige code
3. ⏳ Start met Fase 1: Setup unified frontend
4. ⏳ Iteratief migreren per module
5. ⏳ Parallel draaien van oude + nieuwe frontend (feature flag)
6. ⏳ Geleidelijke rollout naar productie
7. ⏳ Verwijder oude frontends

---

**Status:** Plan gereed voor review en implementatie
**Laatste update:** 25 december 2024
