import { useState, useEffect, useRef } from 'react'
import PlacesMap from './PlacesMap'
import { fetchSheetData, createGradientBuffers } from '../utils/sheetUtils'
import * as turf from '@turf/turf'

const SHEET_ID = '10SnSQIjUFzHz0zXi1TbXbescLkO4ZYqRXJncA7VROZI'
const SHEET_NAME = 'Resultater'
const REFRESH_INTERVAL = 10000 // 10 seconds
const GRADIENT_WIDTH = 250 // km - configurable gradient width
const ANIMATION_DURATION = 10000 // ms - duration of change animation

function PlacesVisualization() {
  const [places, setPlaces] = useState([])
  const previousPlacesRef = useRef([]) // Use ref to avoid closure issues
  const [changedPlaces, setChangedPlaces] = useState([])
  const [convexHull, setConvexHull] = useState(null)
  const [gradientBuffers, setGradientBuffers] = useState([])
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
      console.log('[PlacesVisualization] Previous places count:', previousPlacesRef.current.length)

      // Detect changes between previous and current data
      if (previousPlacesRef.current.length > 0) {
        console.log('[PlacesVisualization] Checking for changes...')
        const changes = []

        data.forEach(currentPlace => {
          const prevPlace = previousPlacesRef.current.find(p => p.name === currentPlace.name)

          if (!prevPlace) {
            // New place added
            console.log('[PlacesVisualization] New place:', currentPlace.name)
            changes.push({ ...currentPlace, changeType: 'new' })
          } else if (prevPlace.score !== currentPlace.score) {
            // Score changed
            console.log('[PlacesVisualization] Score changed for', currentPlace.name,
              'from', prevPlace.score, 'to', currentPlace.score)
            changes.push({
              ...currentPlace,
              changeType: 'updated',
              previousScore: prevPlace.score
            })
          } else {
            // No change for this place
            if (currentPlace.name === 'Oslo') {
              console.log('[PlacesVisualization] Oslo unchanged - prev:', prevPlace.score, 'current:', currentPlace.score)
            }
          }
        })

        // Check for removed places
        previousPlacesRef.current.forEach(prevPlace => {
          if (!data.find(p => p.name === prevPlace.name)) {
            console.log('[PlacesVisualization] Place removed:', prevPlace.name)
            changes.push({ ...prevPlace, changeType: 'removed' })
          }
        })

        if (changes.length > 0) {
          console.log('[PlacesVisualization] ✨ Total changes detected:', changes.length)
          console.log('[PlacesVisualization] Changes:', changes.map(c => `${c.name} (${c.changeType})`).join(', '))
          setChangedPlaces(changes)

          // Clear changed places after animation duration
          setTimeout(() => {
            console.log('[PlacesVisualization] Clearing changed places after animation')
            setChangedPlaces([])
          }, ANIMATION_DURATION)
        } else {
          console.log('[PlacesVisualization] No changes detected')
        }
      } else {
        console.log('[PlacesVisualization] Skipping change detection - first load or no previous data')
      }

      // Store current data for next comparison
      previousPlacesRef.current = data
      setPlaces(data)
      setLastUpdate(new Date())

      if (data.length > 0) {
        // Calculate convex hull only for places with score > 0
        const placesWithScore = data.filter(p => p.score > 0)
        console.log('[PlacesVisualization] Places with score > 0:', placesWithScore.length)

        if (placesWithScore.length >= 3) {
          const points = turf.featureCollection(
            placesWithScore.map(place => turf.point(place.coordinates))
          )
          const hull = turf.convex(points)
          console.log('[PlacesVisualization] Convex hull:', hull ? 'created' : 'failed')
          const hullGeometry = hull ? hull.geometry : null
          setConvexHull(hullGeometry)

          // Create gradient buffers
          if (hullGeometry) {
            const buffers = createGradientBuffers(hullGeometry, GRADIENT_WIDTH)
            console.log('[PlacesVisualization] Created', buffers.length, 'gradient buffers')
            setGradientBuffers(buffers)
          }
        } else if (placesWithScore.length === 2) {
          // For 2 points, create a line
          const line = turf.lineString(placesWithScore.map(p => p.coordinates))
          setConvexHull(line.geometry)
          setGradientBuffers([])
        } else {
          setConvexHull(null)
          setGradientBuffers([])
        }
      } else {
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
            <span className="stat-value">{places.filter(p => p.score > 0).length}</span>
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
          {changedPlaces.length > 0 && (
            <div className="stat-item">
              <span className="stat-label">Endringer:</span>
              <span className="stat-value" style={{ color: '#ef4444' }}>
                {changedPlaces.length} ⚡
              </span>
            </div>
          )}
        </div>

        <div className="places-list">
          <h3>Steder med poeng:</h3>
          <div className="places-scroll">
            {places
              .filter(p => p.score > 0)
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
          places={places.filter(p => p.score > 0)}
          convexHull={convexHull}
          gradientBuffers={gradientBuffers}
          changedPlaces={changedPlaces}
          animationDuration={ANIMATION_DURATION}
        />
      </div>
    </div>
  )
}

export default PlacesVisualization
