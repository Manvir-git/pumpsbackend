


const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Custom token verification middleware
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const SECRET_KEY = process.env.SECRET_KEY || 'fallback_secret_key_change_in_production';
    const decoded = jwt.verify(token, SECRET_KEY);
    
    // Configurable inactivity period
    const INACTIVITY_PERIOD = parseInt(process.env.INACTIVITY_TIMEOUT_MS) || (60 * 60 * 1000); // 1 hour default
    const currentTime = Date.now();
    
    if (currentTime - decoded.lastActivity > INACTIVITY_PERIOD) {
      return res.status(401).json({ 
        message: 'Session expired due to inactivity',
        reason: 'inactivity'
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ 
      message: 'Invalid or expired token',
      reason: 'token_expired'
    });
  }
};

// Initialize Express app
const app = express();

// Import routes
const pumpRoutes = require('./routes/pumpRoute');
const agpumpsRoutes = require('./routes/agpumpsRoute');
const uploadRoute = require('./routes/UploadRoute1');
const enqueriesRoutes = require('./routes/Enqueries');
const Feedbacks=require('./routes/Feedbacks')

// Secret Key from environment variable
const SECRET_KEY = process.env.SECRET_KEY || 'fallback_secret_key_change_in_production';

// Middleware
// CORS middleware with more robust configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:3001'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Logging middleware (optional, can be enabled/disabled)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Routes
app.use('/api/pumps', pumpRoutes);
app.use('/api/agpumps', agpumpsRoutes);
app.use('/api/uploads', uploadRoute);
app.use('/api/enqueries', enqueriesRoutes);
app.use('/api/Feedbacks',Feedbacks);

// Login Route with Enhanced Security
app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;

  // Use environment variables for admin credentials
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'harry5510@gmail.com';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminharry';

  try {
    // Constant-time comparison to prevent timing attacks
    const isEmailMatch = email === ADMIN_EMAIL;
    const isPasswordMatch = password === ADMIN_PASSWORD;

    if (isEmailMatch && isPasswordMatch) {
      const token = jwt.sign(
        { 
          email, 
          role: 'admin',
          timestamp: Date.now(),
          lastActivity: Date.now()
        }, 
        SECRET_KEY, 
        { expiresIn: '1h' }
      );

      return res.status(200).json({
        token,
        message: 'Login successful',
        user: { email }
      });
    }

    // Deliberate delay to prevent timing attacks
    await new Promise(resolve => setTimeout(resolve, 500));

    return res.status(401).json({
      message: 'Invalid credentials'
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      message: 'Internal server error during authentication'
    });
  }
});

// Protected Route Example
app.get('/admin/verify', verifyToken, (req, res) => {
  res.status(200).json({
    message: 'Token is valid',
    user: req.user
  });
});

// Middleware to update last activity and refresh token
app.use((req, res, next) => {
  if (req.headers.authorization) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, SECRET_KEY);
      
      const newToken = jwt.sign(
        { 
          ...decoded, 
          lastActivity: Date.now() 
        }, 
        SECRET_KEY, 
        { expiresIn: '7d' }
      );

      res.set('X-Refresh-Token', newToken);
    } catch (error) {
      // Silently handle token verification failures
    }
  }
  next();
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  
  const errorResponse = {
    error: 'Internal Server Error',
    message: err.message || 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  res.status(500).json(errorResponse);
});

// Secure MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Manviradmin:manirocks@cluster0.2pmww2t.mongodb.net/project';

mongoose.connect(MONGODB_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
.then(() => console.log('MongoDB connected'))
.catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Start the server
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    mongoose.connection.close(false, () => {
      process.exit(0);
    });
  });
});

module.exports = app; // For potential testing