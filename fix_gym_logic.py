import sys

with open('src/app/api/analytics/route.ts', 'r', encoding='utf-8') as f:
    content = f.read()

target = """             w.nivel_estres::int, w.estado_animo::int, w.dolor_zona, w.dolor_eva::int, w.fue_gimnasio, w.tqr::int,"""
replacement = """             w.nivel_estres::int, w.estado_animo::int, w.dolor_zona, w.dolor_eva::int,
             (COALESCE(w.fue_gimnasio, false) OR EXISTS(SELECT 1 FROM entrenamiento_logs el WHERE el.jugador_id = j.id AND el.fecha >= CURRENT_DATE - 1 AND el.rpe_gimnasio > 0)) AS fue_gimnasio, 
             w.tqr::int,"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/app/api/analytics/route.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success Analytics Route")
else:
    print("Target not found in Analytics Route")

with open('src/app/api/readiness/route.ts', 'r', encoding='utf-8') as f:
    content = f.read()

target = """           BOOL_AND(w.entrena_grupo::boolean) AS entrena_grupo, BOOL_OR(w.fue_gimnasio::boolean) AS fue_gimnasio,"""
replacement = """           BOOL_AND(w.entrena_grupo::boolean) AS entrena_grupo, 
           (BOOL_OR(w.fue_gimnasio::boolean) OR EXISTS(SELECT 1 FROM entrenamiento_logs el WHERE el.jugador_id = j.id AND el.fecha >= CURRENT_DATE - 2 AND el.rpe_gimnasio > 0)) AS fue_gimnasio,"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/app/api/readiness/route.ts', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success Readiness Route")
else:
    print("Target not found in Readiness Route")
