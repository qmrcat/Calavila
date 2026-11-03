/* Cala · cantonades, voltes, cobertes, carrers i escales */

/* ============================================================
   CANTONADES ARRODONIDES
   ------------------------------------------------------------
   Un cantó s'arrodoneix només quan les dues arestes que hi
   arriben són parets exteriors. Si una de les dues dona a una
   casa veïna, el mur ha d'arribar al vèrtex exacte perquè hi
   enllaci el mur del veí: allà el cantó es deixa viu.
   Com que la condició depèn del pis (un veí baix deixa de
   tapar a partir de certa alçada), el perfil canvia amb
   l'alçada i cal tapar el ressalt horitzontal que es forma.
   ============================================================ */

const RADI = 0.21, ARR_K = 3;

function capA(A, B, r){                       // punt a distància r d'A cap a B
  const dx = B.x-A.x, dz = B.z-A.z, l = Math.hypot(dx,dz) || 1;
  const t = Math.min(r, l*0.42)/l;
  return {x: A.x+dx*t, z: A.z+dz*t};
}
function bezQ(A, P, B, t){                    // Bézier quadràtica
  const s = 1-t;
  return {x: s*s*A.x + 2*s*t*P.x + t*t*B.x, z: s*s*A.z + 2*s*t*P.z + t*t*B.z};
}
function arcCanto(cel, i){                    // corba del cantó i (sempre la mateixa)
  const p = cel.p;
  const A = capA(p[i], p[(i+3)%4], RADI), B = capA(p[i], p[(i+1)%4], RADI);
  const out = [];
  for(let k=0;k<=ARR_K;k++) out.push(bezQ(A, p[i], B, k/ARR_K));
  return out;
}
function cantons(cel, L){
  const ext = [0,1,2,3].map(e => !ocupat(cel.nb[e], L));
  return {ext, rodo: [0,1,2,3].map(i => ext[(i+3)%4] && ext[i])};
}
function tapaCanto(G, P, cv, y, amunt, col){  // omple el sector que deixa la corba
  for(let k=0;k<cv.length-1;k++){
    if(amunt) tri(G, [P.x,y,P.z], [cv[k+1].x,y,cv[k+1].z], [cv[k].x,y,cv[k].z], col);
    else      tri(G, [P.x,y,P.z], [cv[k].x,y,cv[k].z], [cv[k+1].x,y,cv[k+1].z], col);
  }
}

/* ============================================================
   ARCS I VOLTES
   ============================================================ */

const corbaArc = t => ARC_YS + (ARC_YC-ARC_YS)*Math.sqrt(Math.max(0, 1-(2*t-1)*(2*t-1)));

function arcada(G, cel, ci, col){
  const p = cel.p, nb = cel.nb;
  const obert = [0,1,2,3].map(e => !(nb[e] >= 0 && heights[nb[e]] > 0));

  for(let e=0;e<4;e++){                       // timpans
    if(!obert[e]) continue;
    const A = p[e], B = p[(e+1)%4];
    for(let k=0;k<ARC_K;k++){
      const t0 = k/ARC_K, t1 = (k+1)/ARC_K;
      const y0 = corbaArc(t0), y1 = corbaArc(t1);
      const P0 = entre(A,B,t0), P1 = entre(A,B,t1);
      quad(G, [P0.x,y0,P0.z], [P1.x,y1,P1.z], [P1.x,ALT,P1.z], [P0.x,ALT,P0.z], col);
    }
  }

  let eix = -1;
  if(obert[0] && obert[2]) eix = 0;
  else if(obert[1] && obert[3]) eix = 1;

  if(eix >= 0){                               // volta de canó
    const A = p[eix], B = p[(eix+1)%4], D = p[(eix+3)%4], E = p[(eix+2)%4];
    for(let k=0;k<ARC_K;k++){
      const t0 = k/ARC_K, t1 = (k+1)/ARC_K;
      const y0 = corbaArc(t0), y1 = corbaArc(t1);
      const P0 = entre(A,B,t0), P1 = entre(A,B,t1);
      const Q0 = entre(D,E,t0), Q1 = entre(D,E,t1);
      quad(G, [Q0.x,y0,Q0.z], [Q1.x,y1,Q1.z], [P1.x,y1,P1.z], [P0.x,y0,P0.z], col);
    }
  } else {                                    // porxo: sostre pla
    quad(G, [p[3].x,ALT,p[3].z], [p[2].x,ALT,p[2].z], [p[1].x,ALT,p[1].z], [p[0].x,ALT,p[0].z], col);
  }
}

