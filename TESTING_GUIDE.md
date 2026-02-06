# 🧪 Guía de Pruebas - Sistema de Autenticación

## Pruebas Automatizadas (Checklist)

### ✅ Prueba 1: Refresh en Onboarding Completo
**Objetivo:** Verificar que usuarios con onboarding completo no vuelvan a /onboarding al refrescar

**Pasos:**
1. Inicia sesión con un usuario que YA completó el onboarding
2. Verifica que estás en `/dashboard`
3. Presiona `Ctrl + Shift + R` (hard refresh)
4. ✅ **Resultado esperado:** Deberías permanecer en `/dashboard`
5. ❌ **Falla si:** Te redirige a `/onboarding/role`

**Debugging si falla:**
```sql
-- Verifica el estado en la base de datos
SELECT email, onboarding_completed, onboarding_step 
FROM profiles 
WHERE email = 'tu@email.com';
```

Si `onboarding_completed = false`, ejecuta:
```sql
UPDATE profiles 
SET onboarding_completed = true, onboarding_step = 'done'
WHERE email = 'tu@email.com';
```

---

### ✅ Prueba 2: Bloqueo de Acceso a Onboarding
**Objetivo:** Usuarios con onboarding completo NO pueden acceder a `/onboarding`

**Pasos:**
1. Inicia sesión con un usuario que completó el onboarding
2. Navega manualmente a: `http://localhost:3000/onboarding/role`
3. ✅ **Resultado esperado:** Redirige inmediatamente a `/dashboard`
4. Intenta con otras rutas:
   - `/onboarding/basic`
   - `/onboarding/contact`
   - `/onboarding/doctor`
   - `/onboarding/patient`
5. ✅ **Resultado esperado:** Todas redirigen a `/dashboard`

**Debugging si falla:**
- Verifica que `App.tsx` tenga el guard `OnlyOnboarding`
- Revisa la consola del navegador (F12) por errores

---

### ✅ Prueba 3: Acceso a Dashboard sin Onboarding
**Objetivo:** Usuarios SIN onboarding NO pueden acceder al dashboard

**Pasos:**
1. Crea un nuevo usuario o resetea uno existente:
   ```sql
   UPDATE profiles 
   SET onboarding_completed = false, onboarding_step = 'role'
   WHERE email = 'test@example.com';
   ```
2. Inicia sesión con ese usuario
3. Intenta navegar a: `http://localhost:3000/dashboard`
4. ✅ **Resultado esperado:** Redirige a `/onboarding/role`
5. Intenta navegar a: `http://localhost:3000/dashboard/documentos`
6. ✅ **Resultado esperado:** Redirige a `/onboarding/role`

---

### ✅ Prueba 4: Timeout por Inactividad
**Objetivo:** Sesión expira tras 15 minutos sin actividad

**Pasos:**
1. Inicia sesión y ve al dashboard
2. Abre la consola del navegador (F12)
3. **NO toques nada:** No muevas el mouse, no presiones teclas, no hagas scroll
4. Espera 15 minutos ⏰
5. ✅ **Resultado esperado:**
   - En la consola verás: `Session expired due to inactivity`
   - Redirige automáticamente a `/login`

**Nota:** Para pruebas rápidas, puedes reducir el tiempo temporalmente:
```typescript
// En src/context/AuthContext.tsx
const INACTIVITY_TIMEOUT = 1 * 60 * 1000 // 1 minuto (solo para testing)
```

**⚠️ No olvides revertir a 15 minutos después de probar!**

---

### ✅ Prueba 5: JWT Refresh Automático
**Objetivo:** Token se refresca automáticamente cada 50 minutos

**Pasos:**
1. Inicia sesión y ve al dashboard
2. Abre la consola del navegador (F12)
3. Usa la aplicación normalmente (mueve el mouse, navega, etc.)
4. Cada 50 minutos, revisa la consola
5. ✅ **Resultado esperado:** Verás el mensaje: `JWT token refreshed successfully`

**Para pruebas rápidas:**
```typescript
// En src/context/AuthContext.tsx
const JWT_REFRESH_INTERVAL = 2 * 60 * 1000 // 2 minutos (solo para testing)
```

**⚠️ Revertir a 50 minutos después!**

---

### ✅ Prueba 6: Actividad Detectada
**Objetivo:** Cualquier actividad resetea el timer de inactividad

**Pasos:**
1. Inicia sesión y ve al dashboard
2. Reduce el timeout a 1 minuto (ver Prueba 4)
3. Espera 55 segundos **sin tocar nada**
4. Antes de que se cumplan 60 segundos:
   - Mueve el mouse, O
   - Presiona una tecla, O
   - Haz scroll
5. Espera otros 55 segundos sin tocar nada
6. Repite el paso 4
7. ✅ **Resultado esperado:** La sesión NO expira mientras haya actividad cada < 60 segundos

**Eventos detectados:**
- `mousedown` (click)
- `keydown` (teclas)
- `scroll` (scroll)
- `touchstart` (touch en móvil)
- `mousemove` (movimiento del mouse)

---

### ✅ Prueba 7: Navegación por Pasos de Onboarding
**Objetivo:** Usuario sin onboarding completo es llevado al paso correcto

**Pasos:**

