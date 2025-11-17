
// // Use this line to generate new data
// // npm run generate:catalog


// const fs = require('fs');
// const path = require('path');

// // Paths
// const metaPath = path.join(__dirname, '..', 'data', 'clothingMeta.json');
// const outputPath = path.join(__dirname, '..', 'data', 'catalogData.json');
// const imageDir = path.join(__dirname, '..', 'public', 'clothing-images');

// // Load metadata
// const clothingMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

// // Get all .png images
// function getAllImages(dir) {
//   return fs
//     .readdirSync(dir)
//     .filter((file) => file.endsWith('.png'))
//     .map((file) => file);
// }

// const allImages = getAllImages(imageDir);

// // Group images by variantId (filename prefix)
// const imagesByVariantId = {};
// for (const filename of allImages) {
//   const [variantId] = filename.split('-');
//   if (!imagesByVariantId[variantId]) imagesByVariantId[variantId] = [];
//   imagesByVariantId[variantId].push(filename);
// }

// // Group metadata by groupKey
// const grouped = {}; // groupKey => array of variantIds
// for (const variantId in clothingMeta) {
//   const meta = clothingMeta[variantId];
//   const groupKey = meta.groupKey;
//   if (!grouped[groupKey]) grouped[groupKey] = [];
//   grouped[groupKey].push(variantId);
// }

// // Build final catalog
// const catalog = {};

// for (const groupKey in grouped) {
//   const variantIds = grouped[groupKey];
//   const baseMeta = clothingMeta[variantIds[0]];
//   const tier = baseMeta.tier;

//   const colors = variantIds.map((variantId) => {
//     const meta = clothingMeta[variantId];
//     return {
//       colorName: meta.color.name,
//       hex: meta.color.hex,
//       variantId: variantId,
//       images: imagesByVariantId[variantId] || [],
//       slug: groupKey
//     };
//   });

//   const product = {
//     id: `G-${baseMeta.type.toUpperCase()}-${tier.toUpperCase()}-${baseMeta.material.replace(/\s+/g, '').toUpperCase()}-${baseMeta.price}`,
//     slug: groupKey,  // ✅ auto-added from groupKey
//     name: baseMeta.name,
//     tier: tier,
//     type: baseMeta.type,
//     material: baseMeta.material,
//     price: baseMeta.price,
//     gender: baseMeta.gender,
//     fit: baseMeta.fit,
//     description: baseMeta.description,
//     colors: colors,
//     sizes: baseMeta.sizes
//   };

//   if (!catalog[tier]) catalog[tier] = [];
//   catalog[tier].push(product);
// }

// fs.writeFileSync(outputPath, JSON.stringify(catalog, null, 2));
// console.log('✅ catalogData.json generated successfully.');






// scripts/generateCatalogData.js
// Use this line to generate new data
// npm run generate:catalog

const fs = require('fs');
const path = require('path');

// Paths
const metaPath = path.join(__dirname, '..', 'data', 'clothingMeta.json');
const catalogOutputPath = path.join(__dirname, '..', 'data', 'catalogData.json');
const flatOutputPath = path.join(__dirname, '..', 'data', 'productVariantsFlat.json');
const imageDir = path.join(__dirname, '..', 'public', 'clothing-images');

// ---------- helpers ----------

// Load metadata
const clothingMeta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

// Get all .png images
function getAllImages(dir) {
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.png'))
    .map((file) => file);
}

const allImages = getAllImages(imageDir);

// Group images by variantId (filename prefix before first '-')
const imagesByVariantId = {};
for (const filename of allImages) {
  const [variantId] = filename.split('-');
  if (!imagesByVariantId[variantId]) imagesByVariantId[variantId] = [];
  imagesByVariantId[variantId].push(filename);
}

// Generate a stable-ish groupId from a groupKey/slug
function makeGroupId(groupKey) {
  // 1) Remove trailing "-<number>" or "-<number>.<number>" (e.g. "-59.99")
  const core = groupKey.replace(/-\d+(?:\.\d+)?$/, '');

  // 2) Replace non-alphanumeric with underscores and uppercase
  return 'PG_' + core.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase();
}

// Infer a sizingKey if not explicitly present in meta
function inferSizingKey(meta) {
  const type = (meta.type || 'unknown').toLowerCase();        // hoodie, bomber, jeans, jacket
  const gender = (meta.gender || 'unisex').toLowerCase();     // unisex, mens, womens
  const fit = (meta.fit || 'regular').toLowerCase();          // regular, relaxed, etc.
  return `${type}_${gender}_${fit}`;                          // e.g. hoodie_unisex_regular
}

