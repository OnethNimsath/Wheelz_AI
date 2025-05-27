const express = require('express');
const app = express();
const path = require('path'); // Import the 'path' module to work with file paths
const port = 3000;

// --- IMPORTANT: SERVE STATIC FILES ---
// This line tells Express to serve static files from the 'public' directory.
// When a request comes in, Express will first look for a matching file
// in the 'public' directory.
app.use(express.static(path.join(__dirname, 'public')));
// ------------------------------------

// Middleware to parse JSON bodies (for POST requests from your frontend)
app.use(express.json());
// Middleware to parse URL-encoded bodies (if you use traditional form submissions)
app.use(express.urlencoded({ extended: true }));

// You can remove this simple GET route now if your index.html is served from 'public'
// app.get('/', (req, res) => {
//   res.send('Welcome to the backend of your login system!');
// });

// --- Define your API routes below this (e.g., /login, /register) ---
app.post('/api/login', (req, res) => {
    // In a real app, you'd handle login logic here
    console.log('Login attempt:', req.body);
    const { email, password } = req.body;
    if (email === 'test@example.com' && password === 'password123') {
        res.json({ success: true, message: 'Login successful!' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});