# Frontend Dashboard - CipherVault (Secure Encryption & Data Reveal Platform)

## Overview

React-based healthcare dashboard for **CipherVault** - a secure client-side encryption and controlled data reveal platform. Built with Vite, React 18, React Query, and modern React patterns.

**Key Features**:

- ⚡ Fast development with Vite
- 🔐 Client-side AES-256-GCM encryption/decryption
- 📊 Interactive analytics dashboard with diagnosis tracking
- 🔒 Masked data display with controlled reveal via decryption modal
- 📋 Comprehensive audit log viewer for compliance
- 👤 User authentication with JWT tokens
- 🛡️ Role-based access control (Admin, Analyst, Viewer)
- 📱 Responsive design with Tailwind CSS
- 🎨 Material-UI icons and components
- 📈 Recharts for data visualization
- 🔄 React Query for efficient data fetching and caching

## Tech Stack

- **Framework**: React 18 with Hooks
- **Build Tool**: Vite
- **State Management**: React Query (TanStack Query)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **UI Components**: Material-UI Icons
- **HTTP Client**: Axios
- **Date Handling**: date-fns
- **Testing**: Jest, React Testing Library
- **Encryption**: TweetNaCl.js (for client-side crypto)

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Backend API running on `http://localhost:3001`

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`

**Note**: API requests proxy to `http://localhost:3001` (configured in `vite.config.js`)

### Building

Build for production:

```bash
npm run build
```

Output will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage

# Run specific test file
npm test Dashboard.test.jsx
```

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── layouts/
│   │   │   └── MainLayout.jsx         # Main layout with sidebar/header
│   │   ├── HealthcareDashboard.jsx    # Dashboard with charts & analytics
│   │   ├── RecordsList.jsx            # Records table with filters
│   │   ├── CreateRecordForm.jsx       # Upload encrypted records
│   │   ├── DecryptionModal.jsx        # Password entry for decryption
│   │   └── (other components)
│   ├── pages/
│   │   ├── LoginPage.jsx              # User login
│   │   ├── RegisterPage.jsx           # User registration
│   │   ├── DashboardPage.jsx          # Dashboard container
│   │   ├── RecordsPage.jsx            # Records management
│   │   ├── AuditLogsPage.jsx          # Audit log viewer
│   │   └── SettingsPage.jsx           # User settings
│   ├── hooks/
│   │   ├── useAuth.js                 # Authentication hook
│   │   ├── useQuery.js                # Custom query hook
│   │   └── (other custom hooks)
│   ├── api/
│   │   ├── client.js                  # Axios instance with auth
│   │   └── endpoints.js               # API endpoint definitions
│   ├── crypto/
│   │   ├── encryption.js              # AES-256-GCM encryption
│   │   ├── keyDerivation.js           # PBKDF2 key derivation
│   │   └── (crypto utilities)
│   ├── utils/
│   │   ├── exportUtils.js             # CSV/PDF export functions
│   │   └── formatters.js              # Data formatting helpers
│   ├── styles/
│   │   ├── App.css
│   │   └── (other stylesheets)
│   ├── config/
│   │   └── constants.js               # App constants and config
│   ├── App.jsx                        # Main app component
│   └── main.jsx                       # Entry point
├── __tests__/
│   ├── setup.test.js
│   ├── Dashboard.test.jsx
│   └── (other test files)
├── public/
│   └── (static assets)
├── vite.config.js                     # Vite configuration
├── jest.config.js                     # Jest test configuration
├── tailwind.config.js                 # Tailwind CSS config
├── postcss.config.js                  # PostCSS config
└── package.json
```

## Key Features

### 1. **Client-Side Encryption**
- Records encrypted locally in browser before upload
- Server never sees plaintext data
- AES-256-GCM encryption with PBKDF2 key derivation
- Unique salt per record for enhanced security

### 2. **Dashboard Analytics**
- **Patient Status Distribution**: Line chart showing patient counts by diagnosis
- **Patient Distribution**: Pie chart showing active vs other patients
- **Record Activity**: Track encryption status and record creation trends
- **Key Metrics**: Total records, active patients, decrypted events, critical cases

### 3. **Records Management**
- **View**: List all encrypted records with metadata
- **Create**: Upload CSV files with automatic encryption
- **Decrypt**: Controlled reveal with password verification
- **Delete**: Secure deletion with audit trail
- **Filter**: Search and filter by name, diagnosis, status, date
- **Export**: Export records to CSV with patient data

### 4. **Decryption Workflow**
1. Click "Decrypt" button on encrypted record
2. Enter account password and optional encryption password
3. Client-side decryption in browser
4. View decrypted patient data in dashboard
5. All access logged for audit trail

