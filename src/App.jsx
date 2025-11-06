import PolygonQuiz from './components/PolygonQuiz'
import './components/PolygonQuiz.css'
import './App.css'
import quizData from './data/europeQuiz.json'

function App() {
  if (!quizData) {
    return (
      <div className="app-error">
        <h2>Feil ved lasting av quiz</h2>
        <p>Ingen quizdata tilgjengelig</p>
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