/* ============================================================
   COBERTES FUSIONADES
   ------------------------------------------------------------
   Les cel·les veïnes que acaben a la mateixa alçada formen una
   regió i comparteixen una sola teulada. L'alçada de cada punt
   de la teulada depèn de la distància del vèrtex a la vora de
   la regió (0, 1, 2, 3 anells): un bloc solt fa una piràmide,
   quatre de junts fan un carener. Els vèrtexs de vora es
   desplacen cap enfora per fer el ràfec.
   ============================================================ */

const RAFEC = 0.11, PAS = 0.26;

function cobertes(G){
  const n = cells.length;
  const vista = new Array(n).fill(false);
  for(let ci=0; ci<n; ci++){
    if(heff[ci] <= 0 || vista[ci]) continue;
    const h = heff[ci], pila = [ci], membres = [ci];
    vista[ci] = true;
    while(pila.length){
      const a = pila.pop();
      for(const b of cells[a].nb){
        if(b >= 0 && !vista[b] && heff[b] === h){ vista[b] = true; pila.push(b); membres.push(b); }
      }
    }
    // L'estil de la coberta (teula o terrat, color, xemeneia) surt d'una casa del mateix
    // grup, no d'un número d'ordre: si no, afegir una casa en un racó renumerava tots els
    // grups de després i canviava teulades d'arreu del poble. Ara només canvia l'estil
    // d'un grup quan hi entra o en surt la casa que el decideix.
    let clau = ci, hm = hash3(ci, 41, 17);
    for(const m of membres){ const v = hash3(m, 41, 17); if(v < hm){ hm = v; clau = m; } }
    ferCoberta(G, membres, h, clau);
  }
}

// clau: la cel·la del grup que en decideix l'estil
function ferCoberta(G, llista, h, clau){
  const y = h*ALT;
  const dins = new Set(llista);

  // adjacència de vèrtexs dins la regió
  const adj = new Map();
  for(const ci of llista){
    const vi = cells[ci].vi;
    for(let k=0;k<4;k++){
      const a = vi[k], b = vi[(k+1)%4];
      if(!adj.has(a)) adj.set(a, new Set());
      if(!adj.has(b)) adj.set(b, new Set());
      adj.get(a).add(b); adj.get(b).add(a);
    }
  }

  // distància a la vora
  const d = new Map(), cua = [];
  for(const v of adj.keys()){
    if(vora.has(v) || fans.get(v).some(c => !dins.has(c))){ d.set(v, 0); cua.push(v); }
  }
  for(let qi=0; qi<cua.length; qi++){
    const v = cua[qi], dv = d.get(v);
    for(const w of adj.get(v)) if(!d.has(w)){ d.set(w, dv+1); cua.push(w); }
  }
  for(const v of adj.keys()) if(!d.has(v)) d.set(v, 3);

  // ràfec: els vèrtexs de vora s'allunyen del centre de la regió
  const pos = new Map(), dirs = new Map();
  for(const v of adj.keys()){
    const P = posV.get(v);
    if(d.get(v) === 0){
      let cx=0, cz=0, m=0;
      for(const c of fans.get(v)) if(dins.has(c)){ cx += cells[c].c.x; cz += cells[c].c.z; m++; }
      let dx = P.x - cx/m, dz = P.z - cz/m;
      const l = Math.hypot(dx,dz) || 1; dx/=l; dz/=l;
      dirs.set(v, {x:dx, z:dz});
      pos.set(v, {x: P.x + dx*RAFEC, z: P.z + dz*RAFEC});
    } else {
      dirs.set(v, {x:0, z:0});
      pos.set(v, {x:P.x, z:P.z});
    }
  }

  const alt = v => y + Math.min(d.get(v), 3)*PAS;
  const vora_ = (ci,e) => { const b = cells[ci].nb[e]; return !(b >= 0 && dins.has(b)); };

  const torre = llista.length === 1 ? tipusTorre[llista[0]] : null;
  if(torre === 'guaita'){ merlets(G, llista[0], y); return; }

  if(!torre && hash3(clau, 9, 2) < 0.24){      // terrat comú
    for(const ci of llista){
      const col = colorParet(ci);              // l'ampit de cada casa, del color de la seva façana
      const vi = cells[ci].vi, P = vi.map(v => pos.get(v));
      quad(G, [P[0].x,y,P[0].z], [P[1].x,y,P[1].z], [P[2].x,y,P[2].z], [P[3].x,y,P[3].z], TERRA);
      const top = y + 0.20;
      for(let e=0;e<4;e++){
        if(!vora_(ci,e)) continue;
        const A = P[e], B = P[(e+1)%4];
        const da = dirs.get(vi[e]), db = dirs.get(vi[(e+1)%4]);
        const ai = {x:A.x - da.x*0.20, z:A.z - da.z*0.20};
        const bi = {x:B.x - db.x*0.20, z:B.z - db.z*0.20};
        quad(G, [A.x,y-0.09,A.z], [B.x,y-0.09,B.z], [B.x,top,B.z], [A.x,top,A.z], col);
        quad(G, [bi.x,y,bi.z], [ai.x,y,ai.z], [ai.x,top,ai.z], [bi.x,top,bi.z], col);
        quad(G, [A.x,top,A.z], [B.x,top,B.z], [bi.x,top,bi.z], [ai.x,top,ai.z], col);
      }
      const hc = hash3(ci,4,4), cc = cells[ci].c;
      if(hc > 0.82)      arbre(G, cc.x, y, cc.z, 0.55, ci);
      else if(hc > 0.64) test(G, cc.x, y, cc.z, ci, 1.3);
      else if(hc < 0.12) pergola(G, ci, y);
    }
    return;
  }

  const teu = TEULES[Math.floor(hash3(clau,1,3)*TEULES.length)];
  const cim = torre === 'campanar' ? 0.78 : 0;    // el campanar acaba en punxa
  for(const ci of llista){
    const vi = cells[ci].vi, P = vi.map(v => pos.get(v)), Y = vi.map(v => alt(v));
    const dmin = Math.min(d.get(vi[0]), d.get(vi[1]), d.get(vi[2]), d.get(vi[3]));
    const cc = cells[ci].c, cy = cim ? y + cim : y + Math.min(dmin+1, 3)*PAS;
    for(let k=0;k<4;k++){
      const a = P[k], b = P[(k+1)%4];
      // cada aiguavés amb un to lleugerament diferent: les teules no són mai iguals
      tri(G, [a.x,Y[k],a.z], [b.x,Y[(k+1)%4],b.z], [cc.x,cy,cc.z], clar(teu, 0.92 + hash3(ci,k,77)*0.14));
    }
    for(let e=0;e<4;e++){                      // fascia del ràfec
      if(!vora_(ci,e)) continue;
      const a = P[e], b = P[(e+1)%4];
      quad(G, [a.x,Y[e]-0.09,a.z], [b.x,Y[(e+1)%4]-0.09,b.z], [b.x,Y[(e+1)%4],b.z], [a.x,Y[e],a.z], teu);
    }
  }

  if(torre === 'campanar'){                     // cornisa blanca i penell al capdamunt
    const cel = cells[llista[0]], c = cel.c;
    prisma(G, expand(cel.p, c, 1.06), y-0.12, y-0.05, MARC, false);
    con(G, c.x, c.z, 0.012, 0.010, y+cim-0.02, y+cim+0.26, 4, FERRO, false);
    bola(G, c.x, y+cim+0.06, c.z, 0.045, 0.08, BRONZE, llista[0], 6);
    biga(G, {x:c.x-0.09, z:c.z}, {x:c.x+0.09, z:c.z}, y+cim+0.21, y+cim+0.23, 0.012, FERRO);
  } else if(hash3(clau,7,7) < 0.6){             // xemeneia, a la mateixa casa que decideix l'estil
    const ci = clau;
    const cel = cells[ci], vi = cel.vi;
    const dmin = Math.min(d.get(vi[0]), d.get(vi[1]), d.get(vi[2]), d.get(vi[3]));
    const p = entre(cel.c, cel.p[Math.floor(hash3(clau,7,9)*4)], 0.3);
    xemeneia(G, p.x, p.z, y, y + Math.min(dmin+1, 3)*PAS + 0.16, colorParet(ci), teu);
  }
}

