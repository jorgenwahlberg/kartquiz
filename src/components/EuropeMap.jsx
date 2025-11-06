import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'

function EuropeMap({ unionPolygons, intersectionPolygons }) {
  const mapRef = useRef()

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
            console.log('[EuropeMap] Bounds:', bounds.toBBoxString())
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
        console.log(`    Union ${i+1}:`, poly.type, 'with', poly.coordinates.length, 'ring(s)')
      })
    }

    if (intersectionPolygons && intersectionPolygons.length > 0) {
      console.log('[EuropeMap] Intersection polygon details:')
      intersectionPolygons.forEach((poly, i) => {
        console.log(`    Intersection ${i+1}:`, poly.type, 'with', poly.coordinates.length, 'ring(s)')
      })
    }
  }, [unionPolygons, intersectionPolygons])

  // Style for union polygons (gray fill, black border)
  const unionStyle = {
    fillColor: '#cccccc',
    fillOpacity: 0.3,
    color: '#000000',
    weight: 2
  }

  // Style for intersection polygons (blue fill, blue border)
  const intersectionStyle = {
    fillColor: '#3388ff',
    fillOpacity: 0.5,
    color: '#3388ff',
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
            key={`union-${index}`}
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
            key={`intersection-${index}`}
            data={{
              type: 'Feature',
              geometry: polygon
            }}
            style={intersectionStyle}
          />
        ))}
      </MapContainer>
    </div>
  )
}

export default EuropeMap
