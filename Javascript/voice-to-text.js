class VoiceToTextHandler {
    constructor() {
        this.isRecording = false;
        this.recognition = null;
        this.targetTextArea = null;
        this.micButton = null;
        
        // Google Cloud Speech-to-Text API configuration
        this.API_KEY = 'YOUR_GOOGLE_CLOUD_API_KEY'; // Replace with your actual API key
        this.API_URL = 'https://speech.googleapis.com/v1/speech:recognize';
        
        // Web Speech API fallback configuration
        this.useWebSpeechAPI = true; // Set to false to use only Google Cloud API
        
        this.init();
    }

    init() {
        this.createMicButton();
        this.setupEventListeners();
        this.checkBrowserSupport();
    }

    createMicButton() {
        // Find the additional notes textarea
        const additionalNotesTextarea = document.querySelector('textarea[placeholder*="additional information"]');
        if (!additionalNotesTextarea) {
            console.error('Additional notes textarea not found');
            return;
        }

        this.targetTextArea = additionalNotesTextarea;

        // Create mic button container
        const micContainer = document.createElement('div');
        micContainer.className = 'voice-input-container';
        micContainer.innerHTML = `
            <button type="button" id="voiceMicButton" class="voice-mic-button" title="Click to speak">
                <svg class="mic-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z"/>
                    <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
                <div class="recording-indicator"></div>
            </button>
            <div class="voice-status" id="voiceStatus"></div>
        `;

        // Add custom styles
        const style = document.createElement('style');
        style.textContent = `
            .voice-input-container {
                position: relative;
                margin-top: 8px;
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .voice-mic-button {
                position: relative;
                width: 44px;
                height: 44px;
                border-radius: 50%;
                border: 2px solid #e2e8f0;
                background: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            .voice-mic-button:hover {
                border-color: #667eea;
                background: #f8faff;
                transform: scale(1.05);
            }

            .voice-mic-button.recording {
                border-color: #ef4444;
                background: #fef2f2;
                animation: pulse 1.5s infinite;
            }

            .voice-mic-button.processing {
                border-color: #f59e0b;
                background: #fffbeb;
            }

            @keyframes pulse {
                0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            }

            .mic-icon {
                color: #64748b;
                transition: color 0.3s ease;
            }

            .voice-mic-button:hover .mic-icon {
                color: #667eea;
            }

            .voice-mic-button.recording .mic-icon {
                color: #ef4444;
            }

            .voice-mic-button.processing .mic-icon {
                color: #f59e0b;
            }

            .recording-indicator {
                position: absolute;
                top: -2px;
                right: -2px;
                width: 12px;
                height: 12px;
                background: #ef4444;
                border-radius: 50%;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .voice-mic-button.recording .recording-indicator {
                opacity: 1;
                animation: blink 1s infinite;
            }

            @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0.3; }
            }

            .voice-status {
                font-size: 12px;
                color: #64748b;
                min-height: 16px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .voice-status.recording {
                color: #ef4444;
                font-weight: 500;
            }

            .voice-status.processing {
                color: #f59e0b;
                font-weight: 500;
            }

            .voice-status.success {
                color: #10b981;
                font-weight: 500;
            }

            .voice-status.error {
                color: #ef4444;
                font-weight: 500;
            }

            .listening-animation {
                display: inline-flex;
                gap: 2px;
            }

            .listening-dot {
                width: 4px;
                height: 4px;
                border-radius: 50%;
                background: currentColor;
                animation: listening 1.4s infinite ease-in-out;
            }

            .listening-dot:nth-child(1) { animation-delay: -0.32s; }
            .listening-dot:nth-child(2) { animation-delay: -0.16s; }
            .listening-dot:nth-child(3) { animation-delay: 0s; }

            @keyframes listening {
                0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
                40% { transform: scale(1.2); opacity: 1; }
            }

            /* Mobile responsive */
            @media (max-width: 768px) {
                .voice-input-container {
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 8px;
                }
                
                .voice-status {
                    font-size: 11px;
                }
            }
        `;
        document.head.appendChild(style);

        // Insert the mic container after the textarea
        this.targetTextArea.parentNode.insertBefore(micContainer, this.targetTextArea.nextSibling);
        this.micButton = document.getElementById('voiceMicButton');
    }

    setupEventListeners() {
        if (this.micButton) {
            this.micButton.addEventListener('click', () => this.toggleRecording());
        }
    }

    checkBrowserSupport() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.showStatus('Speech recognition not supported in this browser', 'error');
            if (this.micButton) {
                this.micButton.disabled = true;
                this.micButton.title = 'Speech recognition not supported';
            }
            return false;
        }
        return true;
    }

    async toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        try {
            this.isRecording = true;
            this.updateUI('recording');
            this.showStatus('Listening...', 'recording');

            if (this.useWebSpeechAPI && this.checkBrowserSupport()) {
                await this.startWebSpeechRecognition();
            } else {
                await this.startGoogleCloudRecognition();
            }
        } catch (error) {
            console.error('Failed to start recording:', error);
            this.showStatus('Failed to start recording: ' + error.message, 'error');
            this.resetUI();
        }
    }

    stopRecording() {
        this.isRecording = false;
        
        if (this.recognition) {
            this.recognition.stop();
        }
        
        this.updateUI('processing');
        this.showStatus('Processing...', 'processing');
    }

    async startWebSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();

        // Configuration for better results
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US'; // Change to 'si-LK' for Sinhala if supported

        this.recognition.onstart = () => {
            console.log('Speech recognition started');
            this.showStatus('Listening... Speak now', 'recording');
        };

        this.recognition.onresult = (event) => {
            let transcript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }

            // Show interim results
            if (event.results[event.results.length - 1].isFinal) {
                this.insertTextAtCursor(transcript.trim());
                this.showStatus('✓ Voice input complete', 'success');
                setTimeout(() => this.resetUI(), 2000);
            } else {
                this.showStatus(`Listening: "${transcript}"`, 'recording');
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            let errorMessage = 'Recognition failed';
            
            switch (event.error) {
                case 'no-speech':
                    errorMessage = 'No speech detected. Please try again.';
                    break;
                case 'audio-capture':
                    errorMessage = 'Microphone not accessible. Please check permissions.';
                    break;
                case 'not-allowed':
                    errorMessage = 'Microphone permission denied. Please enable and try again.';
                    break;
                case 'network':
                    errorMessage = 'Network error. Please check your connection.';
                    break;
                default:
                    errorMessage = `Recognition error: ${event.error}`;
            }
            
            this.showStatus(errorMessage, 'error');
            this.resetUI();
        };

        this.recognition.onend = () => {
            console.log('Speech recognition ended');
            if (this.isRecording) {
                this.resetUI();
            }
        };

        this.recognition.start();
    }

    async startGoogleCloudRecognition() {
        try {
            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Create MediaRecorder for audio capture
            const mediaRecorder = new MediaRecorder(stream);
            const audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                await this.processAudioWithGoogleCloud(audioBlob);
                
                // Stop all tracks
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();

            // Auto-stop after 10 seconds or when user stops manually
            const timeout = setTimeout(() => {
                if (this.isRecording) {
                    this.stopRecording();
                }
            }, 10000);

            // Store references for stopping
            this.mediaRecorder = mediaRecorder;
            this.recordingTimeout = timeout;

        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.showStatus('Microphone access denied or unavailable', 'error');
            this.resetUI();
        }
    }

    async processAudioWithGoogleCloud(audioBlob) {
        try {
            this.updateUI('processing');
            this.showStatus('Processing with Google Cloud...', 'processing');

            // Convert audio blob to base64
            const base64Audio = await this.blobToBase64(audioBlob);
            
            const requestBody = {
                config: {
                    encoding: 'WEBM_OPUS', // Adjust based on your audio format
                    sampleRateHertz: 48000, // Adjust based on your recording
                    languageCode: 'en-US', // Change to 'si' for Sinhala
                    enableAutomaticPunctuation: true,
                    model: 'default' // or 'latest_short' for short audio
                },
                audio: {
                    content: base64Audio.split(',')[1] // Remove data:audio/... prefix
                }
            };

            const response = await fetch(`${this.API_URL}?key=${this.API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`Google Cloud API error: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                const transcript = data.results[0].alternatives[0].transcript;
                this.insertTextAtCursor(transcript.trim());
                this.showStatus('✓ Voice input complete', 'success');
            } else {
                this.showStatus('No speech detected. Please try again.', 'error');
            }

        } catch (error) {
            console.error('Google Cloud Speech-to-Text error:', error);
            this.showStatus('Processing failed: ' + error.message, 'error');
        } finally {
            setTimeout(() => this.resetUI(), 2000);
        }
    }

    blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    insertTextAtCursor(text) {
        if (!this.targetTextArea) return;

        const startPos = this.targetTextArea.selectionStart;
        const endPos = this.targetTextArea.selectionEnd;
        const textBefore = this.targetTextArea.value.substring(0, startPos);
        const textAfter = this.targetTextArea.value.substring(endPos);
        
        // Add spacing if needed
        const needsSpaceBefore = textBefore && !textBefore.endsWith(' ') && !textBefore.endsWith('\n');
        const needsSpaceAfter = textAfter && !textAfter.startsWith(' ') && !textAfter.startsWith('\n');
        
        const finalText = textBefore + 
                         (needsSpaceBefore ? ' ' : '') + 
                         text + 
                         (needsSpaceAfter ? ' ' : '') + 
                         textAfter;

        this.targetTextArea.value = finalText;
        
        // Set cursor position after inserted text
        const newCursorPos = startPos + (needsSpaceBefore ? 1 : 0) + text.length;
        this.targetTextArea.setSelectionRange(newCursorPos, newCursorPos);
        
        // Trigger change event for any listeners
        this.targetTextArea.dispatchEvent(new Event('input', { bubbles: true }));
        this.targetTextArea.focus();
    }

    updateUI(state) {
        if (!this.micButton) return;

        this.micButton.classList.remove('recording', 'processing');
        
        if (state === 'recording') {
            this.micButton.classList.add('recording');
            this.micButton.title = 'Click to stop recording';
        } else if (state === 'processing') {
            this.micButton.classList.add('processing');
            this.micButton.title = 'Processing...';
        } else {
            this.micButton.title = 'Click to speak';
        }
    }

    showStatus(message, type = '') {
        const statusElement = document.getElementById('voiceStatus');
        if (!statusElement) return;

        statusElement.classList.remove('recording', 'processing', 'success', 'error');
        
        if (type) {
            statusElement.classList.add(type);
        }

        if (type === 'recording') {
            statusElement.innerHTML = `
                <div class="listening-animation">
                    <div class="listening-dot"></div>
                    <div class="listening-dot"></div>
                    <div class="listening-dot"></div>
                </div>
                ${message}
            `;
        } else {
            statusElement.textContent = message;
        }
    }

    resetUI() {
        this.isRecording = false;
        this.updateUI('idle');
        
        setTimeout(() => {
            this.showStatus('', '');
        }, 3000);

        // Clean up resources
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        
        if (this.recordingTimeout) {
            clearTimeout(this.recordingTimeout);
        }
    }

    // Public method to change language
    setLanguage(languageCode) {
        this.languageCode = languageCode;
        console.log(`Voice recognition language set to: ${languageCode}`);
    }

    // Public method to switch between APIs
    switchToWebSpeechAPI() {
        this.useWebSpeechAPI = true;
        console.log('Switched to Web Speech API');
    }

    switchToGoogleCloudAPI() {
        this.useWebSpeechAPI = false;
        console.log('Switched to Google Cloud Speech-to-Text API');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceToTextHandler;
}

// Make available globally
window.VoiceToTextHandler = VoiceToTextHandler;