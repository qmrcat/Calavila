/* Cala · platja i ponts */

/* ============================================================
   PLATJA
   ------------------------------------------------------------
   En un tram de costa (sempre el mateix per a cada cala), els
   buits a una o dues cel·les del que hi ha construït es tornen
   arena. L'alçada de cada vèrtex diu on és: tocant a terra, a
   ran; entre arena, una mica més avall; tocant al mar, sota
   l'aigua. Així la platja fa pendent sola cap a l'aigua.
   ============================================================ */

function alcadaSorra(v){
  if(vora.has(v)) return -0.75;
  let terra = false, mar = false;
  for(const c of fans.get(v)){
    if(heff[c] > 0 || esCarrer[c]) terra = true;
    else if(!esSorra[c]) mar = true;
  }
  return terra ? 0.03 : mar ? -0.75 : -0.16;
}

const barreja = (a, b, t) => [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];

function sorra(G, cel, ci){
  const p = cel.p, Y = cel.vi.map(alcadaSorra);
  const bl = (u,v) => entre(entre(p[0],p[1],u), entre(p[3],p[2],u), v);
  const hy = (u,v) => { const a = Y[0]+(Y[1]-Y[0])*u, b = Y[3]+(Y[2]-Y[3])*u; return a+(b-a)*v; };
  const col = (y, j) => clar(barreja(SORRA_MULLADA, SORRA_SECA, Math.min(1, Math.max(0, (y+0.6)/0.6))), 0.97 + j*0.06);
  const M = 2;
  for(let i=0;i<M;i++) for(let j=0;j<M;j++){
    const u0=i/M, u1=(i+1)/M, v0=j/M, v1=(j+1)/M, jit = hash3(ci,i,j+90);
    const c0=bl(u0,v0), c1=bl(u1,v0), c2=bl(u1,v1), c3=bl(u0,v1);
    const y0=hy(u0,v0), y1=hy(u1,v0), y2=hy(u1,v1), y3=hy(u0,v1);
    quadV(G, [c0.x,y0,c0.z], [c1.x,y1,c1.z], [c2.x,y2,c2.z], [c3.x,y3,c3.z],
          col(y0,jit), col(y1,jit), col(y2,jit), col(y3,jit));
  }

  if(sorraDist[ci] !== 1) return;                 // les coses, a l'arena seca
  const h = hash3(ci, 61, 2);
  if(h < 0.24) parasol(G, bl, hy, ci);
  else if(h > 0.93){                              // llaüt varat
    const c = bl(0.5,0.5);
    afegeix(G, llautG(newG(), mulberry32(ci*31 + 7)), c.x, hy(0.5,0.5) + 0.09, c.z,
            hash3(ci,63,1)*6.283, 0.14);
  }
}

function parasol(G, bl, hy, ci){
  const u = 0.35 + hash3(ci,62,1)*0.3, v = 0.35 + hash3(ci,62,2)*0.3;
  const p = bl(u,v), y = hy(u,v);
  const cols = [[C('#d9473b'), MARC], [C('#2f6f8f'), MARC], [C('#e0a63a'), MARC],
                [C('#3d7a68'), C('#f2d68a')]][Math.floor(hash3(ci,62,3)*4)];
  con(G, p.x, p.z, 0.012, 0.012, y-0.1, y+0.7, 4, MARC, false);
  const r = 0.36, yb = y + 0.58, ya = y + 0.74, n = 8;
  for(let k=0;k<n;k++){                           // tela a franges, per sobre i per sota
    const a0 = -k*6.283/n, a1 = -(k+1)*6.283/n;
    const A = [p.x+Math.cos(a0)*r, yb, p.z+Math.sin(a0)*r], B = [p.x+Math.cos(a1)*r, yb, p.z+Math.sin(a1)*r];
    tri(G, [p.x,ya,p.z], A, B, cols[k%2]);
    tri(G, [p.x,ya-0.02,p.z], B, A, fosc(cols[k%2], 0.7));
  }
  // tovallola estesa al costat, seguint el pendent de l'arena
  const tc = [C('#f2d68a'), C('#e3a8a2'), C('#a8c3cf'), MARC, C('#d9473b')][Math.floor(hash3(ci,62,4)*5)];
  const U0 = u > 0.5 ? 0.06 : 0.66, U1 = U0 + 0.26, V0 = 0.2, V1 = 0.72;
  const T = [[U0,V0],[U1,V0],[U1,V1],[U0,V1]].map(([a,b]) => { const q = bl(a,b); return [q.x, hy(a,b)+0.014, q.z]; });
  quad(G, T[0], T[1], T[2], T[3], tc);
}

// copia una geometria feta a part, girada i inclinada, a la malla G (per les dues cares)
function afegeix(G, Gt, x, y, z, rot, inc){
  const cr = Math.cos(rot), sr = Math.sin(rot), ci = Math.cos(inc), si = Math.sin(inc);
  const tf = i => {
    const px = Gt.p[i], py = Gt.p[i+1]*ci - Gt.p[i+2]*si, pz = Gt.p[i+1]*si + Gt.p[i+2]*ci;
    return [x + px*cr + pz*sr, y + py, z - px*sr + pz*cr];
  };
  const cl = i => [Gt.c[i], Gt.c[i+1], Gt.c[i+2]];
  for(let i=0;i<Gt.p.length;i+=9){
    const a = tf(i), b = tf(i+3), c = tf(i+6);
    tri(G, a, b, c, cl(i), cl(i+3), cl(i+6));
    tri(G, a, c, b, cl(i), cl(i+6), cl(i+3));
  }
}

