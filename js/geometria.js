/* Cala · peces de geometria: parets, finestres, vegetació, mobiliari, torres */

/* ---------- 4. Constructor de geometria ---------- */

function newG(){ return {p:[], n:[], c:[]}; }
let GL = newG();      // peces que fan llum pròpia (vidres de fanal): no reben ombrejat
let GF = newG();      // finestres que s'encenen de nit
let LLUMS = [];       // on són els fanals, per dibuixar-hi l'halo de nit
function tri(G,a,b,c,col,colB,colC){
  const ux=b[0]-a[0], uy=b[1]-a[1], uz=b[2]-a[2];
  const vx=c[0]-a[0], vy=c[1]-a[1], vz=c[2]-a[2];
  let nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
  const l = Math.hypot(nx,ny,nz) || 1; nx/=l; ny/=l; nz/=l;
  G.p.push(a[0],a[1],a[2], b[0],b[1],b[2], c[0],c[1],c[2]);
  const cs = [col, colB || col, colC || col];
  for(let i=0;i<3;i++){ G.n.push(nx,ny,nz); G.c.push(cs[i][0],cs[i][1],cs[i][2]); }
}
function quad(G,a,b,c,d,col){ tri(G,a,b,c,col); tri(G,a,c,d,col); }
function quad2(G,a,b,c,d,col){ quad(G,a,b,c,d,col); quad(G,d,c,b,a,col); }   // visible per les dues cares
// quad amb un color per vèrtex, per fer degradats
function quadV(G,a,b,c,d,ca,cb,cc,cd){ tri(G,a,b,c,ca,cb,cc); tri(G,a,c,d,ca,cc,cd); }
function toGeom(G){
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(G.p,3));
  g.setAttribute('normal',   new THREE.Float32BufferAttribute(G.n,3));
  g.setAttribute('color',    new THREE.Float32BufferAttribute(G.c,3));
  g.computeBoundingSphere();
  return g;
}
const expand = (pts, c, f) => pts.map(p => ({x: c.x + (p.x-c.x)*f, z: c.z + (p.z-c.z)*f}));
const fosc = (col, f) => [col[0]*f, col[1]*f, col[2]*f];
const clar = (col, f) => [Math.min(1,col[0]*f), Math.min(1,col[1]*f), Math.min(1,col[2]*f)];

/* --- formes de pocs costats: troncs, testos, capçades, caixes --- */

