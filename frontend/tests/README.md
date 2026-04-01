# UI Test Suite

Automated UI testing using Playwright for the propSearch dashboard.

## Setup

```bash
# Install dependencies (already done)
npm install

# Install browsers (already done)
npx playwright install chromium
```

## Running Tests

```bash
# Run all tests
npm test

# Run with UI mode (interactive)
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed

# Run specific test file
npx playwright test pages/Dashboard.spec.ts

# Run smoke tests only
npm run test:smoke

# Run accessibility tests only
npm run test:accessibility

# Run dashboard tests only
npm run test:dashboard

# View test report
npm run test:report
```

## Test Structure

```
tests/
├── README.md                    # This file
├── fixtures/
│   └── properties.ts           # Mock property data
├── components/
│   └── AlphaBadge.spec.ts     # Component unit tests
└── pages/
    ├── Dashboard.spec.ts      # Dashboard E2E tests
    ├── LandingPage.spec.ts    # Landing page tests
    ├── PropertyDetail.spec.ts # Property detail tests
    ├── MortgageTracker.spec.ts # Mortgage tracker tests
    └── ComparisonPage.spec.ts # Comparison page tests
├── accessibility.spec.ts      # Accessibility audit tests
└── smoke.spec.ts              # Smoke tests for all pages
```

## Test Types

### Smoke Tests
Quick checks that pages load without crashing. Run these before every commit.

### Component Tests
Unit tests for individual UI components (AlphaBadge, Tooltip, etc.)

### E2E Tests
Full page tests covering user flows:
- Navigation
- Data display
- User interactions
- State changes

### Accessibility Tests
- Heading hierarchy
- Table structure
- Image alt text
- Color contrast
- Keyboard navigation

## CI Integration

Tests run automatically on the web server defined in `playwright.config.ts`.
In CI mode, tests run with:
- 2 retries
- Single worker
- Forbid-only mode (fails on `test.skip`)

## Debugging

```bash
# Run with UI
npm run test:ui

# Run with screenshot on failure (automatic)
# Screenshots saved to: playwright-report/

# Run single test
npx playwright test --grep "loads without errors"
```
