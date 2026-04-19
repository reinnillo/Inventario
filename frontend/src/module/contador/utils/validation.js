// frontend/src/module/contador/utils/validation.js
// Validación de códigos de producto. Sin dependencias de React.

/** Acepta códigos alfanuméricos con guiones, puntos, barras y similares. Mínimo 2 chars. */
export const CODIGO_REGEX = /^[a-zA-Z0-9\-\_\.\+\/]{2,}$/;

/**
 * Valida que un código escaneado tenga formato mínimo aceptable.
 * @param {string} codigo
 * @returns {{ valid: boolean, reason: string }}
 */
export const validateCodigo = (codigo) => {
  if (!codigo || !codigo.trim()) {
    return { valid: false, reason: 'El código está vacío.' };
  }
  if (!CODIGO_REGEX.test(codigo.trim())) {
    return { valid: false, reason: `Código inválido: "${codigo}"` };
  }
  return { valid: true, reason: '' };
};
