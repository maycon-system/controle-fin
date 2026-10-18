// Web: Blob + nova aba, download e Web Share. Tudo é chamado dentro do toque do usuário.
import type { PdfActions } from './share.types';

const blobOf = (bytes: Uint8Array) => new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });

function openInTab(bytes: Uint8Array): boolean {
  const url = URL.createObjectURL(blobOf(bytes));
  const win = window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return win !== null;
}

export const pdfActions: PdfActions = {
  async share(bytes, fileName) {
    const file = new File([blobOf(bytes)], fileName, { type: 'application/pdf' });
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: fileName });
        return null;
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return null; // o usuário fechou o menu
        return 'Não consegui abrir o menu de compartilhar. Use "Abrir PDF" ou "Baixar PDF".';
      }
    }
    return 'Este navegador não compartilha arquivos. Use "Abrir PDF" ou "Baixar PDF".';
  },

  open(bytes) {
    return openInTab(bytes) ? null : 'O navegador bloqueou a abertura. Tente "Baixar PDF".';
  },

  download(bytes, fileName) {
    const url = URL.createObjectURL(blobOf(bytes));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 4000);
    return `Baixando ${fileName}. Veja na pasta de downloads.`;
  },

  async print(bytes) {
    if (!openInTab(bytes)) return 'O navegador bloqueou a abertura. Use "Baixar PDF" e imprima o arquivo.';
    return 'PDF aberto em outra aba. Use Ctrl+P (ou Cmd+P) nela para imprimir.';
  },
};
