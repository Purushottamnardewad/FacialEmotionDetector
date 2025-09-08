import React, { useEffect, useRef, useState } from 'react'
import * as faceapi from 'face-api.js'
import './App.css'

function App() {
    const videoRef = useRef()
    const canvasRef = useRef()
    const [isDetecting, setIsDetecting] = useState(false)
    const [currentEmotion, setCurrentEmotion] = useState('Neutral')
    const [confidence, setConfidence] = useState(0)
    const [isLoading, setIsLoading] = useState(true)
    const [isVideoReady, setIsVideoReady] = useState(false)
    const [modelsLoaded, setModelsLoaded] = useState(false)
    const detectionIntervalRef = useRef()

    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = process.env.PUBLIC_URL + '/models'
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
                ])
                setModelsLoaded(true)
            } catch (err) {
                console.error('Error loading models:', err)
            }
        }

        const startVideo = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: true,
                    audio: false
                })
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                    videoRef.current.onloadedmetadata = () => {
                        setIsVideoReady(true)
                        setIsLoading(false)
                    }
                }
            } catch (err) {
                console.error("Error accessing webcam:", err)
                setIsLoading(false)
            }
        }

        loadModels()
        startVideo()

        // Cleanup function
        return () => {
            const video = videoRef.current
            if (video && video.srcObject) {
                const tracks = video.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            }
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current)
            }
        }
    }, [])

    const detectEmotions = async () => {
        if (!videoRef.current || !canvasRef.current) return

        const video = videoRef.current
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        const detection = await faceapi
            .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions()

        // Clear previous drawings
        context.clearRect(0, 0, canvas.width, canvas.height)

        if (detection) {
            const expressions = detection.expressions
            const maxValue = Math.max(...Object.values(expressions))
            const emotion = Object.keys(expressions).find(
                item => expressions[item] === maxValue
            )

            const emotionName = emotion.charAt(0).toUpperCase() + emotion.slice(1)
            setCurrentEmotion(emotionName)
            setConfidence(Math.round(maxValue * 100))

            // Draw modern face detection box with gradient
            const box = detection.detection.box
            
            // Create gradient for the border
            const gradient = context.createLinearGradient(box.x, box.y, box.x + box.width, box.y + box.height)
            gradient.addColorStop(0, '#667eea')
            gradient.addColorStop(0.5, '#764ba2')
            gradient.addColorStop(1, '#f093fb')
            
            // Draw rounded rectangle border
            context.strokeStyle = gradient
            context.lineWidth = 3
            context.lineCap = 'round'
            context.setLineDash([10, 5])
            context.strokeRect(box.x, box.y, box.width, box.height)
            context.setLineDash([])

            // Draw modern emotion label with glassmorphism effect
            const labelHeight = 40
            const labelY = box.y - labelHeight - 10
            
            // Background with blur effect simulation
            context.fillStyle = 'rgba(255, 255, 255, 0.9)'
            context.fillRect(box.x, labelY, box.width, labelHeight)
            
            // Border for label
            context.strokeStyle = 'rgba(255, 255, 255, 0.5)'
            context.lineWidth = 1
            context.strokeRect(box.x, labelY, box.width, labelHeight)
            
            // Emotion text with modern font styling
            context.font = 'bold 16px Inter, system-ui, sans-serif'
            context.fillStyle = '#1f2937'
            context.textAlign = 'center'
            context.fillText(
                `${emotionName.toUpperCase()}`,
                box.x + box.width / 2,
                labelY + 16
            )
            
            // Confidence percentage
            context.font = '12px Inter, system-ui, sans-serif'
            context.fillStyle = '#6b7280'
            context.fillText(
                `${Math.round(maxValue * 100)}% confidence`,
                box.x + box.width / 2,
                labelY + 32
            )
        } else {
            // Reset if no face detected
            setCurrentEmotion('No Face Detected')
            setConfidence(0)
        }
    }

    const startDetection = () => {
        setIsDetecting(true)
        detectionIntervalRef.current = setInterval(detectEmotions, 100)
    }

    const stopDetection = () => {
        setIsDetecting(false)
        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current)
        }
        // Clear canvas
        if (canvasRef.current) {
            const context = canvasRef.current.getContext('2d')
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        }
    }

    return (
        <div className="app">
            <div className="container">
                <div className="header">
                    <div className="header-icon">🤖</div>
                    <h1 className="title">Smart Emotion Detection</h1>
                    <p className="subtitle">AI-powered facial expression analysis using advanced machine learning</p>
                </div>

                <div className="main-card">
                    <div className="status-bar">
                        {isLoading ? (
                            "🔄 Loading AI models and initializing camera..."
                        ) : !modelsLoaded ? (
                            "❌ Failed to load AI models. Please refresh the page."
                        ) : !isVideoReady ? (
                            "📷 Please allow camera access to continue..."
                        ) : (
                            "⚡ AI Detection Ready! Try different facial expressions!"
                        )}
                    </div>

                    <div className="video-container">
                        {isLoading && (
                            <div className="loading-overlay">
                                <div className="loading-spinner"></div>
                                <p>Initializing...</p>
                            </div>
                        )}
                        <video 
                            ref={videoRef}
                            className="video-feed"
                            width="640" 
                            height="480" 
                            muted 
                            autoPlay 
                            playsInline
                            style={{ opacity: isLoading ? 0.3 : 1 }}
                        />
                        <canvas 
                            ref={canvasRef}
                            className="detection-overlay"
                        />
                    </div>

                    <div className="control-buttons">
                        <button 
                            className={`btn-start ${isDetecting ? 'active' : ''}`}
                            onClick={startDetection}
                            disabled={isDetecting || isLoading || !modelsLoaded || !isVideoReady}
                        >
                            {isDetecting ? '🔴 Detecting...' : '🚀 Start AI Detection'}
                        </button>
                        <button 
                            className="btn-stop"
                            onClick={stopDetection}
                            disabled={!isDetecting}
                        >
                            ⏹️ Stop Detection
                        </button>
                    </div>

                    <div className="stats-container">
                        <div className="stat-box">
                            <h3>Detected Emotion</h3>
                            <div className="stat-value emotion-value">{currentEmotion}</div>
                        </div>
                        <div className="stat-box">
                            <h3>Confidence</h3>
                            <div className="stat-value confidence-value">{confidence}%</div>
                        </div>
                        <div className="stat-box">
                            <h3>AI Model</h3>
                            <div className="stat-value mode-value">Neural Net</div>
                        </div>
                    </div>

                    <div className="emotion-buttons">
                        <button className="emotion-btn">😊 Happy</button>
                        <button className="emotion-btn">😢 Sad</button>
                        <button className="emotion-btn">😠 Angry</button>
                        <button className="emotion-btn">😲 Surprised</button>
                        <button className="emotion-btn">😨 Fearful</button>
                        <button className="emotion-btn">🤢 Disgusted</button>
                        <button className="emotion-btn">😐 Neutral</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App
