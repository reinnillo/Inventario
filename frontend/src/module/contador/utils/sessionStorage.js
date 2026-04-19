// frontend/src/module/contador/utils/sessionStorage.js
// Ofuscación y persistencia de datos de sesión/historial en localStorage.
// Usa base64 + UTF-8 para evitar exposición en texto plano en dispositivos compartidos.
// NOTA: base64 no es cifrado criptográfico. Para entornos de alta seguridad
//       reemplazar por Web Crypto API con clave derivada del usuario.

import { HISTORY_KEY, MAX_HISTORY } from '../constants';

/**
 * Serializa y codifica en base64 UTF-8 un objeto para guardarlo en localStorage.
 * @param {object} data
 * @returns {string} string base64
 */
export const encodeSession = (data) => {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''));
};

/**
 * Decodifica y deserializa un string base64 guardado con encodeSession.
 * Devuelve null si el dato está corrupto o tiene formato inválido.
 * @param {string} raw
 * @returns {object|null}
 */
export const decodeSession = (raw) => {
  try {
    const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
};

/**
 * Agrega una entrada al historial local de lotes enviados (máx MAX_HISTORY).
 * Devuelve el historial actualizado.
 * @param {object} entry - { marbete, area, ubicacion, isDynamic, esRecuento, registros, piezas, fecha }
 * @returns {object[]}
 */
export const appendHistory = (entry) => {
  const raw = localStorage.getItem(HISTORY_KEY);
  const history = raw ? (decodeSession(raw) || []) : [];
  history.unshift(entry);
  if (history.length > MAX_HISTORY) history.splice(MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, encodeSession(history));
  return history;
};
