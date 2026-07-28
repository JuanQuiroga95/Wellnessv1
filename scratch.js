const fs = require('fs');
let content = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8');

const newCalc = const DENSITY_TABLE: any = {
  acc_2: { "<10": { cant: 1.00, m: 5.80 }, "10-30": { cant: 2.10, m: 11.00 }, "30-50": { cant: 2.65, m: 13.90 }, "50-70": { cant: 3.10, m: 16.30 }, "70-100": { cant: 2.70, m: 14.50 }, "100-150": { cant: 2.30, m: 12.30 }, "150-180": { cant: 1.80, m: 9.60 }, "180-200": { cant: 1.50, m: 8.00 }, ">200": { cant: 1.25, m: 6.60 } },
  dec_2: { "<10": { cant: 1.30, m: 6.90 }, "10-30": { cant: 2.20, m: 11.80 }, "30-50": { cant: 2.90, m: 15.60 }, "50-70": { cant: 3.35, m: 18.00 }, "70-100": { cant: 2.95, m: 15.80 }, "100-150": { cant: 2.45, m: 13.20 }, "150-180": { cant: 1.95, m: 10.50 }, "180-200": { cant: 1.65, m: 8.80 }, ">200": { cant: 1.40, m: 7.50 } },
  acc_3: { "<10": { cant: 0.15, m: 1.20 }, "10-30": { cant: 0.30, m: 2.40 }, "30-50": { cant: 0.45, m: 3.60 }, "50-70": { cant: 0.60, m: 4.80 }, "70-100": { cant: 0.50, m: 4.00 }, "100-150": { cant: 0.40, m: 3.20 }, "150-180": { cant: 0.35, m: 2.80 }, "180-200": { cant: 0.30, m: 2.40 }, ">200": { cant: 0.28, m: 2.20 } },
  dec_3: { "<10": { cant: 0.20, m: 1.50 }, "10-30": { cant: 0.40, m: 3.00 }, "30-50": { cant: 0.60, m: 4.50 }, "50-70": { cant: 0.75, m: 5.60 }, "70-100": { cant: 0.65, m: 4.90 }, "100-150": { cant: 0.55, m: 4.10 }, "150-180": { cant: 0.45, m: 3.40 }, "180-200": { cant: 0.40, m: 3.00 }, ">200": { cant: 0.35, m: 2.60 } },
  hsr: { "<10": { cant: 0.00, m: 0.00 }, "10-30": { cant: 0.00, m: 0.00 }, "30-50": { cant: 0.05, m: 0.50 }, "50-70": { cant: 0.15, m: 2.50 }, "70-100": { cant: 0.35, m: 5.50 }, "100-150": { cant: 0.60, m: 10.00 }, "150-180": { cant: 0.75, m: 12.50 }, "180-200": { cant: 0.85, m: 14.20 }, ">200": { cant: 1.00, m: 16.50 } },
  sprint: { "<10": { cant: 0.00, m: 0.00 }, "10-30": { cant: 0.00, m: 0.00 }, "30-50": { cant: 0.00, m: 0.00 }, "50-70": { cant: 0.00, m: 0.00 }, "70-100": { cant: 0.00, m: 0.00 }, "100-150": { cant: 0.05, m: 1.50 }, "150-180": { cant: 0.12, m: 3.50 }, "180-200": { cant: 0.20, m: 5.80 }, ">200": { cant: 0.30, m: 8.50 } }
};

