/* Cala · desar, desfer i exportar */

/* ============================================================
   10. DESAR, DESFER I EXPORTAR
   ------------------------------------------------------------
   Un sol format de text ho serveix tot: la pila de desfer, el
   desat automàtic i el fitxer d'exportació. Cada cel·la ocupa
   un caràcter per camp, i la cala es reconstrueix a partir de
   la llavor, així que una partida sencera cap en uns 5 kB.
   ============================================================ */

const MARCA = 'CALA1';

function serialitza(){
  const n = cells.length;
  const enc = (arr, off) => {
    let t = '';
    for(let i=0;i<n;i++) t += String.fromCharCode(48 + ((+arr[i]) | 0) + off);
    return t;
  };
  return [MARCA, seed, n, autoPlaces ? 1 : 0,
          enc(heights,0), enc(carrer,0), enc(nivell,0), enc(forcat,0), enc(tint,1), enc(pont,0),
          enc(moll,0), midaCala].join('|');
}

function deserialitza(txt){
  const p = String(txt).trim().split('|');
  if(p[0] !== MARCA) throw new Error('Això no sembla una partida de Cala.');
  const sd = +p[1], n = +p[2];
  if(p.length < 9 || !Number.isInteger(sd) || !Number.isInteger(n) || n < 1) throw new Error('Capçalera malmesa.');
  // els camps dels ponts (10è), dels molls (11è) i de la mida (12è) són posteriors:
  // les partides antigues no els tenen. Els onze primers tenen un caràcter per cel·la
  const nCamps = Math.min(p.length, 11);
  for(let k=4;k<nCamps;k++) if(p[k].length !== n) throw new Error('Les dades no quadren amb el nombre de cel·les.');
  const mida = p.length >= 12 ? p[11] : 'normal';
  if(!esMida(mida)) throw new Error('Mida de cala desconeguda.');

  // tot es valida abans de tocar l'estat: si falla, la partida actual queda intacta
  const dec = (t, off, max) => {
    const a = new Array(n);
    for(let i=0;i<n;i++){
      const v = t.charCodeAt(i) - 48 - off;
      if(!(v >= -off && v <= max)) throw new Error('Hi ha valors fora de rang.');
      a[i] = v;
    }
    return a;
  };
  const h  = dec(p[4], 0, MAX_H),   ca = dec(p[5], 0, 1), ni = dec(p[6], 0, NIV_MAX),
        fo = dec(p[7], 0, 1),       ti = dec(p[8], 1, PALETA.length-1);
  const po = nCamps >= 10 ? dec(p[9], 0, 2) : new Array(n).fill(0);
  const mo = nCamps >= 11 ? dec(p[10], 0, 1) : new Array(n).fill(0);

  let noves = null;                                 // la cala és determinista
  if(sd !== seed || mida !== midaCala || cells.length !== n){
    noves = construirCala(sd, MIDES[mida]);
    if(noves.length !== n) throw new Error('La cala reconstruïda no coincideix.');
  }

  if(noves){ seed = sd; midaCala = mida; cells = noves; indexarGraella(); decorarCala(); ajustaMida(); }
  heights = h;
  carrer  = ca.map(Boolean);
  nivell  = ni;
  forcat  = fo.map(Boolean);
  tint    = ti;
  pont    = po;
  moll    = mo;
  autoPlaces = p[3] === '1';
}

// deserialitza() només toca l'estat; els botons es posen al dia a part
function sincronitzaBotons(){
  const b = document.getElementById('btn-places');
  b.classList.toggle('on', autoPlaces);
  b.setAttribute('aria-pressed', autoPlaces);
  marcaMida();
}

/* --- magatzem: l'API de Claude si hi és, si no localStorage --- */
const magatzem = (function(){
  const w = window.storage;
  if(w && typeof w.get === 'function' && typeof w.set === 'function'){
    return {
      nom: 'Claude',
      async get(k){ try{ const r = await w.get(k); return r ? r.value : null; } catch(e){ return null; } },
      async set(k,v){ try{ await w.set(k,v); } catch(e){} }
    };
  }
  try{
    localStorage.setItem('cala:prova','1'); localStorage.removeItem('cala:prova');
    return {
      nom: 'localStorage',
      async get(k){ try{ return localStorage.getItem(k); } catch(e){ return null; } },
      async set(k,v){ try{ localStorage.setItem(k,v); } catch(e){} }
    };
  } catch(e){
    return { nom: 'cap', async get(){ return null; }, async set(){} };   // mode incògnit
  }
})();

