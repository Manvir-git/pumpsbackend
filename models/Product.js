const mongoose = require('mongoose');

/*
  Universal product model — works for pumps, pipes, sanitary, wire, anything.

  Key design decisions:
  - specs{}  → flexible key-value for category-specific fields
               pumps:   { hp, stages, depth_ft, head_m, discharge_lph }
               pipes:   { diameter_mm, length_m, standard, material, color }
               sanitary:{ material, size, connection_type }
               wire:    { cores, gauge_sqmm }

  - variants[] → different sizes / classes / grades of the SAME product.
               Each variant has its OWN price (frequently updated).
               Example (UPVC pipe): Class2, Class3, Class4 — diff pressure+weight+price
               Example (pump):      5-stage, 7-stage, 9-stage — diff depth+price

  - brand      → used to group "same type, different brand" on the product page
  - category   → ObjectId ref to Category (determines which spec fields are shown)
*/

const variantSchema = new mongoose.Schema({
  label:      { type: String, required: true },  // "Class 2 (Light)", "7 Stage 150ft", "1HP"
  price:      { type: String, default: '' },      // "₹14,500" or "On Request" — admin updates this
  attrs:      { type: mongoose.Schema.Types.Mixed, default: {} }, // { stages:7, depth_ft:150, pressure_kgcm2:6, weight_kgm:0.3 }
  inStock:    { type: Boolean, default: true },
  sortOrder:  { type: Number, default: 0 },
}, { _id: true });

const productSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  brand:       { type: String, required: true, trim: true },   // "BS Pumps", "Finolex", "Astral"
  brandSlug:   { type: String, required: true },               // "bs-pumps", "finolex", "astral"

  categoryId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },

  // Shared specs across all variants of this product
  specs:       { type: mongoose.Schema.Types.Mixed, default: {} },

  // Pricing — if no variants, top-level price; otherwise use variant prices
  price:       { type: String, default: '' },

  variants:    { type: [variantSchema], default: [] },

  images:      { type: [String], default: [] },       // filenames from /uploads/
  features:    { type: [String], default: [] },       // bullet-point feature list
  description: { type: String, default: '' },
  isActive:    { type: Boolean, default: true },
  sortOrder:   { type: Number, default: 0 },
}, { timestamps: true });

// Quick index for common queries
productSchema.index({ categoryId: 1, brandSlug: 1 });
productSchema.index({ brandSlug: 1 });
productSchema.index({ isActive: 1 });

module.exports = mongoose.model('Product', productSchema);
