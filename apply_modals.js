const fs = require('fs');
let coach = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8');

// NewPlayerForm
coach = coach.replace(
  `<div style={{ background:'var(--ink2)', border:'1px solid rgba(200,241,53,.2)', borderRadius:14, padding:24 }} className="anim-up">\n      <p style={{ fontSize:13, fontWeight:600, color:'var(--lime)', marginBottom:18, textTransform:'uppercase', letterSpacing:'0.06em' }}>Nuevo Jugador</p>`,
  `<div className="modal-backdrop">\n      <div className="modal-content" style={{ padding: 32, width: '100%', maxWidth: 700 }}>\n        <p style={{ fontSize:15, fontWeight:700, color:'var(--lime)', marginBottom:24, textTransform:'uppercase', letterSpacing:'0.06em' }}>Nuevo Jugador</p>`
);
coach = coach.replace(
  `        <div style={{ display:'flex', gap:10 }}>\n          <button type="button" className="btn-ghost" style={{ flex:1 }} onClick={onCancel}>Cancelar</button>\n          <button type="submit" className="btn-lime" style={{ flex:1 }} disabled={loading}>{loading?'Creando...':'Crear jugador →'}</button>\n        </div>\n      </form>\n    </div>`,
  `        <div style={{ display:'flex', gap:12, marginTop:24 }}>\n          <button type="submit" className="btn-lime" style={{ flex:1 }} disabled={loading}>{loading?'Creando...':'Crear jugador →'}</button>\n          <button type="button" className="btn-ghost" style={{ flex:1 }} onClick={onCancel}>Cancelar</button>\n        </div>\n      </form>\n      </div>\n    </div>`
);

// BulkImportPanel
coach = coach.replace(
  `<div style={{ background:'var(--ink2)', border:'1px solid rgba(200,241,53,.2)', borderRadius:14, padding:24 }} className="anim-up">\n      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>\n        <p style={{ fontSize:13, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em' }}>\n          📤 Importación masiva de jugadores\n        </p>`,
  `<div className="modal-backdrop">\n      <div className="modal-content" style={{ padding: 32, width: '100%', maxWidth: 700 }}>\n      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>\n        <p style={{ fontSize:15, fontWeight:700, color:'var(--lime)', textTransform:'uppercase', letterSpacing:'0.06em' }}>\n          📤 Importación masiva de jugadores\n        </p>`
);
coach = coach.replace(
  `      </div>\n    </div>\n  )\n}\n\n//`,
  `      </div>\n      </div>\n    </div>\n  )\n}\n\n//`
);

// NewLesionForm
coach = coach.replace(
  `<div style={{ background:'var(--ink2)', border:'1px solid rgba(239,68,68,.25)', borderRadius:14, padding:20 }} className="anim-up">\n      <p style={{ fontSize:13, fontWeight:600, color:'#f87171', marginBottom:16, textTransform:'uppercase', letterSpacing:'0.06em' }}>`,
  `<div className="modal-backdrop">\n      <div className="modal-content" style={{ padding: 32, width: '100%', maxWidth: 700 }}>\n        <p style={{ fontSize:15, fontWeight:700, color:'#f87171', marginBottom:24, textTransform:'uppercase', letterSpacing:'0.06em' }}>`
);
coach = coach.replace(
  `<div style={{ display:'flex', gap:10 }}>\n          <button type="button" className="btn-ghost" style={{ flex:1 }} onClick={onCancel}>Cancelar</button>\n          <button type="submit" className="btn-lime" style={{ flex:1 }} disabled={loading}>{loading?'Registrando...':`,
  `<div style={{ display:'flex', gap:12, marginTop:24 }}>\n          <button type="submit" className="btn-lime" style={{ flex:1 }} disabled={loading}>{loading?'Registrando...':`
);
// Fix end of NewLesionForm manually later since regex with corrupted quotes is annoying
coach = coach.replace(
  `'}</button>\n        </div>\n      </form>\n    </div>\n  )\n}\n\n//`,
  `'}</button>\n          <button type="button" className="btn-ghost" style={{ flex:1 }} onClick={onCancel}>Cancelar</button>\n        </div>\n      </form>\n      </div>\n    </div>\n  )\n}\n\n//`
);


fs.writeFileSync('src/app/coach/CoachClient.tsx', coach, 'utf8');

let enf = fs.readFileSync('src/app/coach/EnfermeriaPanel.tsx', 'utf8');
enf = enf.replace(
  `function NewLesionFormEnf({ teamData, onSuccess }: { teamData: any[]; onSuccess: () => void }) {`,
  `function NewLesionFormEnf({ teamData, onSuccess, onCancel }: { teamData: any[]; onSuccess: () => void; onCancel: () => void }) {`
);
enf = enf.replace(
  `<div style={{ background: 'var(--ink2)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 14, padding: 24 }}>\n      <p style={{ fontSize: 14, fontWeight: 700, color: '#f87171', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.08em' }}>`,
  `<div className="modal-backdrop">\n      <div className="modal-content" style={{ padding: 32, width: '100%', maxWidth: 700 }}>\n      <p style={{ fontSize: 15, fontWeight: 700, color: '#f87171', marginBottom: 24, textTransform: 'uppercase', letterSpacing: '0.06em' }}>`
);
enf = enf.replace(
  `        <button type="submit" className="btn-lime" style={{ width: '100%', fontSize: 14, padding: '12px 0' }} disabled={loading || !f.jugador_id}>\n          {loading ? 'Registrando...' : `,
  `        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>\n          <button type="submit" className="btn-lime" style={{ flex: 1, fontSize: 14, padding: '12px 0' }} disabled={loading || !f.jugador_id}>\n            {loading ? 'Registrando...' : `
);
enf = enf.replace(
  `'}\n        </button>\n      </form>\n    </div>\n  )\n}`,
  `'}\n          </button>\n          <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={onCancel}>Cancelar</button>\n        </div>\n      </form>\n      </div>\n    </div>\n  )\n}`
);
fs.writeFileSync('src/app/coach/EnfermeriaPanel.tsx', enf, 'utf8');
