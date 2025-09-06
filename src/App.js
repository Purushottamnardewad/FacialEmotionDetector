import React, { useEffect, useRef } from 'react'
import * as faceapi from 'face-api.js'
import './App.css'

function App() {
    const videoRef = useRef()

    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = process.env.PUBLIC_URL + '/models'
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
                ])
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
                videoRef.current.srcObject = stream
            } catch (err) {
                console.error("Error accessing webcam:", err)
            }
        }

        const detectEmotions = async () => {
            const video = videoRef.current
            const canvas = document.getElementById('canvas')
            const textStatus = document.getElementById('textStatus')
            const emojiElement = document.getElementById('emoji')

            if (video.paused || video.ended) return

            const detection = await faceapi
                .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceExpressions()

            if (detection) {
                const expressions = detection.expressions
                const maxValue = Math.max(...Object.values(expressions))
                const emotion = Object.keys(expressions).find(
                    item => expressions[item] === maxValue
                )

                // Update emoji and text based on emotion
                textStatus.textContent = emotion
                switch (emotion) {
                    case 'happy':
                        emojiElement.textContent = '😊'
                        break
                    case 'sad':
                        emojiElement.textContent = '😢'
                        break
                    case 'angry':
                        emojiElement.textContent = '😠'
                        break
                    case 'fearful':
                        emojiElement.textContent = '😨'
                        break
                    case 'disgusted':
                        emojiElement.textContent = '🤢'
                        break
                    case 'surprised':
                        emojiElement.textContent = '😲'
                        break
                    default:
                        emojiElement.textContent = '😐'
                }
            }

            requestAnimationFrame(detectEmotions)
        }

        const init = async () => {
            await loadModels()
            await startVideo()
            if (videoRef.current) {
                videoRef.current.addEventListener('play', detectEmotions)
            }
        }

        init()

        // Cleanup function
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = videoRef.current.srcObject.getTracks()
                tracks.forEach(track => track.stop())
            }
        }
    }, [])

    return (
        <>
            <div id="app" className="app">
                <div className="overlay"></div>
                <div className="text">
                    <span aria-label="emoji" role="img" id="emoji">
                        😐
                    </span>
                    You look <span id="textStatus">...</span>!
                </div>
                <div className="mockup">
                    <div id="browser" className="browser">
                        <div className="browserChrome">
                            <div className="browserActions"></div>
                        </div>
                        <canvas id="canvas"></canvas>
                        <video 
                            ref={videoRef}
                            id="video" 
                            width="540" 
                            height="405" 
                            muted 
                            autoPlay 
                            playsInline
                        />
                    </div>
                </div>
                <p className="note">You are not being recorded, it all happens in your own browser!</p>
            </div>
        </>
    )
}

export default App
