// frontend/src/module/contador/CounterDashboard.jsx
// Orquestador del módulo de conteo.
// Solo responsabilidades: instanciar refs, llamar hooks, pasar props a vistas.
// Sin lógica de negocio inline.

import React, { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { db } from '../../db/db';
import { TABLE_VIEW_LIMIT } from './constants';
import './contador.css';

// Hooks
import useNetworkStatus   from './hooks/useNetworkStatus';
import useCounterSession  from './hooks/useCounterSession';
import useCounterScan     from './hooks/useCounterScan';
import useCounterSync     from './hooks/useCounterSync';
import useCounterHistory  from './hooks/useCounterHistory';
import useClientDB        from './hooks/useClientDB';

// Componentes visuales
import SetupView      from './components/SetupView';
import SessionHeader  from './components/SessionHeader';
import ScanForm       from './components/ScanForm';
import ScanFeedback   from './components/ScanFeedback';
import CountingTable  from './components/CountingTable';
import ActionBar      from './components/ActionBar';
import ConfirmModal   from './components/ConfirmModal';

const CounterDashboard = () => {
  const { user } = useAuth();
  const toast    = useToast();

  // --- REFS (creados aquí, pasados a hooks y componentes) ---
  const scanInputRef = useRef(null);
  const locInputRef  = useRef(null);
  const preQtyRef    = useRef(null);

  // --- MODAL DE CONFIRMACIÓN (estado local, no requiere hook propio) ---
  const [confirmModal, setConfirmModal] = useState(null);
  const requestConfirm = (title, message, onConfirm) => setConfirmModal({ title, message, onConfirm });
  const closeConfirm   = () => setConfirmModal(null);

  // --- DATA LAYER (queries Dexie reactivas) ---
  const tableItems = useLiveQuery(
    () => db.counting_session.orderBy('fecha_escaneo').reverse().limit(TABLE_VIEW_LIMIT).toArray(),
    []
  ) || [];
  const allItems = useLiveQuery(() => db.counting_session.toArray(), []) || [];

  // --- HOOKS ---
  const { isOnline } = useNetworkStatus();

  const { localDbCount, isDownloading, downloadClientDB } =
    useClientDB({ user, toast });

  const hasClientDB = localDbCount > 0;

  const { sessionActive, sessionData, setSessionData, startSession, closeSession } =
    useCounterSession({ scanInputRef, locInputRef, onNeedConfirm: requestConfirm });

  const { syncHistory, showHistory, setShowHistory, addToHistory, handleRecontar } =
    useCounterHistory({ setSessionData });

  const {
    scanInput, setScanInput,
    dynamicLocInput, setDynamicLocInput,
    preQty, setPreQty,
    lastScannedId,
    lastScanFeedback,
    handleScanSubmit,
    handleLocKeyDown,
    handleUpdateQuantity,
    handleDeleteItem,
    handleQuantityKeyDown,
  } = useCounterScan({ sessionData, allItemsCount: allItems.length, scanInputRef, locInputRef, toast });

  const { isSyncing, syncProgress, syncData } =
    useCounterSync({ sessionData, user, toast, scanInputRef, locInputRef, onSyncSuccess: addToHistory });

  // --- RENDER ---
  if (!sessionActive) {
    return (
      <SetupView
        sessionData={sessionData}
        setSessionData={setSessionData}
        onStart={startSession}
        syncHistory={syncHistory}
        showHistory={showHistory}
        setShowHistory={setShowHistory}
        onRecontar={handleRecontar}
        localDbCount={localDbCount}
        isDownloading={isDownloading}
        onDownloadDB={downloadClientDB}
      />
    );
  }

  const totalQty = allItems.reduce((acc, i) => acc + i.cantidad, 0);

  return (
    <div className="pda-container">
      <SessionHeader
        marbete={sessionData.marbete}
        area={sessionData.area}
        ubicacion={sessionData.ubicacion}
        isDynamic={sessionData.isDynamic}
        esRecuento={sessionData.esRecuento}
        isOnline={isOnline}
        totalRegistros={allItems.length}
        totalPiezas={totalQty}
      />

      <ScanForm
        sessionData={sessionData}
        scanInput={scanInput}           setScanInput={setScanInput}
        dynamicLocInput={dynamicLocInput} setDynamicLocInput={setDynamicLocInput}
        preQty={preQty}                 setPreQty={setPreQty}
        isSyncing={isSyncing}
        onSubmit={handleScanSubmit}
        onLocKeyDown={handleLocKeyDown}
        scanInputRef={scanInputRef}
        locInputRef={locInputRef}
        preQtyRef={preQtyRef}
      />

      <ScanFeedback feedback={lastScanFeedback} />

      <CountingTable
        items={tableItems}
        lastScannedId={lastScannedId}
        isDynamic={sessionData.isDynamic}
        onUpdateQuantity={handleUpdateQuantity}
        onDeleteItem={handleDeleteItem}
        onQuantityKeyDown={handleQuantityKeyDown}
        hasClientDB={hasClientDB}
      />

      <ActionBar
        totalItems={allItems.length}
        isSyncing={isSyncing}
        syncProgress={syncProgress}
        onSync={() => syncData({ allItems })}
        onClose={() => closeSession(allItems.length)}
      />

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={() => { confirmModal.onConfirm(); closeConfirm(); }}
          onCancel={closeConfirm}
        />
      )}
    </div>
  );
};

export default CounterDashboard;
