// const express = require('express');
// const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');
// const router = express.Router();

// const admins = [
//   { email: 'admin@123.com', password: 'Manvir' }
// ];

// router.post('/admin/login', async (req, res) => {
//   const { email, password } = req.body;
//   const admin = admins.find((admin) => admin.email === email);
//   if (!admin) return res.status(401).json({ message: 'Invalid email or password' });

//   const isPasswordValid = await bcrypt.compare(password, admin.password);
//   if (!isPasswordValid) return res.status(401).json({ message: 'Invalid email or password' });

//   const token = jwt.sign({ email: admin.email }, 'yourSecretKey', { expiresIn: '1h' });
//   res.status(200).json({ token });
// });

// module.exports = router;


const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

const admins = [
  { email: 'admin@123.com', password: bcrypt.hashSync('Manvir', 10) } // Hashing password before storing
];

router.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;

  // Find admin by email
  const admin = admins.find((admin) => admin.email === email);
  if (!admin) return res.status(401).json({ message: 'Invalid email or password' });

  // Compare hashed password with the provided password
  const isPasswordValid = await bcrypt.compare(password, admin.password);
  if (!isPasswordValid) return res.status(401).json({ message: 'Invalid email or password' });

  // Generate a JWT token if credentials are correct
  const token = jwt.sign({ email: admin.email }, 'yourSecretKey', { expiresIn: '1h' });
  res.status(200).json({ token });
});

module.exports = router;
