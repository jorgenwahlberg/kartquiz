import React, { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Popup, Circle, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

function PlacesMap({ places, convexHull, gradientBuffers, changedPlaces, animationDuration }) {
  const mapRef = useRef()
  const [renderKey, setRenderKey] = useState(0)
  const [animationProgress, setAnimationProgress] = useState(0)

  // Default view centered on Norway
  const defaultCenter = [60.472, 8.4689]
  const defaultZoom = 5

  // Calculate circle radius based on score
  // Score 0 = 2000m (2km), higher scores scale proportionally
  const getCircleRadius = (score) => {
    if (score === 0) return 2000 // 2 km for score 0
    return 2000 + (score * 2000) // Each point adds 2 km
  }

  // Animate changed places - lightning flash effect
  useEffect(() => {
    if (!changedPlaces || changedPlaces.length === 0) {
      setAnimationProgress(0)
      return
    }

    console.log('[PlacesMap] Starting animation for', changedPlaces.length, 'changed places:',
                changedPlaces.map(p => `${p.name} (${p.changeType})`).join(', '))

    const startTime = Date.now()
    let animationFrame

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / animationDuration, 1)
      setAnimationProgress(progress)

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      } else {
        console.log('[PlacesMap] Animation complete')
        setAnimationProgress(0)
      }
    }

    animationFrame = requestAnimationFrame(animate)

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [changedPlaces, animationDuration])

  useEffect(() => {
    // Fit map bounds to show convex hull or all places
    if (mapRef.current) {
      const map = mapRef.current

      try {
        if (convexHull && convexHull.type === 'Polygon') {
          // Fit to convex hull
          const geoJsonLayer = L.geoJSON({
            type: 'Feature',
            geometry: convexHull
          })
          const bounds = geoJsonLayer.getBounds()
          if (bounds.isValid()) {
            console.log('[PlacesMap] Fitting bounds to convex hull')
            map.fitBounds(bounds, { padding: [100, 100] })
          }
        } else if (places && places.length > 0) {
          // Fit to all places
          const bounds = L.latLngBounds(
            places.map(place => [place.coordinates[1], place.coordinates[0]])
          )
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] })
          }
        }
      } catch (error) {
        console.error('[PlacesMap] Error fitting bounds:', error)
      }
    }
  }, [convexHull, places])

  useEffect(() => {
    // Force re-render when data changes
    setRenderKey(prev => prev + 1)
  }, [places, convexHull, gradientBuffers, changedPlaces, animationProgress])

  // Style for place circles - semi-transparent
  const getCircleStyle = (score) => ({
    fillColor: '#3b82f6',
    fillOpacity: 0.4,
    color: '#2563eb',
    weight: 2
  })

  // Lightning flash effect - pulsing with multiple waves
  const getLightningFlashStyle = (progress) => {
    // Create multiple flash pulses over the animation duration
    const pulseCount = 5
    const pulseFreq = pulseCount * Math.PI * 2
    const flashIntensity = Math.sin(progress * pulseFreq) * 0.5 + 0.5

    // Fade out over time
    const fadeOut = Math.pow(1 - progress, 0.5) // Slower fade using power curve

    console.log('[PlacesMap] Lightning flash - progress:', progress.toFixed(2),
                'intensity:', flashIntensity.toFixed(2), 'fadeOut:', fadeOut.toFixed(2))

    return {
      fillColor: '#ef4444', // Red color
      fillOpacity: Math.max(0.3, flashIntensity * fadeOut), // At least 30% visible
      color: '#dc2626', // Darker red border
      weight: 4,
      opacity: fadeOut
    }
  }

  // Expanding wave effect for change animation
  const getExpandingWaveRadius = (baseRadius, progress) => {
    // Create multiple expanding waves
    const waveCount = 3
    const waves = []

    for (let i = 0; i < waveCount; i++) {
      const waveDelay = i / waveCount
      const waveProgress = Math.max(0, (progress - waveDelay) / (1 - waveDelay))

      if (waveProgress > 0 && waveProgress < 1) {
        const expandFactor = 1 + (waveProgress * 5) // Expand to 6x size
        waves.push({
          radius: baseRadius * expandFactor,
          opacity: (1 - waveProgress) * 0.6
        })
      }
    }

    return waves
  }

  return (
    <div className="map-container">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Render gradient buffers (outer to inner for proper layering) */}
        {gradientBuffers && gradientBuffers.map((buffer, index) => (
          <GeoJSON
            key={`buffer-${index}-${renderKey}`}
            data={{
              type: 'Feature',
              geometry: buffer.geometry
            }}
            style={{
              fillColor: '#3b82f6',
              fillOpacity: 0.04,
              color: 'transparent',
              weight: 0
            }}
          />
        ))}

        {/* Render place circles sized by score */}
        {places && places.map((place, index) => (
          <Circle
            key={`place-circle-${index}-${renderKey}`}
            center={[place.coordinates[1], place.coordinates[0]]}
            radius={getCircleRadius(place.score)}
            pathOptions={getCircleStyle(place.score)}
          >
            <Popup>
              <div>
                <strong>{place.name}</strong>
                <br />
                Poeng: {place.score}
                <br />
                Koordinater: {place.coordinates[1].toFixed(4)}, {place.coordinates[0].toFixed(4)}
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Lightning flash animation for changed places */}
        {changedPlaces && changedPlaces.length > 0 && animationProgress > 0 && (
          <>
            {changedPlaces.map((changedPlace, index) => {
              const baseRadius = getCircleRadius(changedPlace.score)
              const waves = getExpandingWaveRadius(baseRadius, animationProgress)

              if (index === 0) {
                console.log('[PlacesMap] Rendering flash for', changedPlace.name,
                           'at', changedPlace.coordinates, 'radius:', baseRadius * 1.5)
              }

              return (
                <React.Fragment key={`change-animation-${index}-${renderKey}`}>
                  {/* Expanding wave rings */}
                  {waves.map((wave, waveIndex) => (
                    <Circle
                      key={`wave-${index}-${waveIndex}-${renderKey}`}
                      center={[changedPlace.coordinates[1], changedPlace.coordinates[0]]}
                      radius={wave.radius}
                      pathOptions={{
                        fillColor: '#ef4444',
                        fillOpacity: 0,
                        color: '#dc2626',
                        weight: 3,
                        opacity: wave.opacity
                      }}
                    />
                  ))}

                  {/* Central lightning flash - smaller red pulse */}
                  <Circle
                    key={`flash-${index}-${renderKey}`}
                    center={[changedPlace.coordinates[1], changedPlace.coordinates[0]]}
                    radius={baseRadius * 1.5} // 1.5x the base size
                    pathOptions={getLightningFlashStyle(animationProgress)}
                  />
                </React.Fragment>
              )
            })}
          </>
        )}
      </MapContainer>
    </div>
  )
}

export default PlacesMap
