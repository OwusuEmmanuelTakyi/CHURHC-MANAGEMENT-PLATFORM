-- 002_seed.sql — the seven locals, plus UG's wings and classes for testing

INSERT INTO locals (name, short_code, university_name) VALUES
  ('GHAMSU UG',    'UG',    'University of Ghana, Legon'),
  ('GHAMSU KNUST', 'KNUST', 'Kwame Nkrumah University of Science and Technology'),
  ('GHAMSU UCC',   'UCC',   'University of Cape Coast'),
  ('GHAMSU UEW',   'UEW',   'University of Education, Winneba'),
  ('GHAMSU UDS',   'UDS',   'University for Development Studies'),
  ('GHAMSU GIMPA', 'GIMPA', 'Ghana Institute of Management and Public Administration'),
  ('GHAMSU ATU',   'ATU',   'Accra Technical University');

-- Wings for UG (id 1, since locals inserted in order)
INSERT INTO wings (local_id, name)
SELECT id, w FROM locals, unnest(ARRAY[
  'Media', 'Choir', 'Drama', 'Ushering', 'Prayer', 'Welfare'
]) AS w
WHERE short_code = 'UG';

-- Classes for UG
INSERT INTO classes (local_id, name)
SELECT id, c FROM locals, unnest(ARRAY[
  'Morning Glory', 'Sunrise', 'Calvary', 'Ebenezer'
]) AS c
WHERE short_code = 'UG';