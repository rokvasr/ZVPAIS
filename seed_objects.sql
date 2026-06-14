SET client_encoding = 'UTF8';

INSERT INTO objects (name, description, total_mass, total_volume, created_at) VALUES
('Naftos produktu saugykla',     'Pozeminiai naftos produktu rezervuarai. Talpyklose laikomas dyzelinas, benzinas ir tepalai.',             50.0,  60.0,  NOW()),
('Transformatorine podstancija', 'Aukstosios itampos transformatoriai su alyva. Gedimo atveju alyva patenka i grunta ir gruntini vandeni.', 8.0,   10.0,  NOW()),
('Nuoteku valymo irenginiai',    'Praminiu nuoteku valymo irenginiai. Gedimo atveju neisvalytos nuotekos patenka i vandens telkini.',       NULL,  500.0, NOW()),
('Cheminiu medziagu sandelis',   'Sandelis su pramoniniais chemikalais: tirpikliais, rugstimis ir sunkiaisiais metalais.',                  15.0,  20.0,  NOW()),
('Kateline',                     'Mazutu kurenama kateline. Gedimo atveju ismetami SO2, NOx ir kietosios dalelės i atmosfera.',             NULL,  NULL,  NOW()),
('Galvaninis cechas',            'Metalu galvanine dengimo dirbtuves su rugstiu ir sunkiuju metalu vonelėmis.',                             5.0,   8.0,   NOW()),
('Naftos vamzdynas',             'Pozeminis naftos tiekimo vamzdynas. Nutekelimo atveju naftos produktai patenka i grunta.',                30.0,  35.0,  NOW());

INSERT INTO object_materials (object_id, material_id, mass, volume, percentage, recovered_quantity)
SELECT o.id_object, m.id_material, vals.mass, vals.volume, vals.pct, NULL
FROM (VALUES
  ('Naftos produktu saugykla',     'IV',  'vanduo', 45.0, 52.0, 90.0),
  ('Naftos produktu saugykla',     'V',   'vanduo',  5.0,  8.0, 10.0),
  ('Transformatorine podstancija', 'IV',  'vanduo',  7.5,  9.0, 95.0),
  ('Transformatorine podstancija', 'III', 'vanduo',  0.5,  1.0,  5.0),
  ('Nuoteku valymo irenginiai',    'BDS', NULL,      2.0, NULL, 40.0),
  ('Nuoteku valymo irenginiai',    'Susp',NULL,      1.5, NULL, 30.0),
  ('Nuoteku valymo irenginiai',    'Baz', NULL,      0.8, NULL, 16.0),
  ('Nuoteku valymo irenginiai',    'Baf', NULL,      0.2, NULL,  4.0),
  ('Nuoteku valymo irenginiai',    'Sulf',NULL,      0.5, NULL, 10.0),
  ('Cheminiu medziagu sandelis',   'II',  'vanduo',  4.0,  5.0, 27.0),
  ('Cheminiu medziagu sandelis',   'III', 'vanduo',  8.0, 10.0, 53.0),
  ('Cheminiu medziagu sandelis',   'IV',  'vanduo',  3.0,  5.0, 20.0),
  ('Kateline', 'SO',  NULL, 1.2, NULL, 40.0),
  ('Kateline', 'NO',  NULL, 0.9, NULL, 30.0),
  ('Kateline', 'Kiet',NULL, 0.6, NULL, 20.0),
  ('Kateline', 'IV',  'oras',0.3, NULL, 10.0),
  ('Galvaninis cechas', 'II',  'vanduo', 2.0, 3.0, 40.0),
  ('Galvaninis cechas', 'III', 'vanduo', 1.5, 2.0, 30.0),
  ('Galvaninis cechas', 'II',  'oras',   0.8, NULL, 16.0),
  ('Galvaninis cechas', 'III', 'oras',   0.7, NULL, 14.0),
  ('Naftos vamzdynas', 'IV', 'vanduo', 28.0, 32.0, 93.0),
  ('Naftos vamzdynas', 'V',  'vanduo',  2.0,  3.0,  7.0)
) AS vals(obj_name, grp, env, mass, volume, pct)
JOIN objects o ON o.name = vals.obj_name
JOIN materials m ON
  CASE vals.grp
    WHEN 'BDS'  THEN m.name LIKE 'BDS%'
    WHEN 'Susp' THEN m.name LIKE 'Suspenduotos%'
    WHEN 'Baz'  THEN m.name LIKE 'Bendras azotas%'
    WHEN 'Baf'  THEN m.name LIKE 'Bendras fosforas%'
    WHEN 'Sulf' THEN m.name LIKE 'Sulfatai%'
    WHEN 'SO'   THEN m.name LIKE 'SO%dioksidas%'
    WHEN 'NO'   THEN m.name LIKE 'NO%oksidai%'
    WHEN 'Kiet' THEN m.name LIKE 'Kietosios%'
    WHEN 'I'    THEN m.name LIKE 'I grup%' AND (vals.env IS NULL OR (vals.env = 'oras' AND m.name LIKE '%(oras)%') OR (vals.env = 'vanduo' AND m.name LIKE '%(vanduo%'))
    WHEN 'II'   THEN m.name LIKE 'II grup%' AND (vals.env = 'oras' AND m.name LIKE '%(oras)%' OR vals.env = 'vanduo' AND m.name LIKE '%(vanduo%')
    WHEN 'III'  THEN m.name LIKE 'III grup%' AND (vals.env = 'oras' AND m.name LIKE '%(oras)%' OR vals.env = 'vanduo' AND m.name LIKE '%(vanduo%')
    WHEN 'IV'   THEN m.name LIKE 'IV grup%' AND (vals.env = 'oras' AND m.name LIKE '%(oras)%' OR vals.env = 'vanduo' AND m.name LIKE '%(vanduo%')
    WHEN 'V'    THEN m.name LIKE 'V grup%' AND m.name LIKE '%(vanduo%'
    ELSE FALSE
  END;
