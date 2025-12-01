import questionsData from '../data/questions.json'
import { getAnswers } from './answerStorage'

/**
 * Calculate scores for all places based on answers in localStorage
 * @returns {Array} - Array of place objects with scores
 */
export function calculateScores() {
  const answers = getAnswers()
  const placeScores = {}

  // Initialize scores for all places that can receive points
  // Question 20 has the list of places (alternatives b through n)
  const question20 = questionsData.find(q => q.number === "20")
  if (question20) {
    question20.alternatives.forEach(alt => {
      if (alt.places && alt.places.length > 0) {
        alt.places.forEach(place => {
          placeScores[place] = 0
        })
      }
    })
  }

  // Calculate scores based on answers
  Object.entries(answers).forEach(([questionNumber, answerLetter]) => {
    const question = questionsData.find(q => q.number === questionNumber)
    if (!question) return

    const alternative = question.alternatives.find(alt => alt.letter === answerLetter)
    if (!alternative) return

    const points = alternative.points
    const places = alternative.places || []

    // Distribute points to all places specified in the alternative
    places.forEach(place => {
      placeScores[place] = (placeScores[place] || 0) + points
    })
  })

  // Place coordinates (from Resultater sheet)
  const placeCoordinates = {
    "Normandie": [0.2308802825308061, 49.14366294424078],
    "Rheinhessen": [8.0850303, 49.8935328],
    "Alsace": [7.750000, 48.607800],
    "Sør-England": [-0.19942293764622662, 51.101511308600536],
    "Edinburgh": [-3.188267, 55.953251],
    "Wien": [16.363449, 48.210033],
    "Praha": [14.418540, 50.073658],
    "Warszawa": [21.017532, 52.237049],
    "Budapest": [19.040236, 47.497913],
    "Piemonte": [8.204057048907016, 44.90873572624258],
    "Transilvania": [23.583332, 46.766666],
    "Murmansk": [33.09251, 68.97917],
    "Timbuktu": [-3.00742, 16.77348]
  }

  // Convert to array format matching the existing data structure
  return Object.entries(placeScores).map(([name, score]) => ({
    name,
    score,
    coordinates: placeCoordinates[name] || [0, 0] // [longitude, latitude]
  }))
}
