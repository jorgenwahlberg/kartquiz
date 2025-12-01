import { useState, useEffect, useRef } from 'react'
import PlacesMap from './PlacesMap'
import QuizOverlay from './QuizOverlay'
import SurpriseOverlay from './SurpriseOverlay'
import VideoOverlay from './VideoOverlay'
import { createGradientBuffers } from '../utils/sheetUtils'
import { calculateScores } from '../utils/scoreCalculator'
import { saveAnswer, clearAllAnswers, isAnswered, getAnsweredCount } from '../utils/answerStorage'
import questionsData from '../data/questions.json'
import * as turf from '@turf/turf'
import sverreImage from '../gfx/sverre.jpg'
import dawnMusic from '../sound/dawn.aac'
import guriVinnerVideo from '../gfx/guri-vinner.mp4'
import guriUavgjortVideo from '../gfx/guri-uavgjort.mp4'

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
  const [allQuestions, setAllQuestions] = useState(questionsData)
  const [activeQuestion, setActiveQuestion] = useState(null)
  const [showQuizOverlay, setShowQuizOverlay] = useState(false)
  const [boundingBoxPlaces, setBoundingBoxPlaces] = useState(null) // null means use all places
  const [showSplash, setShowSplash] = useState(true)
  const [showSurprise, setShowSurprise] = useState(false)
  const [surpriseShown, setSurpriseShown] = useState(false) // Track if surprise has been shown
  const [showVideo, setShowVideo] = useState(false)
  const splashAudioRef = useRef(null)

  // Play splash screen music
  useEffect(() => {
    if (showSplash) {
      // Create and play audio when splash is shown
      if (!splashAudioRef.current) {
        splashAudioRef.current = new Audio(dawnMusic)
        splashAudioRef.current.volume = 0.6
        splashAudioRef.current.loop = false
      }

      // Try to play (may be blocked by browser)
      splashAudioRef.current.play().catch(err => {
        console.log('[PlacesVisualization] Splash audio autoplay blocked:', err)
      })
    } else {
      // Stop and clean up audio when splash is hidden
      if (splashAudioRef.current) {
        splashAudioRef.current.pause()
        splashAudioRef.current.currentTime = 0
      }
    }

    // Cleanup on unmount
    return () => {
      if (splashAudioRef.current) {
        splashAudioRef.current.pause()
        splashAudioRef.current = null
      }
    }
  }, [showSplash])

  const loadData = () => {
    try {
      setLoading(true)
      setError(null)

      console.log('[PlacesVisualization] Calculating scores from localStorage...')
      const data = calculateScores()

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

  const loadAllQuestions = () => {
    // Questions are loaded from local JSON
    // Check if any questions are answered - if so, hide splash screen
    const hasAnsweredQuestions = getAnsweredCount() > 0
    if (hasAnsweredQuestions) {
      setShowSplash(false)
    }
    console.log('[PlacesVisualization] Questions loaded from local JSON:', questionsData.length)
  }

  // Find next unanswered question
  const getNextUnansweredQuestion = () => {
    return allQuestions.find(q => !isAnswered(q.number)) || null
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

    // After reloading, check if we should show the surprise
    // (This will be checked in a useEffect after allQuestions is updated)
  }

  // Check if we should show the surprise (after second-to-last question is answered)
  // Runs on places update since that changes when answers are saved
  useEffect(() => {
    if (allQuestions.length === 0 || surpriseShown) return

    const answeredCount = getAnsweredCount()
    const totalQuestions = allQuestions.length

    // Show surprise if exactly the second-to-last question was just answered
    if (answeredCount === totalQuestions - 1 && !surpriseShown) {
      console.log('[PlacesVisualization] Second-to-last question answered! Showing surprise...')
      setShowSurprise(true)
      setSurpriseShown(true)
    }
  }, [places, allQuestions, surpriseShown])

  // Handle answer submission
  const handleSubmitAnswer = (questionNumber, answerLetter) => {
    console.log('[PlacesVisualization] Submitting answer:', answerLetter, 'for question:', questionNumber)
    saveAnswer(questionNumber, answerLetter)

    // Reload data to update scores
    loadData()
  }

  // Handle reset answers
  const handleResetAnswers = () => {
    const confirmed = window.confirm('Er du sikker på at du vil nullstille alle svar? Dette kan ikke angres.')
    if (!confirmed) {
      return
    }

    try {
      console.log('[PlacesVisualization] Resetting all answers')
      clearAllAnswers()
      // Reload data to reflect changes
      loadData()
      loadAllQuestions()
      // Reset surprise state
      setSurpriseShown(false)
      setShowSurprise(false)
      alert('Alle svar er nullstilt!')
    } catch (error) {
      console.error('[PlacesVisualization] Error resetting answers:', error)
      alert('Kunne ikke nullstille svar. Prøv igjen.')
    }
  }

  // Handle closing surprise (confetti) - just goes back to map view
  const handleContinueFromSurprise = () => {
    setShowSurprise(false)
  }

  // Determine which video to show based on leading places
  const getVideoSource = () => {
    if (!places || places.length === 0) return guriVinnerVideo

    // Filter places with score > 0
    const scoredPlaces = places.filter(p => p.score > 0)
    if (scoredPlaces.length === 0) return guriVinnerVideo

    // Find the highest score
    const maxScore = Math.max(...scoredPlaces.map(p => p.score))

    // Get all places with the highest score
    const leadingPlaces = scoredPlaces.filter(p => p.score === maxScore)

    // If only one place in first place, use vinner video
    // If two or more places tied for first, use uavgjort video
    return leadingPlaces.length === 1 ? guriVinnerVideo : guriUavgjortVideo
  }

  // Handle opening video overlay
  const handleOpenVideo = () => {
    setShowVideo(true)
  }

  // Handle closing video overlay
  const handleCloseVideo = () => {
    setShowVideo(false)
  }

  // Handle continuing from video to last question
  const handleContinueFromVideo = () => {
    setShowVideo(false)
    // Open the last (unanswered) question
    const lastQuestion = allQuestions.find(q => !isAnswered(q.number))
    if (lastQuestion) {
      setActiveQuestion(lastQuestion)
      setShowQuizOverlay(true)
    }
  }

  // Keyboard shortcut: "n" to open next question in map view
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Only trigger if quiz overlay, surprise, and video are not showing and not typing in an input/select
      if (showQuizOverlay || showSurprise || showVideo || event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT') {
        return
      }

      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault()
        handleOpenQuiz()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [showQuizOverlay, showSurprise, showVideo, allQuestions]) // Re-attach listener when these change

  // Load data on mount
  useEffect(() => {
    loadData()
    loadAllQuestions()
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

  // Handle splash screen click - play audio and close
  const handleSplashClick = () => {
    // Try to play audio if blocked by autoplay
    if (splashAudioRef.current && splashAudioRef.current.paused) {
      splashAudioRef.current.play().catch(err => {
        console.log('[PlacesVisualization] Could not play splash audio:', err)
      })
    }
    setShowSplash(false)
  }

  return (
    <div className="visualization-container">
      {showSplash && (
        <div className="splash-screen" onClick={handleSplashClick}>
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
                    {isAnswered(q.number) ? ' ✓' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Show video button if confetti has been shown and only 1 question left */}
          {surpriseShown && allQuestions.filter(q => !isAnswered(q.number)).length === 1 && (
            <button onClick={handleOpenVideo} className="btn-video">
              🎬 Se videoen!
            </button>
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
          onClose={handleCloseQuiz}
        />
      )}

      {showSurprise && (
        <SurpriseOverlay
          onContinue={handleContinueFromSurprise}
          places={places}
        />
      )}

      {showVideo && (
        <VideoOverlay
          onContinue={handleContinueFromVideo}
          onClose={handleCloseVideo}
          videoSrc={getVideoSource()}
        />
      )}
    </div>
  )
}

export default PlacesVisualization
