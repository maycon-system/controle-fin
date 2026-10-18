/** Nome do arquivo a partir do título: minúsculas, sem acento, só letras e números separados por "-". */
export function pdfFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .replace(/^relatorio-?/, '');
  return 'relatorio-' + (slug || 'controle-fin') + '.pdf';
}
