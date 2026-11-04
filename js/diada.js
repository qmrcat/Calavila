/* Cala · la Diada: senyeres i estelades a les finestres, els balcons i els terrats */

/* ============================================================
   DIADA
   ------------------------------------------------------------
   S'activa a Configuració, i es recorda en aquest navegador (no
   a la partida), com els guarniments de Nadal. Quan és activada,
   un 45 % de les cases, més o menys, pengen una bandera: la
   senyera o l'estelada. Quines cases, quina bandera i on surt
   d'un hash de la cel·la: sempre són les mateixes.

   Mentre es fa la malla, paret() i ferCoberta() apunten els
   llocs on una casa triada podria penjar-la:
   - la barana d'un balcó (la bandera hi penja per davant);
   - l'ampit d'una finestra (penja per sota, sobre la façana); a la
     planta baixa, només si la casa no té cap altre lloc;
   - el terrat, o el cim d'una torre de guaita (en un pal).
   - si no hi ha res més, el capdamunt de la teulada (en un pal).
   Al final, cada casa en tria un (de vegades dos) i s'hi dibuixa.
   Una casa sense cap finestra, balcó ni terrat no en pot penjar.
   ============================================================ */

let diada = false;
let LLOCS_DIADA = new Map();   // casa -> [{prio, fer}] llocs possibles per penjar-hi la bandera

const GROC_S   = C('#f2c230');
const VERMELL_S = C('#cf2e26');
const BLAU_E   = C('#1f5aa6');
const BLANC_E  = C('#fbfbf6');
const VENT = (() => { const a = 0.65; return {x: Math.cos(a), z: Math.sin(a)}; })();   // cap on onegen les dels pals

const casaDiada = ci => hash3(ci, 401, 1) < 0.45;
const esEstelada = ci => hash3(ci, 403, 1) < 0.5;

// paret() i ferCoberta() hi apunten els llocs; només a les cases triades
function apuntaDiada(ci, prio, fer){
  if(!diada || !(heights[ci] > 0) || !casaDiada(ci)) return;
  let l = LLOCS_DIADA.get(ci);
  if(!l){ l = []; LLOCS_DIADA.set(ci, l); }
  l.push({prio, fer});
}

// cada casa triada penja la bandera en un dels seus llocs: primer els balcons i els terrats.
// Les cases grans, de vegades, en pengen dues
function banderesDiada(){
  for(const [ci, llocs] of LLOCS_DIADA){
    // la planta baixa (prio 0.9) i la teulada (1.5), només si no hi ha res més
    const alts = llocs.some(l => l.prio < 0.9) ? llocs.filter(l => l.prio < 0.9) : llocs;
    const ordre = alts.map((l, i) => ({l, v: l.prio + hash3(ci, i, 404)*0.6})).sort((a, b) => a.v - b.v);
    const n = alts.length >= 3 && hash3(ci, 402, 1) < 0.35 ? 2 : 1;
    for(let k=0;k<n;k++) ordre[k].l.fer();
  }
}

/* --- la bandera ---------------------------------------------
   O: el cantó de dalt del costat del pal (x, y, z); U: cap on s'allarga (unitari);
   V: cap avall (unitari); N: la cara de davant. w i hb, amplada i alçada.
   ona(u): quant s'aparta del pla cap a N a la distància u (0..1) del pal.
   dues: visible per les dues cares (la del pal) o només per davant (la penjada)
   ------------------------------------------------------------ */
function bandera(G, O, U, V, N, w, hb, estelada, ona, dues){
  const F = (u, v, e) => { const o = ona(u) + e;
    return [O.x + U.x*u*w + V.x*v*hb + N.x*o, O.y + U.y*u*w + V.y*v*hb + N.y*o, O.z + U.z*u*w + V.z*v*hb + N.z*o]; };
  const Nv = [N.x, N.y, N.z], Nr = [-N.x, -N.y, -N.z];
  const peca = (a, b, c, d, col, e) => {         // un tros, per davant (i per darrere)
    cara(G, a(e), b(e), c(e), d(e), col, Nv);
    if(dues) cara(G, a(-e), b(-e), c(-e), d(-e), col, Nr);
  };
  const NU = 6;                                   // columnes: les ones
  // nou franges, groc i vermell
  for(let s=0;s<9;s++){
    const v0 = s/9, v1 = (s+1)/9, col = s % 2 ? VERMELL_S : GROC_S;
    for(let i=0;i<NU;i++){
      const u0 = i/NU, u1 = (i+1)/NU;
      peca(e => F(u0,v0,e), e => F(u1,v0,e), e => F(u1,v1,e), e => F(u0,v1,e), col, 0);
    }
  }
  if(!estelada) return;
  // el triangle blau, del pal fins a un terç, i l'estel blanc a dins
  const a = 0.36 * Math.min(1, hb*1.5/w), M = 3, eps = 0.004;
  for(let i=0;i<M;i++){
    const u0 = a*i/M, u1 = a*(i+1)/M, h0 = 0.5*u0/a, h1 = 0.5*u1/a;
    peca(e => F(u0,h0,e), e => F(u1,h1,e), e => F(u1,1-h1,e), e => F(u0,1-h0,e), BLAU_E, eps);
  }
  const cu = a*0.36, r = hb*0.17;
  const punt = (ang, rr, e) => F(cu + Math.sin(ang)*rr/w, 0.5 - Math.cos(ang)*rr/hb, e);
  for(let k=0;k<5;k++){
    const a0 = k*2*Math.PI/5, a1 = a0 + Math.PI/5, a2 = a0 - Math.PI/5;
    const tr = (e, s) => {                         // una punta: el cim i dos punts de l'interior
      const P = punt(a0, r, e), Q = punt(a1, r*0.4, e), R = punt(a2, r*0.4, e), Cc = F(cu, 0.5, e);
      cara(G, P, Q, Cc, Cc, BLANC_E, s); cara(G, R, P, Cc, Cc, BLANC_E, s);
    };
    tr(eps*2, Nv); if(dues) tr(-eps*2, Nr);
  }
}

// penjada d'una barana o d'un ampit, plana contra la façana amb uns plecs suaus
// A: el cantó de dalt d'un costat; U: al llarg de la paret; N: enfora de la paret
function banderaPenjada(G, A, U, N, w, hb, ci){
  const fase = hash3(ci, 405, 1)*6.28;
  bandera(G, A, U, {x:0, y:-1, z:0}, N, w, hb, esEstelada(ci), u => 0.012*Math.sin(u*9.4 + fase), false);
}

// en un pal: el pal arrenca d'(x, y, z), i la bandera oneja cap on bufa el vent
function banderaPal(G, x, y, z, alt, ci){
  con(G, x, z, 0.014, 0.011, y, y + alt, 5, FERRO, false);
  bola(G, x, y + alt + 0.015, z, 0.022, 0.022, BRONZE, ci, 5);
  const w = 0.40, hb = 0.27, fase = hash3(ci, 406, 1)*6.28;
  const U = {x: VENT.x, y: 0, z: VENT.z}, N = {x: -VENT.z, y: 0, z: VENT.x};
  bandera(G, {x: x + U.x*0.012, y: y + alt - 0.01, z: z + U.z*0.012}, U, {x:0, y:-1, z:0}, N, w, hb,
          esEstelada(ci), u => 0.05*u*Math.sin(u*7 + fase), true);
}
