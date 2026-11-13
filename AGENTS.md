# Project Agents Configuration

## Git Push (Multi-account)

El usuario tiene 2 cuentas de GitHub cacheadas en Windows Credential Manager: `anibaldan` y `pdvpedro`.

Para pushear a la cuenta `anibaldan` sin conflicto, usar:

```bash
git push https://anibaldan@github.com/anibaldan/ControlGastosServicios.git main
```

No usar `git push origin main` porque el credential manager elige la cuenta incorrecta (`pdvpedro`).

## Relocalización del proyecto (2026-11-12)

**Proyecto válido (único):** `H:\AI-Projects\OpenCode\ControlGastosServicios20260906OpenCode`
**Versión antigua (obsoleta, NO usar):** `H:\AI-Projects\ControlGastosServicios_old`

- La sesión fue movida con `session_move` desde `H:\AI-Projects\ControlGastosServicios`
  a la ruta nueva; desde entonces todo el trabajo ocurre en la carpeta nueva.
- **Verificación de migración (resultado: nada perdido):** el repo viejo estaba
  *git limpio* en `4211d5e`, y ese commit es **ancestro directo** del HEAD nuevo
  (18 commits encima). Los 7 archivos con contenido distinto eran todos más
  grandes/recientes en la nueva. Los 2 archivos que solo quedaban en la vieja
  (`docs/js/ui.js`, `docs/lib/chart-loader.js`) se eliminaron **a propósito** en
  el commit `cf6f7c7` (split de `ui.js` en 5 módulos `ui-*` + lazy-load de Chart.js).
- La carpeta vieja quedó **congelada desde 2026-07-14**; la nueva tiene cambios
  hasta 2026-10-05.
- El rename estuvo bloqueado por el *watcher* detachado de `opencode-cli.exe`;
  procedimiento completo (diagnóstico con `handle.exe`, kill del backend, helper
  vía WMI) documentado en **global**: `~/.config/opencode/NOTAS-OPERACIONES.md`
  (cargado vía `instructions` en `opencode.jsonc`).
