const fs = require('fs');

// 1. Fix CoachClient.tsx
let coachClient = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8');

// Fix openPlayer types
coachClient = coachClient.replace('async function openPlayer(p, c) {', 'async function openPlayer(p: any, c?: string) {');

// Fix array tuple inference issue at line 4509
coachClient = coachClient.replace(
  "{[['desde','Desde',desde,setDesde],['hasta','Hasta',hasta,setHasta]].map(([id,lbl,val,setter])=>(",
  "{[ {id:'desde',lbl:'Desde',val:desde,setter:setDesde}, {id:'hasta',lbl:'Hasta',val:hasta,setter:setHasta} ].map(({id,lbl,val,setter}: any)=>( "
);

// Fix onClick={load} error at line 1631
coachClient = coachClient.replace(
  `<button className="btn-ghost" style={{ fontSize:12, padding:'8px 14px' }} onClick={load}>Actualizar</button>`,
  `<button className="btn-ghost" style={{ fontSize:12, padding:'8px 14px' }} onClick={() => load()}>Actualizar</button>`
);

// Fix Object.values(wMap).map(w => ({
coachClient = coachClient.replace(
  `return Object.values(wMap).map(w => ({`,
  `return Object.values(wMap).map((w: any) => ({`
);

// Fix [...new Set(
coachClient = coachClient.replace(
  `const allEventDays = [...new Set([`,
  `const allEventDays = Array.from(new Set([`
);

// Write coachClient to lines to fix multiline bugs
let lines = coachClient.split('\n');
[2984, 5759, 6867, 7496, 8978, 10674].forEach(l => {
  let line = lines[l-1];
  if (line) {
    if (l === 2984) {
      lines[l-1] = line.replace('isAnimationActive={true}', '');
    } else {
      lines[l-1] = line.replace(/className="[^"]*"/, '');
    }
  }
});
fs.writeFileSync('src/app/coach/CoachClient.tsx', lines.join('\n'));

// 2. Fix InicioPanel.tsx
let inicioPanel = fs.readFileSync('src/app/coach/InicioPanel.tsx', 'utf8');
inicioPanel = inicioPanel.replace(
  'const diffTime = Math.abs(bday - today);',
  'const diffTime = Math.abs(bday.getTime() - today.getTime());'
);
fs.writeFileSync('src/app/coach/InicioPanel.tsx', inicioPanel);

// 3. Fix acwr.ts
let acwr = fs.readFileSync('src/lib/acwr.ts', 'utf8');
acwr = acwr.replace(
  '[...new Set([...Object.keys(cargaAguda), ...Object.keys(cargaCronica)])]',
  'Array.from(new Set([...Object.keys(cargaAguda), ...Object.keys(cargaCronica)]))'
);
fs.writeFileSync('src/lib/acwr.ts', acwr);

// 4. Fix security.ts
let security = fs.readFileSync('src/lib/security.ts', 'utf8');
security = security.replace(
  'for (const [ip, data] of ipStore.entries()) {',
  'for (const [ip, data] of Array.from(ipStore.entries())) {'
);
fs.writeFileSync('src/lib/security.ts', security);

// 5. Fix PushNotificationManager.tsx
let pushManager = fs.readFileSync('src/components/ui/PushNotificationManager.tsx', 'utf8');
pushManager = pushManager.replace(
  /applicationServerKey: new Uint8Array\(new Buffer\(/g,
  'applicationServerKey: new Uint8Array(Buffer.from('
);
pushManager = pushManager.replace(
  /applicationServerKey: new Uint8Array\(Buffer\.from\((.*?)\)\)/g,
  'applicationServerKey: new Uint8Array(Buffer.from($1)) as unknown as BufferSource'
);
fs.writeFileSync('src/components/ui/PushNotificationManager.tsx', pushManager);

// 6. Fix RPEForm.tsx and WellnessForm.tsx
let rpeForm = fs.readFileSync('src/components/forms/RPEForm.tsx', 'utf8');
rpeForm = rpeForm.replace(
  /<ScoreSlider id="(\w+)" value=\{form\.(\w+)\} onChange=\{v=>setForm\(\{ \.\.\.form, \2: v \}\)\} min=\{0\} max=\{10\} lowLabel="[^"]*" highLabel="[^"]*" isRpe=\{true\} \/>/g,
  (match) => match.replace('isRpe={true} />', 'isRpe={true} customColors={[]} />')
);
fs.writeFileSync('src/components/forms/RPEForm.tsx', rpeForm);

let wellnessForm = fs.readFileSync('src/components/forms/WellnessForm.tsx', 'utf8');
wellnessForm = wellnessForm.replace(
  /<ScoreSlider id="(\w+)" value=\{form\.(\w+)\} onChange=\{v=>setForm\(\{ \.\.\.form, \2: v \}\)\} lowLabel="[^"]*" highLabel="[^"]*" \/>/g,
  (match) => match.replace('/>', 'customColors={[]} />')
);
fs.writeFileSync('src/components/forms/WellnessForm.tsx', wellnessForm);
