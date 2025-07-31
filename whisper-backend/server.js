// require('dotenv').config(); // Uncomment this if you plan to use .env for other variables later, but not strictly needed for GOOGLE_APPLICATION_CREDENTIALS if set directly.
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
// Import Google Cloud Speech client library
const speech = require('@google-cloud/speech').v1p1beta1; // Using v1p1beta1 for more features like punctuation

const app = express();
const port = 3000; // Choose a port for your backend

// Configure Multer for file uploads
// Store files in a 'uploads' directory
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // For parsing application/json

// Ensure 'uploads' directory exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// --- Google Cloud Speech-to-Text Configuration ---
// Set the path to your downloaded JSON key file.
// IMPORTANT: Replace 'your-service-account-key.json' with the actual filename of your JSON key.
// Ensure this file is placed in the same directory as server.js.
// DO NOT commit this file to your public repository!
process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, 'wheelzai-465314-google-creds.json');

// Creates a client for Google Cloud Speech-to-Text
const client = new speech.SpeechClient();
// --- END Google Cloud Speech-to-Text Configuration ---


// API Endpoint for Google Cloud Speech-to-Text transcription
app.post('/transcribe', upload.single('audio'), async (req, res) => {
    console.log('Received transcription request');

    if (!req.file) {
        console.error('No audio file uploaded.');
        return res.status(400).json({ error: 'No audio file uploaded.' });
    }

    const audioFilePath = req.file.path; // Path to the uploaded file
    console.log(`Received audio file: ${req.file.originalname} at ${audioFilePath}`);

    try {
        // Read the audio file into a buffer
        const audioBytes = fs.readFileSync(audioFilePath);

        const audio = {
            content: audioBytes.toString('base64'), // Google Cloud expects base64 encoded audio for content
        };

        const config = {
            // Your MediaRecorder typically outputs audio/webm with the Opus codec.
            // 'WEBM_OPUS' is the correct encoding for this.
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 48000, // Common sample rate for web audio. Ensure this matches your MediaRecorder.
            languageCode: 'en-US', // IMPORTANT: Adjust language code as needed (e.g., 'si-LK' for Sinhala, 'ta-LK' for Tamil, 'en-US' for English)
            enableAutomaticPunctuation: true, // Optional: Improves readability of the transcription
            // model: 'default', // Optional: You can specify a model for better accuracy for certain use cases:
                                // 'default', 'command_and_search', 'phone_call', 'video', 'long'
                                // 'long' is suitable for audio > 1 minute, but generally costs more.
        };

        const request = {
            audio: audio,
            config: config,
        };

        // Performs speech recognition on the audio file
        const [response] = await client.recognize(request);
        const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');

        console.log('Transcription received from Google Cloud:', transcription);

        // Respond with the transcribed text
        res.json({ transcript: transcription });

    } catch (error) {
        console.error('Error during Google Cloud Speech-to-Text transcription:', error);

        // More specific error handling for Google Cloud
        if (error.code === 7) { // Typically indicates PERMISSION_DENIED or RESOURCE_EXHAUSTED
            if (error.details && (error.details.includes("quota") || error.details.includes("billing"))) {
                res.status(429).json({ error: 'Google Cloud quota exceeded or billing not enabled. Please check your Google Cloud Console.' });
            } else {
                 res.status(403).json({ error: 'Permission denied for Google Cloud Speech-to-Text. Check service account roles.' });
            }
        } else if (error.code === 16) { // UNAUTHENTICATED
             res.status(401).json({ error: 'Authentication failed with Google Cloud. Check your GOOGLE_APPLICATION_CREDENTIALS path and JSON key validity.' });
        } else {
            res.status(500).json({ error: 'Error processing audio: ' + error.message, details: error.details });
        }
    } finally {
        // Clean up: delete the uploaded file after processing
        fs.unlink(audioFilePath, (err) => {
            if (err) console.error(`Error deleting temporary file ${audioFilePath}:`, err);
        });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Google Cloud Speech-to-Text backend listening at http://localhost:${port}`);
});