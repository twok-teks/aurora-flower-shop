-- Optional sample catalog. Run after schema.sql.
insert into public.products
  (name, name_en, price, description, description_en, category, in_stock, featured, is_active)
values
  ('Vườn Hồng Dịu Êm', 'Blushing Garden', 680000, 'Hoa hồng vườn và hoa theo mùa trong những sắc hồng dịu nhẹ.', 'Garden roses and seasonal blooms in soft blush tones.', 'Regular Bouquets', true, true, true),
  ('Sớm Mai Trong Vườn', 'Meadow Morning', 540000, 'Một bó hoa phóng khoáng với những nhành hoa tươi vui và lá xanh mềm mại.', 'An airy gathering of cheerful stems and gentle greenery.', 'Seasonal Bouquets', true, true, true),
  ('Lời Thương Khẽ', 'Quiet Romance', 760000, 'Sắc kem và đào thanh nhã dành cho những khoảnh khắc nhiều ý nghĩa.', 'A graceful cream and peach arrangement for meaningful moments.', 'Hoa Cam Binh', false, false, true);
