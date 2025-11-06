import { useState, useEffect } from 'react'
import EuropeMap from './EuropeMap'
import { intersectPolygons, unionPolygons, getPolygonArea } from '../utils/polygonUtils'

function PolygonQuiz({ quizData }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState([])
  const [currentPolygons, setCurrentPolygons] = useState([])
  const [unionPolygonsState, setUnionPolygonsState] = useState([])
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    // Calculate both union and intersection of all selected polygons
    if (selectedAnswers.length > 0) {
      const polygons = selectedAnswers.map(answer => answer.polygon)

      console.log('=== Calculating geometries for', selectedAnswers.length, 'answers ===')
      console.log('Selected answers:', selectedAnswers.map(a => a.text))

      // Log individual polygon areas before operations
      console.log('Individual polygon areas:')
      selectedAnswers.forEach((answer, idx) => {
        const area = getPolygonArea(answer.polygon)
        console.log(`  ${idx + 1}. ${answer.text}: ${area.toFixed(2)} km²`)
      })

      const union = unionPolygons(polygons)
      const intersection = intersectPolygons(polygons)

      console.log('Union result:', union.length, 'polygon(s)')
      console.log('Intersection result:', intersection.length, 'polygon(s)')

      // Calculate total areas
      const unionArea = union.reduce((sum, poly) => sum + getPolygonArea(poly), 0)
      const intersectionArea = intersection.reduce((sum, poly) => sum + getPolygonArea(poly), 0)

      console.log('=== Area Summary ===')
      console.log('Union total area:', unionArea.toFixed(2), 'km²')
      console.log('Intersection total area:', intersectionArea.toFixed(2), 'km²')

      if (unionArea > 0 && intersectionArea > 0) {
        const reductionPercent = ((unionArea - intersectionArea) / unionArea * 100).toFixed(1)
        console.log('Area reduction:', reductionPercent + '%', '(narrowed down by', reductionPercent + '%)')
      }

      setUnionPolygonsState(union)
      setCurrentPolygons(intersection)
    } else {
      setUnionPolygonsState([])
      setCurrentPolygons([])
    }
  }, [selectedAnswers])

  const handleAnswerClick = (answer) => {
    // Add the selected answer to our list
    const newSelectedAnswers = [...selectedAnswers, answer]
    setSelectedAnswers(newSelectedAnswers)

    // Move to next question or complete quiz
    const nextIndex = currentQuestionIndex + 1
    if (nextIndex < quizData.questions.length) {
      setCurrentQuestionIndex(nextIndex)
    } else {
      setIsComplete(true)
    }
  }

  const restartQuiz = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswers([])
    setCurrentPolygons([])
    setIsComplete(false)
  }

  const goBack = () => {
    if (currentQuestionIndex > 0) {
      // Remove last answer and go back
      const newSelectedAnswers = selectedAnswers.slice(0, -1)
      setSelectedAnswers(newSelectedAnswers)
      setCurrentQuestionIndex(currentQuestionIndex - 1)
      setIsComplete(false)
    }
  }

  if (!quizData || !quizData.questions || quizData.questions.length === 0) {
    return <div className="quiz-error">Ingen quizdata tilgjengelig</div>
  }

  const currentQuestion = quizData.questions[currentQuestionIndex]

  if (isComplete) {
    const finalArea = currentPolygons.length > 0
      ? getPolygonArea(currentPolygons[0]).toFixed(2)
      : 0

    return (
      <div className="quiz-container complete">
        <div className="quiz-panel">
          <div className="quiz-complete">
            <h2>Quiz fullført!</h2>
            <p>Basert på dine svar er området innsnevret til:</p>

            <div className="selected-answers">
              {selectedAnswers.map((answer, index) => (
                <div key={index} className="selected-answer">
                  <strong>Q{index + 1}:</strong> {answer.text}
                </div>
              ))}
            </div>

            {currentPolygons.length > 0 ? (
              <div className="result-stats">
                <p>Resulterende område: {finalArea} km²</p>
              </div>
            ) : (
              <div className="no-intersection">
                <p>⚠️ Ingen gyldig region funnet med disse kriteriene!</p>
                <p>De valgte svarene overlapper ikke på kartet.</p>
              </div>
            )}

            <div className="quiz-actions">
              <button onClick={goBack} className="btn-secondary">
                Tilbake
              </button>
              <button onClick={restartQuiz} className="btn-primary">
                Start på nytt
              </button>
            </div>
          </div>
        </div>
        <div className="map-panel">
          <EuropeMap
            unionPolygons={unionPolygonsState}
            intersectionPolygons={currentPolygons}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="quiz-container">
      <div className="quiz-panel">
        <div className="quiz-header">
          <h1>{quizData.title}</h1>
          {quizData.description && (
            <p className="quiz-description">{quizData.description}</p>
          )}
        </div>

        <div className="quiz-progress">
          <span>Spørsmål {currentQuestionIndex + 1} av {quizData.questions.length}</span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((currentQuestionIndex + 1) / quizData.questions.length) * 100}%` }}
            />
          </div>
        </div>

        {selectedAnswers.length > 0 && (
          <div className="previous-answers">
            <h3>Dine svar så langt:</h3>
            {selectedAnswers.map((answer, index) => (
              <div key={index} className="previous-answer">
                <span className="answer-number">Q{index + 1}:</span>
                <span className="answer-text">{answer.text}</span>
              </div>
            ))}
          </div>
        )}

        <div className="quiz-question">
          <h2>{currentQuestion.question}</h2>
          <div className="quiz-answers">
            {currentQuestion.answers.map((answer, index) => (
              <button
                key={index}
                onClick={() => handleAnswerClick(answer)}
                className="answer-button"
              >
                {answer.text}
              </button>
            ))}
          </div>
        </div>

        {currentQuestionIndex > 0 && (
          <button onClick={goBack} className="btn-back">
            ← Tilbake
          </button>
        )}
      </div>

      <div className="map-panel">
        <EuropeMap
          unionPolygons={unionPolygonsState}
          intersectionPolygons={currentPolygons}
        />
        {currentPolygons.length > 0 && (
          <div className="map-info">
            Nåværende område: {getPolygonArea(currentPolygons[0]).toFixed(2)} km²
          </div>
        )}
        {currentPolygons.length === 0 && selectedAnswers.length > 0 && (
          <div className="map-info warning">
            Ingen overlapping funnet - prøv andre svar
          </div>
        )}
      </div>
    </div>
  )
}

export default PolygonQuiz
