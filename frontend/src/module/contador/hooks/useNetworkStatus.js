// frontend/src/module/contador/hooks/useNetworkStatus.js
// Expone el estado de conectividad real del navegador.
// Independiente: no requiere ningún parámetro ni dependencia del módulo.

import { useState, useEffect } from 'react';

/**
 * @returns {{ isOnline: boolean }}
 */
const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
};

export default useNetworkStatus;