function calcularDistancias(jugadores: number, largo: number, ancho: number, series: number, minutos: number) {
  if (!jugadores || !largo || !ancho || !series || !minutos) return null
  const espacioM2 = largo * ancho
  const densidad = espacioM2 / jugadores
  const tiempoTotal = series * minutos
  const distTotal = Math.max(0, (19.243 * Math.log(densidad) - 5.029) * tiempoTotal)
  const distMP = Math.max(0, (7.0421 * Math.log(densidad) - 15.255) * tiempoTotal)
  
  let r = ">200";
  if (densidad < 10) r = "<10";
  else if (densidad < 30) r = "10-30";
  else if (densidad < 50) r = "30-50";
  else if (densidad < 70) r = "50-70";
  else if (densidad < 100) r = "70-100";
  else if (densidad < 150) r = "100-150";
  else if (densidad < 180) r = "150-180";
  else if (densidad < 200) r = "180-200";

  const t = DENSITY_TABLE;
  const nAcel = Math.round(t.acc_2[r].cant * tiempoTotal);
  const distAcel = Number((t.acc_2[r].m * tiempoTotal).toFixed(1));
  const nDecel = Math.round(t.dec_2[r].cant * tiempoTotal);
  const distDecel = Number((t.dec_2[r].m * tiempoTotal).toFixed(1));
  const nAcel3 = Math.round(t.acc_3[r].cant * tiempoTotal);
  const dist_acc_hi = Number((t.acc_3[r].m * tiempoTotal).toFixed(1));
  const nDecel3 = Math.round(t.dec_3[r].cant * tiempoTotal);
  const dist_dec_hi = Number((t.dec_3[r].m * tiempoTotal).toFixed(1));
  const nSprints = Math.round(t.hsr[r].cant * tiempoTotal);
  const distSprint = Number((t.hsr[r].m * tiempoTotal).toFixed(1));
  const sprintN25 = Math.round(t.sprint[r].cant * tiempoTotal);
  const distSprint25 = Number((t.sprint[r].m * tiempoTotal).toFixed(1));

  return { distTotal, distSprint, distMP, distAcel, distDecel, nSprints, nAcel, nDecel, nAcel3, nDecel3, dist_acc_hi, dist_dec_hi, sprintN25, distSprint25, densidad, tiempoTotal }
};

content = content.replace(/function calcularDistancias[\s\S]*?return \{ distTotal, distSprint.*?\}\n\}/, newCalc);

const newMap = {[
                ['Dist. total','distTotal','m'],
                ['Alta pot. >20W/kg','distMP','m'],
                ['Acc > 2 m/s² (Cant)','nAcel',''],
                ['Acc > 2 m/s² (Metros)','distAcel','m'],
                ['Desac > 2 m/s² (Cant)','nDecel',''],
                ['Desac > 2 m/s² (Metros)','distDecel','m'],
                ['Acc > 3 m/s² (Cant)','nAcel3',''],
                ['Acc > 3 m/s² (Metros)','dist_acc_hi','m'],
                ['Desac > 3 m/s² (Cant)','nDecel3',''],
                ['Desac > 3 m/s² (Metros)','dist_dec_hi','m'],
                ['HSR Cantidad','nSprints',''],
                ['HSR Metros','distSprint','m'],
                ['Sprint Cantidad','sprintN25',''],
                ['Sprint Metros','distSprint25','m']
              ].map(([label,key,unit])=>{;

content = content.replace(/\{\[\['Dist\. total','distTotal','m'\][\s\S]*?\]\.map\(\(\[label,key,unit\]\)=>/, newMap);

const newKeys = "const metricKeys = ['distTotal','distMP','nAcel','distAcel','nDecel','distDecel','nAcel3','dist_acc_hi','nDecel3','dist_dec_hi','nSprints','distSprint','sprintN25','distSprint25']";
const newLabels = "const metricLabels = ['Dist. total','Alta pot. >20W/kg','Acc > 2 (Cant)','Acc > 2 (Metros)','Desac > 2 (Cant)','Desac > 2 (Metros)','Acc > 3 (Cant)','Acc > 3 (Metros)','Desac > 3 (Cant)','Desac > 3 (Metros)','HSR Cantidad','HSR Metros','Sprint Cantidad','Sprint Metros']";
const newUnits = "const metricUnits = ['m','m','','m','','m','','m','','m','','m','','m']";

// Replace line 2802 block
content = content.replace(/const metricKeys = \['distTotal.*?\]\n\s*const metricLabels = \['Dist\. total.*?\]\n\s*const metricUnits = \['m.*?\]/g, 
  newKeys + "\\n                      " + newLabels + "\\n                      " + newUnits);

content = content.replace(/const metricKeys = \['distTotal.*?\]\n\s*const metricLabels = \['Dist\. total.*?\]\n\s*const metricUnits = \['m.*?\]/g, 
  newKeys + "\\n  " + newLabels + "\\n  " + newUnits);

content = content.replace(/const metricKeys = \['distTotal.*?\]\n\s*const metricLabels = \['Dist\. total.*?\]\n\s*const metricUnits = \['m.*?\]/g, 
  newKeys + "\\n        " + newLabels + "\\n        " + newUnits);

content = content.replace(/gridTemplateColumns:'repeat\(5,1fr\)'/g, "gridTemplateColumns:'repeat(6,1fr)'");
content = content.replace(/grid-template-columns:repeat\(5,1fr\)/g, "grid-template-columns:repeat(6,1fr)");

fs.writeFileSync('src/app/coach/CoachClient.tsx', content);
console.log('done');
