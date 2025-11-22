import { useEffect } from 'react'
import './VideoOverlay.css'
import surpriseVideo from '../gfx/surprise.mov'

function VideoOverlay({ onContinue, onClose }) {
  // ESC key to close overlay
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [onClose])

  return (
    <div className="video-overlay">
      <div className="video-overlay-content">
        <button onClick={onClose} className="btn-close-video" title="Lukk">
          ✕
        </button>

        <h2 className="video-title">En veldig viktig melding!</h2>
        <video
          controls
          className="surprise-video"
          src={surpriseVideo}
        >
          Your browser does not support the video tag.
        </video>
        <button onClick={onContinue} className="btn-continue-video">
          Fortsett til siste spørsmål →
        </button>
      </div>
    </div>
  )
}

export default VideoOverlay