/* ============================================================
   PONTS
   ------------------------------------------------------------
   Pont de pedra d'un sol arc sobre una cel·la d'aigua: va d'una
   riba (s=0) a l'altra (s=1); t és el través, la direcció per on
   corre el canal. Fa esquena d'ase i té l'arc prou alt perquè
   per sota s'hi vegi l'aigua.
   ============================================================ */

const PEDRA_PONT = C('#c8b596'), DOVELLA = C('#a8957a');

// alçada del pas a la riba de l'aresta e: el carrer, el terra de la casa o, si no hi ha res, a ran
function riba(ci, e){
  const b = cells[ci].nb[e];
  if(b >= 0 && esCarrer[b]){
    const j = cells[b].nb.indexOf(ci);
    return Math.max(nvC[b][j], nvC[b][(j+1)%4])*ALT + CARRER_Y;
  }
  if(b >= 0 && heff[b] > 0 && !span[b]) return base[b]*ALT + CARRER_Y;
  return CARRER_Y;
}

function pontG(G, cel, ci){
  const p = cel.p, eix = pont[ci];
  const bl = (u,v) => entre(entre(p[0],p[1],u), entre(p[3],p[2],u), v);
  const B = eix === 1 ? (s,t) => bl(t,s) : (s,t) => bl(s,t);
  const [eA, eB] = eix === 1 ? [0, 2] : [3, 1];          // arestes de les dues ribes
  const ya = riba(ci, eA), yb = riba(ci, eB);
  const GEP = 0.14, YW = -0.8;                            // esquena d'ase; peu de l'arc, sota l'aigua
  const yd = s => ya + (yb-ya)*s + GEP*Math.sin(Math.PI*s);
  const yc = Math.min(ya, yb) + GEP - 0.17;               // clau de l'arc
  const yArc = s => YW + (yc - YW)*Math.sqrt(Math.max(0, 1 - (2*s-1)*(2*s-1)));
  const pt = (s, t, y) => { const q = B(s,t); return [q.x, y, q.z]; };

  const K = 12, T0 = 0.1, T1 = 0.9, GR = 0.07, BAR = 0.17, DOV = 0.08;
  for(let k=0;k<K;k++){
    const s0 = k/K, s1 = (k+1)/K;
    const d0 = yd(s0), d1 = yd(s1), a0 = yArc(s0), a1 = yArc(s1);
    const v0 = Math.min(a0 + DOV, d0), v1 = Math.min(a1 + DOV, d1);
    quad2(G, pt(s0,T0+GR,d0), pt(s1,T0+GR,d1), pt(s1,T1-GR,d1), pt(s0,T1-GR,d0),
          LLOSA[Math.floor(hash3(ci,k,95)*LLOSA.length)]);                       // tauler
    quad2(G, pt(s0,T0,a0), pt(s1,T0,a1), pt(s1,T1,a1), pt(s0,T1,a0), fosc(PEDRA_PONT, 0.62));  // intradós
    for(const [t, ti] of [[T0, T0+GR], [T1, T1-GR]]){
      quad2(G, pt(s0,t,a0), pt(s1,t,a1), pt(s1,t,v1), pt(s0,t,v0), k%2 ? DOVELLA : fosc(DOVELLA, 0.88));
      quad2(G, pt(s0,t,v0), pt(s1,t,v1), pt(s1,t,d1+BAR), pt(s0,t,d0+BAR),
            clar(PEDRA_PONT, 0.95 + hash3(ci,k,96)*0.09));                          // timpà i barana
      quad2(G, pt(s0,ti,d0), pt(s1,ti,d1), pt(s1,ti,d1+BAR), pt(s0,ti,d0+BAR), PEDRA_PONT);
      quad2(G, pt(s0,t,d0+BAR), pt(s1,t,d1+BAR), pt(s1,ti,d1+BAR), pt(s0,ti,d0+BAR), clar(PEDRA_PONT, 1.08));
    }
  }
  for(const s of [0, 1]){                                 // caps de les baranes i, on no hi ha riba, el front
    const d = yd(s);
    for(const [t, ti] of [[T0, T0+GR], [T1-GR, T1]])
      quad2(G, pt(s,t,d), pt(s,ti,d), pt(s,ti,d+BAR), pt(s,t,d+BAR), PEDRA_PONT);
    const nb = cel.nb[s ? eB : eA];
    if(!esTerra(nb) && !(nb >= 0 && pont[nb] > 0))
      quad2(G, pt(s,T0,YW), pt(s,T1,YW), pt(s,T1,d), pt(s,T0,d), PEDRA_PONT);
  }
  if(fanals.has(ci)){                                     // fanal al mig d'una barana (si no n'hi ha cap al costat)
    const t = hash3(ci,97,2) < 0.5 ? T0 + GR/2 : T1 - GR/2, q = B(0.5, t);
    fanal(G, q.x, yd(0.5) + BAR, q.z);
  }
}
