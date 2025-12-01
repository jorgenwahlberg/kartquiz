/**
 * Local storage utilities for quiz answers
 */

const ANSWERS_KEY = 'quiz_answers'

/**
 * Get all answers from localStorage
 * @returns {Object} - Object mapping question numbers to answer letters (e.g., {"1": "a", "2": "b"})
 */
export function getAnswers() {
  try {
    const stored = localStorage.getItem(ANSWERS_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.error('[answerStorage] Error getting answers:', error)
    return {}
  }
}

/**
 * Save an answer to localStorage
 * @param {string} questionNumber - Question number
 * @param {string} answerLetter - Answer letter (a, b, c, etc.)
 */
export function saveAnswer(questionNumber, answerLetter) {
  try {
    const answers = getAnswers()
    answers[questionNumber] = answerLetter
    localStorage.setItem(ANSWERS_KEY, JSON.stringify(answers))
    console.log('[answerStorage] Saved answer:', questionNumber, '=', answerLetter)
  } catch (error) {
    console.error('[answerStorage] Error saving answer:', error)
    throw error
  }
}

/**
 * Get a specific answer
 * @param {string} questionNumber - Question number
 * @returns {string|null} - Answer letter or null if not answered
 */
export function getAnswer(questionNumber) {
  const answers = getAnswers()
  return answers[questionNumber] || null
}

/**
 * Check if a question has been answered
 * @param {string} questionNumber - Question number
 * @returns {boolean} - True if answered
 */
export function isAnswered(questionNumber) {
  return getAnswer(questionNumber) !== null
}

/**
 * Clear all answers from localStorage
 */
export function clearAllAnswers() {
  try {
    localStorage.removeItem(ANSWERS_KEY)
    console.log('[answerStorage] All answers cleared')
  } catch (error) {
    console.error('[answerStorage] Error clearing answers:', error)
    throw error
  }
}

/**
 * Get count of answered questions
 * @returns {number} - Number of answered questions
 */
export function getAnsweredCount() {
  const answers = getAnswers()
  return Object.keys(answers).length
}
