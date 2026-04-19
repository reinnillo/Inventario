# Refactorización: Módulo `contador`

Migración de `components/Dashboard/CounterDashboard.jsx` (628 líneas, monolítico)
a un módulo cohesivo en `frontend/src/module/contador/`.

---

## Estructura objetivo

```text
frontend/src/module/contador/
│
├── index.jsx                          ← Punto de entrada público (re-export)
├── CounterDashboard.jsx               ← Orquestador: hooks + composición (~80 líneas)
├── contador.css                       ← Todos los estilos del módulo
├── constants.js                       ← Valores escalares compartidos
│
├── utils/
│   ├── audio.js                       ← playBeep()
│   ├── sessionStorage.js              ← encodeSession, decodeSession, appendHistory
│   └── validation.js                  ← CODIGO_REGEX + validateCodigo()
│
├── hooks/
│   ├── useNetworkStatus.js            ← { isOnline }
│   ├── useCounterSession.js           ← sessionActive, sessionData, startSession, closeSession
│   ├── useCounterScan.js              ← scanInput, preQty, lastScanFeedback, handlers
│   ├── useCounterSync.js              ← isSyncing, syncProgress, syncData
│   └── useCounterHistory.js           ← syncHistory, showHistory, handleRecontar
│
└── components/
    ├── SetupView.jsx                  ← Formulario de configuración de lote
    ├── SessionHeader.jsx              ← Cabecera: marbete, área, stats, red
    ├── ScanForm.jsx                   ← Inputs de ubicación + producto + preQty
    ├── ScanFeedback.jsx               ← Banner temporal de último escaneo
    ├── CountingTable.jsx              ← Tabla con edición y eliminación
    ├── ActionBar.jsx                  ← Botones Salir/Enviar + barra de progreso
    ├── HistoryPanel.jsx               ← Lista de lotes enviados + Recontar
    └── ConfirmModal.jsx               ← Modal de confirmación reutilizable
```

---

## Regla de dependencias (dirección única — nunca invertir)

```text
constants.js
    ↓
utils/          (importan constants, sin React)
    ↓
hooks/          (importan utils + constants + librerías externas)
    ↓
components/     (reciben solo props, sin lógica de negocio)
    ↓
CounterDashboard.jsx   (instancia hooks, pasa props a components)
    ↓
index.jsx       (re-exporta CounterDashboard)
```

---

## Checklist de implementación

### Fase 1 — Infraestructura base

- [x] Crear carpeta `frontend/src/module/contador/`
- [x] Crear stub `index.jsx`
- [x] Crear stub `CounterDashboard.jsx`
- [x] Crear `contador.css` (copiado desde `CounterDashboard.css`)

### Fase 2 — Constantes y utilidades

- [x] Crear `constants.js`
- [x] Crear `utils/audio.js`
- [x] Crear `utils/sessionStorage.js`
- [x] Crear `utils/validation.js`

### Fase 3 — Custom Hooks

- [x] Implementar `hooks/useNetworkStatus.js`
  - Estado `isOnline` + listeners `online`/`offline` en `window`
  - Sin dependencias externas
- [x] Implementar `hooks/useCounterSession.js`
  - Gestiona: `sessionActive`, `sessionData`, `startSession`, `closeSession`
  - Persiste en `localStorage` con `encodeSession`/`decodeSession`
  - Maneja `visibilitychange` para re-hidratación
  - Recibe `{ scanInputRef, locInputRef }` para foco post-inicio
  - `closeSession(itemsCount)` recibe el conteo como param (no lee Dexie directamente)
- [x] Implementar `hooks/useCounterScan.js`
  - Gestiona: `scanInput`, `dynamicLocInput`, `preQty`, `lastScannedId`, `lastScanFeedback`
  - Handlers: `handleScanSubmit`, `handleLocKeyDown`, `handleUpdateQuantity`, `handleDeleteItem`, `handleQuantityKeyDown`
  - Recibe `{ sessionData, allItemsCount, scanInputRef, locInputRef, toast }`
  - Llama a `validateCodigo` y `playBeep` de utils
- [x] Implementar `hooks/useCounterSync.js`
  - Gestiona: `isSyncing`, `syncProgress`
  - Función `syncData({ allItems })`
  - Recibe `{ sessionData, user, toast, scanInputRef, locInputRef, onSyncSuccess }`
  - Notifica resultado vía callback `onSyncSuccess` (desacoplado del historial)