// tronc entre dos punts: secció de n costats que passa de radi r0 a r1
function tronc(G, x0,y0,z0, x1,y1,z1, r0, r1, col, n=5, gir=0){
  for(let k=0;k<n;k++){
    const a0 = gir - k*6.283/n, a1 = gir - (k+1)*6.283/n;
    const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
    quad(G, [x0+c0*r0,y0,z0+s0*r0], [x0+c1*r0,y0,z0+s1*r0],
            [x1+c1*r1,y1,z1+s1*r1], [x1+c0*r1,y1,z1+s0*r1], col);
  }
}
// tronc de con vertical, amb tapa a dalt si cal
function con(G, x, z, r0, r1, y0, y1, n, col, tapa, gir=0){
  tronc(G, x,y0,z, x,y1,z, r0, r1, col, n, gir);
  if(tapa && r1 > 0) for(let k=0;k<n;k++){
    const a0 = gir - k*6.283/n, a1 = gir - (k+1)*6.283/n;
    tri(G, [x,y1,z], [x+Math.cos(a0)*r1,y1,z+Math.sin(a0)*r1], [x+Math.cos(a1)*r1,y1,z+Math.sin(a1)*r1], col);
  }
}
// sòlid de revolució: perfil [[radi, alçada], ...] de baix a dalt, un color per franja.
// jit deforma els radis perquè les capçades no semblin fetes a torn
function torn(G, x, y, z, perfil, n, cols, llavor, jit){
  const rnd = mulberry32(llavor);
  const anells = perfil.map(([r,h]) => {
    const a = [];
    for(let k=0;k<n;k++){
      const ang = -k*6.283/n, rr = r*(1 + jit*(rnd()-0.5));
      a.push([x + Math.cos(ang)*rr, y + h, z + Math.sin(ang)*rr]);
    }
    return a;
  });
  for(let i=0;i<anells.length-1;i++){
    const A = anells[i], B = anells[i+1], col = cols[Math.min(i, cols.length-1)];
    for(let k=0;k<n;k++){
      const k1 = (k+1)%n;
      quad(G, A[k], A[k1], B[k1], B[k], col);
    }
  }
}
// bony irregular (capçada, mata) amb la base a y: més fosc a sota, més clar a dalt
function bola(G, x, y, z, rx, ry, col, llavor, n=7){
  torn(G, x, y, z, [[0,0],[rx*0.72,ry*0.16],[rx,ry*0.48],[rx*0.74,ry*0.8],[0,ry]], n,
       [fosc(col,0.72), fosc(col,0.88), col, clar(col,1.15)], llavor, 0.3);
}
// caixa orientada segons l'eix horitzontal (ux,uz): mitja llargada lu, mitja amplada lv
function caixa(G, cx, cz, ux, uz, lu, lv, y0, y1, col){
  const vx = -uz, vz = ux;
  const pts = [[-1,1],[1,1],[1,-1],[-1,-1]].map(([a,b]) =>
    ({x: cx + ux*a*lu + vx*b*lv, z: cz + uz*a*lu + vz*b*lv}));
  prisma(G, pts, y0, y1, col, true);
}
// biga horitzontal entre dos punts
function biga(G, A, B, y0, y1, w, col){
  const dx = B.x-A.x, dz = B.z-A.z, l = Math.hypot(dx,dz) || 1;
  caixa(G, (A.x+B.x)/2, (A.z+B.z)/2, dx/l, dz/l, l/2, w/2, y0, y1, col);
}

/* --- una paret amb la seva obertura --- */

// trets de cada casa, perquè totes les finestres d'una mateixa casa lliguin
const colorPorticons = ci => PORTICONS[Math.floor(hash3(ci,12,5)*PORTICONS.length)];
const colorPorta = ci => hash3(ci,14,3) < 0.5 ? colorPorticons(ci) : FUSTA;
const ambArc   = ci => hash3(ci,13,2) < 0.22;                  // finestres de mig punt
const teSocol  = ci => hash3(ci,3,3) < 0.55;
const colSocol = (ci, col) => hash3(ci,3,4) < 0.5 ? fosc(col, 0.80) : SOCOL;
const colMarc  = ci => tint[ci] > 0 ? MARC : PEDRA;            // façana pintada: marcs blancs
const OMBRA = 0.80;     // foscor al peu de la façana (oclusió ambiental barata)
const SOCOL_H = 0.22;   // el carrer és CARRER_Y per sobre del terra: se'n veu un pam

