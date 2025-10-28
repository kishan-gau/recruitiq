# RecruitIQ License Manager - Frontend

Admin portal for managing RecruitIQ licenses across all deployment types (Cloud Shared, Cloud Dedicated, and On-Premise).

## Features

- **Dashboard**: Overview of all licenses, customers, revenue metrics, and upcoming renewals
- **Customer Management**: List, search, filter, and manage all customers
- **Customer Details**: Detailed view of each customer with usage stats, license info, and recent activity
- **License Creation**: Multi-step wizard for creating new licenses with configurable tiers and limits
- **Analytics**: Revenue trends, user activity, and customer insights
- **Settings**: Configure API endpoints, notification preferences, and license signing keys

## Tech Stack

- **React 18** - UI library
- **React Router 6** - Routing
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **date-fns** - Date formatting

## Getting Started

### Install Dependencies

```bash
cd license-manager/frontend
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5174`

### Build for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/         # Reusable UI components
│   ├── Layout.jsx     # Main layout with sidebar and header
│   ├── Sidebar.jsx    # Navigation sidebar
│   ├── Header.jsx     # Top header
│   ├── Card.jsx       # Card container
│   ├── MetricCard.jsx # Metric display card
│   ├── Table.jsx      # Data table
│   ├── Badge.jsx      # Status badge
│   ├── ProgressBar.jsx # Usage progress bar
│   └── Modal.jsx      # Modal dialog
│
├── pages/             # Main application pages
│   ├── Dashboard.jsx        # Overview dashboard
│   ├── CustomerList.jsx     # Customer list with filters
│   ├── CustomerDetail.jsx   # Customer detail view
│   ├── LicenseCreate.jsx    # License creation wizard
│   ├── Analytics.jsx        # Analytics dashboard
│   └── Settings.jsx         # Settings page
│
├── services/          # API and data services
│   └── api.js         # Mock API service (replace with real API)
│
├── App.jsx            # Main app component with routing
├── main.jsx           # React entry point
└── index.css          # Global styles and Tailwind config
```

## Mock Data

Currently using mock data in `src/services/api.js`. This simulates:
- 6 sample customers with various tiers and deployment types
- Usage statistics and activity logs
- Dashboard metrics
- Analytics data

Replace the mock API service with real backend API calls once the backend is ready.

## Pages

### Dashboard (`/dashboard`)
- Key metrics (customers, licenses, revenue, expiring)
- Revenue and customer growth charts
- Upcoming renewals table
- Quick stats

### Customers (`/customers`)
- Searchable and filterable customer list
- Filter by tier, status, and deployment type
- Quick view of usage and expiry
- Click to view details

### Customer Detail (`/customers/:id`)
- Complete license information
- Instance and deployment details
- Contact information
- Usage progress bars (users, workspaces, jobs, candidates)
- Recent activity log
- Actions: Renew, Suspend, Reactivate, Download .lic

### Create License (`/licenses/create`)
Multi-step wizard:
1. Customer information
2. Deployment type selection
3. License tier selection (Starter/Professional/Enterprise)
4. Limits and duration configuration
5. Review and confirm

### Analytics (`/analytics`)
- Period selection (7d/30d/90d)
- Key metrics
- Revenue trends
- User activity
- Customer distribution
- Top customers by revenue

### Settings (`/settings`)
- License signing keys (public/private)
- API endpoint configuration
- Notification preferences
- Grace period settings

## Styling

Using Tailwind CSS with custom component classes defined in `index.css`:

```css
.btn - Base button
.btn-primary - Primary action button
.btn-secondary - Secondary button
.btn-success - Success/positive action
.btn-danger - Dangerous/destructive action
.card - Card container
.input - Form input
.label - Form label
.badge - Status badge
```

## Integration with Backend

To connect with the real backend:

1. Update `src/services/api.js`:
   - Replace mock functions with real HTTP calls
   - Use axios or fetch to call backend API
   - Handle authentication tokens

2. Update environment variables:
   ```bash
   VITE_API_URL=https://license-api.recruitiq.com
   ```

3. Add authentication:
   - Implement login page
   - Store auth tokens
   - Add auth headers to API requests

## Next Steps

1. **Charts**: Integrate Recharts for visualizations
2. **Real API**: Connect to backend API
3. **Authentication**: Add admin login
4. **Export**: Add CSV/PDF export functionality
5. **Search**: Enhance search with debouncing
6. **Filters**: Add more granular filters
7. **Bulk Actions**: Add bulk license operations
8. **Audit Log**: Add admin action logging

## License

Proprietary - RecruitIQ Internal Tool
