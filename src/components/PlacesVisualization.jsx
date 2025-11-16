import { useState, useEffect } from 'react'
import PlacesMap from './PlacesMap'
import { fetchSheetData, calculateWeightedMean, createGradientBuffers } from '../utils/sheetUtils'
import * as turf from '@turf/turf'

const SHEET_ID = '10SnSQIjUFzHz0zXi1TbXbescLkO4ZYqRXJncA7VROZI'
const SHEET_NAME = 'Resultater'
const REFRESH_INTERVAL = 10000 // 10 seconds

function PlacesVisualization() {
  const [places, setPlaces] = useState([])
  const [weightedCenter, setWeightedCenter] = useState(null)
  const [convexHull, setConvexHull] = useState(null)
  const [gradientBuffers, setGradientBuffers] = useState([])
  const [circleRadius, setCircleRadius] = useState(50) // km
  const [gradientWidth, setGradientWidth] = useState(100) // km
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('[PlacesVisualization] Fetching data...')
      const data = await fetchSheetData(SHEET_ID, SHEET_NAME)

      console.log('[PlacesVisualization] Loaded places:', data.length)
      setPlaces(data)
      setLastUpdate(new Date())

      if (data.length > 0) {
        // Calculate weighted mean
        const center = calculateWeightedMean(data)
        console.log('[PlacesVisualization] Weighted center:', center)
        setWeightedCenter(center)

        // Calculate convex hull if we have 3+ points
        if (data.length >= 3) {
          const points = turf.featureCollection(
            data.map(place => turf.point(place.coordinates))
          )
          const hull = turf.convex(points)
          console.log('[PlacesVisualization] Convex hull:', hull ? 'created' : 'failed')
          const hullGeometry = hull ? hull.geometry : null
          setConvexHull(hullGeometry)

          // Create gradient buffers
          if (hullGeometry) {
            const buffers = createGradientBuffers(hullGeometry, gradientWidth)
            console.log('[PlacesVisualization] Created', buffers.length, 'gradient buffers')
            setGradientBuffers(buffers)
          }
        } else if (data.length === 2) {
          // For 2 points, create a line
          const line = turf.lineString(data.map(p => p.coordinates))
          setConvexHull(line.geometry)
          setGradientBuffers([])
        } else {
          setConvexHull(null)
          setGradientBuffers([])
        }
      } else {
        setWeightedCenter(null)
        setConvexHull(null)
        setGradientBuffers([])
      }

      setLoading(false)
    } catch (err) {
      console.error('[PlacesVisualization] Error loading data:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  // Load data on mount and set up refresh interval
  useEffect(() => {
    loadData()

    const interval = setInterval(() => {
      console.log('[PlacesVisualization] Auto-refreshing data...')
      loadData()
    }, REFRESH_INTERVAL)

    return () => clearInterval(interval)
  }, [])

  // Recalculate gradient buffers when gradient width changes
  useEffect(() => {
    if (convexHull && convexHull.type === 'Polygon') {
      const buffers = createGradientBuffers(convexHull, gradientWidth)
      console.log('[PlacesVisualization] Recalculated gradient buffers:', buffers.length)
      setGradientBuffers(buffers)
    }
  }, [gradientWidth, convexHull])

  if (loading && places.length === 0) {
    return (
      <div className="visualization-container">
        <div className="loading-message">
          <h2>Laster data...</h2>
          <p>Henter resultater fra Google Sheets</p>
        </div>
      </div>
    )
  }

  if (error && places.length === 0) {
    return (
      <div className="visualization-container">
        <div className="error-message">
          <h2>Feil ved lasting av data</h2>
          <p>{error}</p>
          <button onClick={loadData} className="btn-retry">
            Prøv igjen
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="visualization-container">
      <div className="control-panel">
        <div className="header">
          <h1>Resultatvisualisering</h1>
          <p className="description">Geografisk fordeling av poeng</p>
        </div>

        <div className="stats">
          <div className="stat-item">
            <span className="stat-label">Antall steder:</span>
            <span className="stat-value">{places.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Totalt poeng:</span>
            <span className="stat-value">
              {places.reduce((sum, p) => sum + p.score, 0).toFixed(0)}
            </span>
          </div>
          {lastUpdate && (
            <div className="stat-item">
              <span className="stat-label">Sist oppdatert:</span>
              <span className="stat-value">
                {lastUpdate.toLocaleTimeString('nb-NO')}
              </span>
            </div>
          )}
        </div>

        <div className="radius-control">
          <label htmlFor="radius-slider">
            Sirkelradius: <strong>{circleRadius} km</strong>
          </label>
          <input
            id="radius-slider"
            type="range"
            min="10"
            max="200"
            step="10"
            value={circleRadius}
            onChange={(e) => setCircleRadius(Number(e.target.value))}
            className="radius-slider"
          />
        </div>

        <div className="radius-control">
          <label htmlFor="gradient-slider">
            Gradientbredde: <strong>{gradientWidth} km</strong>
          </label>
          <input
            id="gradient-slider"
            type="range"
            min="10"
            max="300"
            step="10"
            value={gradientWidth}
            onChange={(e) => setGradientWidth(Number(e.target.value))}
            className="radius-slider"
          />
        </div>

        <div className="places-list">
          <h3>Steder med poeng:</h3>
          <div className="places-scroll">
            {places
              .sort((a, b) => b.score - a.score)
              .map((place, index) => (
                <div key={index} className="place-item">
                  <span className="place-name">{place.name}</span>
                  <span className="place-score">{place.score} poeng</span>
                </div>
              ))}
          </div>
        </div>

        {error && (
          <div className="warning-message">
            <small>Advarsel: {error}</small>
          </div>
        )}
      </div>

      <div className="map-panel">
        <PlacesMap
          weightedCenter={weightedCenter}
          circleRadius={circleRadius}
          convexHull={convexHull}
          gradientBuffers={gradientBuffers}
        />
      </div>
    </div>
  )
}

export default PlacesVisualization