// especial: null, 'campanar' (pis de les campanes) o 'guaita' (torre de defensa)
function paret(G, A, B, y0, y1, col, ci, L, e, plantaBaixa, donaCarrer, especial){
  if(plantaBaixa){
    const dk = fosc(col, OMBRA);
    quadV(G, [A.x,y0,A.z], [B.x,y0,B.z], [B.x,y1,B.z], [A.x,y1,A.z], dk, dk, col, col);
  } else {
    quad(G, [A.x,y0,A.z], [B.x,y0,B.z], [B.x,y1,B.z], [A.x,y1,A.z], col);
  }

  const dx = B.x-A.x, dz = B.z-A.z, len = Math.hypot(dx,dz);
  if(len < 1e-4) return;
  const ux = dx/len, uz = dz/len;
  const nx = -uz, nz = ux;                       // normal cap enfora
  const P = (t,y,o) => [A.x + ux*len*t + nx*o, y, A.z + uz*len*t + nz*o];
  // GG: on va la peça (la malla del poble o la de les finestres que s'encenen)
  const q = (t0,t1,ya,yb,o,col2,GG=G) => quad(GG, P(t0,ya,o), P(t1,ya,o), P(t1,yb,o), P(t0,yb,o), col2);
  const qa = (t0,t1,ya,yb,o,col2,GG=G) => {      // obertura acabada en arc de mig punt
    const r = Math.min((t1-t0)*len/2, (yb-ya)*0.6), tm = (t0+t1)/2, yr = yb - r, hw = (t1-t0)/2;
    q(t0, t1, ya, yr, o, col2, GG);
    for(let k=0;k<6;k++){
      const a0 = Math.PI*k/6, a1 = Math.PI*(k+1)/6;
      tri(GG, P(tm,yr,o), P(tm + Math.cos(a0)*hw, yr + Math.sin(a0)*r, o),
                          P(tm + Math.cos(a1)*hw, yr + Math.sin(a1)*r, o), col2);
    }
  };
  const lleixa = (t0,t1,ya,yb,o,col2) => {       // volum que sobresurt: tapa, front i costats
    quad(G, P(t0,yb,0), P(t0,yb,o), P(t1,yb,o), P(t1,yb,0), col2);
    q(t0, t1, ya, yb, o, col2);
    quad(G, P(t0,ya,0), P(t0,ya,o), P(t0,yb,o), P(t0,yb,0), col2);
    quad(G, P(t1,ya,o), P(t1,ya,0), P(t1,yb,0), P(t1,yb,o), col2);
  };

  const h = hash3(ci, L, e);
  const k = ci*7 + e;

  // sòcol pintat
  if(plantaBaixa && teSocol(ci) && especial !== 'guaita') q(0, 1, y0, y0+SOCOL_H, 0.008, colSocol(ci, col));
  if(len < 0.45) return;

  // la façana d'un local (bar, botiga o hotel) no té ni buguenvíl·lea ni fanal de paret: hi va el tendal
  const local = barFront.get(ci) === e;
  // buguenvíl·lea: una tija que s'enfila i una mata florida que s'eixampla a dalt
  let tv = -1;
  if(donaCarrer && !especial && !local && hash3(k, L, 55) > 0.55){
    tv = hash3(k,L,60) < 0.5 ? 0.15 : 0.85;
    const top = y1 - 0.06;
    q(tv-0.012/len, tv+0.012/len, y0+0.09, top-0.12, 0.014, ESCORCA);
    for(let i=0;i<20;i++){
      const f = hash3(k,L,70+i), s2 = 0.03 + hash3(k,L,80+i)*0.035;
      const yy = top - 0.04 - f*0.40, ample = 0.05 + (1-f)*0.16;
      const t = tv + (hash3(k,L,100+i)-0.5)*2*ample/len, fs = s2/len;
      q(Math.max(0.02,t-fs), Math.min(0.98,t+fs), yy, yy + s2*1.3, 0.03 + (i%4)*0.008,
        hash3(k,L,90+i) < 0.6 ? BUGA : VERD);
    }
  }

  // fanal de paret penjat d'un braç de forja
  if(donaCarrer && plantaBaixa && !especial && !local && len > 0.7 && hash3(k,L,123) < 0.32){
    const tf = tv > 0 ? 1 - tv : (hash3(k,L,124) < 0.5 ? 0.15 : 0.85), yb = y0 + 0.74;
    const a = P(tf, 0, 0.005), b = P(tf, 0, 0.15);
    biga(G, {x:a[0], z:a[2]}, {x:b[0], z:b[2]}, yb-0.02, yb, 0.02, FERRO);
    con(G, b[0], b[2], 0.006, 0.006, yb-0.04, yb-0.02, 4, FERRO, false);
    lanterna(G, b[0], yb-0.175, b[2], 0.045);
  }

  if(especial === 'campanar'){                    // finestral amb la campana a dins
    const w = Math.min(0.34, len*0.42)/len, t0 = 0.5-w/2, t1 = 0.5+w/2, fm = 0.035/len;
    qa(t0-fm, t1+fm, y0+0.10, y1-0.06, 0.006, MARC);
    qa(t0, t1, y0+0.12, y1-0.09, 0.010, FOSC);
    const cw = w*0.28, yc = y1 - 0.25;
    quad(G, P(0.5-cw,y0+0.30,0.014), P(0.5+cw,y0+0.30,0.014),
            P(0.5+cw*0.55,yc,0.014), P(0.5-cw*0.55,yc,0.014), BRONZE);
    q(0.5-cw*1.15, 0.5+cw*1.15, y0+0.27, y0+0.31, 0.015, BRONZE);
    lleixa(t0-fm*1.4, t1+fm*1.4, y0+0.07, y0+0.10, 0.05, PEDRA);
    return;
  }

  if(h < 0.34) return;                            // paret cega

  const w = Math.min(0.36, len*0.40) / len;       // amplada en fracció d'aresta
  const t0 = 0.5 - w/2, t1 = 0.5 + w/2, fm = 0.035/len;

  if(plantaBaixa && h > (donaCarrer ? 0.46 : 0.84)){   // porta
    const arc = ambArc(ci) || hash3(ci,L,e+40) < 0.3, forat = arc ? qa : q, yt = y0 + 0.60;
    forat(t0-fm, t1+fm, y0, yt+0.035, 0.006, arc ? PEDRA : colMarc(ci));     // brancals
    forat(t0, t1, y0+0.02, yt, 0.010, FOSC);
    forat(t0+0.014/len, t1-0.014/len, y0+0.02, yt-0.014, 0.020, colorPorta(ci));
    lleixa(t0-fm, t1+fm, y0+0.05, y0+0.13, 0.07, PEDRA);                    // graó
    if(donaCarrer && !local) PORTES.push({ci, e, x: A.x + ux*len*0.5, z: A.z + uz*len*0.5, nx, nz, y: y0, local: false});   // per on entra i surt la gent
    return;
  }

  if(especial === 'guaita'){                      // espitllera
    q(0.5-0.022/len, 0.5+0.022/len, y0+0.22, y0+0.58, 0.010, FOSC);
    q(0.5-0.05/len, 0.5+0.05/len, y0+0.19, y0+0.22, 0.012, fosc(col, 0.85));
    return;
  }

  const arc = ambArc(ci), forat = arc ? qa : q;
  const pc = colorPorticons(ci), pcF = fosc(pc, 0.72);
  const balco = h > 0.66 && !plantaBaixa;
  const ya = balco ? y0 + 0.06 : y0 + 0.28, yb = balco ? y0 + 0.62 : ya + 0.34;

  forat(t0-fm, t1+fm, ya-0.03, yb+0.035, 0.006, colMarc(ci));    // marc
  // buit: més o menys la meitat de les finestres tenen llum de nit, cadascuna d'un to
  if(hash3(ci, L*5 + e, 71) < 0.55) forat(t0, t1, ya, yb, 0.010, fosc(CALID, 0.65 + hash3(ci,L,e+72)*0.35), GF);
  else                              forat(t0, t1, ya, yb, 0.010, FOSC);

  const portico = (ta, tb) => {                   // fulla amb tres llistons
    q(ta, tb, ya, yb, 0.016, pc);
    for(const f of [0.3, 0.55, 0.8])
      q(ta + 0.006/len, tb - 0.006/len, ya+(yb-ya)*f, ya+(yb-ya)*f + 0.012, 0.018, pcF);
  };
  const sw = (t1-t0)/2;
  if(!arc && !balco && h > 0.58){                 // porticons tancats
    portico(t0, 0.5 - 0.003/len); portico(0.5 + 0.003/len, t1);
  } else {                                        // oberts contra la paret
    portico(Math.max(0.02, t0-fm-sw), t0-fm);
    portico(t1+fm, Math.min(0.98, t1+fm+sw));
  }

  if(!balco){
    lleixa(t0-fm*1.5, t1+fm*1.5, ya-0.06, ya-0.03, 0.05, colMarc(ci));   // ampit
    // per la Diada, una bandera que penja de l'ampit. A la planta baixa, només si no hi ha cap més
    // lloc (una casa d'un sol pis), i més curta perquè no toqui el carrer
    apuntaDiada(ci, plantaBaixa ? 0.9 : 0.35, () => {
      const a = P(t0 - fm, ya - 0.03, 0.066);
      banderaPenjada(G, {x:a[0], y:a[1], z:a[2]}, {x:ux, y:0, z:uz}, {x:nx, y:0, z:nz}, (t1 - t0 + 2*fm)*len, plantaBaixa ? 0.15 : 0.24, ci);
    });
    return;
  }

  // balcó: llosa de pedra, barana de forja i, sovint, un test
  const o = 0.17, yl = ya - 0.01, yt = yl + 0.2;
  const tb0 = Math.max(0.02, t0 - 0.07/len), tb1 = Math.min(0.98, t1 + 0.07/len);
  lleixa(tb0, tb1, yl-0.05, yl, o, PEDRA);
  const oa = o - 0.012;
  q(tb0, tb1, yt-0.018, yt, oa, FERRO);
  q(tb0, tb1, yl+0.03, yl+0.045, oa, FERRO);
  const nbar = Math.max(3, Math.round((tb1-tb0)*len/0.05));
  for(let i=0;i<=nbar;i++){
    const t = tb0 + (tb1-tb0)*i/nbar;
    q(t-0.005/len, t+0.005/len, yl, yt, oa, FERRO);
  }
  for(const t of [tb0, tb1]){                     // costats de la barana
    quad2(G, P(t,yt-0.018,0), P(t,yt-0.018,oa), P(t,yt,oa), P(t,yt,0), FERRO);
    for(const f of [0.33, 0.66]) quad2(G, P(t,yl,oa*f-0.005), P(t,yl,oa*f+0.005), P(t,yt,oa*f+0.005), P(t,yt,oa*f-0.005), FERRO);
  }
  if(hash3(k,L,33) < 0.6){
    const pt = P(tb0 + 0.07/len, yl, o*0.5);
    test(G, pt[0], yl, pt[2], k*31 + L, 0.7);
  }
  // per la Festa Major, de vegades un damàs penjat de la barana; si no, per la Diada, potser la bandera
  if(damasAqui(ci, L, e)){
    const wd = Math.min(0.34, (tb1 - tb0)*len*0.62), a = P((tb0 + tb1)/2 - wd/2/len, yt + 0.005, oa + 0.016);
    damas(G, {x:a[0], y:a[1], z:a[2]}, {x:ux, y:0, z:uz}, {x:nx, y:0, z:nz}, wd, 0.4, ci, L, e);
  }
  else apuntaDiada(ci, 0, () => {
    const wb = (tb1 - tb0)*len*0.86, a = P((tb0 + tb1)/2 - wb/2/len, yt + 0.005, oa + 0.016);
    banderaPenjada(G, {x:a[0], y:a[1], z:a[2]}, {x:ux, y:0, z:uz}, {x:nx, y:0, z:nz}, wb, wb*0.62, ci);
  });
}

