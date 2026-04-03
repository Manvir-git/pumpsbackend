const mongoose = require('mongoose');

// Each pipe variant (Class 2 / Class 3 / Class 4) has its own specs + price
const variantSchema = new mongoose.Schema({
  label:          { type: String, required: true },  // e.g. "Class 2 (Light)", "Class 4 (Heavy)"
  pressure_kgcm2: { type: Number, default: null },   // Pressure rating kg/cm²
  weight_kgm:     { type: Number, default: null },   // Weight per metre kg/m
  price_per_m:    { type: String, default: '' },     // e.g. "₹45" or "On Request"
  in_stock:       { type: Boolean, default: true },
}, { _id: false });

const pipeSchema = new mongoose.Schema({
  id:          { type: String, required: true, unique: true },
  name:        { type: String, required: true },   // e.g. "UPVC Pipe 25mm"
  brand:       { type: String, required: true },   // e.g. "finolex", "astral", "prince"
  type:        { type: String, required: true,     // pipe material type
                 enum: ['upvc', 'cpvc', 'hdpe', 'gi', 'ppr', 'other'] },
  diameter_mm: { type: Number, default: null },    // Outer diameter mm
  length_m:    { type: Number, default: 3 },       // Standard length per piece (usually 3m or 6m)
  color:       { type: String, default: '' },      // e.g. "Grey", "Cream"
  standard:    { type: String, default: '' },      // e.g. "IS 4985", "IS 15778"
  application: { type: String, default: '' },      // e.g. "Water supply, irrigation"
  image:       { type: String, default: '' },
  description: { type: String, default: '' },

  variants:    { type: [variantSchema], default: [] }, // Class 2/3/4 etc.
}, { timestamps: true });

const Pipe = mongoose.model('Pipe', pipeSchema);
module.exports = Pipe;