### 5. **Audit Logs** (Admin only)
- View all system actions (LOGIN, LOGOUT, REVEAL_RECORD, DELETE)
- Filter by user, action, date range, status
- Expand rows to see detailed information (IP, error messages, etc.)
- Export logs to CSV/PDF/JSON
- Compliance reporting and statistics

### 6. **Authentication & Authorization**
- JWT token-based authentication
- Three roles: Admin, Analyst, Viewer
- Automatic token refresh
- Logout with token cleanup
- Protected routes and role-based access

## Component Details

### HealthcareDashboard
Main dashboard component with:
- KPI statistics cards
- Diagnosis & patient visualization
- Patient distribution pie chart
- Records table with decryption modal
- Lab results panel (shows vitals when patient selected)

### RecordsList
Records management with:
- Sortable, filterable table
- Status badges (Encrypted/Decrypted)
- Timestamp display
- Action buttons (Decrypt/View/Delete)
- Metadata display (file size, creation date)

### DecryptionModal
Modal dialog for:
- Account password entry (required)
- Encryption password entry (optional, for different password)
- Error handling and messages
- Security warnings and notes
- Accessibility features

### AuditLogsPage
Audit log viewer with:
- Filter by user, action, status, date
- Sort by any column
- Expandable rows with full details
- Search functionality
- Export options (CSV/PDF/JSON)
- Pagination
- Statistics dashboard

## API Integration

### Authentication
```javascript
POST /auth/login
POST /auth/register
POST /auth/logout
```

### Records
```javascript
GET /records                  // List user's records
POST /records                 // Create new record
GET /records/:id/reveal       // Get decryption payload
PUT /records/:id              // Update record
DELETE /records/:id           // Delete record
```

### Audit Logs
```javascript
GET /audit-logs              // List audit logs (admin only)
GET /audit-logs/statistics   // Compliance stats
GET /audit-logs/export       // Export logs
```

## Environment Variables

Create `.env` file in frontend root (or use defaults):

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3001
VITE_API_TIMEOUT=30000

# App Configuration
VITE_APP_NAME=CipherVault
VITE_LOG_LEVEL=debug
```

## Development Workflow

### 1. Start Backend
```bash
cd backend
npm run dev
```

### 2. Start Frontend Dev Server
```bash
cd frontend
npm run dev
```

### 3. Access Dashboard
Open `http://localhost:5173` in browser

### 4. Default Test Account
- Email: `admin@example.com`
- Password: `password123`
- Role: Admin (can see audit logs)

## Data Flow

```
User Input
    ↓
[React Components] ←→ [React Query] ←→ [Axios API Client]
    ↓                                      ↓
[Crypto Functions]                   [JWT Authentication]
(Client-Side Encryption)                  ↓
    ↓                              [Backend API]
[Local Storage]                           ↓
(Session Management)               [MongoDB Database]
```

## Security Best Practices

✅ **Implemented**:
- Client-side encryption before upload
- JWT tokens with expiration
- Secure password hashing
- HTTPS in production
- CORS configured
- Input validation
- Comprehensive audit logging
- No sensitive data in local storage (except JWT)

⚠️ **Recommendations**:
- Use HTTPS only in production
- Set strong `JWT_SECRET` on backend
- Implement rate limiting on auth endpoints
- Use secure, httpOnly cookies for tokens
- Regular security audits
- Keep dependencies updated

## Performance Optimizations

- ✅ Code splitting with Vite
- ✅ React Query for smart caching
- ✅ Lazy loading of routes
- ✅ Tailwind CSS purging
- ✅ Image optimization
- ✅ Memoization of expensive computations

## Testing

### Unit Tests
Test individual components and utilities:
```bash
npm test -- Dashboard.test.jsx
```

### Integration Tests
Test component interactions:
```bash
npm test -- integration.test.js
```

### E2E Tests (future)
```bash
npm run test:e2e
```

## Troubleshooting

### API Connection Errors
- Ensure backend is running on port 3001
- Check `VITE_API_BASE_URL` in `.env`
- Check browser console for CORS errors

### Decryption Fails
- Verify encryption password is correct
- Check console for crypto errors
- Ensure data wasn't corrupted during upload

### Login Issues
- Clear browser cache and cookies
- Check JWT token expiration
- Verify user exists in database
- Check backend logs

### Build Errors
- Delete `node_modules` and `dist/`
- Run `npm install` again
- Check Node.js version >= 18
- Check for import errors in console

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Connect repo to Vercel
3. Set environment variables
4. Deploy automatically on push

### Docker
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Static Hosting (GitHub Pages, Netlify)
```bash
npm run build
# Deploy dist/ folder
```

