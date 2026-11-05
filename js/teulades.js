/* Cala · tipus de teulades i de terrats */

/* ============================================================
   TEULADES I TERRATS
   ------------------------------------------------------------
   Cada grup de cases que comparteix coberta (vegeu cobertes())
   en té un estil, que surt d'un hash de la casa que el decideix:
   sempre és el mateix. Hi ha:
   - teulades a quatre aigües (les de sempre: una piràmide per a
     una casa sola, un carener per a un bloc);
   - teulades a dues aigües: un carener per cel·la, entre els
     punts mitjos de dues arestes oposades, amb un cavall (paret
     en triangle) a cada punta. L'eix es propaga pel grup: si dues
     cel·les es toquen per la punta del carener, el carener
     continua; si es toquen pel ràfec, fan dues teulades paral·leles.
     Si l'eix no quadra a tot el grup, es fa a quatre aigües;
   - teulades a una aigua, en cases soles: si n'hi ha una de més
     alta al costat, la teulada s'hi recolza;
   - terrats: el de sempre, amb ampit d'obra, testos, arbres o
     pèrgola; amb barana de ferro i estenedors de roba; i amb
     golfes, una cambra petita amb teulada, porta i finestra, i de
     vegades també estenedors.
   On arrenca o arriba una escala sempre hi ha terrat (el de
   sempre o el de barana), perquè s'hi ha de poder passar.
   En mode Teulades, clicant una casa es tria a mà l'estil del seu
   grup (teulada[ci]); el botó dret el torna automàtic.
   ============================================================ */

const PUJA_DUES = 0.34, PUJA_UNA = 0.3;
const ROBA = ['#f4f1ea', '#a8c3cf', '#e3a8a2', '#f2d68a', '#2f6f8f', '#d9473b', '#fbfbf6', '#3d7a68'].map(C);
const CORDA = C('#e8e4dc');

// els estils, en l'ordre en què van sortint en clicar en mode Teulades (teulada[ci] = índex + 1)
const ESTILS = ['quatre', 'dues', 'una', 'terrat', 'barana', 'golfes'];
const NOM_ESTIL = {quatre: 'teulada a quatre aigües', dues: 'teulada a dues aigües', una: 'teulada a una aigua',
                   terrat: 'terrat amb ampit', barana: 'terrat amb barana i estenedors', golfes: 'terrat amb golfes'};

// l'estil triat a mà per a un grup, o null: el de la casa que decideix, o si no, el de la primera que en tingui
function estilTriat(llista, clau){
  const k = teulada[clau] || llista.map(m => teulada[m] || 0).find(v => v > 0);
  return k ? ESTILS[k - 1] : null;
}

// els estils que pot tenir un grup: amb una escala, només terrat; a una aigua, només una casa sola;
// a dues aigües, si el carener hi quadra
function estilsPossibles(llista, clau){
  const forcat = llista.some(m => terratForcat[m]);
  return ESTILS.filter(e => (!forcat || e === 'terrat' || e === 'barana') && (e !== 'una' || llista.length === 1)
                          && (e !== 'dues' || eixosCarener(llista, clau)));
}

// quin estil té la coberta d'un grup: 'quatre', 'dues', 'una', 'terrat', 'barana' o 'golfes'
function estilCoberta(llista, h, clau, torre){
  const triat = torre ? null : estilTriat(llista, clau);
  if(triat && estilsPossibles(llista, clau).includes(triat)) return triat;
  if(llista.some(m => terratForcat[m])) return hash3(clau, 9, 5) < 0.5 ? 'terrat' : 'barana';
  if(torre) return 'quatre';
  if(hash3(clau, 9, 2) < 0.30){
    const s = hash3(clau, 9, 5);
    return s < 0.4 ? 'terrat' : s < 0.7 ? 'barana' : 'golfes';
  }
  // una casa sola arrambada a una de més alta: de vegades, teulada a una aigua que s'hi recolza
  if(llista.length === 1 && cells[clau].nb.some(b => b >= 0 && heff[b] > h) && hash3(clau, 9, 7) < 0.3) return 'una';
  const s = hash3(clau, 9, 6);
  return s < 0.45 ? 'quatre' : s < 0.92 ? 'dues' : llista.length === 1 ? 'una' : 'dues';
}

