import { describe, it, expect } from 'vitest'
import { intersectPolygons, isValidPolygon, getPolygonArea } from './polygonUtils'

describe('polygonUtils', () => {
  describe('isValidPolygon', () => {
    it('should validate a correct polygon', () => {
      const polygon = {
        type: 'Polygon',
        coordinates: [[
          [0, 0], [10, 0], [10, 10], [0, 10], [0, 0]
        ]]
      }
      expect(isValidPolygon(polygon)).toBe(true)
    })

    it('should reject invalid polygon', () => {
      expect(isValidPolygon(null)).toBe(false)
      expect(isValidPolygon({})).toBe(false)
      expect(isValidPolygon({ type: 'Point' })).toBe(false)
    })
  })

  describe('intersectPolygons', () => {
    it('should return single polygon when only one provided', () => {
      const polygon = {
        type: 'Polygon',
        coordinates: [[
          [0, 0], [10, 0], [10, 10], [0, 10], [0, 0]
        ]]
      }
      const result = intersectPolygons([polygon])
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(polygon)
    })

    it('should intersect two overlapping squares', () => {
      const polygon1 = {
        type: 'Polygon',
        coordinates: [[
          [0, 0], [10, 0], [10, 10], [0, 10], [0, 0]
        ]]
      }
      const polygon2 = {
        type: 'Polygon',
        coordinates: [[
          [5, 5], [15, 5], [15, 15], [5, 15], [5, 5]
        ]]
      }

      const result = intersectPolygons([polygon1, polygon2])
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('Polygon')

      // The intersection should be the overlapping square [5,5] to [10,10]
      const area = getPolygonArea(result[0])
      expect(area).toBeGreaterThan(0)
    })

    it('should return empty array for non-overlapping polygons', () => {
      const polygon1 = {
        type: 'Polygon',
        coordinates: [[
          [0, 0], [5, 0], [5, 5], [0, 5], [0, 0]
        ]]
      }
      const polygon2 = {
        type: 'Polygon',
        coordinates: [[
          [10, 10], [15, 10], [15, 15], [10, 15], [10, 10]
        ]]
      }

      const result = intersectPolygons([polygon1, polygon2])
      expect(result).toHaveLength(0)
    })

    it('should intersect Tog and Rødvin from quiz', () => {
      // Exact coordinates from europeQuiz.json
      const tog = {
        type: 'Polygon',
        coordinates: [[
          [-10, 71], [50, 71], [50, 35], [-10, 35], [-10, 71]
        ]]
      }
      const rodvin = {
        type: 'Polygon',
        coordinates: [[
          [-10, 71], [18, 71], [18, 36], [-10, 36], [-10, 71]
        ]]
      }

      const result = intersectPolygons([tog, rodvin])
      console.log('Tog + Rødvin intersection result:', result)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].type).toBe('Polygon')

      const area = getPolygonArea(result[0])
      console.log('Intersection area:', area, 'km²')
      expect(area).toBeGreaterThan(0)

      // Should be a large area covering Western Europe
      expect(area).toBeGreaterThan(1000000) // At least 1 million km²
    })

    it('should handle multi-ring polygon union (Snøscooter: Northern Scandinavia OR Barcelona)', () => {
      // Snøscooter has multiple regions (union)
      const snoscooterMultiRing = {
        type: 'Polygon',
        coordinates: [
          [[10, 71], [31, 71], [31, 65], [10, 65], [10, 71]], // Northern Scandinavia
          [[1.5, 42], [3, 42], [3, 40.5], [1.5, 40.5], [1.5, 42]] // Barcelona area
        ]
      }
      const rodvin = {
        type: 'Polygon',
        coordinates: [[
          [-10, 71], [18, 71], [18, 36], [-10, 36], [-10, 71]
        ]]
      }

      console.log('Testing multi-ring Snøscooter polygon (2 regions)')

      const result = intersectPolygons([snoscooterMultiRing, rodvin])
      console.log('Multi-ring Snøscooter + Rødvin intersection result:', result)

      // Should have intersections with both regions
      expect(result.length).toBeGreaterThan(0)

      // Calculate total area
      const totalArea = result.reduce((sum, poly) => sum + getPolygonArea(poly), 0)
      console.log('Total intersection area:', totalArea, 'km²')

      // Should have area in Northern Scandinavia (main region)
      expect(totalArea).toBeGreaterThan(0)
    })

    it('should intersect Snøscooter (single ring) and Rødvin from quiz', () => {
      // Single ring version for comparison
      const snoscooter = {
        type: 'Polygon',
        coordinates: [[
          [10, 71], [31, 71], [31, 65], [10, 65], [10, 71]
        ]]
      }
      const rodvin = {
        type: 'Polygon',
        coordinates: [[
          [-10, 71], [18, 71], [18, 36], [-10, 36], [-10, 71]
        ]]
      }

      const result = intersectPolygons([snoscooter, rodvin])
      console.log('Single-ring Snøscooter + Rødvin intersection area:',
        result.length > 0 ? getPolygonArea(result[0]).toFixed(2) + ' km²' : '0')

      expect(result.length).toBeGreaterThan(0)
      expect(result[0].type).toBe('Polygon')

      const area = getPolygonArea(result[0])
      // The intersection should be roughly [10, 71] to [18, 65]
      // which is Northern Norway/Sweden
      expect(area).toBeGreaterThan(100000) // At least 100,000 km²
      expect(area).toBeLessThan(500000) // Less than 500,000 km²
    })

    it('should handle three polygon intersection', () => {
      const polygon1 = {
        type: 'Polygon',
        coordinates: [[
          [0, 0], [20, 0], [20, 20], [0, 20], [0, 0]
        ]]
      }
      const polygon2 = {
        type: 'Polygon',
        coordinates: [[
          [5, 5], [25, 5], [25, 25], [5, 25], [5, 5]
        ]]
      }
      const polygon3 = {
        type: 'Polygon',
        coordinates: [[
          [10, 10], [30, 10], [30, 30], [10, 30], [10, 10]
        ]]
      }

      const result = intersectPolygons([polygon1, polygon2, polygon3])
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('Polygon')

      // The intersection should be [10,10] to [20,20]
      const area = getPolygonArea(result[0])
      expect(area).toBeGreaterThan(0)
    })
  })

  describe('getPolygonArea', () => {
    it('should calculate area of a square', () => {
      // A 10x10 degree square (rough approximation)
      const polygon = {
        type: 'Polygon',
        coordinates: [[
          [0, 0], [10, 0], [10, 10], [0, 10], [0, 0]
        ]]
      }
      const area = getPolygonArea(polygon)
      expect(area).toBeGreaterThan(0)
    })
  })
})
