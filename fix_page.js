const fs = require('fs');
let page = fs.readFileSync('src/app/coach/page.tsx', 'utf8');
page = page.replace(
  'j.peso_kg::text AS peso_kg, j.estatura_cm, j.pie_habil, j.foto_url',
  'j.peso_kg::text AS peso_kg, j.estatura_cm, j.pie_habil, j.foto_url, j.fecha_nacimiento::text AS fecha_nacimiento'
);
page = page.replace(
  'j.peso_kg::text AS peso_kg, j.estatura_cm, j.pie_habil, j.foto_url',
  'j.peso_kg::text AS peso_kg, j.estatura_cm, j.pie_habil, j.foto_url, j.fecha_nacimiento::text AS fecha_nacimiento'
);
page = page.replace(
  'foto_url: p.foto_url ? String(p.foto_url) : null,',
  'foto_url: p.foto_url ? String(p.foto_url) : null,\n      fecha_nacimiento: p.fecha_nacimiento ? String(p.fecha_nacimiento) : null,'
);
fs.writeFileSync('src/app/coach/page.tsx', page, 'utf8');