// la normal cap enfora de l'aresta e d'una cel·la
const enfora = (cel, e) => { const m = entre(cel.p[e % 4], cel.p[(e+1) % 4], 0.5); return [m.x - cel.c.x, 0, m.z - cel.c.z]; };

/* --- dues aigües --- */
// l'eix de cada cel·la del grup: les arestes e amb e % 2 === eix fan de cavall (punta del carener).
// Es propaga de veí en veí; si no quadra (pot passar en una quadrícula irregular), torna null
function eixosCarener(llista, clau){
  const dins = new Set(llista);
  for(const inici of (hash3(clau, 9, 8) < 0.5 ? [0, 1] : [1, 0])){
    const ax = new Map([[clau, inici]]), cua = [clau];
    let ok = true;
    for(let i=0; i<cua.length && ok; i++){
      const a = cua[i];
      cells[a].nb.forEach((b, e) => {
        if(!ok || b < 0 || !dins.has(b)) return;
        const j = cells[b].nb.indexOf(a);
        const vol = (e % 2 === ax.get(a)) ? j % 2 : 1 - j % 2;   // punta amb punta, ràfec amb ràfec
        if(ax.has(b)){ if(ax.get(b) !== vol) ok = false; }
        else { ax.set(b, vol); cua.push(b); }
      });
    }
    if(ok) return ax;
  }
  return null;
}

function teuladaDuesAigues(G, llista, y, clau, pos, vora_, teu){
  const ax = eixosCarener(llista, clau); if(!ax) return false;
  const yc = y + PUJA_DUES, carener = fosc(teu, 0.85);
  let xem = null;
  for(const ci of llista){
    const cel = cells[ci], P = cel.vi.map(v => pos.get(v)), a = ax.get(ci);
    const V = k => P[k % 4], W = k => cel.p[k % 4];
    const M0 = entre(V(a), V(a+1), 0.5), M1 = entre(V(a+2), V(a+3), 0.5);
    const ton = s => clar(teu, 0.92 + hash3(ci, s, 77)*0.14);
    // els dos aiguavessos
    cara(G, [V(a+1).x,y,V(a+1).z], [V(a+2).x,y,V(a+2).z], [M1.x,yc,M1.z], [M0.x,yc,M0.z], ton(0), [0,1,0]);
    cara(G, [V(a+3).x,y,V(a+3).z], [V(a).x,y,V(a).z], [M0.x,yc,M0.z], [M1.x,yc,M1.z], ton(1), [0,1,0]);
    facetaSolar(ci, [V(a+1).x,y,V(a+1).z], [V(a+2).x,y,V(a+2).z], [M1.x,yc,M1.z], [M0.x,yc,M0.z]);
    facetaSolar(ci, [V(a+3).x,y,V(a+3).z], [V(a).x,y,V(a).z], [M0.x,yc,M0.z], [M1.x,yc,M1.z]);
    tronc(G, M0.x, yc, M0.z, M1.x, yc, M1.z, 0.022, 0.022, carener, 4);                 // el carener
    for(const e of [a, a+2]){
      if(!vora_(ci, e % 4)) continue;                                                  // el carener continua a la casa del costat
      const nd = enfora(cel, e % 4), M = e === a ? M0 : M1, A = V(e), B = V(e+1);
      // el cavall: la paret en triangle, si no la tapa una casa més alta
      const b = cel.nb[e % 4];
      if(!(b >= 0 && heff[b]*ALT >= yc)){
        const wa = W(e), wb = W(e+1), wm = entre(wa, wb, 0.5);
        cara(G, [wa.x,y,wa.z], [wb.x,y,wb.z], [wm.x,yc,wm.z], [wm.x,yc,wm.z], colorParet(ci), nd);
      }
      // les llates de la vora, en pendent
      cara(G, [A.x,y-0.07,A.z], [M.x,yc-0.07,M.z], [M.x,yc,M.z], [A.x,y,A.z], teu, nd);
      cara(G, [M.x,yc-0.07,M.z], [B.x,y-0.07,B.z], [B.x,y,B.z], [M.x,yc,M.z], teu, nd);
    }
    for(const e of [a+1, a+3]){                                                         // la fascia del ràfec
      if(!vora_(ci, e % 4)) continue;
      const A = V(e), B = V(e+1);
      cara(G, [A.x,y-0.09,A.z], [B.x,y-0.09,B.z], [B.x,y,B.z], [A.x,y,A.z], teu, enfora(cel, e % 4));
    }
    const m = entre(M0, M1, 0.5);
    apuntaDiada(ci, 1.5, () => banderaPal(G, m.x, yc - 0.03, m.z, 0.6, ci));
    if(ci === clau) xem = entre(M0, M1, 0.3);
  }
  if(xem && hash3(clau,7,7) < 0.6 && !solar[clau]) xemeneia(G, xem.x, xem.z, y, yc + 0.16, colorParet(clau), teu);
  return true;
}

