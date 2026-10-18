// iPhone e Android: grava o PDF no cache e usa a folha de compartilhar e a impressão do sistema.
// (Na web o Metro usa share.web.ts no lugar deste arquivo.)
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { PdfActions } from './share.types';

function toFile(bytes: Uint8Array, fileName: string): File {
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.writeSync(bytes); // síncrono: o arquivo está completo antes de compartilhar ou imprimir
  return file;
}

export const pdfActions: PdfActions = {
  async share(bytes, fileName) {
    if (!(await Sharing.isAvailableAsync())) return 'Este aparelho não consegue compartilhar arquivos.';
    const file = toFile(bytes, fileName);
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: fileName,
    });
    return null;
  },

  async print(bytes, fileName) {
    const file = toFile(bytes, fileName);
    await Print.printAsync({ uri: file.uri });
    return null;
  },
};