/* ============================================================
   CARRERS A DIFERENTS NIVELLS I ESCALES
   ------------------------------------------------------------
   Cada cel·la de carrer té un nivell enter. L'alçada d'un
   VÈRTEX és el màxim dels nivells dels carrers que hi toquen;
   així la cel·la alta queda plana i és la baixa la que absorbeix
   el desnivell i es converteix en escala. No cal marcar res:
   la cel·la diagonal apareix sola on hi ha canvi de nivell.
   ============================================================ */

const NIV_MAX = 4;

function alcadaVertex(v){
  let m = 0;
  for(const c of fans.get(v)) if(esCarrer[c] || heights[c] > 0) m = Math.max(m, nivEf[c]);
  return m;
}

function llambordes(G, bl, ci, y){
  const M = 3;
  for(let i=0;i<M;i++) for(let j=0;j<M;j++){
    const c0 = bl(i/M,j/M), c1 = bl((i+1)/M,j/M), c2 = bl((i+1)/M,(j+1)/M), c3 = bl(i/M,(j+1)/M);
    const col = LLOSA[Math.floor(hash3(ci, i, j+30)*LLOSA.length)];
    quad(G, [c0.x,y,c0.z], [c1.x,y,c1.z], [c2.x,y,c2.z], [c3.x,y,c3.z], col);
  }
}