/* --- vegetació: xiprer, pi pinyoner i olivera --- */
// t tria l'espècie (per defecte, a l'atzar): < 0.34 xiprer, < 0.67 pi, i si no, olivera
function arbre(G, x, y, z, alt, k, t = hash3(k, 5, 17)){
  const ll = (k*2654435761) | 0;
  if(t < 0.34){                                   // xiprer: un fus alt i estret
    con(G, x, z, 0.035, 0.03, y, y+alt*0.1, 5, ESCORCA, false);
    const r = alt*0.16;
    torn(G, x, y+alt*0.06, z,
         [[0,0],[r*0.8,alt*0.06],[r,alt*0.24],[r*0.85,alt*0.52],[r*0.45,alt*0.8],[0,alt]],
         7, [fosc(XIPRER,0.75), fosc(XIPRER,0.9), XIPRER, XIPRER, clar(XIPRER,1.2)], ll, 0.22);
  } else if(t < 0.67){                            // pi pinyoner: tronc vinclat i capçada de para-sol
    const a = hash3(k,6,1)*6.283, inc = alt*0.14;
    const tx = x + Math.cos(a)*inc, tz = z + Math.sin(a)*inc, ty = y + alt*0.72;
    tronc(G, x,y,z, tx,ty,tz, 0.04, 0.028, ESCORCA);
    const r = alt*0.40;
    torn(G, tx, ty - alt*0.06, tz,
         [[0,0],[r*0.8,alt*0.05],[r,alt*0.13],[r*0.65,alt*0.22],[0,alt*0.26]],
         8, [fosc(PI_C,0.7), PI_C, clar(PI_C,1.1), clar(PI_C,1.25)], ll, 0.25);
  } else {                                        // olivera: soca torta i capçada grisa en flocs
    const a = hash3(k,6,1)*6.283;
    const mx = x + Math.cos(a)*alt*0.07, mz = z + Math.sin(a)*alt*0.07, my = y + alt*0.25;
    tronc(G, x,y,z, mx,my,mz, 0.055, 0.042, ESCORCA);
    tronc(G, mx,my,mz, x - Math.cos(a)*alt*0.04, y + alt*0.48, z - Math.sin(a)*alt*0.04, 0.042, 0.028, ESCORCA);
    for(let i=0;i<3;i++){
      const b = a + i*2.1, d = alt*0.13;
      bola(G, x + Math.cos(b)*d, y + alt*(0.36 + 0.07*i), z + Math.sin(b)*d,
           alt*0.24, alt*0.30, OLIVA, ll + i);
    }
  }
}

