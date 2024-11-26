




const express = require('express');
const multer = require('multer');
const Pump = require('../models/agpumps');  // Using the agricultural pumps model
const path = require('path');
const router = express.Router();

// Multer configuration
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// POST new agricultural pump with detailed logging
router.post('/', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'rightImage', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('Received request body:', req.body);
    console.log('Received files:', req.files);

    const { id, name, price, features } = req.body;

    // Log received data
    console.log('Extracted data:', { id, name, price, features });

    // Validate required fields with detailed logging
    if (!id || !name || !price) {
      console.log('Missing required fields:', {
        hasId: !!id,
        hasName: !!name,
        hasPrice: !!price,
        hasFeatures: !!features
      });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Process and log image paths
    const image = req.files?.['image'] ? `/${req.files['image'][0].filename}` : null;
    const rightImage = req.files?.['rightImage'] ? `/${req.files['rightImage'][0].filename}` : null;
    
    console.log('Processed image paths:', { image, rightImage });

    // Parse features with error handling
    let parsedFeatures;
    try {
      parsedFeatures = features ? JSON.parse(features) : [];
      console.log('Parsed features:', parsedFeatures);
    } catch (parseError) {
      console.error('Features parsing error:', parseError);
      parsedFeatures = [];  // Fallback to empty array if parsing fails
    }

    // Create new pump with logging
    console.log('Creating new agricultural pump with data:', {
      id,
      name,
      price,
      features: parsedFeatures,
      image,
      rightImage
    });

    const newPump = new Pump({
      id,
      name,
      price,
      features: parsedFeatures,
      image,
      rightImage
    });

    // Log pump validation
    const validationError = newPump.validateSync();
    if (validationError) {
      console.error('Validation error:', validationError);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationError.errors
      });
    }

    // Attempt to save with detailed error logging
    console.log('Attempting to save agricultural pump to database...');
    const savedPump = await newPump.save();
    console.log('Agricultural pump saved successfully:', savedPump);

    res.status(201).json({
      success: true,
      message: 'Agricultural pump created successfully',
      pump: savedPump
    });

  } catch (error) {
    console.error('Detailed error in agricultural pump creation:', {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack,
      errorCode: error.code
    });

    // Send more detailed error response
    res.status(500).json({
      success: false,
      message: 'Error creating agricultural pump',
      error: {
        message: error.message,
        type: error.name,
        code: error.code
      }
    });
  }
});

// GET all agricultural pumps
router.get('/', async (req, res) => {
  try {
    const pumps = await Pump.find();
    res.json(pumps);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch agricultural pumps' });
  }
});

// GET specific agricultural pump by ID
router.get('/:id', async (req, res) => {
   id = decodeURIComponent(req.params.id).trim();
  try {
    const pump = await Pump.findOne({ id });
    if (!pump) {
      return res.status(404).json({ message: 'Agricultural pump not found' });
    }
    res.json(pump);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching agricultural pump data', error: err.message });
  }
});

// DELETE agricultural pump
router.delete('/:id', async (req, res) => {
  try {
    const pump = await Pump.findOneAndDelete({ id: req.params.id });
    if (!pump) {
      return res.status(404).json({ success: false, message: 'Agricultural pump not found' });
    }
    res.status(200).json({ success: true, message: 'Agricultural pump deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete agricultural pump' });
  }
});

module.exports = router;