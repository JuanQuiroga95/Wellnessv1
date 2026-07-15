const fs = require('fs');

let coach = fs.readFileSync('src/app/coach/CoachClient.tsx', 'utf8').replace(/\r\n/g, '\n');
coach = coach.replace(
  `<div style={{ background:'var(--ink2)', border:'1px solid rgba(239,68,68,.25)', borderRadius:14, padding:20 }} className="anim-up">\n      <p style={{ fontSize:13, fontWeight:600, color:'#f87171', marginBottom:16, textTransform:'uppercase', letterSpacing:'0.06em' }}>`,
  `<div className="modal-backdrop">\n      <div className="modal-content" style={{ padding: 32, width: '100%', maxWidth: 700 }}>\n        <p style={{ fontSize:15, fontWeight:700, color:'#f87171', marginBottom:24, textTransform:'uppercase', letterSpacing:'0.06em' }}>`
);
coach = coach.replace(
  `<div style={{ display:'flex', gap:10 }}>\n          <button type="button" className="btn-ghost" style={{ flex:1 }} onClick={onCancel}>Cancelar</button>\n          <button type="submit" className="btn-lime" style={{ flex:1 }} disabled={loading}>{loading?'Registrando...':`,
  `<div style={{ display:'flex', gap:12, marginTop:24 }}>\n          <button type="submit" className="btn-lime" style={{ flex:1 }} disabled={loading}>{loading?'Registrando...':`
);
coach = coach.replace(
  `'Registrar lesión →'}</button>\n        </div>\n      </form>\n    </div>\n  )\n}\n\n//`,
  `'Registrar lesión →'}</button>\n          <button type="button" className="btn-ghost" style={{ flex:1 }} onClick={onCancel}>Cancelar</button>\n        </div>\n      </form>\n      </div>\n    </div>\n  )\n}\n\n//`
);
// In case the character is corrupted in source
coach = coach.replace(
  `'Registrar lesin ''}</button>\n        </div>\n      </form>\n    </div>\n  )\n}\n\n//`,
  `'Registrar lesión →'}</button>\n          <button type="button" className="btn-ghost" style={{ flex:1 }} onClick={onCancel}>Cancelar</button>\n        </div>\n      </form>\n      </div>\n    </div>\n  )\n}\n\n//`
);

// If the previous replace failed because of encoding, try regex
coach = coach.replace(
  /'Registrar lesi.*\}<\/button>\n        <\/div>\n      <\/form>\n    <\/div>\n  \)\n\}\n\n\/\//,
  `'Registrar lesión →'}</button>\n          <button type="button" className="btn-ghost" style={{ flex:1 }} onClick={onCancel}>Cancelar</button>\n        </div>\n      </form>\n      </div>\n    </div>\n  )\n}\n\n//`
);
fs.writeFileSync('src/app/coach/CoachClient.tsx', coach, 'utf8');

let enf = fs.readFileSync('src/app/coach/EnfermeriaPanel.tsx', 'utf8').replace(/\r\n/g, '\n');
enf = enf.replace(
  `function NewLesionFormEnf({ teamData, onSuccess }: { teamData: any[]; onSuccess: () => void }) {`,
  `function NewLesionFormEnf({ teamData, onSuccess, onCancel }: { teamData: any[]; onSuccess: () => void; onCancel?: () => void }) {`
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

console.log(enf.includes('modal-backdrop'));
