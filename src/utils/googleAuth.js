/**
 * Google OAuth and Sheets API utilities
 */

/**
 * Initialize Google API client
 * @param {Function} callback - Called when GAPI is ready
 */
export function initializeGapi(callback) {
  const script = document.createElement('script')
  script.src = 'https://apis.google.com/js/api.js'
  script.onload = () => {
    window.gapi.load('client', async () => {
      await window.gapi.client.init({
        apiKey: '', // Not needed for OAuth
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
      })
      console.log('[googleAuth] GAPI client initialized')
      callback()
    })
  }
  document.body.appendChild(script)
}

/**
 * Submit user's answer to Google Sheet
 * @param {string} sheetId - Google Sheets ID
 * @param {string} questionNumber - Question number
 * @param {string} userAnswer - User's answer (A, B, C, etc.)
 * @param {string} accessToken - OAuth access token
 * @returns {Promise<boolean>} - Success status
 */
export async function submitAnswerToSheet(sheetId, questionNumber, userAnswer, accessToken) {
  try {
    // Set the access token
    window.gapi.client.setToken({ access_token: accessToken })

    const range = 'Spørsmål og svar!A:Z'

    console.log('[googleAuth] Fetching sheet data to find question:', questionNumber)

    // First, find the row with the question number
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: range,
    })

    const rows = response.result.values
    let rowIndex = -1
    let answerColumnIndex = -1

    // Find header row to locate "Svar" column
    if (rows && rows.length > 0) {
      const headers = rows[0]
      answerColumnIndex = headers.findIndex(h => h === 'Svar')

      if (answerColumnIndex === -1) {
        throw new Error('Could not find "Svar" column in sheet')
      }

      console.log('[googleAuth] Found "Svar" column at index:', answerColumnIndex)
    }

    // Find the row with matching question number (Nr column is assumed to be first column)
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === questionNumber) {
        rowIndex = i + 1 // Sheets are 1-indexed
        break
      }
    }

    if (rowIndex === -1) {
      throw new Error(`Question number ${questionNumber} not found in sheet`)
    }

    console.log('[googleAuth] Found question at row:', rowIndex)

    // Convert column index to letter (0 = A, 1 = B, etc.)
    const columnLetter = String.fromCharCode(65 + answerColumnIndex)
    const updateRange = `Spørsmål og svar!${columnLetter}${rowIndex}`

    console.log('[googleAuth] Updating range:', updateRange, 'with value:', userAnswer)

    // Update the answer column
    await window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: updateRange,
      valueInputOption: 'RAW',
      resource: {
        values: [[userAnswer]]
      }
    })

    console.log('[googleAuth] ✓ Answer submitted successfully:', userAnswer)
    return true
  } catch (error) {
    console.error('[googleAuth] Error submitting answer:', error)
    throw error
  }
}