function escala(G, bl, eix, y0, y1, ci){
  const dif = y1 - y0;
  const n = Math.max(2, Math.min(14, Math.round(Math.abs(dif)/0.16)));
  const flip = eix === 1;
  const B = flip ? ((s,t)=>bl(t,s)) : ((s,t)=>bl(s,t));
  const rev = (dif > 0) !== flip;
  for(let k=0;k<n;k++){
    const s0 = k/n, s1 = (k+1)/n;
    const ya = y0 + dif*k/n, yb = y0 + dif*(k+1)/n;
    const col = LLOSA[(k + ci) % LLOSA.length];
    const c0 = B(s0,0), c1 = B(s1,0), c2 = B(s1,1), c3 = B(s0,1);
    if(flip) quad(G, [c3.x,yb,c3.z], [c2.x,yb,c2.z], [c1.x,yb,c1.z], [c0.x,yb,c0.z], col);
    else     quad(G, [c0.x,yb,c0.z], [c1.x,yb,c1.z], [c2.x,yb,c2.z], [c3.x,yb,c3.z], col);
    const a = B(s0,0), b = B(s0,1);            // contrapetja
    const lo = Math.min(ya,yb), hi = Math.max(ya,yb);
    if(rev) quad(G, [b.x,lo,b.z], [a.x,lo,a.z], [a.x,hi,a.z], [b.x,hi,b.z], LLOSA[0]);
    else    quad(G, [a.x,lo,a.z], [b.x,lo,b.z], [b.x,hi,b.z], [a.x,hi,a.z], LLOSA[0]);
  }
}

function rampa(G, bl, Y, ci){                  // desnivell en diagonal: pendent suau
  const hy = (u,v) => { const a = Y[0]+(Y[1]-Y[0])*u, b = Y[3]+(Y[2]-Y[3])*u; return a+(b-a)*v; };
  const M = 4;
  for(let i=0;i<M;i++) for(let j=0;j<M;j++){
    const u0=i/M, u1=(i+1)/M, v0=j/M, v1=(j+1)/M;
    const c0=bl(u0,v0), c1=bl(u1,v0), c2=bl(u1,v1), c3=bl(u0,v1);
    quad(G, [c0.x,hy(u0,v0),c0.z], [c1.x,hy(u1,v0),c1.z],
            [c2.x,hy(u1,v1),c2.z], [c3.x,hy(u0,v1),c3.z],
         LLOSA[Math.floor(hash3(ci,i,j+30)*LLOSA.length)]);
  }
}

function paviment(G, cel, ci){
  const p = cel.p;
  const Y = cel.vi.map(v => nvV.get(v)*ALT + CARRER_Y);
  const bl = (u,v) => entre(entre(p[0],p[1],u), entre(p[3],p[2],u), v);
  const ig = (a,b) => Math.abs(a-b) < 1e-6;

  if(ig(Y[0],Y[1]) && ig(Y[1],Y[2]) && ig(Y[2],Y[3])){
    llambordes(G, bl, ci, Y[0]);
    return {y: Y[0], pla: true};
  }
  if(ig(Y[0],Y[3]) && ig(Y[1],Y[2]))      escala(G, bl, 0, Y[0], Y[1], ci);
  else if(ig(Y[0],Y[1]) && ig(Y[3],Y[2])) escala(G, bl, 1, Y[0], Y[3], ci);
  else                                    rampa(G, bl, Y, ci);
  return {y: (Y[0]+Y[1]+Y[2]+Y[3])/4, pla: false};
}

function mobiliari(G, cel, ci, y, sotaVolta){
  const h = hash3(ci, 21, 3), c = cel.c;
  const capA = (k, f) => entre(c, cel.p[k], f);   // punt entre el centre i un cantó
  if(h < 0.24){                                   // un o dos testos amb flors
    const k = Math.floor(hash3(ci,22,4)*4), a = capA(k, 0.6);
    test(G, a.x, y, a.z, ci);
    if(hash3(ci,22,5) < 0.5){ const b = capA((k+1)%4, 0.62); test(G, b.x, y, b.z, ci + 7919, 0.8); }
  } else if(h < 0.31){                            // banc de pedra, paral·lel a una aresta
    const k = Math.floor(hash3(ci,24,4)*4), A = cel.p[k], B = cel.p[(k+1)%4];
    const m = entre(entre(A,B,0.5), c, 0.32), l = Math.hypot(B.x-A.x, B.z-A.z) || 1;
    banc(G, m.x, m.z, (B.x-A.x)/l, (B.z-A.z)/l, y);
  } else if(h < 0.43 && !sotaVolta){              // fanal
    const a = capA(Math.floor(hash3(ci,23,4)*4), 0.72);
    fanal(G, a.x, y, a.z);
  } else if(h < 0.53 && !sotaVolta){              // arbre de plaça
    arbre(G, c.x, y, c.z, 0.95, ci);
  }
}
