/* Cala · port: molls de carreus, norais, fars, illots i barques amarrades */

/* ============================================================
   PORT
   ------------------------------------------------------------
   Un moll és un carrer fet sobre l'aigua (carrer[ci] i moll[ci]
   alhora): s'hi pot caminar, fer-hi escales, posar-hi cases o
   lligar-hi un pont com a qualsevol carrer. El que canvia és
   l'aspecte: parets de carreus amb cantell en lloc de roca,
   norais a la vora, estris de pesca i, a la punta, un far.
   A l'aigua del costat hi queden barques amarrades.

   A part, en mode Fars se'n pot posar un a qualsevol lloc: a
   l'aigua surt dret damunt d'un illot de roca, i en un carrer,
   una plaça o un moll plans, damunt del paviment.
   ============================================================ */

const CARREU   = C('#bfae8f');   // pedra dels molls
const CANTELL  = C('#d9ccb0');   // la filada de dalt, més clara
const XARXES   = ['#a83a2e', '#3d6b5a', '#2f5f86'].map(C);
const CAIXES   = [FUSTA, C('#3f6f9a'), C('#d8a23a')];
const BOIA     = C('#e9b23a');

// aigua lliure, on hi pot anar una barca
const aiguaLliure = w => w >= 0 && heights[w] === 0 && heff[w] <= 0 && !esCarrer[w] && !pont[w] && !esSorra[w] && !fars[w];

// es pot fer un moll aquí? aigua (o un carrer ja fet) que toqui terra, un carrer, un pont o un altre moll
function potMoll(ci){
  if(heights[ci] > 0 || pont[ci]) return false;
  return cells[ci].nb.some(b => esTerra(b) || (b >= 0 && pont[b] > 0));
}

// normal horitzontal de l'aresta A-B que surt de la cel·la (cap al centre c no)
function normalFora(A, B, c){
  const dx = B.x-A.x, dz = B.z-A.z, l = Math.hypot(dx,dz) || 1;
  let nx = dz/l, nz = -dx/l;
  if(nx*((A.x+B.x)/2 - c.x) + nz*((A.z+B.z)/2 - c.z) < 0){ nx = -nx; nz = -nz; }
  return {x:nx, z:nz};
}

// paret de carreus d'una aresta que dona a l'aigua, amb el cantell que sobresurt a dalt
function paretMoll(G, A, B, tA, tB, ci, e, c){
  const FONS = -1.0, FILADA = 0.16;
  // filades de dalt a baix, seguint l'alçada de cada cap (el moll pot fer pendent)
  for(let k=0; ; k++){
    const a1 = tA - k*FILADA, b1 = tB - k*FILADA;
    if(Math.max(a1, b1) <= FONS) break;
    const a0 = Math.max(FONS, a1 - FILADA), b0 = Math.max(FONS, b1 - FILADA);
    const to = (k + Math.floor(hash3(ci, e, 141)*2)) % 2 ? CARREU : fosc(CARREU, 0.9);
    quad(G, [A.x,a0,A.z], [B.x,b0,B.z], [B.x,b1,B.z], [A.x,a1,A.z], k === 0 ? CANTELL : to);
  }
  // cantell: llosa que sobresurt una mica de la paret
  const n = normalFora(A, B, c), o = 0.05;
  const Ao = {x:A.x + n.x*o, z:A.z + n.z*o}, Bo = {x:B.x + n.x*o, z:B.z + n.z*o};
  quad(G, [A.x,tA+0.012,A.z], [Ao.x,tA+0.012,Ao.z], [Bo.x,tB+0.012,Bo.z], [B.x,tB+0.012,B.z], CANTELL);
  quad(G, [Ao.x,tA-0.06,Ao.z], [Bo.x,tB-0.06,Bo.z], [Bo.x,tB+0.012,Bo.z], [Ao.x,tA+0.012,Ao.z], CANTELL);

  // norai al mig de la vora
  if(hash3(ci, e, 140) < 0.6){
    const m = entre(A, B, 0.5), y = (tA + tB)/2;
    const x = m.x - n.x*0.11, z = m.z - n.z*0.11;
    con(G, x, z, 0.045, 0.035, y, y+0.10, 6, FERRO, false);
    con(G, x, z, 0.06, 0.06, y+0.10, y+0.13, 6, FERRO, true);
  }
}