/* --- test de terracota amb flors --- */
function test(G, x, y, z, k, esc=1){
  const r = 0.08*esc, h = 0.14*esc, ll = (k*2246822519) | 0;
  con(G, x, z, r*0.72, r, y, y+h, 8, TEST, false);
  con(G, x, z, r*1.1, r*1.1, y+h-0.025*esc, y+h, 8, clar(TEST,1.12), true);    // vora
  bola(G, x, y+h-0.02*esc, z, r*1.35, 0.17*esc, VERD, ll);
  const flor = hash3(k,2,43) < 0.6 ? BUGA : GERANI;
  for(let i=0;i<5;i++){
    const a = hash3(k,i,40)*6.283, d = r*(0.5 + hash3(k,i,41)*0.7);
    bola(G, x + Math.cos(a)*d, y + h + 0.04*esc + hash3(k,i,42)*0.08*esc, z + Math.sin(a)*d,
         0.035*esc, 0.05*esc, flor, ll + i, 5);
  }
}

/* --- fanals: llanterna de forja amb el vidre encès --- */
function lanterna(G, x, y, z, r){                 // y = base de la llanterna
  const g = Math.PI/4;
  con(G, x, z, r*0.5, r*0.62, y, y+r*0.35, 4, FERRO, false, g);
  tronc(GL, x, y+r*0.35, z, x, y+r*1.8, z, r*0.62, r*0.92, LLUM, 4, g);    // vidre
  con(G, x, z, r*1.2, r*1.2, y+r*1.8, y+r*1.95, 4, FERRO, false, g);
  con(G, x, z, r*1.2, 0, y+r*1.95, y+r*2.6, 4, FERRO, false, g);            // barret
  con(G, x, z, r*0.14, r*0.1, y+r*2.6, y+r*3.0, 4, FERRO, true, g);
  LLUMS.push(x, y + r*1.1, z);
}
function fanal(G, x, y, z){
  con(G, x, z, 0.075, 0.06, y, y+0.07, 6, FERRO, true);     // peanya
  con(G, x, z, 0.022, 0.017, y+0.07, y+0.68, 6, FERRO, false);
  lanterna(G, x, y+0.68, z, 0.06);
}

