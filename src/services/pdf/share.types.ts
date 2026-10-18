export type PdfActionId = 'share' | 'open' | 'download' | 'print';

/**
 * Cada função devolve uma mensagem para mostrar ao usuário (aviso ou instrução), ou null.
 * `open` e `download` só existem na web.
 */
export interface PdfActions {
  /** Abre a folha de compartilhar do sistema (ou o Web Share, na web). */
  share(bytes: Uint8Array, fileName: string): Promise<string | null>;
  open?(bytes: Uint8Array): string | null;
  download?(bytes: Uint8Array, fileName: string): string | null;
  /** Celulares: impressão do sistema. Web: abre o PDF para imprimir de lá. */
  print(bytes: Uint8Array, fileName: string): Promise<string | null>;
}
