
// Use this line to generate new data
// npm run generate:catalog


const fs = require('fs');
const path = require('path');

// Paths
const metaPath = path.join(__dirname, '..', 'data', 'clothingMeta.json');
const outputPath = path.join(__dirname, '..', 'data', 'catalogData.json');
const imageDir = path.join(__dirname, '..', 'public', 'clothing-images');

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

// Group images by variantId (filename prefix)
const imagesByVariantId = {};
for (const filename of allImages) {
  const [variantId] = filename.split('-');
  if (!imagesByVariantId[variantId]) imagesByVariantId[variantId] = [];
  imagesByVariantId[variantId].push(filename);
}

// Group metadata by groupKey
const grouped = {}; // groupKey => array of variantIds
for (const variantId in clothingMeta) {
  const meta = clothingMeta[variantId];
  const groupKey = meta.groupKey;
  if (!grouped[groupKey]) grouped[groupKey] = [];
  grouped[groupKey].push(variantId);
}

// Build final catalog
const catalog = {};

for (const groupKey in grouped) {
  const variantIds = grouped[groupKey];
  const baseMeta = clothingMeta[variantIds[0]];
  const tier = baseMeta.tier;

  const colors = variantIds.map((variantId) => {
    const meta = clothingMeta[variantId];
    return {
      colorName: meta.color.name,
      hex: meta.color.hex,
      variantId: variantId,
      images: imagesByVariantId[variantId] || [],
      slug: groupKey
    };
  });

  const product = {
    id: `G-${baseMeta.type.toUpperCase()}-${tier.toUpperCase()}-${baseMeta.material.replace(/\s+/g, '').toUpperCase()}-${baseMeta.price}`,
    slug: groupKey,  // ✅ auto-added from groupKey
    name: baseMeta.name,
    tier: tier,
    type: baseMeta.type,
    material: baseMeta.material,
    price: baseMeta.price,
    gender: baseMeta.gender,
    fit: baseMeta.fit,
    description: baseMeta.description,
    colors: colors,
    sizes: baseMeta.sizes
  };

  if (!catalog[tier]) catalog[tier] = [];
  catalog[tier].push(product);
}

fs.writeFileSync(outputPath, JSON.stringify(catalog, null, 2));
console.log('✅ catalogData.json generated successfully.');



















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
// const grouped = {};  // groupKey => array of variantIds
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
//       images: imagesByVariantId[variantId] || []
//     };
//   });

//   const product = {
//     id: `G-${baseMeta.type.toUpperCase()}-${tier.toUpperCase()}-${baseMeta.material.replace(/\s+/g, '').toUpperCase()}-${baseMeta.price}`,
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
// console.log('✅ catalogData.json generated successfully (grouped by product groupKey).');













