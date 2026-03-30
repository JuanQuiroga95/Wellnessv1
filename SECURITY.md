# Seguridad — W&P Wellness & Performance

## Medidas implementadas

### Autenticación
- JWT firmado con HS256, expira en 7 días
- Cookie httpOnly + secure + sameSite=strict (protege contra XSS y CSRF)
- Contraseñas hasheadas con bcrypt (cost 12)
- Comparación de passwords en tiempo constante (previene timing attacks)

### Rate Limiting
- Login: máx 10 intentos por IP cada 15 minutos
- Endpoints de escritura: máx 30-100 req/min por IP

### Autorización
- Cada admin solo accede a datos de su club (verificación server-side en todos los endpoints)
- Jugadores solo leen/escriben sus propios datos
- master_admin requerido para migraciones y seeds
- Cron endpoints solo accesibles con header x-vercel-cron o CRON_SECRET

### Headers de seguridad
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

### Validación de inputs
- Sanitización de strings (longitud máx, caracteres de control)
- Validación de enteros con rango min/max
- Verificación de ownership antes de cualquier UPDATE/DELETE

## Variables de entorno requeridas
Ver `.env.example`

## Recomendaciones adicionales para producción
1. Configurar JWT_SECRET en Vercel con un valor de mínimo 32 caracteres aleatorios
2. En Neon: crear usuario de DB de solo lectura para monitoreo, mantener el admin solo para deploy
3. Activar Vercel Authentication para el dashboard de Vercel mismo
4. Revisar logs de Vercel regularmente para detectar patrones de abuso
