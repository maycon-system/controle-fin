import { PDF_HB, PDF_HR } from './fontMetrics';
import type { ReportPdfInput } from './types';

/**
 * Gera o PDF do relatório (A4, vetorial, fontes padrão do PDF, codificação WinAnsi).
 * Porta fiel do gerador do app anterior (index.html, `pdfBuild`): mesmo desenho e mesmas medidas.
 * Função pura e síncrona; devolve os bytes do arquivo.
 */
export function buildReportPdf(input: ReportPdfInput, generatedAt: Date = new Date()): Uint8Array {
  // O desenho foi portado sem mudanças do app anterior, que calcula em reais.
  // A conversão de centavos para reais acontece só aqui, na entrada.
  const rel = {
    titulo: input.title,
    subtitulo: input.subtitle,
    periodo: input.period,
    receita: input.incomeCents / 100,
    gasto: input.spentCents / 100,
    saldo: input.balanceCents / 100,
    media: input.averageCents / 100,
    grupos: input.groups.map((g) => ({ nome: g.name, val: g.cents / 100, cor: g.color })),
    cats: input.categories.map((c) => ({ nome: c.name, val: c.cents / 100, cor: c.color })),
    meses: input.months.map((x) => ({
      label: x.label,
      mes: x.monthName,
      renda: x.incomeCents / 100,
      gasto: x.spentCents / 100,
      saldo: x.balanceCents / 100,
    })),
  };
  const W=595,H=842,MX=33,CW=W-2*MX,LIM=795;
  const C={ink:[15,18,24],mut:[91,100,120],line:[230,234,242],axis:[200,208,222],white:[255,255,255],bg:[246,248,251],
    blue:[37,99,235],blueTxt:[29,78,216],org:[242,140,40],orgTxt:[180,83,9],green:[0,122,80],red:[200,40,40],bar:[74,120,232],grey:[185,195,211],val:[59,68,87]};
  const pages:string[][]=[];let cur:string[]=[];
  const enc=(t:string|number)=>String(t).replace(/[–—]/g,'-').replace(/[^\x20-\xFF]/g,'?').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
  const rgb=(c:number[])=>c.map((v:number)=>(v/255).toFixed(3)).join(' ');
  const f2=(v:number)=>v.toFixed(2);
  const hex=(c:string):number[]=>{const m=/^#?([0-9a-f]{6})$/i.exec(c||'');return m?[0,2,4].map(i=>parseInt(m[1].substr(i,2),16)):[138,147,168];};
  const fN=(v:number)=>{const neg=v<-0.004;const s=Math.abs(v).toFixed(2).split('.');return (neg?'-':'')+s[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.')+','+s[1];};
  const fI=(v:number)=>String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  const pc=(v:number)=>v.toFixed(1).replace('.',',')+'%';
  const compact=(v:number)=>{const a=Math.abs(v);const c=(x:number)=>x.toFixed(1).replace('.',',').replace(/,0$/,'');return a>=1e6?'R$ '+c(v/1e6)+' mi':a>=1e3?'R$ '+c(v/1e3)+' mil':'R$ '+Math.round(v);};
  function tw(t:string|number,size:number,font:string,cs?:number):number{
    const s=String(t);
    if(font==='F2')return s.length*0.6*size+(cs||0)*s.length;
    const tb=font==='F3'?PDF_HB:PDF_HR;let w=0;
    const b=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    for(const ch of b){const k=ch.charCodeAt(0);w+=(k>=32&&k<=126?tb[k-32]:556);}
    return w*size/1000+(cs||0)*s.length;
  }
  function fit(t:string|number,size:number,font:string,maxW:number):string{t=String(t);if(tw(t,size,font)<=maxW)return t;while(t.length>1&&tw(t+'...',size,font)>maxW)t=t.slice(0,-1);return t.replace(/\s+$/,'')+'...';}
  // coordenadas: Y de cima para baixo (baseline do texto)
  function text(t:string|number,x:number,Y:number,size:number,font:string,color:number[],cs?:number){cur.push(rgb(color)+' rg BT /'+font+' '+size+' Tf '+(cs?cs+' Tc ':'')+f2(x)+' '+f2(H-Y)+' Td ('+enc(t)+') Tj'+(cs?' 0 Tc':'')+' ET');}
  function textR(t:string|number,xr:number,Y:number,size:number,font:string,color:number[],cs?:number){text(t,xr-tw(t,size,font,cs)+(cs||0),Y,size,font,color,cs);}
  function textC(t:string|number,xc:number,Y:number,size:number,font:string,color:number[],cs?:number){text(t,xc-tw(t,size,font,cs)/2,Y,size,font,color,cs);}
  function rr(x:number,Y:number,w:number,h:number,rad:number|number[]){
    const R=Array.isArray(rad)?rad:[rad,rad,rad,rad];
    const yb=H-Y-h,yt=H-Y,xr=x+w,K=0.5523,tl=R[0],tr=R[1],br=R[2],bl=R[3],p=[];
    p.push(f2(x+bl)+' '+f2(yb)+' m',f2(xr-br)+' '+f2(yb)+' l');
    if(br)p.push(f2(xr-br+br*K)+' '+f2(yb)+' '+f2(xr)+' '+f2(yb+br-br*K)+' '+f2(xr)+' '+f2(yb+br)+' c');
    p.push(f2(xr)+' '+f2(yt-tr)+' l');
    if(tr)p.push(f2(xr)+' '+f2(yt-tr+tr*K)+' '+f2(xr-tr+tr*K)+' '+f2(yt)+' '+f2(xr-tr)+' '+f2(yt)+' c');
    p.push(f2(x+tl)+' '+f2(yt)+' l');
    if(tl)p.push(f2(x+tl-tl*K)+' '+f2(yt)+' '+f2(x)+' '+f2(yt-tl+tl*K)+' '+f2(x)+' '+f2(yt-tl)+' c');
    p.push(f2(x)+' '+f2(yb+bl)+' l');
    if(bl)p.push(f2(x)+' '+f2(yb+bl-bl*K)+' '+f2(x+bl-bl*K)+' '+f2(yb)+' '+f2(x+bl)+' '+f2(yb)+' c');
    p.push('h');return p.join(' ');
  }
  function box(x:number,Y:number,w:number,h:number,rad:number|number[],fc:number[],sc?:number[]){cur.push(rgb(fc)+' rg '+(sc?rgb(sc)+' RG 0.7 w ':'')+rr(x,Y,w,h,rad)+(sc?' B':' f'));}
  function dot(x:number,Y:number,r:number,color:number[]){box(x-r,Y-r,2*r,2*r,r,color);}
  function line(x1:number,Y1:number,x2:number,Y2:number,color:number[],lw:number){cur.push(rgb(color)+' RG '+lw+' w '+f2(x1)+' '+f2(H-Y1)+' m '+f2(x2)+' '+f2(H-Y2)+' l S');}
  function card(x:number,Y:number,w:number,h:number){box(x,Y,w,h,9,C.white,C.line);}
  function label(t:string,x:number,Y:number){text(t.toUpperCase(),x,Y,7.6,'F3',C.mut,1.1);}
  function newPage(){pages.push(cur);cur=[rgb(C.bg)+' rg 0 0 '+W+' '+H+' re f'];}
  function ringSeg(cx:number,cy:number,ro:number,ri:number,a0:number,a1:number,color:number[]){
    const P=(r:number,a:number)=>[cx+r*Math.sin(a),(H-cy)+r*Math.cos(a)];
    const p:string[]=[];
    function arc(r:number,as:number,ae:number){
      const span=ae-as,n=Math.max(1,Math.ceil(Math.abs(span)/(Math.PI/2)-1e-9)),d=span/n,k=4/3*Math.tan(d/4);
      for(let i=0;i<n;i++){
        const t0=as+i*d,t1=t0+d,q0=P(r,t0),q1=P(r,t1);
        p.push(f2(q0[0]+k*r*Math.cos(t0))+' '+f2(q0[1]-k*r*Math.sin(t0))+' '+f2(q1[0]-k*r*Math.cos(t1))+' '+f2(q1[1]+k*r*Math.sin(t1))+' '+f2(q1[0])+' '+f2(q1[1])+' c');
      }
    }
    if(a1-a0>=2*Math.PI-1e-6){
      let s=P(ro,0);p.push(f2(s[0])+' '+f2(s[1])+' m');arc(ro,0,2*Math.PI);p.push('h');
      s=P(ri,0);p.push(f2(s[0])+' '+f2(s[1])+' m');arc(ri,0,-2*Math.PI);p.push('h');
      cur.push(rgb(color)+' rg '+p.join(' ')+' f');
    }else{
      let s=P(ro,a0);p.push(f2(s[0])+' '+f2(s[1])+' m');arc(ro,a0,a1);
      s=P(ri,a1);p.push(f2(s[0])+' '+f2(s[1])+' l');arc(ri,a1,a0);p.push('h');
      cur.push(rgb(color)+' rg 1 1 1 RG 1.6 w '+p.join(' ')+' B');
    }
  }
  function nice(max:number){
    if(!(max>0))return {top:1000,step:250};
    const raw=max/4,mag=Math.pow(10,Math.floor(Math.log10(raw)));
    const step=[1,2,2.5,5,10].map(m=>m*mag).find(s=>s>=raw-1e-9)||10*mag;
    return {top:Math.ceil(max/step-1e-9)*step,step};
  }
  const axisLbl=(v:number)=>v>=1e6?(v/1e6).toFixed(v%1e6?1:0).replace('.',',')+' mi':v>=1000?(v/1000).toFixed(v%1000?1:0).replace('.',',')+' mil':String(Math.round(v));

  const meses=rel.meses||[],n=meses.length;
  newPage();pages.shift(); // inicia a 1a página (com fundo) sem deixar página vazia

  // ── Cabeçalho ──
  text('RELATÓRIO FINANCEIRO',MX,42,7.6,'F3',C.mut,1.5);
  let tsz=27;const tit=rel.periodo||rel.titulo;
  while(tw(tit,tsz,'F3')>CW-125&&tsz>15)tsz-=1;
  text(tit,MX,42+tsz+2,tsz,'F3',C.ink);
  text(rel.subtitulo,MX,42+tsz+20,10,'F1',C.mut);
  const lw=tw('Controle.fin',12,'F3');
  textR('Controle.fin',W-MX,52,12,'F3',C.ink);
  box(W-MX-lw-8-22,34,22,22,6,C.green);
  textC('R$',W-MX-lw-8-11,49,8.2,'F3',C.white);

  // ── KPIs ──
  const kw=(CW-27)/4,KY=107,KH=70;
  const rec=rel.receita,gas=rel.gasto,sal=rel.saldo;
  const kp:[string,string,number[],string][]=[
    ['Receita total',fN(rec),C.blueTxt,n+(n===1?' mês':' meses')+' no período'],
    ['Gasto total',fN(gas),C.orgTxt,rec>0?pc(gas/rec*100)+' da receita':'sem receita lançada'],
    ['Saldo',fN(sal),sal>=0?C.green:C.red,rec>0?pc(sal/rec*100)+' da receita':'sem receita lançada'],
    ['Média mensal',fN(rel.media),C.ink,n>1?'gasto por mês':'gasto no mês']
  ];
  kp.forEach((k,i)=>{
    const x=MX+i*(kw+9);card(x,KY,kw,KH);
    text(k[0].toUpperCase(),x+12,KY+22,6.8,'F3',C.mut,0.9);
    const v='R$ '+k[1];let vs=15;while(tw(v,vs,'F3')>kw-24&&vs>8)vs-=0.5;
    text(v,x+12,KY+44,vs,'F3',k[2]);
    text(k[3],x+12,KY+59,7.8,'F1',C.mut);
  });

  // ── Painel: evolução mensal ──
  const P1=188,PH=303,CWD=323,DW=195,GAP=11;
  card(MX,P1,CWD,PH);
  label('Evolução mensal',MX+16,P1+26);
  {
    const xr=MX+CWD-16;
    textR('Gasto',xr,P1+26,7.8,'F1',C.mut);box(xr-tw('Gasto',7.8,'F1')-13,P1+19.5,7,7,2,C.org);
    const x2=xr-tw('Gasto',7.8,'F1')-13-12;
    textR('Receita',x2,P1+26,7.8,'F1',C.mut);box(x2-tw('Receita',7.8,'F1')-13,P1+19.5,7,7,2,C.blue);
  }
  const plotL=MX+16+34,plotR=MX+CWD-16,plotW=plotR-plotL,plotTop=P1+50,bottomLim=P1+PH-16;
  const maxLen=Math.max(8,...meses.map(m=>Math.max(fN(m.renda).length,fN(m.gasto).length,fN(m.saldo).length)));
  const tsz2=Math.min(8,((plotW/Math.max(n,1))-3)/(maxLen*0.6));
  const tableMode=n>0&&n<=6&&tsz2>=6.2;
  const plotBottom=bottomLim-16-4-(tableMode?52:0);
  const plotH=plotBottom-plotTop;
  const mx=Math.max(0,...meses.map(m=>Math.max(m.renda,m.gasto)));
  const sc=nice(mx);
  for(let v=sc.step;v<=sc.top+1e-6;v+=sc.step){
    const yy=plotBottom-v/sc.top*plotH;
    line(plotL,yy,plotR,yy,C.line,0.6);
    textR(axisLbl(v),plotL-6,yy+2.4,6.8,'F2',C.mut);
  }
  line(plotL,plotBottom,plotR,plotBottom,C.axis,0.9);
  const gW=plotW/Math.max(n,1),bw=Math.min(gW*0.3,24),bgap=2.5,pair=2*bw+bgap;
  meses.forEach((m,i)=>{
    const gx=plotL+i*gW,x0=gx+(gW-pair)/2,cx=gx+gW/2;
    ([[m.renda,C.blue,x0],[m.gasto,C.org,x0+bw+bgap]] as [number,number[],number][]).forEach(b=>{
      const v=Math.max(0,b[0]),h=v/sc.top*plotH;
      if(h>0){const hh=Math.max(h,0.8),r=Math.min(3,bw/2,hh);box(b[2],plotBottom-hh,bw,hh,[r,r,0,0],b[1]);}
      if(n<=6&&v>0){
        const t=fI(v);const s=Math.min(6.8,(bw+bgap-1.5)/(t.length*0.6));
        textC(t,b[2]+bw/2,plotBottom-h-3.5,s,'F2',C.val);
      }
    });
    const full=gW>=46;
    textC(full?m.mes:m.mes.slice(0,3),cx,plotBottom+12.5,n>6?7:8,'F3',C.ink);
  });
  if(tableMode){
    const ty=plotBottom+18;
    const rows:[string,'renda'|'gasto'|'saldo',number[]|null][]=[['Receita','renda',C.ink],['Gasto','gasto',C.ink],['Saldo','saldo',null]];
    rows.forEach((r,ri)=>{
      const yy=ty+ri*18;
      line(MX+16,yy,plotR,yy,ri===0?C.axis:C.line,ri===0?0.9:0.6);
      text(r[0],MX+16,yy+12,7.6,'F3',C.mut);
      meses.forEach((m,i)=>{
        const col=r[2]||(m.saldo<0?C.red:C.green);
        textC(fN(m[r[1]]),plotL+i*gW+gW/2,yy+12,tsz2,'F2',col);
      });
    });
  }

  // ── Painel: gasto por grupo (rosca) ──
  const DX=MX+CWD+GAP;
  card(DX,P1,DW,PH);
  label('Gasto por grupo',DX+16,P1+26);
  let gl=(rel.grupos||[]).filter(g=>g.val>0.004).sort((a,b)=>b.val-a.val).map(g=>({nome:g.nome,val:g.val,cor:hex(g.cor)}));
  if(gl.length>5){const rest=gl.slice(4);gl=gl.slice(0,4);gl.push({nome:'Demais ('+rest.length+')',val:rest.reduce((s,g)=>s+g.val,0),cor:C.grey});}
  const gTot=gl.reduce((s,g)=>s+g.val,0);
  const cx=DX+DW/2,cy=P1+98,RO=52,RI=35;
  if(gTot>0){
    let a=0;
    gl.forEach(g=>{const sp=g.val/gTot*2*Math.PI;ringSeg(cx,cy,RO,RI,a,a+sp,g.cor);a+=sp;});
  }else{ringSeg(cx,cy,RO,RI,0,2*Math.PI,[230,234,242]);}
  textC('Gasto',cx,cy-2,7,'F1',C.mut);
  {const v=compact(gas);let s=10.5;while(tw(v,s,'F3')>2*RI-10&&s>6)s-=0.5;textC(v,cx,cy+11,s,'F3',C.ink);}
  if(gTot>0){
    const lx=DX+16,rx=DX+DW-16;let ly=cy+RO+24;
    gl.forEach(g=>{
      dot(lx+4,ly-3,3.8,g.cor);
      const vt=fN(g.val);
      textR(vt,rx,ly+4,8,'F2',C.ink);
      const maxW=rx-lx-14-tw(vt,8,'F2')-6;
      text(fit(g.nome,9,'F1',maxW),lx+14,ly,9,'F1',C.ink);
      text(pc(g.val/gTot*100)+' do gasto',lx+14,ly+10.5,7.2,'F1',C.mut);
      ly+=26;
    });
  }else{
    textC('Nenhum gasto no período',cx,cy+RO+30,8.5,'F1',C.mut);
  }

  // ── Painel: gastos por categoria ──
  let cats=(rel.cats||[]).map(c=>({nome:c.nome,val:c.val,cor:C.bar}));
  const catSum=cats.reduce((s,c)=>s+c.val,0);
  const semCat=gas-catSum;
  if(semCat>0.004)cats.push({nome:'Sem categoria',val:semCat,cor:C.grey});
  const base=catSum+(semCat>0.004?semCat:0);
  const catMax=Math.max(0,...cats.map(c=>c.val));
  const RH=27;
  function catPanel(top:number,list:{nome:string;val:number;cor:number[]}[],titulo:string,first:boolean){
    const cap=Math.floor((LIM-16-(top+40)-19)/RH)+1;
    const rowsMax=Math.max(1,cap);
    const take=list.slice(0,rowsMax*2),rows=Math.max(1,Math.ceil(take.length/2));
    const h=40+(rows-1)*RH+19+14;
    card(MX,top,CW,h);
    label(titulo,MX+16,top+26);
    textR(first?'valores em R$ · % do gasto total':'continuação',W-MX-16,top+26,7.6,'F1',C.mut);
    const colW=(CW-32-22)/2;
    if(!take.length){text('Nenhum gasto categorizado no período.',MX+16,top+52,9,'F1',C.mut);return {used:0,bottom:top+h};}
    take.forEach((c,i)=>{
      const col=i<rows?0:1,r=col?i-rows:i;
      const x=MX+16+col*(colW+22),ry=top+40+r*RH;
      const pctTxt=base>0?pc(c.val/base*100):'';
      textR(pctTxt,x+colW,ry+9,7.4,'F2',C.mut);
      textR(fN(c.val),x+colW-tw('00,0%',7.4,'F2')-10,ry+9,8.4,'F2',C.ink);
      const maxW=colW-tw('00,0%',7.4,'F2')-10-tw(fN(c.val),8.4,'F2')-10;
      text(fit(c.nome,8.8,'F1',maxW),x,ry+9,8.8,'F1',C.ink);
      box(x,ry+14,colW,4.5,2.25,[230,234,242]);
      const bwid=catMax>0?Math.max(colW*c.val/catMax,4.5):0;
      if(bwid>0)box(x,ry+14,bwid,4.5,2.25,c.cor);
    });
    return {used:take.length,bottom:top+h};
  }
  let Ytop=P1+PH+GAP,left=cats.slice(),firstPanel=true,lastBottom=Ytop;
  do{
    const r=catPanel(Ytop,left,firstPanel?'Gastos por categoria':'Gastos por categoria (cont.)',firstPanel);
    lastBottom=r.bottom;left=left.slice(Math.max(r.used,1));
    if(left.length){newPage();Ytop=40;}
    firstPanel=false;
  }while(left.length);

  // ── Detalhamento mensal (quando não cabe a tabela sob o gráfico) ──
  if(n>0&&!tableMode){
    const RHm=20,hh=40+(n+1)*RHm+8;
    let top=lastBottom+GAP;
    if(top+hh>LIM){newPage();top=40;}
    card(MX,top,CW,hh);
    label('Detalhamento mensal',MX+16,top+26);
    const c3=W-MX-16,c2=c3-100,c1=c2-100;
    textR('RECEITA',c1,top+42,6.8,'F3',C.mut,0.9);textR('GASTO',c2,top+42,6.8,'F3',C.mut,0.9);textR('SALDO',c3,top+42,6.8,'F3',C.mut,0.9);
    meses.forEach((m,i)=>{
      const yy=top+48+i*RHm;
      line(MX+16,yy,W-MX-16,yy,i===0?C.axis:C.line,i===0?0.9:0.6);
      text(m.label,MX+16,yy+13.5,9,'F1',C.ink);
      textR(fN(m.renda),c1,yy+13.5,8.6,'F2',C.ink);
      textR(fN(m.gasto),c2,yy+13.5,8.6,'F2',C.ink);
      textR(fN(m.saldo),c3,yy+13.5,8.6,'F2',m.saldo<0?C.red:C.green);
    });
  }
  pages.push(cur);

  // ── Rodapé em todas as páginas ──
  const agora=generatedAt.toLocaleDateString('pt-BR')+' '+generatedAt.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const N=pages.length;
  const streams=pages.map((p,i)=>{
    const save=cur;cur=p;
    text('Controle.fin',MX,812,7.8,'F1',C.mut);
    textR('Gerado em '+agora+' · Página '+(i+1)+'/'+N,W-MX,812,7.8,'F1',C.mut);
    cur=save;
    return p.join('\n');
  });

  const o:string[]=[];
  const kids=[];for(let i=0;i<N;i++)kids.push((7+2*i)+' 0 R');
  o[1]='<< /Type /Catalog /Pages 2 0 R >>';
  o[2]='<< /Type /Pages /Kids ['+kids.join(' ')+'] /Count '+N+' >>';
  o[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  o[4]='<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>';
  o[5]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  streams.forEach((c,i)=>{
    o[6+2*i]='<< /Length '+c.length+' >>\nstream\n'+c+'\nendstream';
    o[7+2*i]='<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+W+' '+H+'] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents '+(6+2*i)+' 0 R >>';
  });
  let pdf='%PDF-1.4\n';const offs:number[]=[];
  for(let i=1;i<o.length;i++){offs[i]=pdf.length;pdf+=i+' 0 obj\n'+o[i]+'\nendobj\n';}
  const xref=pdf.length;
  pdf+='xref\n0 '+o.length+'\n0000000000 65535 f \n';
  for(let i=1;i<o.length;i++)pdf+=String(offs[i]).padStart(10,'0')+' 00000 n \n';
  pdf+='trailer\n<< /Size '+o.length+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
  const bytes=new Uint8Array(pdf.length);
  for(let i=0;i<pdf.length;i++)bytes[i]=pdf.charCodeAt(i)&255;
  return bytes;
}
