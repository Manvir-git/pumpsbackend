const mongoose = require('mongoose');

const agPumpSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: String, default: '' },
  features: { type: [String], default: [] },
  image: { type: String, default: '' },
  rightImage: { type: String, default: '' },
  description: { type: String, default: '' },

  // Structured spec fields
  brand: { type: String, default: 'bs', enum: ['bs', 'crompton', 'aroma', 'other'] },
  category: { type: String, default: 'borewell', enum: ['borewell', 'openwell', 'submersible', 'monoblock'] },
  hp: { type: Number, default: null },
  stages: { type: Number, default: null },
  depth_ft: { type: Number, default: null },
  discharge_lph: { type: Number, default: null },
  head_m: { type: Number, default: null },
}, { timestamps: true });

const AgPump = mongoose.model('agPump', agPumpSchema);
module.exports = AgPump;
