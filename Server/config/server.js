// Import necessary modules
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const cors = require('cors'); // <--- ADD THIS LINE

// --- Firebase Admin SDK Initialization ---
serviceAccount = require('./wheelzai-firebase-admin-sdk-fbc-858f01b9eec.json'); // !!! ENSURE THIS PATH IS CORRECT !!!

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// --- Express App Setup ---
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors()); // <--- ADD THIS LINE TO ENABLE CORS FOR ALL ROUTES

// --- JWT Secret (VERY IMPORTANT: Use a strong, unique secret in production) ---
const JWT_SECRET = 'your_super_secret_jwt_key';

// --- Routes ---

/**
 * @route POST /signup
 * @desc Registers a new user
 * @access Public
 */
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (!snapshot.empty) {
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUserRef = await usersRef.add({
      email: email,
      password: hashedPassword,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({ message: 'User registered successfully!', userId: newUserRef.id });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup.', error: error.message });
  }
});

/**
 * @route POST /login
 * @desc Authenticates a user and returns a JWT
 * @access Public
 */
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const userData = snapshot.docs[0].data();
    const userId = snapshot.docs[0].id;

    const isMatch = await bcrypt.compare(password, userData.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { userId: userId, email: email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ message: 'Login successful!', token: token });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.', error: error.message });
  }
});

// --- Simple Protected Route Example (for demonstration) ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: 'Authentication token required.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT verification error:', err);
            return res.status(403).json({ message: 'Invalid or expired token.' });
        }
        req.user = user;
        next();
    });
};

/**
 * @route GET /protected
 * @desc A route that requires authentication
 * @access Private
 */
app.get('/protected', authenticateToken, (req, res) => {
    res.status(200).json({
        message: `Welcome, ${req.user.email}! This is protected data.`,
        user: req.user
    });
});


// --- Start the server ---
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access signup at http://localhost:${PORT}/signup`);
  console.log(`Access login at http://localhost:${PORT}/login`);
});
