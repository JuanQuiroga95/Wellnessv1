const fs = require('fs')

let coach = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8')

// Replace PDF buttons and Actualizar buttons
coach = coach.replace(/style=\{\{\s*fontSize:\s*11,\s*padding:\s*'8px 14px',\s*borderRadius:\s*8,\s*background:\s*'rgba\(200,241,53,\.1\)',\s*color:\s*'var\(--lime\)',\s*border:\s*'1px solid rgba\(200,241,53,\.3\)',\s*cursor:\s*'pointer'(,\s*marginBottom:\s*1)?\s*\}\}/g, 'className="btn-ghost-lime"')
coach = coach.replace(/style=\{\{\s*fontSize:\s*11,\s*padding:\s*'8px 12px',\s*borderRadius:\s*8,\s*background:\s*'rgba\(200,241,53,\.1\)',\s*color:\s*'var\(--lime\)',\s*border:\s*'1px solid rgba\(200,241,53,\.3\)',\s*cursor:\s*'pointer'\s*\}\}/g, 'className="btn-ghost-lime"')

coach = coach.replace(/style=\{\{\s*fontSize:\s*11,\s*padding:\s*'8px 14px',\s*borderRadius:\s*8,\s*background:\s*'rgba\(96,165,250,\.1\)',\s*color:\s*'#60a5fa',\s*border:\s*'1px solid rgba\(96,165,250,\.3\)',\s*cursor:\s*'pointer'\s*\}\}/g, 'className="btn-ghost-blue"')

coach = coach.replace(/style=\{\{\s*fontSize:\s*11,\s*padding:\s*'8px 14px',\s*borderRadius:\s*8,\s*background:loading\?'rgba\(255,255,255,\.04\)':'rgba\(96,165,250,\.1\)',\s*color:loading\?'var\(--fog\)':'#60a5fa',\s*border:\s*'1px solid rgba\(96,165,250,\.3\)',\s*cursor:loading\?'default':'pointer'\s*\}\}/g, 'className="btn-ghost-blue"')

coach = coach.replace(/style=\{\{\s*fontSize:\s*12,\s*padding:\s*'7px 14px',\s*borderRadius:\s*9,\s*background:\s*'rgba\(200,241,53,\.1\)',\s*border:\s*'1px solid rgba\(200,241,53,\.3\)',\s*color:\s*loading\s*\?\s*'var\(--fog\)'\s*:\s*'var\(--lime\)',\s*cursor:\s*loading\s*\?\s*'default'\s*:\s*'pointer',\s*fontWeight:\s*600,\s*display:\s*'flex',\s*alignItems:\s*'center',\s*gap:\s*5\s*\}\}/g, 'className="btn-ghost-lime"')

// Also replace the old "Imprimir / Guardar PDF" buttons
coach = coach.replace(/<button onclick="window\.print\(\)" style="padding:8px 20px;background:#1a1a1a;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px">/g, '<button onClick={() => window.print()} className="btn-ghost" style={{ padding: "8px 20px" }}>')
coach = coach.replace(/<button onclick="window\.print\(\)" style="padding:8px 20px;background:#1d4ed8;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;">/g, '<button onClick={() => window.print()} className="btn-ghost-blue" style={{ padding: "8px 20px" }}>')


fs.writeFileSync('src/app/coach/CoachClient.tsx', coach)