/* --- banc de pedra --- */
function banc(G, x, z, ux, uz, y){
  caixa(G, x, z, ux, uz, 0.22, 0.075, y+0.11, y+0.15, PEDRA);
  for(const s of [-0.15, 0.15])
    caixa(G, x + ux*s, z + uz*s, ux, uz, 0.03, 0.06, y, y+0.11, fosc(PEDRA, 0.85));
}

/* --- xemeneia amb barret de teula --- */
function xemeneia(G, x, z, y0, y1, col, teu){
  prisma(G, rect(x, z, 0.15, 0.15), y0, y1, col, true);
  prisma(G, rect(x, z, 0.20, 0.20), y1, y1+0.035, col, true);          // llosa
  prisma(G, rect(x, z, 0.10, 0.10), y1+0.035, y1+0.08, FOSC, false);    // boca
  con(G, x, z, 0.15, 0, y1+0.08, y1+0.16, 4, teu, false, Math.PI/4);
}

/* --- pèrgola de canyes amb parra, per als terrats --- */
function pergola(G, ci, y){
  const cel = cells[ci], Q = expand(cel.p, cel.c, 0.72), yt = y + 0.55;
  for(const p of Q) con(G, p.x, p.z, 0.022, 0.022, y, yt, 4, FUSTA, true);
  biga(G, Q[0], Q[1], yt, yt+0.04, 0.03, FUSTA);
  biga(G, Q[3], Q[2], yt, yt+0.04, 0.03, FUSTA);
  for(let i=0;i<5;i++){
    const t = (i+0.5)/5;
    biga(G, entre(Q[0],Q[1],t), entre(Q[3],Q[2],t), yt+0.04, yt+0.065, 0.02, FUSTA);
  }
  for(let i=0;i<4;i++){
    const p = entre(entre(Q[0],Q[1],hash3(ci,i,50)), entre(Q[3],Q[2],hash3(ci,i,51)), hash3(ci,i,52));
    bola(G, p.x, yt+0.02, p.z, 0.14, 0.08, VERD, ci*13 + i);
  }
}