/* --- una aigua: una casa sola --- */
function teuladaUnaAigua(G, ci, y, pos, teu){
  const cel = cells[ci], P = cel.vi.map(v => pos.get(v)), W = k => cel.p[k % 4], V = k => P[k % 4];
  // la banda alta: on hi ha una casa més alta (la teulada s'hi recolza); si no, a l'atzar
  const h0 = Math.floor(hash3(ci, 9, 9)*4);
  let eH = h0;
  for(let k=0;k<4;k++){ const e = (h0 + k) % 4, b = cel.nb[e]; if(b >= 0 && heff[b]*ALT > y + 0.05){ eH = e; break; } }
  const yh = y + PUJA_UNA, Y = k => (k % 4 === eH || k % 4 === (eH+1) % 4) ? yh : y;
  const tapa = e => { const b = cel.nb[e % 4]; return b >= 0 && heff[b]*ALT >= yh; };   // una casa més alta tapa aquella paret
  cara(G, [V(0).x,Y(0),V(0).z], [V(1).x,Y(1),V(1).z], [V(2).x,Y(2),V(2).z], [V(3).x,Y(3),V(3).z],
       clar(teu, 0.95 + hash3(ci, 0, 77)*0.1), [0,1,0]);
  facetaSolar(ci, [V(eH+2).x,Y(eH+2),V(eH+2).z], [V(eH+3).x,Y(eH+3),V(eH+3).z], [V(eH).x,Y(eH),V(eH).z], [V(eH+1).x,Y(eH+1),V(eH+1).z]);
  const col = colorParet(ci);
  // la paret de la banda alta i les dels costats, en triangle
  if(!tapa(eH)){ const a = W(eH), b = W(eH+1); cara(G, [a.x,y,a.z], [b.x,y,b.z], [b.x,yh,b.z], [a.x,yh,a.z], col, enfora(cel, eH)); }
  if(!tapa(eH+1)){ const a = W(eH+1), b = W(eH+2); cara(G, [a.x,y,a.z], [b.x,y,b.z], [a.x,yh,a.z], [a.x,yh,a.z], col, enfora(cel, eH+1)); }
  if(!tapa(eH+3)){ const a = W(eH+3), b = W(eH); cara(G, [a.x,y,a.z], [b.x,y,b.z], [b.x,yh,b.z], [b.x,yh,b.z], col, enfora(cel, eH+3)); }
  // les vores: fascia a la banda baixa i llates en pendent als costats
  for(let e=0;e<4;e++){
    const A = V(e), B = V(e+1), ya = Y(e), yb = Y(e+1);
    if(e === eH && tapa(eH)) continue;
    cara(G, [A.x,ya-0.08,A.z], [B.x,yb-0.08,B.z], [B.x,yb,B.z], [A.x,ya,A.z], teu, enfora(cel, e));
  }
  const c = cel.c;
  apuntaDiada(ci, 1.5, () => banderaPal(G, c.x, (y + yh)/2 - 0.03, c.z, 0.6, ci));
  if(hash3(ci,7,7) < 0.6 && !solar[ci]){           // xemeneia, a la banda alta (si no hi ha plaques)
    const p = entre(c, entre(W(eH), W(eH+1), 0.5), 0.45);
    xemeneia(G, p.x, p.z, y, yh + 0.16, col, teu);
  }
  return true;
}

