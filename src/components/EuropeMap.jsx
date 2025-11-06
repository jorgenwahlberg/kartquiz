import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'

function EuropeMap({ unionPolygons, intersectionPolygons }) {
  const mapRef = useRef()
  const [renderKey, setRenderKey] = useState(0)

  // Default view centered on Europe
  const center = [54, 15]
  const zoom = 4

  useEffect(() => {
    // Fit map bounds to show intersection polygons (or union if no intersection)
    if (mapRef.current) {
      const map = mapRef.current
      const polygonsToFit = intersectionPolygons && intersectionPolygons.length > 0
        ? intersectionPolygons
        : unionPolygons

      console.log('[EuropeMap] Fitting bounds to:', polygonsToFit && polygonsToFit.length > 0 ? 'intersection' : 'union or default')

      if (polygonsToFit && polygonsToFit.length > 0) {
        try {
          // Create a feature collection to get bounds
          const geoJsonLayer = L.geoJSON({
            type: 'FeatureCollection',
            features: polygonsToFit.map(p => ({
              type: 'Feature',
              geometry: p
            }))
          })
          const bounds = geoJsonLayer.getBounds()
          if (bounds.isValid()) {
            const sw = bounds.getSouthWest()
            const ne = bounds.getNorthEast()
            const center = bounds.getCenter()
            console.log('[EuropeMap] Bounds details:')
            console.log('  Southwest:', `[${sw.lng.toFixed(2)}, ${sw.lat.toFixed(2)}]`)
            console.log('  Northeast:', `[${ne.lng.toFixed(2)}, ${ne.lat.toFixed(2)}]`)
            console.log('  Center:', `[${center.lng.toFixed(2)}, ${center.lat.toFixed(2)}]`)
            console.log('  BBox:', bounds.toBBoxString())
            map.fitBounds(bounds, { padding: [50, 50] })
          }
        } catch (error) {
          console.error('[EuropeMap] Error fitting bounds:', error)
        }
      }
    }
  }, [intersectionPolygons, unionPolygons])

  useEffect(() => {
    // Log polygon counts
    console.log('[EuropeMap] Rendering map with:')
    console.log('  - Union polygons:', unionPolygons ? unionPolygons.length : 0)
    console.log('  - Intersection polygons:', intersectionPolygons ? intersectionPolygons.length : 0)

    if (unionPolygons && unionPolygons.length > 0) {
      console.log('[EuropeMap] Union polygon details:')
      unionPolygons.forEach((poly, i) => {
        const coordCount = poly.coordinates[0] ? poly.coordinates[0].length : 0
        const ringCount = poly.coordinates.length
        console.log(`  Union ${i+1}: ${poly.type} with ${ringCount} ring(s), ${coordCount} coords in outer ring`)
        // Sample coordinates
        if (poly.coordinates[0] && poly.coordinates[0].length > 0) {
          const sampleCoords = poly.coordinates[0].slice(0, 3)
          console.log(`    Sample coords:`, sampleCoords)
        }
      })
    }

    if (intersectionPolygons && intersectionPolygons.length > 0) {
      console.log('[EuropeMap] Intersection polygon details:')
      intersectionPolygons.forEach((poly, i) => {
        const coordCount = poly.coordinates[0] ? poly.coordinates[0].length : 0
        const ringCount = poly.coordinates.length
        console.log(`  Intersection ${i+1}: ${poly.type} with ${ringCount} ring(s), ${coordCount} coords in outer ring`)
        // Sample coordinates
        if (poly.coordinates[0] && poly.coordinates[0].length > 0) {
          const sampleCoords = poly.coordinates[0].slice(0, 3)
          console.log(`    Sample coords:`, sampleCoords)
        }
      })
    }

    // Force re-render of GeoJSON components when polygons change
    setRenderKey(prev => prev + 1)
  }, [unionPolygons, intersectionPolygons])

  // Style for union polygons (gray fill, black border)
  const unionStyle = {
    fillColor: '#cccccc',
    fillOpacity: 0.3,
    color: '#000000',
    weight: 2
  }

  // Style for intersection polygons (green fill, green border)
  const intersectionStyle = {
    fillColor: '#22c55e',
    fillOpacity: 0.5,
    color: '#16a34a',
    weight: 3
  }

  return (
    <div className="map-container">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Render union polygons first (background layer) */}
        {unionPolygons && unionPolygons.map((polygon, index) => (
          <GeoJSON
            key={`union-${index}-${renderKey}`}
            data={{
              type: 'Feature',
              geometry: polygon
            }}
            style={unionStyle}
          />
        ))}

        {/* Render intersection polygons on top */}
        {intersectionPolygons && intersectionPolygons.map((polygon, index) => (
          <GeoJSON
            key={`intersection-${index}-${renderKey}`}
            data={{
              type: 'Feature',
              geometry: polygon
            }}
            style={intersectionStyle}
            pane="overlayPane"
          />
        ))}
      </MapContainer>
    </div>
  )
}

export default EuropeMap
