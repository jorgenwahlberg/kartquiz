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
- **Turf.js** - Geospatial operations (polygon intersections)

### Application Structure

This is a **frontend-only SPA** (single-page application). The core architecture follows a component-based pattern:

**Quiz Flow:**
1. Quiz data (with polygon geometries) is loaded from JSON in `src/data/`
2. `PolygonQuiz` component manages quiz state and selected answers
3. Each answer has an associated GeoJSON polygon representing a region on the map
4. As user answers questions, polygons are intersected to narrow down the region
5. Final result shows the intersection of all selected answer polygons on the map

**Core Concept:**
This is a **geography narrowing quiz** where each question's answers have corresponding polygons on a map of Europe. The map progressively shows the intersection of all chosen polygons, visually narrowing down a geographic region based on the user's selections.

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
│   ├── PolygonQuiz.jsx  # Main quiz component with polygon intersection logic
│   ├── PolygonQuiz.css  # Styles for quiz interface
│   └── EuropeMap.jsx    # Leaflet map component for displaying polygons
├── hooks/         # Custom React hooks (not yet used)
├── utils/
│   └── polygonUtils.js  # Geospatial utilities (intersection, validation)
├── data/
│   └── europeQuiz.json  # Quiz configuration with GeoJSON polygons
└── styles/        # Additional shared styles
```

## Key Patterns

### Quiz Data Format
Quiz data is stored in JSON files (see `src/data/europeQuiz.json`). The format follows this structure:

```json
{
  "title": "Quiz Title",
  "description": "Quiz description",
  "questions": [
    {
      "id": 1,
      "question": "Question text?",
      "answers": [
        {
          "text": "Answer text",
          "polygon": {
            "type": "Polygon",
            "coordinates": [[[lon, lat], [lon, lat], ...]]
          }
        }
      ]
    }
  ]
}
```

**Polygon Format:**
- Uses GeoJSON Polygon geometry format
- Coordinates are `[longitude, latitude]` pairs
- First and last coordinate must be identical (closed polygon)
- Outer ring is counter-clockwise, holes are clockwise
- Europe roughly spans: longitude -10 to 50, latitude 35 to 71

### Adding New Features

**Creating a New Quiz:**
1. Create a new JSON file in `src/data/` (e.g., `africaQuiz.json`)
2. Follow the quiz data format with valid GeoJSON polygons
3. Update `App.jsx` to load your new quiz file
4. Test polygon intersections work correctly

**Adding Map Functionality:**
- Map component is `EuropeMap.jsx` using react-leaflet
- Customize map center, zoom, and tile layers in the component
- Add markers, popups, or other Leaflet features as needed

**Polygon Operations:**
- All geospatial operations use Turf.js in `src/utils/polygonUtils.js`
- `intersectPolygons()` - calculates intersection of multiple polygons
- `isValidPolygon()` - validates GeoJSON polygon structure
- `getPolygonCenter()` - finds center point of polygon
- `getPolygonArea()` - calculates area in km²

**Working with GeoJSON:**
- Use tools like geojson.io to draw and export polygons
- Validate GeoJSON at geojsonlint.com
- Keep polygons simple for better performance
- Complex intersections may result in MultiPolygons (handled automatically)

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
