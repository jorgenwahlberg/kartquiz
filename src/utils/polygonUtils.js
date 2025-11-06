import * as turf from '@turf/turf'

/**
 * Convert a polygon geometry to a Turf feature, handling multi-ring polygons
 * Multi-ring polygons are treated as a union of separate regions
 * @param {Object} polygonGeometry - GeoJSON polygon geometry
 * @returns {Object} - Turf feature (Polygon or MultiPolygon)
 */
function convertToTurfFeature(polygonGeometry) {
  const coords = polygonGeometry.coordinates

  // Check if this is a multi-ring polygon (union of regions)
  // If the first element of coordinates is an array of arrays, it's multi-ring
  if (coords.length > 1 && Array.isArray(coords[0][0]) && coords[0][0].length === 2) {
    // Multiple coordinate rings - union them together
    const polygons = coords.map(ring => turf.polygon([ring]))

    // Union all polygons together
    let result = polygons[0]
    for (let i = 1; i < polygons.length; i++) {
      const unioned = turf.union(turf.featureCollection([result, polygons[i]]))
      if (unioned) {
        result = unioned
      }
    }
    return result
  } else {
    // Single polygon ring
    return turf.polygon(coords)
  }
}

/**
 * Calculate the union of multiple polygons
 * @param {Array} polygons - Array of GeoJSON polygon geometries
 * @returns {Array} - Array of unioned polygon geometries
 */
export function unionPolygons(polygons) {
  if (!polygons || polygons.length === 0) {
    console.log('[unionPolygons] No polygons provided')
    return []
  }

  if (polygons.length === 1) {
    console.log('[unionPolygons] Single polygon, returning as-is')
    return [polygons[0]]
  }

  try {
    console.log('[unionPolygons] Unioning', polygons.length, 'polygons')

    // Start with the first polygon
    let result = convertToTurfFeature(polygons[0])
    console.log('[unionPolygons] First polygon type:', result.geometry.type)

    // Union with each subsequent polygon
    for (let i = 1; i < polygons.length; i++) {
      const nextPolygon = convertToTurfFeature(polygons[i])
      console.log('[unionPolygons] Adding polygon', i+1, 'type:', nextPolygon.geometry.type)

      const unioned = turf.union(turf.featureCollection([result, nextPolygon]))

      if (unioned) {
        result = unioned
        console.log('[unionPolygons] Union result type:', result.geometry.type)
      }
    }

    // Handle both Polygon and MultiPolygon results
    if (result.geometry.type === 'Polygon') {
      const poly = {
        type: 'Polygon',
        coordinates: result.geometry.coordinates
      }
      console.log('[unionPolygons] Returning single polygon')
      return [poly]
    } else if (result.geometry.type === 'MultiPolygon') {
      const polys = result.geometry.coordinates.map(coords => ({
        type: 'Polygon',
        coordinates: coords
      }))
      console.log('[unionPolygons] Returning', polys.length, 'polygons from MultiPolygon')
      return polys
    }

    return []
  } catch (error) {
    console.error('[unionPolygons] Error calculating polygon union:', error)
    return []
  }
}

/**
 * Calculate the intersection of multiple polygons
 * @param {Array} polygons - Array of GeoJSON polygon geometries
 * @returns {Array} - Array of intersected polygon geometries (may be multiple due to multipolygon results)
 */
export function intersectPolygons(polygons) {
  if (!polygons || polygons.length === 0) {
    console.log('[intersectPolygons] No polygons provided')
    return []
  }

  if (polygons.length === 1) {
    console.log('[intersectPolygons] Single polygon, returning as-is')
    return [polygons[0]]
  }

  try {
    console.log('[intersectPolygons] Intersecting', polygons.length, 'polygons')

    // Start with the first polygon (may be a union of regions)
    let result = convertToTurfFeature(polygons[0])
    console.log('[intersectPolygons] First polygon type:', result.geometry.type)

    // Intersect with each subsequent polygon
    for (let i = 1; i < polygons.length; i++) {
      const nextPolygon = convertToTurfFeature(polygons[i])
      console.log('[intersectPolygons] Intersecting with polygon', i+1, 'type:', nextPolygon.geometry.type)

      const intersection = turf.intersect(turf.featureCollection([result, nextPolygon]))

      if (!intersection) {
        console.log('[intersectPolygons] No intersection found')
        return []
      }

      result = intersection
      console.log('[intersectPolygons] Intersection result type:', result.geometry.type)
    }

    // Handle both Polygon and MultiPolygon results
    if (result.geometry.type === 'Polygon') {
      const poly = {
        type: 'Polygon',
        coordinates: result.geometry.coordinates
      }
      console.log('[intersectPolygons] Returning single polygon')
      return [poly]
    } else if (result.geometry.type === 'MultiPolygon') {
      const polys = result.geometry.coordinates.map(coords => ({
        type: 'Polygon',
        coordinates: coords
      }))
      console.log('[intersectPolygons] Returning', polys.length, 'polygons from MultiPolygon')
      return polys
    }

    return []
  } catch (error) {
    console.error('[intersectPolygons] Error calculating polygon intersection:', error)
    return []
  }
}

/**
 * Validate if a polygon is valid GeoJSON
 * @param {Object} polygon - GeoJSON polygon geometry
 * @returns {boolean}
 */
export function isValidPolygon(polygon) {
  try {
    if (!polygon || !polygon.type || !polygon.coordinates) {
      return false
    }

    if (polygon.type !== 'Polygon') {
      return false
    }

    // Try to create a turf polygon to validate structure
    turf.polygon(polygon.coordinates)
    return true
  } catch (error) {
    return false
  }
}

/**
 * Get the center point of a polygon
 * @param {Object} polygon - GeoJSON polygon geometry
 * @returns {Array} - [longitude, latitude]
 */
export function getPolygonCenter(polygon) {
  try {
    const turfPolygon = turf.polygon(polygon.coordinates)
    const center = turf.center(turfPolygon)
    return center.geometry.coordinates
  } catch (error) {
    console.error('Error calculating polygon center:', error)
    return [0, 0]
  }
}

/**
 * Calculate the area of a polygon in square kilometers
 * @param {Object} polygon - GeoJSON polygon geometry
 * @returns {number}
 */
export function getPolygonArea(polygon) {
  try {
    const turfPolygon = turf.polygon(polygon.coordinates)
    return turf.area(turfPolygon) / 1000000 // Convert from m² to km²
  } catch (error) {
    console.error('Error calculating polygon area:', error)
    return 0
  }
}