let desaT = null, restaurat = false;
function desaAuto(){
  if(!restaurat) return;   // fins que no s'ha llegit la partida desada, no se sobreescriu
  clearTimeout(desaT);
  desaT = setTimeout(()=>{ magatzem.set('cala:auto', serialitza()); }, 500);
}

/* --- pila de desfer --- */
const PILA_MAX = 60;
let pila = [], cursor = -1;

function instantania(){
  const t = serialitza();
  if(pila[cursor] === t) return;
  pila = pila.slice(0, cursor+1);
  pila.push(t);
  if(pila.length > PILA_MAX) pila.shift();
  cursor = pila.length - 1;
  botonsHistoria();
  desaAuto();
}
function aplicaEstat(t){
  const c = centre.clone();
  deserialitza(t);
  sincronitzaBotons();
  construirMalla();
  centre.copy(c); actualitzarCamera();   // desfer no ha de moure la càmera
  botonsHistoria();
  desaAuto();
}
function desfes(){ if(cursor > 0){ cursor--; aplicaEstat(pila[cursor]); } }
function refes(){ if(cursor < pila.length-1){ cursor++; aplicaEstat(pila[cursor]); } }
function botonsHistoria(){
  document.getElementById('btn-desfes').disabled = cursor <= 0;
  document.getElementById('btn-refes').disabled  = cursor >= pila.length-1;
}
document.getElementById('btn-desfes').onclick = desfes;
document.getElementById('btn-refes').onclick  = refes;

/* --- panell de partida --- */
const panell = document.getElementById('panel');
const codi = document.getElementById('codi');

const btnFitxer = document.getElementById('btn-fitxer');
function obrePanell(v){
  panell.classList.toggle('obert', v);
  btnFitxer.classList.toggle('on', v);
  btnFitxer.setAttribute('aria-expanded', v);
}
btnFitxer.onclick = ()=>{
  const obrir = !panell.classList.contains('obert');
  obrePanell(obrir);
  if(obrir){ codi.value = serialitza(); avis('Desat a ' + magatzem.nom + '. Copia el codi per guardar la partida fora.'); }
};

// copiar i baixar sempre exporten la partida tal com és ara, no la del moment d'obrir el panell
document.getElementById('btn-copia').onclick = async ()=>{
  codi.value = serialitza();
  try{ await navigator.clipboard.writeText(codi.value); avis('Codi copiat.'); }
  catch(e){
    codi.select(); codi.setSelectionRange(0, 999999);
    try{ document.execCommand('copy'); avis('Codi copiat.'); }
    catch(e2){ avis('Selecciona el text del quadre i copia\'l a mà.'); }
  }
};

document.getElementById('btn-baixa').onclick = ()=>{
  codi.value = serialitza();
  try{
    const b = new Blob([codi.value], {type:'text/plain'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = 'cala-' + seed + '.cala';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href), 2000);
  } catch(e){ avis('El navegador no ha deixat baixar el fitxer. Copia el codi.'); }
};

function importa(t){
  try{
    deserialitza(t);
    sincronitzaBotons();
    construirMalla();
    pila = []; cursor = -1; instantania();
    centre.set(0,1.4,0); dist = distInicial(); actualitzarCamera();
    obrePanell(false);
    avis('Partida carregada.');
  } catch(e){ avis('No s\'ha pogut carregar: ' + e.message); }
}
document.getElementById('btn-importa').onclick = ()=>importa(codi.value);

const fitxer = document.getElementById('fitxer');
document.getElementById('btn-obre').onclick = ()=>fitxer.click();
fitxer.onchange = ()=>{
  const f = fitxer.files[0];
  if(!f) return;
  const r = new FileReader();
  r.onload = ()=>{ codi.value = r.result; importa(r.result); };
  r.readAsText(f);
  fitxer.value = '';
};