// Build tags for AI from meta
function buildTags(meta) {
  const tags = new Set();

  if (meta.type) tags.add(meta.type.toLowerCase());
  if (meta.tier) tags.add(meta.tier.toLowerCase());
  if (meta.material) tags.add(meta.material.toLowerCase());
  if (meta.gender) tags.add(meta.gender.toLowerCase());
  if (meta.fit) tags.add(meta.fit.toLowerCase());
  if (meta.color && meta.color.name) tags.add(meta.color.name.toLowerCase());

  // fabric metadata
  if (meta.fabric) {
    if (meta.fabric.materialMain) tags.add(meta.fabric.materialMain.toLowerCase());
    if (meta.fabric.warmth) tags.add(meta.fabric.warmth.toLowerCase());
    if (meta.fabric.thickness) tags.add(meta.fabric.thickness.toLowerCase());
    if (meta.fabric.stretchLevel) tags.add(meta.fabric.stretchLevel.toLowerCase());
  }

  // style metadata
  if (meta.style) {
    if (meta.style.dressCode) tags.add(meta.style.dressCode.toLowerCase());
    if (Array.isArray(meta.style.styleTags)) {
      for (const t of meta.style.styleTags) tags.add(t.toLowerCase());
    }
    if (Array.isArray(meta.style.useCases)) {
      for (const u of meta.style.useCases) tags.add(u.toLowerCase());
    }
  }

  return Array.from(tags);
}

// ---------- group metadata by groupKey ----------

const groupedByKey = {}; // groupKey => array of variantIds

for (const variantId in clothingMeta) {
  const meta = clothingMeta[variantId];

  if (!meta.groupKey) {
    console.warn(`⚠️ variant ${variantId} missing groupKey, skipping`);
    continue;
  }

  const groupKey = meta.groupKey;
  if (!groupedByKey[groupKey]) groupedByKey[groupKey] = [];
  groupedByKey[groupKey].push(variantId);
}

// ---------- Build catalogData (tier -> [ProductGroup]) ----------

const catalog = {};       // { [tier]: ProductGroup[] }
const flatVariants = [];  // for productVariantsFlat.json

for (const groupKey in groupedByKey) {
  const variantIds = groupedByKey[groupKey];

  if (variantIds.length === 0) continue;

  const baseMeta = clothingMeta[variantIds[0]];
  const tier = baseMeta.tier;
  const groupId = makeGroupId(groupKey);

  // sizingKey: use explicit if present, else infer
  const sizingKey = baseMeta.sizingKey || inferSizingKey(baseMeta);

  // --- build colors (per-variant summaries) ---
  const colors = variantIds.map((variantId) => {
    const meta = clothingMeta[variantId];
    return {
      variantId,
      colorName: meta.color?.name ?? null,
      hex: meta.color?.hex ?? null,
      images: imagesByVariantId[variantId] || [],
      sizes: meta.sizes || {},   // per-variant size stock
      slug: groupKey
    };
  });

  // --- aggregate sizes at group level ---
  const aggregatedSizes = {};
  for (const variantId of variantIds) {
    const meta = clothingMeta[variantId];
    const sizes = meta.sizes || {};
    for (const size in sizes) {
      if (!aggregatedSizes[size]) aggregatedSizes[size] = 0;
      aggregatedSizes[size] += sizes[size];
    }
  }

  // --- build product group for catalogData ---
  const productGroup = {
    id: groupKey,                // ✅ unique per group card
    groupId,                     // ✅ normalized "PG_..." id
    slug: groupKey,              // used in URLs (same as before)

    sizingKey,                   // ✅ for size logic / future UI

    name: baseMeta.name,
    tier: tier,
    type: baseMeta.type,
    material: baseMeta.material,
    price: baseMeta.price,       // legacy for compatibility
    basePrice: baseMeta.price,   // explicit canonical price
    gender: baseMeta.gender,
    fit: baseMeta.fit,
    description: baseMeta.description,
    colors,
    sizes: aggregatedSizes       // aggregated inventory across variants
  };

  if (!catalog[tier]) catalog[tier] = [];
  catalog[tier].push(productGroup);

  // --- also populate flatVariants for AI ---
  for (const variantId of variantIds) {
    const meta = clothingMeta[variantId];
    const variantSizingKey = meta.sizingKey || sizingKey; // per-variant (allows overrides later)

    const flat = {
      variantId,
      groupId,
      groupSlug: groupKey,
      sizingKey: variantSizingKey,

      name: meta.name,
      tier: meta.tier,
      type: meta.type,
      material: meta.material,
      gender: meta.gender,
      fit: meta.fit,
      price: meta.price,

      colorName: meta.color?.name ?? null,
      hex: meta.color?.hex ?? null,
      sizes: meta.sizes || {},
      images: imagesByVariantId[variantId] || [],
      description: meta.description,

      // rich metadata for RAG
      fabric: meta.fabric || null,
      style: meta.style || null,
      fitProfile: meta.fitProfile || null,
      care: meta.care || null,
      styleNotes: meta.styleNotes || null,
      fitNotes: meta.fitNotes || null,

      tags: buildTags(meta)
    };

    flatVariants.push(flat);
  }
}

// ---------- Write outputs ----------

fs.writeFileSync(catalogOutputPath, JSON.stringify(catalog, null, 2));
console.log('✅ catalogData.json generated successfully.');

fs.writeFileSync(flatOutputPath, JSON.stringify(flatVariants, null, 2));
console.log('✅ productVariantsFlat.json generated successfully.');















