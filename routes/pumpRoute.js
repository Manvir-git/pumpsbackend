// const express = require('express');
// const multer = require('multer');
// const Pump = require('../models/Pump'); // Residential Pump model
// const path = require('path');
// const router = express.Router();
// // Set up Multer for image uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads/'); // Save files in 'uploads' folder
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname)); // Unique filenames
//   },
// });
// const upload = multer({ storage });

// // Serve static files (images)
// router.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// // Route to fetch all pumps
// router.get('/', async (req, res) => {
//   try {
//     const pumps = await Pump.find(); // Fetch all residential pumps
//     res.json(pumps);
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to fetch residential pumps' });
//   }
// });

// // Route to fetch a specific pump by ID
// router.get('/:id', async (req, res) => {
//   try {
//     const pump = await Pump.findOne({ id: req.params.id }); // Match using the `id` field
//     if (!pump) {
//       return res.status(404).json({ message: 'Pump not found' });
//     }
//     res.json(pump);
//   } catch (err) {
//     res.status(500).json({ message: 'Error fetching pump data', error: err.message });
//   }
// });

// // Route to add a new residential pump (with image upload)
// router.post('/', upload.single('image'), async (req, res) => {
//   const { id, name, price, nextId, previousId, rightImage, features } = req.body;
//   const image = req.file ? `/uploads/${req.file.filename}` : null;

//   try {
//     const newPump = new Pump({
//       id,
//       name,
//       price,
//       nextId,
//       previousId,
//       rightImage,
//       features,
//       image,
//     });
//     await newPump.save(); // Save pump to the database
//     res.status(201).json(newPump); // Return the newly added pump
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to add pump' });
//   }
// });

// module.exports = router;



// const express = require('express');
// const multer = require('multer');
// const Pump = require('../models/Pump'); // Residential Pump model
// const path = require('path');
// const router = express.Router();

// // Multer configuration
// const storage = multer.diskStorage({
//   destination: './uploads/',
//   filename: function(req, file, cb) {
//     cb(null, Date.now() + path.extname(file.originalname));
//   }
// });

// const upload = multer({ storage: storage });


// // POST new pump
// router.post('/', upload.fields([
//   { name: 'image', maxCount: 1 },
//   { name: 'rightImage', maxCount: 1 }
// ]), async (req, res) => {
//   try {
//     const { id, name, price, features } = req.body;
    
//     // Validate required fields
//     if (!id || !name || !price) {
//       return res.status(400).json({
//         success: false,
//         message: 'Missing required fields'
//       });
//     }

//     // Process images
//     const image = req.files?.['image'] ? `/uploads/${req.files['image'][0].filename}` : null;
//     const rightImage = req.files?.['rightImage'] ? `/uploads/${req.files['rightImage'][0].filename}` : null;

//     // Create new pump
//     const newPump = new Pump({
//       id,
//       name,
//       price: Number(price),
//       features: JSON.parse(features),
//       image,
//       rightImage
//     });

//     await newPump.save();
//     res.status(201).json({ 
//       success: true, 
//       message: 'Pump created successfully',
//       pump: newPump 
//     });
//   } catch (error) {
//     res.status(500).json({ 
//       success: false, 
//       message: 'Error creating pump',
//       error: error.message 
//     });
//   }
// });


// // Route to fetch all residential pumps
// router.get('/', async (req, res) => {
//   try {
//     const pumps = await Pump.find(); // Fetch all residential pumps
//     res.json(pumps); // Send response with pump data
//   } catch (err) {
//     res.status(500).json({ error: 'Failed to fetch residential pumps' });
//   }
// });

// // Route to fetch a specific pump by ID
// router.get('/:id', async (req, res) => {
//   try {
//     const pump = await Pump.findOne({ id: req.params.id }); // Match using the `id` field
//     if (!pump) {
//       return res.status(404).json({ message: 'Pump not found' });
//     }
//     res.json(pump); // Send the pump details as JSON
//   } catch (err) {
//     res.status(500).json({ message: 'Error fetching pump data', error: err.message });
//   }
// });


// router.delete('/:id', async (req, res) => {
//   try {
//     const pump = await Pump.findOneAndDelete({ id: req.params.id });

//     if (!pump) {
//       return res.status(404).json({ success: false, message: 'Residential Pump not found' });
//     }

//     res.status(200).json({ success: true, message: 'Residential Pump deleted successfully' });
//   } catch (err) {
//     res.status(500).json({ success: false, message: 'Failed to delete residential pump' });
//   }
// });

// module.exports = router;


const express = require('express');
const multer = require('multer');
const Pump = require('../models/Pump');
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

// POST new pump with detailed logging
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
    console.log('Creating new pump with data:', {
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
    console.log('Attempting to save pump to database...');
    const savedPump = await newPump.save();
    console.log('Pump saved successfully:', savedPump);

    res.status(201).json({
      success: true,
      message: 'Pump created successfully',
      pump: savedPump
    });

  } catch (error) {
    console.error('Detailed error in pump creation:', {
      errorMessage: error.message,
      errorName: error.name,
      errorStack: error.stack,
      errorCode: error.code
    });

    // Send more detailed error response
    res.status(500).json({
      success: false,
      message: 'Error creating pump',
      error: {
        message: error.message,
        type: error.name,
        code: error.code
      }
    });
  }
});

// Existing routes remain unchanged...
router.get('/', async (req, res) => {
  try {
    const pumps = await Pump.find();
    res.json(pumps);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch residential pumps' });
  }
});

router.get('/:id', async (req, res) => {
   id = decodeURIComponent(req.params.id).trim();
  try {
    const pump = await Pump.findOne({ id });
    if (!pump) {
      return res.status(404).json({ message: 'Pump not found' });
    }
    res.json(pump);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching pump data', error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const pump = await Pump.findOneAndDelete({ id: req.params.id });
    if (!pump) {
      return res.status(404).json({ success: false, message: 'Residential Pump not found' });
    }
    res.status(200).json({ success: true, message: 'Residential Pump deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete residential pump' });
  }
});

module.exports = router;