## Contributing

1. Create feature branch
2. Make changes
3. Run tests: `npm test`
4. Commit with clear messages
5. Push and create pull request

## Performance Monitoring

- Use React DevTools profiler
- Monitor API response times
- Check bundle size: `npm run build`
- Use Lighthouse for audits

## Support & Documentation

- Backend API: See `backend/README.md`
- Database Schema: See backend models
- Encryption Details: See crypto utils
- Component Props: Check JSDoc comments in components

## License

Proprietary - CipherVault Platform


Preview production build:

```bash
npm run preview
```

## Testing

### Run Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Generate Coverage Report

```bash
npm run test:coverage
```

## Code Quality

### Lint Code

```bash
npm run lint
```

### Fix Linting Issues

```bash
npm run lint:fix
```

## Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API and service layer
│   ├── contexts/            # React context providers
│   ├── utils/               # Utility functions
│   ├── App.jsx              # Root component
│   ├── App.css              # App styles
│   ├── index.css            # Global styles
│   └── main.jsx             # React entry point
├── __tests__/               # Test files
├── public/                  # Static assets
├── index.html               # HTML entry point
├── vite.config.js           # Vite configuration
├── jest.config.js           # Jest testing configuration
├── .eslintrc.js             # ESLint configuration
├── babel.config.js          # Babel configuration
├── package.json             # Dependencies
└── .env.example             # Environment template
```

## Tech Stack

### Core

- **React 18** - UI library
- **Vite 5** - Build tool and dev server
- **React Router v6** - Client-side routing
- **React Query** - Server state management
- **Zustand** - Client state management
- **Axios** - HTTP client

### Testing

- **Jest** - Test framework
- **React Testing Library** - Component testing
- **@testing-library/jest-dom** - DOM matchers

### Code Quality

- **ESLint** - Linting
- **Prettier** - Code formatting (optional, can be added)

## API Integration

The dashboard communicates with the backend API at `/api/v1`.

Key endpoints used:

- `GET /api/v1/health` - Health check
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/records` - Fetch records
- `POST /api/v1/records/{id}/reveal` - Request decryption token
- `GET /api/v1/records/{id}/decrypted` - Get decrypted payload
- `GET /api/v1/audit` - Fetch audit logs

## Environment Variables

See `.env.example` for complete configuration. Key variables:

| Variable                 | Purpose                | Example               |
| ------------------------ | ---------------------- | --------------------- |
| `VITE_API_BASE_URL`      | Backend API URL        | http://localhost:3000 |
| `VITE_AUTO_MASK_TIMEOUT` | Auto-mask timeout (ms) | 300000 (5 min)        |
| `VITE_ITEMS_PER_PAGE`    | Pagination size        | 20                    |
| `VITE_LOG_LEVEL`         | Logging level          | info                  |

## Development Guidelines

### Creating Components

1. Create component file in `src/components/`
2. Create corresponding test file in `__tests__/`
3. Write tests first (TDD approach)
4. Implement component
5. Run `npm test` to verify
6. Run `npm run lint` to check code quality

### Component Template

```jsx
/**
 * MyComponent - Brief description
 */

import React from "react";
import "./MyComponent.css";

function MyComponent({ prop1, prop2 }) {
  return <div className="my-component">{prop1}</div>;
}

export default MyComponent;
```

### Using Hooks

- Use custom hooks from `src/hooks/` for reusable logic
- Use React Query for server state
- Use Zustand for client state
- Use Context for cross-cutting concerns

### API Calls

Use Axios via service layer in `src/services/`:

```javascript
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const fetchRecords = async () => {
  const response = await axios.get(`${API_BASE}/api/v1/records`);
  return response.data;
};
```

## Performance Optimization

- Code splitting with Vite
- Lazy loading routes with React.lazy
- React Query caching
- CSS modules for scoped styles
- Image optimization

## Security Considerations

- No plaintext data in localStorage (use httpOnly cookies for tokens)
- CORS configured for backend origin only
- CSP headers (configured in backend)
- Input validation before submission
- XSS protection with React's built-in escaping
- CSRF token for state-changing operations

## Troubleshooting

### Port 3001 Already in Use

```bash
npm run dev -- --port 3002
```

### Module Resolution Errors

Clear cache and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

### Build Fails

Check Node version:

```bash
node --version  # Should be >= 18.0.0
```

Clean build artifacts:

```bash
rm -rf dist node_modules
npm install
npm run build
```

## Contributing

1. Create feature branch from `main`
2. Follow code guidelines (TDD, lint checks)
3. Test coverage must be > 70%
4. Create pull request with description
5. Code review before merge

## License

MIT

## Contact

For issues or questions, contact the technical lead.