/* --- terrats --- */
// barana de ferro sobre un sòcol baix d'obra, de A a B (vora de fora) amb ai, bi cap a dins
function baranaFerro(G, A, B, ai, bi, y, col){
  const top = y + 0.05, a5 = entre(A, ai, 0.25), b5 = entre(B, bi, 0.25);
  quad(G, [A.x,y-0.09,A.z], [B.x,y-0.09,B.z], [B.x,top,B.z], [A.x,top,A.z], col);
  quad(G, [b5.x,y,b5.z], [a5.x,y,a5.z], [a5.x,top,a5.z], [b5.x,top,b5.z], col);
  quad(G, [A.x,top,A.z], [B.x,top,B.z], [b5.x,top,b5.z], [a5.x,top,a5.z], col);
  const ra = entre(A, ai, 0.12), rb = entre(B, bi, 0.12), yt = top + 0.2;
  const l = Math.hypot(rb.x - ra.x, rb.z - ra.z), ux = (rb.x - ra.x)/(l || 1), uz = (rb.z - ra.z)/(l || 1);
  const n = Math.max(2, Math.round(l/0.07));
  for(let i=0;i<=n;i++){                          // els barrots
    const p = entre(ra, rb, i/n);
    quad2(G, [p.x - ux*0.005, top, p.z - uz*0.005], [p.x + ux*0.005, top, p.z + uz*0.005],
             [p.x + ux*0.005, yt, p.z + uz*0.005], [p.x - ux*0.005, yt, p.z - uz*0.005], FERRO);
  }
  tronc(G, ra.x, yt, ra.z, rb.x, yt, rb.z, 0.01, 0.01, FERRO, 4);   // el passamà
}

// estenedor de roba: dos pals amb travesser, dues cordes i roba estesa
function estenedor(G, ci, y){
  const cel = cells[ci], c = cel.c, a = Math.floor(hash3(ci, 410, 1)*2);
  const mid = e => entre(cel.p[e % 4], cel.p[(e+1) % 4], 0.5);
  const A = entre(c, mid(a), 0.62), B = entre(c, mid(a+2), 0.62);
  const dx = B.x - A.x, dz = B.z - A.z, l = Math.hypot(dx, dz) || 1, ux = dx/l, uz = dz/l, sx = -uz, sz = ux;
  const yl = y + 0.42, w = 0.1;
  for(const P of [A, B]){
    con(G, P.x, P.z, 0.009, 0.009, y, yl + 0.02, 4, FERRO, false);
    tronc(G, P.x - sx*w, yl, P.z - sz*w, P.x + sx*w, yl, P.z + sz*w, 0.007, 0.007, FERRO, 3);
  }
  for(const s of [-1, 1]){
    const a0 = {x: A.x + sx*w*s, z: A.z + sz*w*s}, b0 = {x: B.x + sx*w*s, z: B.z + sz*w*s};
    tronc(G, a0.x, yl, a0.z, b0.x, yl, b0.z, 0.0035, 0.0035, CORDA, 3);
    const n = 2 + Math.floor(hash3(ci, 411, s + 2)*3);
    for(let k=0;k<n;k++){
      const t = (k + 0.5)/n, k2 = k*7 + s + 2;
      const pw = Math.min(0.03 + hash3(ci, 413, k2)*0.035, l/n*0.4), ph = 0.06 + hash3(ci, 414, k2)*0.11;
      const col = ROBA[Math.floor(hash3(ci, 415, k2)*ROBA.length)];
      const m = {x: a0.x + (b0.x - a0.x)*t, z: a0.z + (b0.z - a0.z)*t};
      quad2(G, [m.x - ux*pw, yl - 0.004, m.z - uz*pw], [m.x + ux*pw, yl - 0.004, m.z + uz*pw],
               [m.x + ux*pw, yl - ph, m.z + uz*pw], [m.x - ux*pw, yl - ph, m.z - uz*pw], col);
    }
  }
}

