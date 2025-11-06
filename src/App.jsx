import { useState, useEffect } from 'react'
import PolygonQuiz from './components/PolygonQuiz'
import './components/PolygonQuiz.css'
import './App.css'

function App() {
  const [quizData, setQuizData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Load quiz data from JSON file
    fetch('/src/data/europeQuiz.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load quiz data')
        }
        return response.json()
      })
      .then(data => {
        setQuizData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading quiz:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Laster quiz...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-error">
        <h2>Feil ved lasting av quiz</h2>
        <p>{error}</p>
        <p>Kontroller at quiz-datafilen finnes på <code>src/data/europeQuiz.json</code></p>
      </div>
    )
  }

  if (!quizData) {
    return (
      <div className="app-error">
        <h2>Ingen quizdata tilgjengelig</h2>
      </div>
    )
  }

  return (
    <div className="app">
      <PolygonQuiz quizData={quizData} />
    </div>
  )
}

export default App
