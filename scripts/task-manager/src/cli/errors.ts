// Errores esperables del script: se muestran como un mensaje claro (sin stack) y fijan el código
// de salida. Cualquier otra excepción es un bug y sale como «Error inesperado».

/** Error de uso o de negocio: `exitCode` 1 por defecto. */
export class CliError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}

/** Mal uso de la línea de comandos (comando o flag desconocido, falta un valor): código 2 y pista de ayuda. */
export class UsageError extends CliError {
  constructor(message: string) {
    super(message, 2);
    this.name = "UsageError";
  }
}
