# KartQuiz

An interactive geography quiz application that uses map polygons to progressively narrow down regions. Built with React, Leaflet, and Turf.js.

## Overview

KartQuiz presents questions where each answer corresponds to a geographic polygon on a map. As you answer questions, the map shows the **intersection** of all your chosen answers, visually narrowing down to a specific region. Perfect for geography learning, region identification, or any location-based quiz scenarios.

## Features

- 🗺️ **Interactive Map** - Real-time visualization of polygon intersections on a map of Europe
- 🎯 **Progressive Filtering** - Each answer narrows down the geographic region
- 📊 **Area Calculation** - See the size of the resulting region in km²
- 🔄 **Navigation** - Go back to change previous answers
- 🎨 **Responsive Design** - Works on desktop and mobile devices
- 🌓 **Dark Mode Support** - Automatic light/dark theme switching

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will open at http://localhost:3000

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

### Test

```bash
npm test
```

## Creating Your Own Quiz

Quiz data is stored in JSON format in the `src/data/` directory. Here's the structure:

```json
{
  "title": "Your Quiz Title",
  "description": "Quiz description",
  "questions": [
    {
      "id": 1,
      "question": "Your question?",
      "answers": [
        {
          "text": "Answer option",
          "polygon": {
            "type": "Polygon",
            "coordinates": [
              [
                [longitude, latitude],
                [longitude, latitude],
                ...
              ]
            ]
          }
        }
      ]
    }
  ]
}
```

### Creating Polygons

1. Visit [geojson.io](https://geojson.io) to draw polygons on a map
2. Export as GeoJSON
3. Copy the polygon geometry to your quiz JSON
4. Validate at [geojsonlint.com](https://geojsonlint.com)

### Tips for Good Quizzes

- **Overlapping Regions**: Ensure answer polygons have meaningful overlaps
- **Simple Shapes**: Simpler polygons perform better
- **Logical Questions**: Questions should progressively narrow the region
- **Test Intersections**: Verify that expected answer combinations produce valid results

## Project Structure

```
src/
├── components/
│   ├── PolygonQuiz.jsx    # Main quiz component
│   ├── PolygonQuiz.css    # Quiz styles
│   └── EuropeMap.jsx      # Leaflet map component
├── utils/
│   └── polygonUtils.js    # Geospatial utilities
├── data/
│   └── europeQuiz.json    # Quiz configuration
├── App.jsx                # Main app component
└── index.css              # Global styles
```

## Technologies

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Leaflet** - Interactive map library
- **react-leaflet** - React bindings for Leaflet
- **Turf.js** - Geospatial analysis (polygon intersections)
- **Vitest** - Testing framework
- **ESLint** - Code linting

## How It Works

1. **Load Quiz**: Quiz data with GeoJSON polygons is loaded from JSON
2. **Display Question**: User sees a question with multiple answer choices
3. **Select Answer**: Clicking an answer adds its polygon to the selection
4. **Calculate Intersection**: Turf.js calculates the intersection of all selected polygons
5. **Update Map**: The map displays the resulting intersection area
6. **Next Question**: Process repeats for each question
7. **Final Result**: Shows the final narrowed-down region

## License

MIT

## Contributing

Contributions welcome! Feel free to:
- Add new quiz topics
- Improve polygon intersection algorithms
- Enhance the UI/UX
- Add new map features
- Write tests
