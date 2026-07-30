import sys

def modify_page():
    path = 'src/app/coach/page.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    target = """      recentLogs: logs.map(l => ({ id: Number(l.id), fecha: String(l.fecha), carga_ua: Number(l.carga_ua)||0, rpe: Number(l.rpe)||0, rpe_gimnasio: Number(l.rpe_gimnasio)||null, duracion_min: Number(l.duracion_min)||0 })),\n      lastWellness: lastW,"""
    
    replacement = """      recentLogs: (() => {
        const uniqueLogsMap = new Map();
        logs.forEach(l => {
          const fechaStr = String(l.fecha);
          const currentRpe = Number(l.rpe) || 0;
          const currentUa = Number(l.carga_ua) || 0;
          if (!uniqueLogsMap.has(fechaStr)) {
            uniqueLogsMap.set(fechaStr, l);
          } else {
            const existing = uniqueLogsMap.get(fechaStr);
            if (currentRpe > (Number(existing.rpe) || 0) || currentUa > (Number(existing.carga_ua) || 0)) {
              uniqueLogsMap.set(fechaStr, l);
            }
          }
        });
        return Array.from(uniqueLogsMap.values()).map(l => ({ id: Number(l.id), fecha: String(l.fecha), carga_ua: Number(l.carga_ua)||0, rpe: Number(l.rpe)||0, rpe_gimnasio: Number(l.rpe_gimnasio)||null, duracion_min: Number(l.duracion_min)||0 }));
      })(),
      lastWellness: lastW,"""
      
    if target in content:
        content = content.replace(target, replacement)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Success page.tsx")
    else:
        print("Target not found in page.tsx")

modify_page()
