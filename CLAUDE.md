# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Starting Development
```bash
npm install          # Install dependencies (first time setup)
npm run dev         # Start development server at http://localhost:3000
```

### Building and Testing
```bash
npm run build       # Build for production (output to dist/)
npm run preview     # Preview production build locally
npm run lint        # Run ESLint to check code quality
npm test           # Run tests with Vitest
```

### Running Single Test
```bash
npm test -- Quiz.test.jsx                    # Run specific test file
npm test -- --watch                          # Run tests in watch mode
npm test -- -t "test name pattern"           # Run tests matching pattern
```

## Architecture Overview

### Tech Stack
- **React 18** - UI library with modern hooks
- **Vite** - Build tool and dev server (fast HMR)
- **Vitest** - Test runner (Vite-native, Jest-compatible API)
- **ESLint** - Code linting with React-specific rules
- **Leaflet + react-leaflet** - Interactive map rendering
- **Turf.js** - Geospatial operations (convex hull, weighted mean)

### Application Structure

This is a **frontend-only SPA** (single-page application). The core architecture follows a component-based pattern:

**Data Visualization Flow:**
1. Data is fetched from Google Sheets every 10 seconds
2. `PlacesVisualization` component manages data loading and refresh
3. Each place has coordinates and a score
4. `PlacesMap` component renders all places as markers on the map
5. Weighted geographic mean (based on scores) is shown as a red marker with a configurable radius circle
6. A convex hull polygon surrounds all places with points

**Core Concept:**
This is a **geographic data visualization app** that displays places with scores on a map. The app shows:
- Individual places as blue markers
- Weighted geographic mean as a red marker with a radius circle
- Convex hull (boundary polygon) around all places
- Auto-refresh every 10 seconds from Google Sheets

**State Management:**
- Currently uses React's built-in `useState` for local component state
- For larger features, consider adding Context API or a state management library

**Styling:**
- Component-scoped CSS files (e.g., `App.css`)
- Global styles in `src/index.css`
- Light/dark mode support via CSS media queries

### Directory Structure

```
src/
├── components/
│   ├── PlacesVisualization.jsx  # Main visualization component with data loading
│   ├── PlacesVisualization.css  # Styles for visualization interface
│   ├── PlacesMap.jsx            # Leaflet map component for displaying places
│   ├── PolygonQuiz.jsx          # Legacy quiz component (no longer used)
│   ├── PolygonQuiz.css          # Legacy quiz styles
│   └── EuropeMap.jsx            # Legacy map component (no longer used)
├── hooks/         # Custom React hooks (not yet used)
├── utils/
│   ├── sheetUtils.js    # Google Sheets data fetching and processing
│   └── polygonUtils.js  # Geospatial utilities (legacy)
├── data/
│   └── europeQuiz.json  # Legacy quiz data (no longer used)
└── styles/        # Additional shared styles
```

## Key Patterns

### Google Sheets Data Integration
Data is fetched from a Google Sheets document every 10 seconds. The sheet must be publicly accessible (view-only is sufficient).

**Sheet Configuration:**
- Sheet ID: `10SnSQIjUFzHz0zXi1TbXbescLkO4ZYqRXJncA7VROZI`
- Sheet Name: `Resultater`
- Refresh Interval: 10 seconds

**Expected Column Format:**
- `Sted` - Place name (text)
- `Latlon` - Coordinates in format "latitude,longitude" (e.g., "59.9139,10.7522")
- `Poeng` - Score/points (number)

**Data Processing:**
1. Sheet is fetched as CSV using Google Sheets export URL
2. Rows are parsed and validated
3. Only places with valid coordinates and positive scores are included
4. Coordinates are converted to GeoJSON format `[longitude, latitude]`

### Visualization Features

**Weighted Geographic Mean:**
- Calculated using scores as weights
- Formula: `weighted_lon = Σ(lon_i × score_i) / Σ(score_i)`
- Displayed as a red marker with configurable radius circle

**Convex Hull:**
- Calculated using Turf.js `convex()` function
- Automatically surrounds all places with points
- Requires 3+ points (for 2 points, shows a line)

**Auto-Refresh:**
- Data is refreshed every 10 seconds automatically
- Errors during refresh don't clear existing data
- Last update time is displayed in the UI

### Adding New Features

**Changing Data Source:**
1. Update `SHEET_ID` and `SHEET_NAME` in `PlacesVisualization.jsx`
2. Ensure the sheet has columns: `Sted`, `Latlon`, `Poeng`
3. Make sure the sheet is publicly accessible (Share > Anyone with link can view)
4. Test data fetching and validation

**Customizing Visualization:**
- Adjust `REFRESH_INTERVAL` in `PlacesVisualization.jsx` (default: 10000ms)
- Change default circle radius in component state (default: 50km)
- Modify marker icons in `PlacesMap.jsx` using Leaflet's Icon API
- Customize colors and styles in `PlacesVisualization.css`

**Adding Map Functionality:**
- Map component is `PlacesMap.jsx` using react-leaflet
- Customize map center, zoom, and tile layers in the component
- Add additional markers, popups, or other Leaflet features as needed
- Use Turf.js for geospatial calculations

**Data Processing:**
- `fetchSheetData()` in `src/utils/sheetUtils.js` handles data fetching
- `parseLatLon()` converts coordinate strings to `[lon, lat]` arrays
- `calculateWeightedMean()` computes weighted geographic center
- All functions include validation and error handling

### Component Conventions
- Use functional components with hooks
- Export default for components, named exports for utilities
- Keep components focused (single responsibility)
- Extract complex logic into custom hooks

## Map Integration

### Leaflet Setup
- Leaflet CSS must be imported: `import 'leaflet/dist/leaflet.css'`
- Map container needs explicit height/width CSS
- Default tiles use OpenStreetMap (free, no API key required)

### Map Component Usage
```jsx
<EuropeMap polygons={arrayOfGeoJSONPolygons} />
```

The map automatically:
- Fits bounds to show all polygons
- Applies styling to polygon overlays
- Centers on Europe by default

## Testing Approach

- Test files use `.test.jsx` or `.test.js` extension
- Place tests next to the component they test
- Vitest uses `globals: true` config, so no need to import `describe`, `it`, `expect`
- Test user interactions, not implementation details
- For map components, mock Leaflet to avoid DOM issues in tests

## Vite Configuration

The `vite.config.js` sets:
- React plugin for JSX transformation
- Dev server on port 3000 with auto-open
- Vitest integration with jsdom environment for DOM testing

## ESLint Rules

ESLint is configured for React 18 with:
- React Hooks rules enforcement
- React Refresh compatibility checks
- ES2020+ syntax support
