import type { ReportData } from '../../data/reports';
import { pdfFileName } from '../../domain/pdfFileName';
import type { Period } from '../../domain/reportPeriod';
import { buildReportPdf } from './buildReportPdf';
import type { PdfActionId, PdfActions } from './share.types';
import { toPdfInput } from './toPdfInput';

export const NEED_REPORT_MSG = 'Gere o relatório primeiro (toque em "Gerar relatório").';

/** Botões de PDF por plataforma: a web tem os quatro; os celulares compartilham (que já inclui salvar) e imprimem. */
export function visibleActions(platform: string): PdfActionId[] {
  return platform === 'web' ? ['share', 'open', 'download', 'print'] : ['share', 'print'];
}

/**
 * Gera o PDF do relatório e executa a ação. Devolve uma mensagem para o usuário, ou null.
 * Tudo até chamar a ação é síncrono: o navegador exige que "compartilhar" e "abrir" aconteçam
 * dentro do toque do usuário, sem nenhum `await` antes.
 */
export function runPdfAction(
  id: PdfActionId,
  ctx: { period: Period; data: ReportData } | null,
  actions: PdfActions,
  generatedAt: Date = new Date(),
): Promise<string | null> {
  if (!ctx) return Promise.resolve(NEED_REPORT_MSG);
  try {
    const bytes = buildReportPdf(toPdfInput(ctx.period, ctx.data), generatedAt);
    const fileName = pdfFileName(ctx.period.title);
    let result: Promise<string | null> | string | null;
    switch (id) {
      case 'share':
        result = actions.share(bytes, fileName);
        break;
      case 'print':
        result = actions.print(bytes, fileName);
        break;
      case 'open':
        result = actions.open ? actions.open(bytes) : 'Esta ação não está disponível neste aparelho.';
        break;
      case 'download':
        result = actions.download ? actions.download(bytes, fileName) : 'Esta ação não está disponível neste aparelho.';
        break;
    }
    return Promise.resolve(result).catch(failure);
  } catch (e) {
    return Promise.resolve(failure(e));
  }
}

function failure(e: unknown): string {
  return 'Não foi possível concluir: ' + (e instanceof Error ? e.message : 'erro desconhecido') + '.';
}
