const mongoose = require('mongoose');

const agPumpSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: String, required: true },
  features: { type: [String], required: true },
  image: { type: String, required: true },
  rightImage: { type: String, required: true }
});

const AgPump = mongoose.model('agPump', agPumpSchema);

module.exports = AgPump;
