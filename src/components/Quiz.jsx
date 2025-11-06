import { useState } from 'react'

function Quiz({ questions }) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [showScore, setShowScore] = useState(false)

  const handleAnswerClick = (isCorrect) => {
    if (isCorrect) {
      setScore(score + 1)
    }

    const nextQuestion = currentQuestion + 1
    if (nextQuestion < questions.length) {
      setCurrentQuestion(nextQuestion)
    } else {
      setShowScore(true)
    }
  }

  const restartQuiz = () => {
    setCurrentQuestion(0)
    setScore(0)
    setShowScore(false)
  }

  if (!questions || questions.length === 0) {
    return <div>No questions available</div>
  }

  if (showScore) {
    return (
      <div className="quiz-complete">
        <h2>Quiz Complete!</h2>
        <p>
          You scored {score} out of {questions.length}
        </p>
        <button onClick={restartQuiz}>Restart Quiz</button>
      </div>
    )
  }

  const question = questions[currentQuestion]

  return (
    <div className="quiz">
      <div className="quiz-progress">
        Question {currentQuestion + 1} of {questions.length}
      </div>
      <div className="quiz-question">
        <h2>{question.question}</h2>
        <div className="quiz-answers">
          {question.answers.map((answer, index) => (
            <button
              key={index}
              onClick={() => handleAnswerClick(answer.isCorrect)}
              className="answer-button"
            >
              {answer.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Quiz
