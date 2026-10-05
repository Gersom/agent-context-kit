// Hora `HH:MM:SS`, compartida por el encabezado (ui/) y los avisos de la lectura con memoria
// (io/), sin que io/ dependa de ui/.

/** Hora `HH:MM:SS`. */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString("es", { hour12: false });
}