/* --- torre de guaita: matacà i merlets al capdamunt --- */
function merlets(G, ci, y){
  const cel = cells[ci], c = cel.c, col = colorParet(ci);
  const O = expand(cel.p, c, 1.08), I = expand(cel.p, c, 0.88);
  const ya = y - 0.16, yb = y + 0.20, ym = y + 0.34, M = 5;
  quad(G, [I[0].x,y,I[0].z], [I[1].x,y,I[1].z], [I[2].x,y,I[2].z], [I[3].x,y,I[3].z], TERRA);
  for(let e=0;e<4;e++){
    const e1 = (e+1)%4, p = cel.p;
    quad(G, [O[e].x,ya,O[e].z], [p[e].x,ya,p[e].z], [p[e1].x,ya,p[e1].z], [O[e1].x,ya,O[e1].z], fosc(col,0.75));
    for(let s=0;s<M;s++){
      const t0 = s/M, t1 = (s+1)/M, top = s%2 === 0 ? ym : yb;
      const o0 = entre(O[e],O[e1],t0), o1 = entre(O[e],O[e1],t1);
      const i0 = entre(I[e],I[e1],t0), i1 = entre(I[e],I[e1],t1);
      quad(G, [o0.x,ya,o0.z], [o1.x,ya,o1.z], [o1.x,top,o1.z], [o0.x,top,o0.z], col);
      quad(G, [i1.x,y,i1.z], [i0.x,y,i0.z], [i0.x,top,i0.z], [i1.x,top,i1.z], col);
      quad(G, [o0.x,top,o0.z], [o1.x,top,o1.z], [i1.x,top,i1.z], [i0.x,top,i0.z], clar(col,1.06));
      if(s < M-1) quad2(G, [o1.x,yb,o1.z], [i1.x,yb,i1.z], [i1.x,ym,i1.z], [o1.x,ym,o1.z], col);
    }
  }
}

/* --- prisma genèric a partir d'un polígon --- */
function rect(cx, cz, w, d){
  return [{x:cx-w/2, z:cz+d/2},{x:cx+w/2, z:cz+d/2},{x:cx+w/2, z:cz-d/2},{x:cx-w/2, z:cz-d/2}];
}
function prisma(G, pts, y0, y1, col, tapa){
  const n = pts.length;
  for(let e=0;e<n;e++){
    const A = pts[e], B = pts[(e+1)%n];
    quad(G, [A.x,y0,A.z], [B.x,y0,B.z], [B.x,y1,B.z], [A.x,y1,A.z], col);
  }
  if(tapa !== false){
    for(let e=1;e<n-1;e++)
      tri(G, [pts[0].x,y1,pts[0].z], [pts[e].x,y1,pts[e].z], [pts[e+1].x,y1,pts[e+1].z], col);
  }
}
const entre = (A,B,t) => ({x: A.x+(B.x-A.x)*t, z: A.z+(B.z-A.z)*t});
