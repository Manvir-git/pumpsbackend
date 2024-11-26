const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
    name:String,
    email: String,
    message:String
});

const feedback = mongoose.model('feedbacks', FeedbackSchema);

// POST route to handle form submission
router.post('/', async (req, res) => {
  try {
      const newfeedback = new feedback(req.body);
      await newfeedback.save();
      res.status(200).json({ message: 'EFeedback submitted successfully' });
  } catch (error) {
      console.error('Error submitting Feedback:', error);
      res.status(500).json({ message: 'Error submitting Feedback', error });
  }
});


router.get('/', async (req, res) => {
  try {
      const feedbacks = await feedback.find(); // Fetch all feedbacks from the database
      res.status(200).json(feedbacks);
  } catch (error) {
      res.status(500).json({ message: 'Error fetching feedbacks', error });
  }
});
router.delete('/:id', async (req, res) => {
  try {
    const feedbackId = req.params.id;
    const deletedfeedback = await feedback.findByIdAndDelete(feedbackId);

    if (!deletedfeedback) {
      return res.status(404).json({ message: 'feedback not found' });
    }

    res.status(200).json({ message: 'feedback deleted successfully' });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ message: 'Error deleting feedback', error });
  }
});
module.exports = router;