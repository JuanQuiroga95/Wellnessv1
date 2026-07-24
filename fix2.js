const fs = require('fs');
const path = 'src/app/coach/CoachClient.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove the accidentally inserted line
content = content.replace(
  "if (!ori || ori === '') {\r\n                      <CuadroHeader title=\"DISTRIBUCIÓN DE CARGA MENSUAL\" subtitle=\"Orientación Física\" icon={Icons.estadisticas || '📊'} description=\"Porcentaje de tareas asignadas a cada cualidad física en el mes seleccionado.\" />\r\n                      const jug =",
  "if (!ori || ori === '') {\r\n                      const jug ="
);

content = content.replace(
  "if (!ori || ori === '') {\n                      <CuadroHeader title=\"DISTRIBUCIÓN DE CARGA MENSUAL\" subtitle=\"Orientación Física\" icon={Icons.estadisticas || '📊'} description=\"Porcentaje de tareas asignadas a cada cualidad física en el mes seleccionado.\" />\n                      const jug =",
  "if (!ori || ori === '') {\n                      const jug ="
);

// 2. Replace the actual title
const target = `<div style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                   📊 Distribución de Carga Mensual (Orientación Física)
                 </div>`;
const replacement = `<CuadroHeader title="DISTRIBUCIÓN DE CARGA MENSUAL" subtitle="Orientación Física" icon={Icons.estadisticas || '📊'} description="Porcentaje de tareas asignadas a cada cualidad física en el mes seleccionado." />`;

content = content.replace(target, replacement);

const targetWindows = `<div style={{ fontSize:10, fontWeight:700, color:'var(--silver)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>\r\n                   📊 Distribución de Carga Mensual (Orientación Física)\r\n                 </div>`;
content = content.replace(targetWindows, replacement);

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed CoachClient.tsx');
