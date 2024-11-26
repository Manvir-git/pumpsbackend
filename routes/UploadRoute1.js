// // routes/uploadRoute.js
// const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const router = express.Router();

// // Configure multer for image uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, '../uploads'); // Folder to store uploaded files
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname)); // Ensure a unique filename by adding timestamp
//   }
// });

// const upload = multer({ storage }).single('image'); // Use 'image' as the form field name

// // POST route to handle image upload
// router.post('/upload', upload, (req, res) => {
//   if (!req.file) {
//     return res.status(400).send('No file uploaded');
//   }

//   // Respond with the file path where the image is stored
//   res.json({ filePath: `/uploads/${req.file.filename}` });
// });

// module.exports = router;

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Ensure the 'uploads' directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true }); // Create the 'uploads' directory if it doesn't exist
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Use the consistent uploadDir path
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Ensure a unique filename by adding timestamp
  }
});

// Handle multiple files (if needed, you can adjust the number of allowed files)
const uploadMultiple = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|gif/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      return cb(new Error('Only image files are allowed'), false);
    }
  }
}).array('image', 2); // Accepts up to two files, you can adjust this

// POST route for multiple file uploads
router.post('/uploadMultiple', uploadMultiple, (req, res) => {
  if (!req.files || req.files.length === 0) {
    console.error('No files uploaded');
    return res.status(400).send('No files uploaded');
  }

  console.log('Files uploaded successfully: ', req.files);

  // Respond with the file paths where the images are stored
  const filePaths = req.files.map(file => `/uploads/${file.filename}`);
  res.json({ filePaths });
});

// POST route for single 'rightImage' upload
const uploadSingle = multer({ storage }).single('rightImage');
router.post('/uploadRightImage', uploadSingle, (req, res) => {
  if (!req.file) {
    console.error('No file uploaded');
    return res.status(400).send('No file uploaded');
  }

  console.log('File uploaded successfully: ', req.file);

  // Respond with the file path where the image is stored
  res.json({ filePath: `/uploads/${req.file.filename}` });
});

// Error handling middleware for multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(500).json({ message: 'Multer error occurred: ' + err.message });
  } else if (err) {
    return res.status(500).json({ message: 'An error occurred: ' + err.message });
  }
});

module.exports = router;

