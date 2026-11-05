/* Cala · mode de només consulta: mirar el poble sense canviar-lo, i saber què és cada cosa */

/* ============================================================
   NOMÉS CONSULTA
   ------------------------------------------------------------
   S'activa a Configuració, i es recorda en aquest navegador.
   Mentre és activa, la càmera es mou com sempre (girar, moure,
   acostar), però no es pot construir ni treure res: s'amaguen
   els botons que canvien el poble i les tecles que ho fan no
   responen. Clicant una cel·la, al costat del cursor surt una
   fitxa que diu què hi ha: una casa (amb els pisos, el color, el
   local i la teulada), un carrer, una plaça, una escala, un moll,
   una parada del mercat de Nadal, la platja, un pont, la mar...
   ============================================================ */

let consulta = false;

const pisos = n => n === 1 ? '1 pis' : n + ' pisos';
const nivells = n => n === 1 ? '1 nivell' : n + ' nivells';
const terraAqui = b => b >= 0 && (heff[b] > 0 || esCarrer[b]);

// què hi ha a la cel·la ci: {titol, detalls: [...]}
function descriuCella(ci){
  const d = [];
  let t;
  if(heights[ci] > 0){
    const torre = tipusTorre[ci];
    t = torre === 'campanar' ? 'Campanar' : torre === 'guaita' ? 'Torre de guaita'
      : span[ci] ? 'Casa amb porxo' : 'Casa';
    d.push(pisos(heights[ci]) + (base[ci] > 0 ? ', sobre un terreny enlairat ' + nivells(base[ci]) : ''));
    if(roca[ci]) d.push('construïda a la muntanya');
    d.push(tint[ci] >= 0 ? 'façana de color ' + PALETA_NOMS[tint[ci]].toLowerCase() : 'façana de color automàtic');
    if(span[ci]) d.push('la planta baixa és un porxo amb arcs, per on es passa');
    if(bar[ci] && barFront.has(ci)) d.push('a la planta baixa, ' + LOCALS[bar[ci]] + ([...terrassaDe.values()].includes(ci) ? ', amb terrassa' : ''));
    if(escalaE[ci] >= 0) d.push('a sobre hi ha una escala, que puja un nivell');
    else if(torre === 'campanar') d.push('acaba en punxa, amb un penell');
    else if(torre === 'guaita') d.push('acaba amb merlets');
    else {
      const {membres, clau} = grupCoberta(ci);
      let e = estilCoberta(membres, heff[ci], clau, null);
      if(e === 'dues' && !eixosCarener(membres, clau)) e = 'quatre';     // com la dibuixa ferCoberta
      d.push(NOM_ESTIL[e] + (estilTriat(membres, clau) ? ' (triada a mà)' : '')
             + (membres.length > 1 ? ', compartida amb ' + (membres.length === 2 ? '1 casa més' : (membres.length - 1) + ' cases més') : ''));
      if(AMB_PLAQUES.has(ci)) d.push('amb plaques solars ' + (e === 'golfes' && ci === clau ? 'a la teulada de les golfes'
                                     : ['terrat', 'barana', 'golfes'].includes(e) ? 'al terrat' : 'a la teulada'));
    }
    if(nadal && !span[ci] && casaGuarnida(ci)) d.push('guarnida per Nadal amb una garlanda de llums');
    if(diada && LLOCS_DIADA.has(ci)) d.push('per la Diada hi penja ' + (esEstelada(ci) ? 'una estelada' : 'una senyera'));
    return {titol: t, detalls: d};
  }
  if(span[ci]){
    d.push('passa per sobre del carrer, entre dues cases enfrontades');
    if(heff[ci] > 1) d.push('a sobre hi ha ' + pisos(heff[ci] - 1));
    return {titol: 'Volta', detalls: d};
  }
  if(pont[ci]){
    const e = pont[ci] - 1, nb = cells[ci].nb;
    const dos = terraAqui(nb[e]) && terraAqui(nb[e + 2]);
    if(fanals.has(ci)) d.push('amb un fanal');
    return {titol: dos ? 'Pont de pedra' : 'Embarcador', detalls: [dos ? 'travessa el canal d\'una riba a l\'altra' : 'surt de la riba cap a l\'aigua', ...d]};
  }
  if(esMunt(ci)){
    d.push(nivEf[ci] > 0 ? 'alçada: ' + nivells(nivEf[ci]) : 'arran d\'aigua');
    if(fars[ci]) d.push('al cim hi ha un far');
    if(esMoliMunt(ci)) d.push('al cim hi ha un aerogenerador');
    d.push('s\'hi pot construir una casa, o obrir-hi un carrer');
    return {titol: 'Muntanya de roca', detalls: d};
  }
  if(esCarrer[ci]){
    const alt = nivEf[ci] > 0 ? 'enlairat ' + nivells(nivEf[ci]) : null;
    if(moll[ci]){
      t = 'Moll';
      if(esPuntaMoll(ci)) d.push('a la punta de l\'espigó');
    } else if(escalaE[ci] >= 0){
      t = 'Escala';
      d.push('puja del nivell ' + Math.min(...nvC[ci]) + ' al ' + Math.max(...nvC[ci]));
    } else if(esMercat(ci)){
      t = 'Parada del mercat de Nadal';
      d.push('una caseta de fusta amb tions, molsa i figures');
    } else if(terrassaDe.has(ci)){
      t = 'Terrassa';
      d.push('d\'' + LOCALS[bar[terrassaDe.get(ci)]]);
    } else if(fars[ci]){
      t = 'Far';
      d.push(carrer[ci] ? 'en un carrer' : 'en una plaça');
    } else {
      const cases = cells[ci].nb.filter(b => b >= 0 && heights[b] > 0).length;
      t = !carrer[ci] ? 'Plaça' : cases >= 3 ? 'Plaça' : 'Carrer';
      if(!carrer[ci]) d.push('s\'ha fet sola, envoltada de cases');
    }
    if(alt) d.push(alt);
    if(roca[ci]) d.push('obert a la muntanya');
    if(gegantsAqui(ci)) d.push('hi ha els gegants');
    if(nadal && arbreNadalAqui(ci)) d.push('hi ha un arbre de Nadal');
    if(fanals.has(ci)) d.push('amb un fanal');
    if(ambGent && hiHaAsseguts(ci)) d.push('hi ha gent asseguda al banc');
    if(ambGent && A_TERRASSA.has(ci)) d.push('hi ha gent prenent alguna cosa');
    if(ambGent && PESCADORS.has(ci)) d.push('hi ha algú pescant');
    if(nadal && eixLlums(ci) >= 0) d.push('amb llums de Nadal d\'una façana a l\'altra');
    if(festa && eixFesta(ci) >= 0) d.push('amb banderetes de Festa Major');
    return {titol: t, detalls: d};
  }
  if(esSorra[ci]){
    d.push(platja[ci] > 1 ? 'hi ha ' + ELEMENTS_PLATJA[platja[ci]] : 'arena llisa');
    if(ambGent && AL_SOL.has(ci)) d.push('hi ha algú prenent el sol');
    return {titol: 'Platja', detalls: d};
  }
  if(esMoliMar(ci)) return {titol: 'Aerogenerador', detalls: ['a la mar, sobre un pilot clavat al fons', 'les pales giren de cara al vent']};
  if(fars[ci]) return {titol: 'Far', detalls: ['sobre un illot de roca, a l\'aigua']};
  if(esCanal(ci)) return {titol: 'Canal', detalls: ['aigua entre dues ribes; s\'hi pot fer un pont']};
  return {titol: 'Mar', detalls: []};
}

/* --- la fitxa, al costat del cursor --- */
let fitxaT = 0;
function mostraFitxa(ci, x, y){
  const el = document.getElementById('fitxa');
  if(ci < 0){ amagaFitxa(); return; }
  const {titol, detalls} = descriuCella(ci);
  el.innerHTML = '';
  const b = document.createElement('b'); b.textContent = titol; el.appendChild(b);
  if(detalls.length){
    const ul = document.createElement('ul');
    for(const t of detalls){ const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); }
    el.appendChild(ul);
  }
  el.hidden = false;
  // a tocar del cursor, però sempre dins la pantalla
  const w = el.offsetWidth, h = el.offsetHeight, m = 12;
  el.style.left = Math.max(m, Math.min(innerWidth - w - m, x + 16)) + 'px';
  el.style.top  = Math.max(m, Math.min(innerHeight - h - m, y + 16)) + 'px';
  clearTimeout(fitxaT);
  fitxaT = setTimeout(amagaFitxa, 8000);
}
function amagaFitxa(){ const el = document.getElementById('fitxa'); if(el) el.hidden = true; clearTimeout(fitxaT); }
