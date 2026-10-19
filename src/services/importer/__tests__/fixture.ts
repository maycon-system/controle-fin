/** Backup SINTÉTICO (sem dados reais) que exercita cada regra do importador. Meses do app antigo vão de 0 a 11. */
// Backup sintético (sem dados reais), usado pelos testes do importador.
export function makeBackup() {
  const d: Record<string, unknown> = {};
  d.cfin_grupos = [
    { id: 'nb', nome: 'Nubank', cor: '#7c3aed' },
    { id: 'pix', nome: 'PIX', cor: '#00b87a' },
    { id: 'fixo', nome: 'Fixo', cor: '#d97706' },
  ];
  d.cfin_cats = [
    { id: 'farm', nome: 'Farmácia', cor: '#dc2626' },
    { id: 'c1', nome: 'Assinaturas', cor: '#7c3aed' },
  ];

  // Fixo "NuVida" (grupo nb, sourceId 1): maio a outubro, junho com valor ajustado, julho ausente (buraco)
  d.cfin_nb_4_2026 = [
    { id: 1, desc: 'NuVida', value: 17.16, rec: 'fixo', cat: 'c1' },
    { id: 1778096351922, desc: 'Banho', value: 331.25, rec: 'variavel', cat: 'farm' }, // id = instante (6/5/2026)
  ];
  d.cfin_nb_5_2026 = [{ id: 10.5, desc: 'NuVida', value: 17.16, rec: 'fixo', sourceId: 1, cat: 'c1' }];
  d.cfin_nb_6_2026 = []; // julho: buraco (a recorrência pulou este mês)
  d.cfin_nb_7_2026 = [{ id: 10.6, desc: 'NuVida', value: 17.16, rec: 'fixo', sourceId: 1, cat: 'c1' }];
  d.cfin_nb_8_2026 = [{ id: 10.7, desc: 'NuVida', value: 17.16, rec: 'fixo', sourceId: 1, cat: 'c1' }];
  d.cfin_nb_9_2026 = [
    { id: 10.8, desc: 'NuVida', value: 17.16, rec: 'fixo', sourceId: 1, cat: 'c1', diaVenc: 12 },
    { id: 777, desc: 'Sem data', value: 10, rec: 'variavel' }, // id pequeno: sem data confiável
    { id: 5, desc: 'Com data', value: 20, rec: 'variavel', dataLanc: '2026-10-08T18:35:57.222Z' },
  ];
  d.cfin_nb_5_2026 = [
    ...(d.cfin_nb_5_2026 as object[]),
  ];
  // junho (índice 5): valor diferente
  d.cfin_nb_5_2026 = [{ id: 10.5, desc: 'NuVida', value: 17.16, rec: 'fixo', sourceId: 1, cat: 'c1' }];
  // (maio=4 tem o original, junho=5 acima; ajusta junho para outro valor)
  (d.cfin_nb_5_2026 as { value: number }[])[0].value = 19.99;

  // Parcelado com valorTotal: "Curso" 1680 em 12x, parcela 1 em outubro, copias adiante
  d.cfin_nb_9_2026 = [
    ...(d.cfin_nb_9_2026 as object[]),
    { id: 100, desc: 'Curso', value: 140, rec: 'parcelado', totalParc: 12, parcAtual: 1, valorTotal: 1680, cat: 'c1' },
  ];
  d.cfin_nb_10_2026 = [
    // cópia automática de novembro (mês depois do backup): usa o valor ORIGINAL, não a decisão do usuário
    { id: 10.9, desc: 'NuVida', value: 99.99, rec: 'fixo', sourceId: 1, cat: 'c1' },
    { id: 101.1, desc: 'Curso', value: 140, rec: 'parcelado', totalParc: 12, parcAtual: 2, valorTotal: 1680, sourceId: 100 },
  ];
  d.cfin_nb_11_2026 = [
    { id: 101.2, desc: 'Curso', value: 140, rec: 'parcelado', totalParc: 12, parcAtual: 3, valorTotal: 1680, sourceId: 100 },
  ];

  // Parcelado antigo sem valorTotal: "Diego" 152,24 x3 (jul, ago, set) -> total 456,72; terminou
  d.cfin_nb_6_2026 = [{ id: 200, desc: 'Diego', value: 152.24, rec: 'parcelado', totalParc: 3, parcAtual: 1 }];
  d.cfin_nb_7_2026 = [
    ...(d.cfin_nb_7_2026 as object[]),
    { id: 201, desc: 'Diego', value: 152.24, rec: 'parcelado', totalParc: 3, parcAtual: 2, sourceId: 200 },
  ];
  d.cfin_nb_8_2026 = [
    ...(d.cfin_nb_8_2026 as object[]),
    { id: 202, desc: 'Diego', value: 152.24, rec: 'parcelado', totalParc: 3, parcAtual: 3, sourceId: 200 },
  ];

  // Parcelado cancelado no meio: 6x, só maio e junho existem, e o app já está em outubro
  d.cfin_fixo_4_2026 = [{ id: 300, desc: 'Cancelado', value: 50, rec: 'parcelado', totalParc: 6, parcAtual: 1 }];
  d.cfin_fixo_5_2026 = [{ id: 301, desc: 'Cancelado', value: 50, rec: 'parcelado', totalParc: 6, parcAtual: 2, sourceId: 300 }];
  // Fixo encerrado: maio a julho; "sourceId: 1" também existe no grupo nb (cadeias diferentes)
  d.cfin_fixo_4_2026 = [
    ...(d.cfin_fixo_4_2026 as object[]),
    { id: 1, desc: 'MEI', value: 86.05, rec: 'fixo', diaVenc: 20 },
    { id: 400, desc: 'Antiga', value: 30, rec: 'fixo' },
  ];
  d.cfin_fixo_5_2026 = [
    ...(d.cfin_fixo_5_2026 as object[]),
    { id: 1.1, desc: 'MEI', value: 86.05, rec: 'fixo', sourceId: 1, diaVenc: 20 },
    { id: 401, desc: 'Antiga', value: 30, rec: 'fixo', sourceId: 400 },
  ];
  d.cfin_fixo_6_2026 = [
    { id: 1.2, desc: 'MEI', value: 86.05, rec: 'fixo', sourceId: 1, diaVenc: 20 },
    { id: 402, desc: 'Antiga', value: 30, rec: 'fixo', sourceId: 400 },
  ];
  for (const m of [7, 8, 9]) {
    d[`cfin_fixo_${m}_2026`] = [{ id: 1.3 + m, desc: 'MEI', value: 86.05, rec: 'fixo', sourceId: 1, diaVenc: 20 }];
  }

  // Grupos antigos que não aparecem no app (ignorados, com aviso)
  d.cfin_comum_4_2026 = [{ id: 1, desc: 'Antigo', value: 99, rec: 'variavel' }];
  d.cfin_cartao_4_2026 = [{ id: 2, desc: 'Antigo 2', value: 98, rec: 'variavel' }];

  // Saldo bancário: histórico que reproduz o saldo, e um mês que não bate
  d.cfin_banco_9_2026 = 1984.4;
  d.cfin_bhist_9_2026 = [
    { data: '01/10/2026', tipo: 'Definição', val: 192.94 },
    { data: '02/10/2026', tipo: 'Definição', val: 1084.4 },
    { data: '16/10/2026', tipo: 'Adição', val: 900 },
  ];
  d.cfin_banco_4_2026 = 2000; // histórico dá 1500: precisa de um ajuste final
  d.cfin_bhist_4_2026 = [{ data: '03/05/2026', tipo: 'Definição', val: 1500 }];

  // Renda por mês (e a global, que é ignorada)
  d.cfin_renda = 4500;
  d.cfin_renda_4_2026 = 4500;
  d.cfin_renda_9_2026 = 6000;
  d.cfin_migrado_v2 = true;

  return { versao: '3.0', data: '2026-10-18T19:41:34.967Z', dados: d };
}

