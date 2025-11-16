import { MapContainer, TileLayer, Marker, Popup, Circle, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import * as turf from '@turf/turf'

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Custom icon for weighted center
const centerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

function PlacesMap({ weightedCenter, circleRadius, convexHull, gradientBuffers }) {
  const mapRef = useRef()
  const [renderKey, setRenderKey] = useState(0)

  // Default view centered on Norway
  const defaultCenter = [60.472, 8.4689]
  const defaultZoom = 5

  useEffect(() => {
    // Fit map bounds to show convex hull or weighted center
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
        } else if (weightedCenter) {
          // Center on weighted mean
          map.setView([weightedCenter[1], weightedCenter[0]], 6)
        }
      } catch (error) {
        console.error('[PlacesMap] Error fitting bounds:', error)
      }
    }
  }, [convexHull, weightedCenter])

  useEffect(() => {
    // Force re-render when data changes
    setRenderKey(prev => prev + 1)
  }, [weightedCenter, circleRadius, convexHull, gradientBuffers])

  // Style for weighted center circle
  const circleOptions = {
    fillColor: '#ef4444',
    fillOpacity: 0.15,
    color: '#dc2626',
    weight: 2
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

        {/* Render weighted center circle */}
        {weightedCenter && (
          <>
            <Circle
              key={`circle-${renderKey}`}
              center={[weightedCenter[1], weightedCenter[0]]}
              radius={circleRadius * 1000} // Convert km to meters
              pathOptions={circleOptions}
            />
            <Marker
              key={`center-marker-${renderKey}`}
              position={[weightedCenter[1], weightedCenter[0]]}
              icon={centerIcon}
            >
              <Popup>
                <div>
                  <strong>Vektet geografisk snitt</strong>
                  <br />
                  Radius: {circleRadius} km
                  <br />
                  Koordinater: {weightedCenter[1].toFixed(4)}, {weightedCenter[0].toFixed(4)}
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>
    </div>
  )
}

export default PlacesMap