// estris de pesca i de port damunt d'un moll pla
function mobiliariMoll(G, cel, ci, y){
  const h = hash3(ci, 150, 1), c = cel.c;
  const k = Math.floor(hash3(ci,150,2)*4), A = cel.p[k], B = cel.p[(k+1)%4];
  const l = Math.hypot(B.x-A.x, B.z-A.z) || 1, ux = (B.x-A.x)/l, uz = (B.z-A.z)/l;
  const a = entre(c, entre(A, B, 0.5), 0.45);
  if(h < 0.26){                                   // caixes de peix apilades
    const n = 2 + Math.floor(hash3(ci,150,3)*2);
    for(let i=0;i<n;i++){
      const col = CAIXES[Math.floor(hash3(ci,151,i)*CAIXES.length)];
      const yi = y + (i === 2 ? 0.09 : 0), s = i === 2 ? 0.08 : (i - 0.5)*0.17;
      caixa(G, a.x + ux*s, a.z + uz*s, ux, uz, 0.075, 0.055, yi, yi + 0.09, col);
    }
  } else if(h < 0.44){                            // xarxes amuntegades amb una boia
    const col = XARXES[Math.floor(hash3(ci,152,1)*XARXES.length)];
    bola(G, a.x, y, a.z, 0.22, 0.10, col, ci*17 + 3, 8);
    bola(G, a.x + ux*0.12, y + 0.07, a.z + uz*0.12, 0.05, 0.08, BOIA, ci*17 + 4, 6);
  } else if(h < 0.58){                            // fanal
    const p = entre(c, A, 0.7);
    fanal(G, p.x, y, p.z);
  } else if(h < 0.66){                            // banc mirant l'aigua
    banc(G, a.x, a.z, ux, uz, y);
  }
}

// la punta d'un espigó: només toca una cosa, i és un altre moll (un moll arran de costa no en té)
function esPuntaMoll(ci){
  const t = cells[ci].nb.filter(b => esTerra(b) || (b >= 0 && pont[b] > 0));
  return t.length === 1 && moll[t[0]] > 0;
}

// far de bocana: torre a franges, balconada i llanterna que s'encén de nit.
// `s` l'escala: els d'illot són una mica més grossos que els de punta de moll
function far(G, x, y, z, k, s = 1){
  const col = hash3(k,160,2) < 0.5 ? C('#3f8f5a') : C('#c0453a');   // verd o vermell, com els de debò
  con(G, x, z, 0.26*s, 0.24*s, y, y+0.12*s, 8, CARREU, true);
  const N = 5, H = 1.25*s, yb = y + 0.12*s;
  for(let i=0;i<N;i++){
    const y0 = yb + H*i/N, y1 = yb + H*(i+1)/N;
    con(G, x, z, (0.17 - 0.05*i/N)*s, (0.17 - 0.05*(i+1)/N)*s, y0, y1, 8, i%2 ? MARC : col, false);
  }
  const yt = yb + H;
  con(G, x, z, 0.2*s, 0.2*s, yt, yt+0.04*s, 8, FERRO, true);              // balconada
  for(let i=0;i<8;i++){                                                    // barana
    const a = i*Math.PI/4;
    con(G, x + Math.cos(a)*0.18*s, z + Math.sin(a)*0.18*s, 0.008, 0.008, yt+0.04*s, yt+0.13*s, 4, FERRO, false);
  }
  tronc(GL, x, yt+0.04*s, z, x, yt+0.26*s, z, 0.09*s, 0.09*s, LLUM, 8);    // llanterna
  con(G, x, z, 0.12*s, 0.12*s, yt+0.26*s, yt+0.29*s, 8, col, true);
  con(G, x, z, 0.12*s, 0, yt+0.29*s, yt+0.40*s, 8, col, false);           // cúpula
  LLUMS.push(x, yt+0.15*s, z);
}

