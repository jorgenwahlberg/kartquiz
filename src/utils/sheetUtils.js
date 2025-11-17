import * as turf from '@turf/turf'

/**
 * Parse CSV text to array of objects
 * Handles quoted fields correctly (e.g., "value1","value2")
 * @param {string} csv - CSV text
 * @returns {Array} - Array of row objects
 */
function parseCSV(csv) {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) return []

  // Parse a CSV line respecting quoted fields
  function parseLine(line) {
    const fields = []
    let currentField = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField.trim())
        currentField = ''
      } else {
        currentField += char
      }
    }
    fields.push(currentField.trim())
    return fields
  }

  const headers = parseLine(lines[0])
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i])
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    rows.push(row)
  }

  return rows
}

/**
 * Parse lat/lon string to coordinate array [lng, lat]
 * Supports formats: "lat,lon" or "lat, lon"
 * @param {string} latlon - Coordinate string
 * @returns {Array|null} - [longitude, latitude] or null if invalid
 */
export function parseLatLon(latlon) {
  if (!latlon || typeof latlon !== 'string') return null

  const parts = latlon.split(',').map(s => s.trim())
  if (parts.length !== 2) return null

  const lat = parseFloat(parts[0])
  const lon = parseFloat(parts[1])

  if (isNaN(lat) || isNaN(lon)) return null
  if (lat < -90 || lat > 90) return null
  if (lon < -180 || lon > 180) return null

  return [lon, lat] // GeoJSON format: [longitude, latitude]
}

/**
 * Fetch data from Google Sheets
 * @param {string} sheetId - Google Sheets ID
 * @param {string} sheetName - Sheet name/tab
 * @returns {Promise<Array>} - Array of place objects
 */
export async function fetchSheetData(sheetId, sheetName) {
  try {
    // Use Google Sheets CSV export URL
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`

    console.log('[fetchSheetData] Fetching from:', url)
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet data: ${response.status} ${response.statusText}`)
    }

    const csvText = await response.text()
    console.log('[fetchSheetData] Received CSV data:', csvText.substring(0, 200))

    const rows = parseCSV(csvText)
    console.log('[fetchSheetData] Parsed rows:', rows.length)

    // Transform rows to place objects
    const places = rows
      .map(row => {
        const coordinates = parseLatLon(row.Latlon)
        const score = parseFloat(row.Poeng)

        if (!coordinates || isNaN(score) || score < 0) {
          return null
        }

        return {
          name: row.Sted || 'Unknown',
          coordinates, // [lng, lat]
          score
        }
      })
      .filter(place => place !== null)

    console.log('[fetchSheetData] Valid places with scores:', places.length)
    return places
  } catch (error) {
    console.error('[fetchSheetData] Error fetching sheet data:', error)
    throw error
  }
}

/**
 * Calculate weighted geographic mean of places
 * @param {Array} places - Array of place objects with coordinates and scores
 * @returns {Array} - [longitude, latitude] of weighted center
 */
export function calculateWeightedMean(places) {
  if (!places || places.length === 0) return null

  let totalWeight = 0
  let weightedLon = 0
  let weightedLat = 0

  places.forEach(place => {
    const [lon, lat] = place.coordinates
    const weight = place.score

    weightedLon += lon * weight
    weightedLat += lat * weight
    totalWeight += weight
  })

  if (totalWeight === 0) return null

  return [weightedLon / totalWeight, weightedLat / totalWeight]
}

/**
 * Fetch all quiz questions with their answer status
 * @param {string} sheetId - Google Sheets ID
 * @returns {Promise<Array>} - Array of question objects with answer status
 */
export async function fetchAllQuizQuestions(sheetId) {
  try {
    // Fetch the "Spørsmål og svar" sheet
    const questionsUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Spørsmål og svar')}`
    console.log('[fetchAllQuizQuestions] Fetching questions from:', questionsUrl)

    const questionsResponse = await fetch(questionsUrl)
    if (!questionsResponse.ok) {
      throw new Error(`Failed to fetch questions: ${questionsResponse.status}`)
    }

    const questionsCSV = await questionsResponse.text()
    const questionRows = parseCSV(questionsCSV)

    // Fetch the "Svaralternativer" sheet
    const answersUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Svaralternativer')}`
    console.log('[fetchAllQuizQuestions] Fetching answers from:', answersUrl)

    const answersResponse = await fetch(answersUrl)
    if (!answersResponse.ok) {
      throw new Error(`Failed to fetch answers: ${answersResponse.status}`)
    }

    const answersCSV = await answersResponse.text()
    const answerRows = parseCSV(answersCSV)

    // Build array of all questions
    const questions = questionRows.map(row => {
      const questionNumber = row.Nr
      const questionText = row.Tekst || '' // Column is called "Tekst" not "Spørsmål"
      const userAnswer = row.Svar

      // Find all alternatives for this question
      const questionData = answerRows.filter(altRow => altRow.Nr === questionNumber)
      const alternatives = questionData
        .map(altRow => altRow.Alternativ)
        .filter(alt => alt && alt.trim().length > 0)

      // Check if answer exists and is not empty/whitespace
      const isAnswered = userAnswer !== undefined &&
                        userAnswer !== null &&
                        typeof userAnswer === 'string' &&
                        userAnswer.trim().length > 0

      return {
        number: questionNumber,
        question: questionText,
        alternatives: alternatives,
        answer: userAnswer || null, // User's answer if exists
        isAnswered: isAnswered
      }
    })

    // Filter out questions without text or alternatives
    const filteredQuestions = questions.filter(q => q.question && q.alternatives.length > 0)

    console.log('[fetchAllQuizQuestions] Loaded', filteredQuestions.length, 'questions')
    console.log('[fetchAllQuizQuestions] Answered:', filteredQuestions.filter(q => q.isAnswered).length)

    return filteredQuestions
  } catch (error) {
    console.error('[fetchAllQuizQuestions] Error:', error)
    return []
  }
}

/**
 * Get a specific question by number
 * @param {string} sheetId - Google Sheets ID
 * @param {string} questionNumber - Question number to fetch
 * @returns {Promise<Object|null>} - Question object or null
 */
export async function fetchQuestionByNumber(sheetId, questionNumber) {
  const allQuestions = await fetchAllQuizQuestions(sheetId)
  return allQuestions.find(q => q.number === questionNumber) || null
}

/**
 * Create gradient buffer layers around a polygon
 * @param {Object} polygon - GeoJSON polygon geometry
 * @param {number} gradientWidth - Total gradient width in kilometers
 * @param {number} steps - Number of gradient steps (default: 10)
 * @returns {Array} - Array of buffered polygon geometries with opacity values
 */
export function createGradientBuffers(polygon, gradientWidth, steps = 10) {
  if (!polygon || gradientWidth <= 0) return []

  const buffers = []

  try {
    // Create multiple buffer layers from outer to inner
    for (let i = steps; i >= 0; i--) {
      const distance = (gradientWidth * i) / steps
      const opacity = 1 - (i / steps) // Outer layers more transparent

      if (distance > 0) {
        const buffered = turf.buffer(polygon, distance, { units: 'kilometers' })
        if (buffered) {
          buffers.push({
            geometry: buffered.geometry,
            opacity: opacity * 0.3 // Scale opacity for better visuals
          })
        }
      } else {
        // Original polygon at full opacity
        buffers.push({
          geometry: polygon,
          opacity: 0.3
        })
      }
    }

    return buffers
  } catch (error) {
    console.error('[createGradientBuffers] Error creating buffers:', error)
    return []
  }
}