- [x] Implementar `hooks/useCounterHistory.js`
  - Gestiona: `syncHistory`, `showHistory`
  - Carga historial al montar desde `localStorage`
  - Función `handleRecontar(entry)` que llama a `setSessionData` (recibido como param)

### Fase 4 — Componentes visuales (solo props, sin hooks de lógica)

- [x] Implementar `components/ConfirmModal.jsx`
  - Props: `title`, `message`, `onConfirm`, `onCancel`
- [x] Implementar `components/SessionHeader.jsx`
  - Props: `marbete`, `area`, `ubicacion`, `isDynamic`, `esRecuento`, `isOnline`, `totalRegistros`, `totalPiezas`
- [x] Implementar `components/ScanFeedback.jsx`
  - Props: `feedback` (`{ codigo, qty, isNew } | null`)
- [x] Implementar `components/ScanForm.jsx`
  - Props: `sessionData`, `scanInput`, `setScanInput`, `dynamicLocInput`, `setDynamicLocInput`, `preQty`, `setPreQty`, `isSyncing`, `onSubmit`, `onLocKeyDown`, `scanInputRef`, `locInputRef`, `preQtyRef`
- [x] Implementar `components/CountingTable.jsx`
  - Props: `items`, `lastScannedId`, `isDynamic`, `onUpdateQuantity`, `onDeleteItem`, `onQuantityKeyDown`
- [x] Implementar `components/ActionBar.jsx`
  - Props: `totalItems`, `isSyncing`, `syncProgress`, `onSync`, `onClose`
- [x] Implementar `components/HistoryPanel.jsx`
  - Props: `history`, `showHistory`, `onToggle`, `onRecontar`
- [x] Implementar `components/SetupView.jsx`
  - Props: `sessionData`, `setSessionData`, `onStart`, `syncHistory`, `showHistory`, `setShowHistory`, `onRecontar`

### Fase 5 — Orquestador

- [x] Implementar `CounterDashboard.jsx` completo
  - Instanciar refs (`scanInputRef`, `locInputRef`, `preQtyRef`)
  - Queries Dexie: `tableItems` y `allItems` con `useLiveQuery`
  - Llamar a los 5 hooks
  - Renderizar `<SetupView>` o vista activa según `sessionActive`
  - Gestionar `confirmModal` (estado local, no requiere hook propio)
- [x] Completar `index.jsx`

### Fase 6 — Migración

- [ ] Actualizar todos los imports de `CounterDashboard` en el resto de la app
  - Buscar: `from '../../components/Dashboard/CounterDashboard'`
  - Reemplazar: `from '../../module/contador'`
- [ ] Eliminar `frontend/src/components/Dashboard/CounterDashboard.jsx`
- [ ] Eliminar `frontend/src/components/Dashboard/CounterDashboard.css`
- [ ] Verificar que no hay imports rotos (`npm run build` sin errores)

---

## Notas de implementación

### Refs y foco

Los refs del DOM (`scanInputRef`, `locInputRef`, `preQtyRef`) se crean en `CounterDashboard`
y se pasan **hacia abajo** a los componentes (que renderizan los `<input>`) y
**lateralmente** a los hooks (que llaman a `.focus()`). Nunca se crean dentro de los hooks.

### `closeSession` desacoplado de Dexie

El hook `useCounterSession` no importa Dexie directamente. `closeSession` recibe
`itemsCount` como parámetro. El orquestador le pasa `allItems.length`:

```js
closeSession(allItems.length)   // en CounterDashboard.jsx
```

### `syncData` y el historial

`useCounterSync` recibe un callback `onSyncSuccess(historyEntry)` en lugar de
acoplarse directamente a `useCounterHistory`. El orquestador conecta ambos:

```js
syncData({ allItems, onSuccess: (entry) => addToHistory(entry) })
```

### `ConfirmModal` como candidato a `Shared/`

Si en el futuro otro módulo necesita un modal de confirmación, mover
`components/ConfirmModal.jsx` a `frontend/src/components/Shared/ConfirmModal.jsx`
y actualizar el import en `CounterDashboard.jsx`.
