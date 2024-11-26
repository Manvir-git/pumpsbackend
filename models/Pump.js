// const mongoose = require('mongoose');

// const pumpSchema = new mongoose.Schema({
//   id: { type: String, required: true },
//   name: { type: String, required: true },
//   price: { type: String, required: true },
//   features: { type: [String], required: true },
//   image: { type: String, required: true },
//   rightImage: { type: String, required: true }
// });

// const Pump = mongoose.model('Pump', pumpSchema);

// module.exports = Pump;



const mongoose = require('mongoose');

const pumpSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: String, required: true }, // Keep as string to match frontend formatting
  features: { type: [String], required: true },
  image: { type: String, required: true },
  rightImage: { type: String, required: true }
});

const Pump = mongoose.model('Pump', pumpSchema);

module.exports = Pump;