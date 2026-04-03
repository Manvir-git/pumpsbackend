const mongoose = require('mongoose');

const pumpSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: String, default: '' },
  features: { type: [String], default: [] },
  image: { type: String, default: '' },
  rightImage: { type: String, default: '' },
  description: { type: String, default: '' },

  // Structured spec fields — used for search/filter
  brand: { type: String, default: 'bs', enum: ['bs', 'crompton', 'aroma', 'other'] },
  category: { type: String, default: 'borewell', enum: ['borewell', 'openwell', 'domestic', 'industrial'] },
  hp: { type: Number, default: null },          // e.g. 0.5, 1, 1.5, 2, 3, 5
  stages: { type: Number, default: null },       // e.g. 5, 7, 9, 12, 14
  depth_ft: { type: Number, default: null },     // Max pumping depth in feet
  discharge_lph: { type: Number, default: null },// Litres per hour at best efficiency
  head_m: { type: Number, default: null },       // Max head in metres
}, { timestamps: true });

const Pump = mongoose.model('Pump', pumpSchema);
module.exports = Pump;
