import { useState, useEffect } from 'react'
import Confetti from 'react-confetti'
import './SurpriseOverlay.css'
import tadaSound from '../sound/065492_tadawav-80833.mp3'

function SurpriseOverlay({ onContinue, places }) {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  })
  const [recycle, setRecycle] = useState(true)
  const [audioPlayed, setAudioPlayed] = useState(false)

  // Calculate leading place(s)
  const getLeadingPlaces = () => {
    if (!places || places.length === 0) return 'et ukjent sted'

    // Filter places with score > 0
    const scoredPlaces = places.filter(p => p.score > 0)
    if (scoredPlaces.length === 0) return 'et ukjent sted'

    // Find the highest score
    const maxScore = Math.max(...scoredPlaces.map(p => p.score))

    // Get all places with the highest score
    const leadingPlaces = scoredPlaces.filter(p => p.score === maxScore)

    // Format place names in Norwegian
    const placeNames = leadingPlaces.map(p => p.name)

    if (placeNames.length === 1) {
      return placeNames[0]
    } else if (placeNames.length === 2) {
      return `${placeNames[0]} eller ${placeNames[1]}`
    } else {
      // 3 or more: "Oslo, Bergen og Stockholm"
      const allButLast = placeNames.slice(0, -1).join(', ')
      const last = placeNames[placeNames.length - 1]
      return `${allButLast} eller ${last}`
    }
  }

  const leadingDestination = getLeadingPlaces()

  // Play celebration sounds on user interaction
  const playCelebrationSounds = () => {
    if (audioPlayed) return // Only play once

    try {
      // Create and play tada fanfare sound
      const tada = new Audio(tadaSound)
      tada.volume = 0.7

      // Play tada immediately
      tada.play().catch(err => {
        console.log('[SurpriseOverlay] Audio blocked:', err)
      })

      setAudioPlayed(true)
      console.log('[SurpriseOverlay] Celebration fanfare playing')
    } catch (error) {
      console.error('[SurpriseOverlay] Error playing sounds:', error)
    }
  }

  // Handle clicks on overlay to play sound
  const handleOverlayClick = () => {
    playCelebrationSounds()
  }

  // ESC key to close overlay
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onContinue()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [onContinue])

  // Try to play sounds automatically on mount (may be blocked by browser)
  useEffect(() => {
    playCelebrationSounds()
  }, [])

  useEffect(() => {
    // Update window size for confetti
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    window.addEventListener('resize', handleResize)

    // Stop recycling confetti after 8 seconds (let existing pieces fall)
    const stopRecycleTimer = setTimeout(() => {
      setRecycle(false)
    }, 8000)

    // Close overlay and return to map after 10 seconds
    const closeTimer = setTimeout(() => {
      onContinue()
    }, 10000)

    return () => {
      clearTimeout(stopRecycleTimer)
      clearTimeout(closeTimer)
      window.removeEventListener('resize', handleResize)
    }
  }, [onContinue])

  return (
    <div className="surprise-overlay" onClick={handleOverlayClick}>
      <button onClick={onContinue} className="btn-close-surprise" title="Lukk">
        ✕
      </button>
      <Confetti
        width={windowSize.width}
        height={windowSize.height}
        numberOfPieces={500}
        recycle={recycle}
        colors={['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']}
      />
      <div className="surprise-message">
        <h1 className="surprise-title">🎉 Gratulerer! 🎉</h1>
        <p className="surprise-subtitle">Du har vunnet en tur til {leadingDestination}!</p>
        {!audioPlayed && (
          <p className="audio-hint">🔊 Klikk for lyd!</p>
        )}
      </div>
    </div>
  )
}

export default SurpriseOverlay
