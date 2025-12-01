import { useState, useEffect } from 'react'
import './QuizOverlay.css'

function QuizOverlay({ questionData, onSubmitAnswer, onClose }) {
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset state when question changes
  useEffect(() => {
    setSelectedAnswer(null)
    setIsSubmitting(false)
  }, [questionData?.number]) // Reset when question number changes

  // Keyboard shortcuts for selecting alternatives (A, B, C, etc.) and ESC to close
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (!questionData) return

      // ESC key to close overlay
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (isSubmitting) return

      // Convert key to uppercase
      const key = event.key.toUpperCase()

      // Check if it's a letter key (A-Z)
      if (key.length === 1 && key >= 'A' && key <= 'Z') {
        // Find alternative with matching letter
        const alternative = questionData.alternatives.find(alt => alt.letter.toUpperCase() === key)

        if (alternative) {
          event.preventDefault()
          handleAnswerSelect(alternative.letter)
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isSubmitting, questionData, onClose])

  if (!questionData) return null

  const handleAnswerSelect = async (answerLetter) => {
    if (isSubmitting) return

    setSelectedAnswer(answerLetter)
    setIsSubmitting(true)

    try {
      // Show selected state briefly (300ms) for visual feedback before closing
      await new Promise(resolve => setTimeout(resolve, 300))

      onSubmitAnswer(questionData.number, answerLetter)

      // Close overlay after successful submission
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

        <div className="quiz-question-number">
          Spørsmål {questionData.number}
        </div>

        <h2 className="quiz-question-text">
          {questionData.question}
        </h2>

        <div className="quiz-alternatives">
          {questionData.alternatives.map((alternative) => (
            <div
              key={alternative.letter}
              className={`quiz-alternative ${selectedAnswer === alternative.letter ? 'selected' : ''} ${isSubmitting ? 'disabled' : ''}`}
              onClick={() => handleAnswerSelect(alternative.letter)}
              style={{ cursor: !isSubmitting ? 'pointer' : 'not-allowed' }}
            >
              <span className="alternative-letter">
                {alternative.letter.toUpperCase()}
              </span>
              <span className="alternative-text">
                {alternative.text}
              </span>
              {selectedAnswer === alternative.letter && <span className="checkmark">✓</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default QuizOverlay
