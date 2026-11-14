import { createIlbrService } from './lib/ilbr-engine.js';

export const VERSION = '1.0.0';
export function bootILBR(globalObject = globalThis) {
  const service = createIlbrService({ version: VERSION });
  if (globalObject?.ILB_SERIES && typeof globalObject.ILB_SERIES === 'object') globalObject.ILB_SERIES.regex = service;
  else if (globalObject) globalObject.ILB_SERIES = { regex: service };
  try { globalObject?.dispatchEvent?.(new CustomEvent('ilb-series:ready', { detail: { id: 'ILBR', api: service } })); } catch { /* optional event */ }
  return { ok: true, service };
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  try { window.ILBR = bootILBR(window).service; } catch { /* optional service */ }
}
