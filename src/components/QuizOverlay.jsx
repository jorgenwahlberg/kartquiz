import { useState, useEffect } from 'react'
import './QuizOverlay.css'

function QuizOverlay({ questionData, onSubmitAnswer, isAuthenticated, onSignIn, onClose }) {
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset state when question changes
  useEffect(() => {
    setSelectedAnswer(null)
    setIsSubmitting(false)
  }, [questionData?.number]) // Reset when question number changes

  if (!questionData) return null

  const handleAnswerSelect = async (index) => {
    if (isSubmitting) return

    if (!isAuthenticated) {
      // User needs to sign in first
      alert('Vennligst logg inn med Google for å svare')
      onSignIn()
      return
    }

    setSelectedAnswer(index)
    setIsSubmitting(true)

    try {
      // Submit full answer text from alternatives
      const answerText = questionData.alternatives[index]
      await onSubmitAnswer(questionData.number, answerText)

      // Close overlay immediately after successful submission
      onClose()
    } catch (error) {
      console.error('[QuizOverlay] Error submitting answer:', error)
      alert('Kunne ikke lagre svaret. Prøv igjen.')
      setSelectedAnswer(null)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="quiz-overlay">
      <div className="quiz-overlay-content">
        <button onClick={onClose} className="btn-close-overlay" title="Lukk">
          ✕
        </button>

        {!isAuthenticated && (
          <div className="auth-warning">
            <p>⚠️ Du må logge inn med Google for å svare</p>
            <button onClick={onSignIn} className="btn-signin">
              Logg inn med Google
            </button>
          </div>
        )}

        <div className="quiz-question-number">
          Spørsmål {questionData.number}
        </div>

        <h2 className="quiz-question-text">
          {questionData.question}
        </h2>

        <div className="quiz-alternatives">
          {questionData.alternatives.map((alternative, index) => (
            <div
              key={index}
              className={`quiz-alternative ${selectedAnswer === index ? 'selected' : ''} ${isSubmitting ? 'disabled' : ''}`}
              onClick={() => handleAnswerSelect(index)}
              style={{ cursor: isAuthenticated && !isSubmitting ? 'pointer' : 'not-allowed' }}
            >
              <span className="alternative-letter">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="alternative-text">
                {alternative}
              </span>
              {selectedAnswer === index && <span className="checkmark">✓</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default QuizOverlay
