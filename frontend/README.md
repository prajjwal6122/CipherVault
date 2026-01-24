# Frontend Dashboard - Secure Encryption & Data Reveal Platform

## Overview

React-based dashboard for the Secure Client-Side Encryption & Controlled Data Reveal Platform. Built with Vite, React Query, and modern React patterns.

**Features**:

- Fast development with Vite
- React 18 with hooks
- Client-side data decryption
- Masked data display with controlled reveal
- Audit log viewer
- User authentication
- Role-based access control

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

The dashboard will be available at `http://localhost:3001`

The development server proxies API requests to `http://localhost:3000`

### Building

Build for production:

```bash
npm run build
```

Output will be in the `dist/` directory.

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
