import { useState, useEffect, useRef } from 'react'
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'
import PlacesMap from './PlacesMap'
import QuizOverlay from './QuizOverlay'
import { fetchSheetData, createGradientBuffers, fetchAllQuizQuestions, fetchQuestionByNumber } from '../utils/sheetUtils'
import { initializeGapi, submitAnswerToSheet, resetAllAnswers } from '../utils/googleAuth'
import * as turf from '@turf/turf'
import sverreImage from '../gfx/sverre.jpg'

const SHEET_ID = '10SnSQIjUFzHz0zXi1TbXbescLkO4ZYqRXJncA7VROZI'
const SHEET_NAME = 'Resultater'
const REFRESH_INTERVAL = 10000 // 10 seconds
const GRADIENT_WIDTH = 250 // km - configurable gradient width
const ANIMATION_DURATION = 10000 // ms - duration of change animation
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

function PlacesVisualizationInner() {
  const [places, setPlaces] = useState([])
  const previousPlacesRef = useRef([]) // Use ref to avoid closure issues
  const [changedPlaces, setChangedPlaces] = useState([])
  const [convexHull, setConvexHull] = useState(null)
  const [gradientBuffers, setGradientBuffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [allQuestions, setAllQuestions] = useState([])
  const [activeQuestion, setActiveQuestion] = useState(null)
  const [showQuizOverlay, setShowQuizOverlay] = useState(false)
  const [accessToken, setAccessToken] = useState(null)
  const [gapiReady, setGapiReady] = useState(false)
  const [boundingBoxPlaces, setBoundingBoxPlaces] = useState(null) // null means use all places
  const [showSplash, setShowSplash] = useState(true)

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
            // Check if place went from 0 to having points (appearing on map)
            const isNewlyAppearing = prevPlace.score === 0 && currentPlace.score > 0

            // Score changed
            console.log('[PlacesVisualization] Score changed for', currentPlace.name,
              'from', prevPlace.score, 'to', currentPlace.score,
              isNewlyAppearing ? '(NEWLY APPEARING)' : '')
            changes.push({
              ...currentPlace,
              changeType: isNewlyAppearing ? 'new' : 'updated',
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

  const loadAllQuestions = async () => {
    try {
      const questions = await fetchAllQuizQuestions(SHEET_ID)
      setAllQuestions(questions)
      console.log('[PlacesVisualization] Loaded', questions.length, 'questions')

      // Check if any questions are answered - if so, hide splash screen
      const hasAnsweredQuestions = questions.some(q => q.isAnswered)
      if (hasAnsweredQuestions) {
        setShowSplash(false)
      }
    } catch (err) {
      console.error('[PlacesVisualization] Error loading quiz questions:', err)
    }
  }

  // Find next unanswered question
  const getNextUnansweredQuestion = () => {
    return allQuestions.find(q => !q.isAnswered) || null
  }

  // Open quiz with next unanswered question
  const handleOpenQuiz = () => {
    const nextQuestion = getNextUnansweredQuestion()
    if (nextQuestion) {
      setActiveQuestion(nextQuestion)
      setShowQuizOverlay(true)
    } else {
      alert('Alle spørsmål er besvart!')
    }
  }

  // Open specific question
  const handleSelectQuestion = (questionNumber) => {
    const question = allQuestions.find(q => q.number === questionNumber)
    if (question) {
      setActiveQuestion(question)
      setShowQuizOverlay(true)
    }
  }

  // Close quiz overlay and refresh data
  const handleCloseQuiz = () => {
    setShowQuizOverlay(false)
    setActiveQuestion(null)
    // Reload map data and questions immediately
    loadData()
    loadAllQuestions()
  }

  // Initialize Google API client on mount
  useEffect(() => {
    initializeGapi(() => {
      console.log('[PlacesVisualization] GAPI initialized')
      setGapiReady(true)
    })
  }, [])

  // Google OAuth login
  const login = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      console.log('[PlacesVisualization] OAuth login successful')
      setAccessToken(tokenResponse.access_token)
    },
    onError: (error) => {
      console.error('[PlacesVisualization] OAuth login failed:', error)
      alert('Kunne ikke logge inn. Prøv igjen.')
    },
    scope: 'https://www.googleapis.com/auth/spreadsheets'
  })

  // Handle answer submission
  const handleSubmitAnswer = async (questionNumber, answer) => {
    if (!accessToken || !gapiReady) {
      throw new Error('Not authenticated or GAPI not ready')
    }

    console.log('[PlacesVisualization] Submitting answer:', answer, 'for question:', questionNumber)
    await submitAnswerToSheet(SHEET_ID, questionNumber, answer, accessToken)

    // Reload questions to update answer status
    await loadAllQuestions()
  }

  // Handle reset answers
  const handleResetAnswers = async () => {
    if (!accessToken || !gapiReady) {
      alert('Du må logge inn først for å nullstille svar.')
      return
    }

    const confirmed = window.confirm('Er du sikker på at du vil nullstille alle svar? Dette kan ikke angres.')
    if (!confirmed) {
      return
    }

    try {
      console.log('[PlacesVisualization] Resetting all answers')
      await resetAllAnswers(SHEET_ID, accessToken)
      // Reload data and questions to reflect changes
      await loadData()
      await loadAllQuestions()
      alert('Alle svar er nullstilt!')
    } catch (error) {
      console.error('[PlacesVisualization] Error resetting answers:', error)
      alert('Kunne ikke nullstille svar. Prøv igjen.')
    }
  }

  // Load data on mount and set up refresh interval
  useEffect(() => {
    loadData()
    loadAllQuestions()

    const interval = setInterval(() => {
      console.log('[PlacesVisualization] Auto-refreshing data...')
      loadData()
      loadAllQuestions()
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
      {showSplash && (
        <div className="splash-screen" onClick={() => setShowSplash(false)}>
          <div className="splash-content">
            <h1>Sverres reisequiz!</h1>
            <img src={sverreImage} alt="Sverre" className="splash-image" />
            <p className="splash-instruction">Klikk for å starte</p>
          </div>
        </div>
      )}

      <div className="control-panel">
        <div className="header">
          <h1>Kor ska vi reis?</h1>
          <p className="description"></p>
        </div>

        <div className="quiz-controls">
          <button onClick={handleOpenQuiz} className="btn-quiz">
            📝 Spørsmål {getNextUnansweredQuestion()?.number || '✓'}
          </button>

          {allQuestions.length > 0 && (
            <div className="question-selector">
              <label htmlFor="question-select"></label>
              <select
                id="question-select"
                onChange={(e) => handleSelectQuestion(e.target.value)}
                value=""
              >
                <option value="">-- Velg et spørsmål --</option>
                {allQuestions.map((q) => (
                  <option key={q.number} value={q.number}>
                    {q.number}. {q.question.substring(0, 50)}{q.question.length > 50 ? '...' : ''}
                    {q.isAnswered ? ' ✓' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="places-list">
          <h3>Resultatliste:</h3>
          <div className="places-scroll">
            {places
              .filter(p => p.score > 0)
              .sort((a, b) => b.score - a.score)
              .map((place, index) => {
                const isChanged = changedPlaces.some(cp => cp.name === place.name)
                return (
                  <div key={index} className={`place-item ${isChanged ? 'place-changed' : ''}`}>
                    <span className="place-name">{place.name}</span>
                    <span className="place-score">{place.score} poeng</span>
                  </div>
                )
              })}
          </div>
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

        <div className="bounding-box-control">
          <label htmlFor="bounding-box-slider">
            Antall steder for kartvisning: {boundingBoxPlaces === null ? places.filter(p => p.score > 0).length : boundingBoxPlaces}
          </label>
          <input
            id="bounding-box-slider"
            type="range"
            min="1"
            max={Math.max(1, places.filter(p => p.score > 0).length)}
            value={boundingBoxPlaces === null ? places.filter(p => p.score > 0).length : boundingBoxPlaces}
            onChange={(e) => setBoundingBoxPlaces(parseInt(e.target.value))}
            className="bounding-box-slider"
          />
        </div>

        <div className="reset-control">
          <button onClick={handleResetAnswers} className="btn-reset">
            Start på nytt
          </button>
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
          boundingBoxPlaces={boundingBoxPlaces}
        />
      </div>

      {showQuizOverlay && (
        <QuizOverlay
          questionData={activeQuestion}
          onSubmitAnswer={handleSubmitAnswer}
          isAuthenticated={!!accessToken}
          onSignIn={() => login()}
          onClose={handleCloseQuiz}
        />
      )}
    </div>
  )
}

function PlacesVisualization() {
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <PlacesVisualizationInner />
    </GoogleOAuthProvider>
  )
}

export default PlacesVisualization
