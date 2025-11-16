import './QuizOverlay.css'

function QuizOverlay({ questionData }) {
  if (!questionData) return null

  return (
    <div className="quiz-overlay">
      <div className="quiz-overlay-content">
        <div className="quiz-question-number">
          Spørsmål {questionData.number}
        </div>

        <h2 className="quiz-question-text">
          {questionData.question}
        </h2>

        <div className="quiz-alternatives">
          {questionData.alternatives.map((alternative, index) => (
            <div key={index} className="quiz-alternative">
              <span className="alternative-letter">
                {String.fromCharCode(65 + index)}
              </span>
              <span className="alternative-text">
                {alternative}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default QuizOverlay
