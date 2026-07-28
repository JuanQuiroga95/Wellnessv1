const fs = require('fs');
let text = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8');

const startIndex = text.indexOf('function CambioCargaPanel() {');
const endIndex = text.indexOf('function getSesionStyle(s: any, withWidth = true) {');

if (startIndex !== -1 && endIndex !== -1) {
  text = text.substring(0, startIndex) + text.substring(endIndex);
  text = text.replace("{id:'cambio-carga',label:'Cambio de Carga'},", "");
  text = text.replace("{id:'cambio-carga',label:'Cambio de Carga',icon:'🔄'},", "");
  text = text.replace("{tab==='cambio-carga' && <CambioCargaPanel />}", "");
  text = text.replace("{ id:'cambio-carga',   label:'Cambio de Carga',      icon:'🔄' },", "");
  
  const dictStart = text.indexOf("'cambio-carga': (");
  if (dictStart !== -1) {
    const dictEnd = text.indexOf("'expo-ai': (", dictStart);
    if (dictEnd !== -1) {
       text = text.substring(0, dictStart) + text.substring(dictEnd);
    }
  }
  
  fs.writeFileSync('src/app/coach/CoachClient.tsx', text, 'utf8');
  console.log('done');
} else {
  console.log('not found');
}
