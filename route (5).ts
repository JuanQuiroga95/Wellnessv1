@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;
:root{--lime:#c8f135;--ink:#080808;--ink2:#111;--ink3:#1a1a1a;--mist:#252525;--fog:#333;--silver:#888;--snow:#eee;--green:#22c55e;--amber:#f59e0b;--red:#ef4444}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',system-ui,sans-serif;background:var(--ink);color:var(--snow);min-height:100vh;-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:var(--fog);border-radius:2px}
.display{font-family:'Bebas Neue',sans-serif;letter-spacing:.03em;line-height:.92}
.mono{font-family:'DM Mono',monospace}
@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes scanMove{from{top:-5%}to{top:110%}}
.anim-up{animation:slideUp .4s cubic-bezier(.16,1,.3,1) both}
.delay-1{animation-delay:.07s}.delay-2{animation-delay:.14s}.delay-3{animation-delay:.21s}
.ticker-wrap{overflow:hidden;white-space:nowrap}
.ticker-inner{display:inline-block;animation:ticker 18s linear infinite}
.scanline{position:absolute;left:0;width:100%;height:1px;background:linear-gradient(90deg,transparent,rgba(200,241,53,.12),transparent);animation:scanMove 4s ease-in-out infinite;pointer-events:none}
.card{background:var(--ink2);border:1px solid var(--mist);border-radius:16px}
.wp-input{width:100%;background:var(--ink3);border:1px solid var(--fog);border-radius:10px;padding:10px 14px;font-size:14px;font-family:'DM Sans',sans-serif;color:var(--snow);outline:none;transition:border-color .15s}
.wp-input:focus{border-color:var(--lime)}
.wp-input::placeholder{color:var(--silver)}
.btn-lime{background:var(--lime);color:var(--ink);border:none;border-radius:10px;padding:11px 22px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:opacity .15s}
.btn-lime:hover{opacity:.9}.btn-lime:disabled{opacity:.35;cursor:default}
.btn-ghost{background:transparent;color:var(--silver);border:1px solid var(--fog);border-radius:10px;padding:10px 18px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;transition:color .15s,border-color .15s}
.btn-ghost:hover{color:var(--snow);border-color:var(--silver)}
.nav-tab{padding:8px 14px;border-radius:8px;font-size:13px;font-weight:500;color:var(--silver);background:transparent;border:none;cursor:pointer;white-space:nowrap;transition:color .15s,background .15s}
.nav-tab:hover{color:var(--snow);background:var(--mist)}
.nav-tab.active{color:var(--lime);background:rgba(200,241,53,.1)}