// golfes: una cambra petita en un racó del terrat, amb teulada a quatre aigües, porta i finestra
function golfes(G, ci, y, teu){
  const cel = cells[ci], c = cel.c, k = Math.floor(hash3(ci, 420, 1)*4);
  const cen = entre(c, cel.p[k], 0.28);                     // cap a un cantó: davant de la porta hi queda terrat
  const Q = cel.p.map(p => ({x: cen.x + (p.x - c.x)*0.48, z: cen.z + (p.z - c.z)*0.48}));
  const hg = 0.5, ys = y + hg, yc = ys + 0.2, col = colorParet(ci);
  for(let e=0;e<4;e++){
    const A = Q[e], B = Q[(e+1)%4], m = entre(A, B, 0.5);
    cara(G, [A.x,y,A.z], [B.x,y,B.z], [B.x,ys,B.z], [A.x,ys,A.z], col, [m.x - cen.x, 0, m.z - cen.z]);
  }
  const R = Q.map(p => entre(cen, p, 1.2));
  for(let e=0;e<4;e++){
    const a = R[e], b = R[(e+1)%4], m = entre(a, b, 0.5), nd = [m.x - cen.x, 0, m.z - cen.z];
    cara(G, [a.x,ys,a.z], [b.x,ys,b.z], [cen.x,yc,cen.z], [cen.x,yc,cen.z], clar(teu, 0.92 + hash3(ci, e, 79)*0.14), [nd[0], 1, nd[2]]);
    facetaSolar(ci, [a.x,ys,a.z], [b.x,ys,b.z], [cen.x,yc,cen.z], [cen.x,yc,cen.z]);   // amb plaques, a la teulada de les golfes
    cara(G, [a.x,ys-0.06,a.z], [b.x,ys-0.06,b.z], [b.x,ys,b.z], [a.x,ys,a.z], teu, nd);
  }
  // la porta i la finestra, a les dues cares que no miren al cantó
  const cara2 = (e, t0, t1, ya, yb, o, colr, GG = G) => {
    const A = Q[e % 4], B = Q[(e+1) % 4], m = entre(A, B, 0.5), l = Math.hypot(m.x - cen.x, m.z - cen.z) || 1;
    const nx = (m.x - cen.x)/l, nz = (m.z - cen.z)/l, P = t => entre(A, B, t);
    const a = P(t0), b = P(t1);
    cara(GG, [a.x + nx*o, ya, a.z + nz*o], [b.x + nx*o, ya, b.z + nz*o], [b.x + nx*o, yb, b.z + nz*o], [a.x + nx*o, yb, a.z + nz*o], colr, [nx, 0, nz]);
  };
  const ep = k + 1, ef = k + 2;
  cara2(ep, 0.3, 0.7, y, y + 0.4, 0.006, colMarc(ci));
  cara2(ep, 0.35, 0.65, y, y + 0.37, 0.01, colorPorta(ci));
  cara2(ef, 0.35, 0.65, y + 0.2, y + 0.38, 0.006, colMarc(ci));
  const llum = hash3(ci, 421, 1) < 0.6;               // de nit, més o menys la meitat tenen llum
  cara2(ef, 0.39, 0.61, y + 0.23, y + 0.35, 0.01, llum ? fosc(CALID, 0.75) : FOSC, llum ? GF : G);
}