**Caso 1: Usuario nuevo (sin rol)**
```sql
UPDATE profiles 
SET onboarding_completed = false, onboarding_step = 'role', role = NULL
WHERE email = 'test@example.com';
```
- Inicia sesión
- ✅ Debería ir a `/onboarding/role`

**Caso 2: Usuario con rol, sin info básica**
```sql
UPDATE profiles 
SET onboarding_completed = false, onboarding_step = 'basic', role = 'patient'
WHERE email = 'test@example.com';
```
- Inicia sesión
- ✅ Debería ir a `/onboarding/basic`

**Caso 3: Usuario con info básica, sin contacto**
```sql
UPDATE profiles 
SET onboarding_completed = false, onboarding_step = 'contact'
WHERE email = 'test@example.com';
```
- Inicia sesión
- ✅ Debería ir a `/onboarding/contact`

**Caso 4: Usuario con contacto, falta detalles**
```sql
UPDATE profiles 
SET onboarding_completed = false, onboarding_step = 'details', role = 'patient'
WHERE email = 'test@example.com';
```
- Inicia sesión
- ✅ Debería ir a `/onboarding/patient` (o `/onboarding/doctor` si role='doctor')

---

### ✅ Prueba 8: Cierre Manual de Sesión
**Objetivo:** signOut limpia correctamente timers y sesión

**Pasos:**
1. Inicia sesión y ve al dashboard
2. Abre DevTools → Application → Local Storage
3. Observa las keys de Supabase
4. Click en "Cerrar Sesión" en la UI
5. ✅ **Resultado esperado:**
   - Local Storage limpiado
   - Redirige a `/login`
   - Timers limpiados (no hay logs en consola después de cerrar)

---

### ✅ Prueba 9: Múltiples Pestañas
**Objetivo:** Cerrar sesión en una pestaña cierra en todas

**Pasos:**
1. Inicia sesión
2. Abre 3 pestañas con el dashboard:
   - Pestaña A: `/dashboard`
   - Pestaña B: `/dashboard/documentos`
   - Pestaña C: `/dashboard/consultas`
3. En la Pestaña A, cierra sesión
4. ✅ **Resultado esperado:**
   - Las otras pestañas detectan el cambio
   - Redirigen a `/login` automáticamente

---

### ✅ Prueba 10: Timeout en Múltiples Pestañas
**Objetivo:** Timeout en una pestaña afecta a todas

**Pasos:**
1. Inicia sesión
2. Reduce timeout a 1 minuto (ver Prueba 4)
3. Abre 2 pestañas
4. Pestaña A: dashboard (déjala quieta)
5. Pestaña B: documentos (úsala continuamente)
6. ✅ **Resultado esperado:**
   - La actividad en Pestaña B resetea el timer GLOBAL
   - Ninguna pestaña expira mientras haya actividad en cualquiera

---

## 📊 Tabla de Resultados

Usa esta tabla para marcar tus pruebas:

| # | Prueba | ✅ Pasó | ❌ Falló | Notas |
|---|--------|---------|----------|-------|
| 1 | Refresh en onboarding completo | ⬜ | ⬜ | |
| 2 | Bloqueo acceso a onboarding | ⬜ | ⬜ | |
| 3 | Sin acceso a dashboard sin onboarding | ⬜ | ⬜ | |
| 4 | Timeout por inactividad | ⬜ | ⬜ | |
| 5 | JWT Refresh automático | ⬜ | ⬜ | |
| 6 | Actividad detectada | ⬜ | ⬜ | |
| 7 | Navegación por pasos | ⬜ | ⬜ | |
| 8 | Cierre manual de sesión | ⬜ | ⬜ | |
| 9 | Múltiples pestañas | ⬜ | ⬜ | |
| 10 | Timeout en múltiples pestañas | ⬜ | ⬜ | |

---

## 🐛 Problemas Comunes y Soluciones

### Problema: "onboarding_completed is null"
```sql
-- Actualizar usuarios existentes
UPDATE profiles
SET onboarding_completed = false
WHERE onboarding_completed IS NULL;
```

### Problema: "No se resetea el timer"
**Causa:** Los event listeners no están funcionando
**Solución:**
1. Verifica que AuthContext esté montado
2. Abre consola y ejecuta:
```javascript
// Debería ver el listener
window.addEventListener('mousedown', () => console.log('mousedown detected'))
```

### Problema: "Token no se refresca"
**Causa:** El interval no está configurado
**Solución:** Verifica en consola que aparezca el log cada 50 minutos

### Problema: "Multiple redirects detected"
**Causa:** Conflicto entre guards
**Solución:** Revisa que cada ruta tenga los guards correctos en App.tsx

---

## 🎯 Criterios de Éxito

Para considerar el sistema funcionando correctamente:

- ✅ Las 10 pruebas deben pasar
- ✅ No debe haber errores en consola
- ✅ No debe haber loops de redirección
- ✅ Los timers deben limpiarse al cerrar sesión
- ✅ La UX debe ser fluida sin delays innecesarios

---

## 🚀 Siguiente Paso

Una vez que TODAS las pruebas pasen:
1. Revierte cambios de testing (timeouts cortos)
2. Commit cambios a Git
3. Deploy a staging
4. Prueba en staging con timeouts reales (15 min)
5. Deploy a producción

**¡El sistema está listo! 🎉**
