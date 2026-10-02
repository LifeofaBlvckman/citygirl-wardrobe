-- Seed the 6 CityGirl gowns into the products table.
-- Run in Supabase → SQL Editor. Re-running updates the same rows (upsert on id).
-- Image paths are relative to the deployed site (the photos ship in assets/img/).
-- Later you can upload photos to Supabase Storage and replace these with full URLs.

insert into products (id, name, price, category, tag, bestseller, image, images, sizes, fabric, stretch, care, fit, model_size, model_info, rating, reviews, description, sort) values
('d1','Noir Crystal Gown',220000,'Dresses','New',true,'assets/img/drop-1.jpg','["assets/img/drop-1.jpg"]','["S","M","L","XL"]','Hand-beaded crystal lace over lining','Slight stretch','Dry clean only','True to size · custom sizing on request','M','Model is 5''9" / 1.75m and wearing a size M',5.0,18,'A show-stopping high-neck gown in hand-beaded black crystal lace — made to turn every head in the room.',1),
('d2','Golden Cascade Gown',260000,'Dresses','New',false,'assets/img/drop-2.jpg','["assets/img/drop-2.jpg"]','["S","M","L","XL"]','Gold & silver beaded fringe on stretch base','Medium stretch','Dry clean only','Fitted · custom sizing on request','M','Model is 5''9" / 1.75m and wearing a size M',5.0,12,'Cascading gold and silver beadwork over a sculpting black base — pure red-carpet drama.',2),
('d3','Lilac Shimmer Gown',280000,'Dresses','New',false,'assets/img/drop-3.jpg','["assets/img/drop-3.jpg"]','["S","M","L","XL"]','Lilac paillette sequins with pearl detail','Slight stretch','Dry clean only','Strapless, true to size · custom sizing on request','M','Model is 5''9" / 1.75m and wearing a size M',5.0,9,'A strapless lilac mermaid gown covered in soft petal sequins — romantic, glamorous and unforgettable.',3),
('d4','Amethyst Halter Gown',300000,'Dresses','New',true,'assets/img/drop-4.jpg','["assets/img/drop-4.jpg"]','["S","M","L","XL"]','Purple crystal-beaded mesh over lining','Slight stretch','Dry clean only','Halter neck, true to size · custom sizing on request','M','Model is 5''9" / 1.75m and wearing a size M',5.0,14,'A deep amethyst halter gown dripping in teardrop crystals — elegant, bold and made to be remembered.',4),
('d5','Pearl Fringe Dress',260000,'Dresses','New',false,'assets/img/drop-5.jpg','["assets/img/drop-5.jpg"]','["S","M","L","XL"]','Hand-strung pearl fringe on stretch mesh','Medium stretch','Dry clean only','Midi length, true to size · custom sizing on request','M','Model is 5''9" / 1.75m and wearing a size M',5.0,11,'A luminous pearl-fringe midi that moves with you — the ultimate birthday or dinner statement.',5),
('d6','Scarlet Crystal Gown',310000,'Dresses','New',true,'assets/img/drop-6.jpg','["assets/img/drop-6.jpg"]','["S","M","L","XL"]','Red crystal fringe with sculpted bardot bodice','Slight stretch','Dry clean only','Off-shoulder, true to size · custom sizing on request','M','Model is 5''9" / 1.75m and wearing a size M',5.0,16,'A sculpted scarlet gown with a dramatic bardot neckline and shimmering crystal fringe — couture-level glamour.',6)
on conflict (id) do update set
  name=excluded.name, price=excluded.price, category=excluded.category, tag=excluded.tag,
  bestseller=excluded.bestseller, image=excluded.image, images=excluded.images, sizes=excluded.sizes,
  fabric=excluded.fabric, stretch=excluded.stretch, care=excluded.care, fit=excluded.fit,
  model_size=excluded.model_size, model_info=excluded.model_info, rating=excluded.rating,
  reviews=excluded.reviews, description=excluded.description, sort=excluded.sort;
