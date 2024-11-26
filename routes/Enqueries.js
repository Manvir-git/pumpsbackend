const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema({
    email: String,
    mobile: String,
    city: String,
    pincode: String,
    country: String,
    description: String,
    productCode: String,
    productName: String,
    title: String,
    company: String,
    landline: String,
    state: String
});

const Enquiry = mongoose.model('enqueries', enquirySchema);

// POST route to handle form submission
router.post('/', async (req, res) => {
  try {
      const newEnquiry = new Enquiry(req.body);
      await newEnquiry.save();
      res.status(200).json({ message: 'Enquiry submitted successfully' });
  } catch (error) {
      console.error('Error submitting enquiry:', error);
      res.status(500).json({ message: 'Error submitting enquiry', error });
  }
});


router.get('/', async (req, res) => {
  try {
      const enquiries = await Enquiry.find(); // Fetch all enquiries from the database
      res.status(200).json(enquiries);
  } catch (error) {
      res.status(500).json({ message: 'Error fetching enquiries', error });
  }
});
router.delete('/:id', async (req, res) => {
  try {
    const enquiryId = req.params.id;
    const deletedEnquiry = await Enquiry.findByIdAndDelete(enquiryId);

    if (!deletedEnquiry) {
      return res.status(404).json({ message: 'Enquiry not found' });
    }

    res.status(200).json({ message: 'Enquiry deleted successfully' });
  } catch (error) {
    console.error('Error deleting enquiry:', error);
    res.status(500).json({ message: 'Error deleting enquiry', error });
  }
});
module.exports = router;