// illot de roca per a un far posat sobre l'aigua: un monticle de vuit cares que
// s'estreny cap amunt, amb un replà al cim i un parell de roques soltes a l'aigua
const ILLOT_Y = 0.22;
function illot(G, cel, ci){
  const c = cel.c, vora = [];
  for(let e=0;e<4;e++) vora.push(cel.p[e], entre(cel.p[e], cel.p[(e+1)%4], 0.5));
  const anell = (f, j) => vora.map((p, i) => {
    const k = f*(1 + (hash3(ci, i, 180+j) - 0.5)*0.18);
    return {x: c.x + (p.x-c.x)*k, z: c.z + (p.z-c.z)*k};
  });
  const pisos = [[anell(0.98, 0), -0.6], [anell(0.8, 1), 0.07], [anell(0.6, 2), ILLOT_Y]];
  for(let j=0;j<2;j++){
    const [a, ya] = pisos[j], [b, yb] = pisos[j+1];
    for(let i=0;i<8;i++){
      const i2 = (i+1)%8, col = hash3(ci, i, 190+j) < 0.5 ? ROCA_A : ROCA_B;
      quad(G, [a[i].x,ya,a[i].z], [a[i2].x,ya,a[i2].z], [b[i2].x,yb,b[i2].z], [b[i].x,yb,b[i].z], j ? clar(col, 1.08) : col);
    }
  }
  const t = pisos[2][0];
  for(let i=0;i<8;i++){
    const i2 = (i+1)%8;
    tri(G, [c.x,ILLOT_Y+0.015,c.z], [t[i].x,ILLOT_Y,t[i].z], [t[i2].x,ILLOT_Y,t[i2].z], clar(ROCA_A, 1.12));
  }
  for(let r=0;r<2;r++){                                   // roques soltes arran d'aigua
    const i = Math.floor(hash3(ci, r, 195)*8), p = entre(c, vora[i], 0.9);
    bola(G, p.x, -0.08, p.z, 0.13 + 0.06*hash3(ci, r, 196), 0.2, r ? ROCA_B : ROCA_A, ci*31 + r, 6);
  }
  far(G, c.x, ILLOT_Y, c.z, ci, 1.15);
}

// on van les barques amarrades: a l'aigua del costat dels molls. Una barca fa més d'una
// cel·la de llarg, així que també han de ser lliures les dues cel·les del costat on
// sobresurt, i no hi pot haver cap altra barca a tocar
function amarres(){
  const out = [], ocupat = new Set();
  for(let ci=0; ci<cells.length; ci++){
    if(!moll[ci] || !esCarrer[ci]) continue;
    const cel = cells[ci];
    for(let e=0;e<4;e++){
      const w = cel.nb[e];
      if(!aiguaLliure(w) || ocupat.has(w) || hash3(w,170,1) > 0.7) continue;
      const j = cells[w].nb.indexOf(ci);
      const laterals = [cells[w].nb[(j+1)%4], cells[w].nb[(j+3)%4]];
      if(!laterals.every(aiguaLliure) || laterals.some(b => ocupat.has(b))) continue;
      ocupat.add(w); for(const b of laterals) ocupat.add(b);
      const A = cel.p[e], B = cel.p[(e+1)%4], m = entre(A, B, 0.5), n = normalFora(A, B, cel.c);
      out.push({clau: w + '_' + ci + '_' + e, x: m.x + n.x*0.34, z: m.z + n.z*0.34,
                rot: Math.atan2(-(B.z-A.z), B.x-A.x), llavor: w*977 + 13});
    }
  }
  return out;
}
