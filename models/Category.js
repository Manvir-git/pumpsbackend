const mongoose = require('mongoose');

/*
  Category tree — stored flat with parentId references.
  Example tree:
    Pumps
      └── Submersible Motors
    Pipes
      ├── GI Pipes
      ├── UPVC Pipes
      ├── CPVC Pipes
      └── Column Pipes
    Sanitary
      ├── GI Fittings
      ├── PVC Fittings
      ├── Valves & Cocks
      ├── Taps & Faucets
      └── Water Tanks
    Accessories
      └── Pump Wire
*/

const categorySchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  slug:     { type: String, required: true, unique: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  icon:     { type: String, default: '' },      // emoji or icon name
  sortOrder:{ type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
