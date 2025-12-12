-- Quick Test Products for Multi-Agent Outfit Builder
-- 20 curated items: blazers, shirts, pants, shoes

-- Business Blazers
INSERT INTO catalog_product (slug, title, description, category, brand, color, price_numeric, available_sizes, image_url, variant_id) VALUES
('navy-wool-blazer', 'Classic Navy Wool Blazer', 'Professional single-breasted blazer in navy wool. Perfect for business meetings.', 'blazer', 'LUXLN', 'Navy', 199.00, 'S,M,L,XL', '/images/blazer-navy.jpg', 'BLZ-001'),
('charcoal-suit-jacket', 'Charcoal Grey Suit Jacket', 'Modern fit suit jacket in charcoal grey. Versatile for office or formal events.', 'blazer', 'CRBSC', 'Charcoal', 249.00, 'S,M,L,XL', '/images/blazer-charcoal.jpg', 'BLZ-002'),
('tan-cotton-blazer', 'Tan Cotton Blazer', 'Smart casual blazer in tan cotton. Great for date nights.', 'blazer', 'FRSPT', 'Tan', 169.00, 'S,M,L,XL', '/images/blazer-tan.jpg', 'BLZ-003'),
('black-slim-blazer', 'Black Slim Fit Blazer', 'Sleek black blazer with slim fit. Modern and professional.', 'blazer', 'LUXLN', 'Black', 229.00, 'S,M,L,XL', '/images/blazer-black.jpg', 'BLZ-004'),
('blue-linen-blazer', 'Light Blue Linen Blazer', 'Breathable linen blazer for summer events.', 'blazer', 'CMFTZ', 'Light Blue', 189.00, 'S,M,L,XL', '/images/blazer-blue.jpg', 'BLZ-005');

-- Dress Shirts
INSERT INTO catalog_product (slug, title, description, category, brand, color, price_numeric, available_sizes, image_url, variant_id) VALUES
('white-oxford-shirt', 'Classic White Oxford Shirt', 'Essential white oxford cloth button-down. Goes with everything.', 'shirt', 'LUXLN', 'White', 79.00, 'S,M,L,XL', '/images/shirt-white.jpg', 'SHT-001'),
('light-blue-dress-shirt', 'Light Blue Dress Shirt', 'Professional dress shirt in light blue. Perfect for business.', 'shirt', 'CRBSC', 'Light Blue', 69.00, 'S,M,L,XL', '/images/shirt-lightblue.jpg', 'SHT-002'),
('pink-slim-shirt', 'Pink Slim Fit Shirt', 'Modern slim fit shirt in soft pink. Great for dates.', 'shirt', 'FRSPT', 'Pink', 75.00, 'S,M,L,XL', '/images/shirt-pink.jpg', 'SHT-003'),
('striped-business-shirt', 'Navy Striped Business Shirt', 'Classic business shirt with navy stripes.', 'shirt', 'LUXLN', 'Navy Stripe', 85.00, 'S,M,L,XL', '/images/shirt-stripe.jpg', 'SHT-004'),
('grey-casual-shirt', 'Grey Casual Shirt', 'Versatile grey shirt for smart casual looks.', 'shirt', 'CMFTZ', 'Grey', 65.00, 'S,M,L,XL', '/images/shirt-grey.jpg', 'SHT-005');

-- Chinos & Pants
INSERT INTO catalog_product (slug, title, description, category, brand, color, price_numeric, available_sizes, image_url, variant_id) VALUES
('navy-chinos', 'Navy Blue Chinos', 'Classic navy chinos. Essential for business casual.', 'pants', 'CRBSC', 'Navy', 89.00, '28,30,32,34,36', '/images/pants-navy.jpg', 'PNT-001'),
('khaki-chinos', 'Khaki Chinos', 'Versatile khaki chinos. Perfect for smart casual.', 'pants', 'FRSPT', 'Khaki', 79.00, '28,30,32,34,36', '/images/pants-khaki.jpg', 'PNT-002'),
('charcoal-dress-pants', 'Charcoal Dress Pants', 'Professional dress pants in charcoal grey.', 'pants', 'LUXLN', 'Charcoal', 99.00, '28,30,32,34,36', '/images/pants-charcoal.jpg', 'PNT-003'),
('black-slim-pants', 'Black Slim Fit Pants', 'Modern slim fit pants in black. Sleek and professional.', 'pants', 'LUXLN', 'Black', 95.00, '28,30,32,34,36', '/images/pants-black.jpg', 'PNT-004'),
('olive-casual-chinos', 'Olive Casual Chinos', 'Casual chinos in olive green. Great for weekends.', 'pants', 'CMFTZ', 'Olive', 75.00, '28,30,32,34,36', '/images/pants-olive.jpg', 'PNT-005');

-- Dress Shoes
INSERT INTO catalog_product (slug, title, description, category, brand, color, price_numeric, available_sizes, image_url, variant_id) VALUES
('black-oxford-shoes', 'Black Oxford Dress Shoes', 'Classic black oxford shoes. Essential for business.', 'shoes', 'LUXLN', 'Black', 149.00, '7,8,9,10,11,12', '/images/shoes-black-oxford.jpg', 'SHO-001'),
('brown-leather-shoes', 'Brown Leather Derby Shoes', 'Versatile brown leather shoes for business casual.', 'shoes', 'CRBSC', 'Brown', 139.00, '7,8,9,10,11,12', '/images/shoes-brown.jpg', 'SHO-002'),
('tan-suede-loafers', 'Tan Suede Loafers', 'Smart casual loafers in tan suede. Perfect for dates.', 'shoes', 'FRSPT', 'Tan', 129.00, '7,8,9,10,11,12', '/images/shoes-tan.jpg', 'SHO-003'),
('navy-brogues', 'Navy Leather Brogues', 'Stylish navy brogues with brogue detailing.', 'shoes', 'LUXLN', 'Navy', 159.00, '7,8,9,10,11,12', '/images/shoes-navy.jpg', 'SHO-004'),
('burgundy-monk-straps', 'Burgundy Monk Strap Shoes', 'Elegant burgundy monk straps for formal events.', 'shoes', 'CMFTZ', 'Burgundy', 169.00, '7,8,9,10,11,12', '/images/shoes-burgundy.jpg', 'SHO-005');

-- These products create several complete outfit combinations:
-- Business Meeting: Navy Blazer + White Shirt + Charcoal Pants + Black Oxfords = ~€522
-- Smart Casual: Tan Blazer + Light Blue Shirt + Navy Chinos + Brown Shoes = ~€476  
-- Date Night: Black Blazer + Pink Shirt + Black Pants + Tan Loafers = ~€528
-- Weekend Smart: Blue Blazer + Grey Shirt + Khaki Chinos + Navy Brogues = ~€492
