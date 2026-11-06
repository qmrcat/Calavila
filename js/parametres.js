/* Cala · els paràmetres: els percentatges que fan el poble com és */

/* ============================================================
   PARÀMETRES
   ------------------------------------------------------------
   Tots els percentatges que decideixen com es veu el poble són
   aquí: quantes cobertes són terrat, quantes finestres tenen
   balcó, quantes cases pengen la bandera per la Diada, quants
   balcons tenen damàs per la Festa Major...

   Cada element del poble té un número fix a l'atzar (un hash de
   la cel·la), i el paràmetre diu fins on arriba: amb un 30 % de
   terrats, són terrat les cobertes amb el número per sota de
   0,30. Per això, si s'apuja un percentatge, les que ja ho eren
   ho continuen sent i se n'hi afegeixen d'altres.

   Es poden canviar:
   - al joc, a Configuració → Paràmetres;
   - des del codi (o la consola del navegador):
       parametre('terrats')                 -> 0.3
       posaParametre('terrats', 0.5)        // el valor, de 0 a 1 (o el nombre, si no és un %)
       posaParametres({damassos: 0.6, estelades: 0.2})
       restableixParametres()               // tots, als valors per defecte
       restableixParametres('diada')        // només els d'un grup
       PARAMETRES                           // la llista, amb els valors per defecte
   Els canvis es desen en aquest navegador (només els que no són
   els de per defecte) i el poble es torna a fer. No van a la
   partida: una partida oberta en un altre navegador es veurà amb
   els paràmetres d'allà.

   Per afegir-ne un: una línia a PARAMETRES, i al codi PAR.clau.
   ============================================================ */

const GRUPS_PARAMETRES = [
  {id: 'cases',   nom: 'Cases'},
  {id: 'carrers', nom: 'Carrers i places'},
  {id: 'port',    nom: 'Port'},
  {id: 'diada',   nom: 'Diada'},
  {id: 'festa',   nom: 'Festa Major'},
  {id: 'nadal',   nom: 'Nadal'},
  {id: 'gent',    nom: 'Gent'},
];

// clau, grup, nom, valor per defecte, i què vol dir. Els que no són un percentatge diuen min, max i unitat
const PARAMETRES = [
  {clau: 'terrats',        grup: 'cases', nom: 'Cobertes amb terrat',            def: 0.30, desc: 'Dels grups de cases, els que tenen terrat (amb ampit, amb barana o amb golfes) en lloc de teulada'},
  {clau: 'quatreAigues',   grup: 'cases', nom: 'Teulades a quatre aigües',       def: 0.45, desc: 'De les teulades, les que són a quatre aigües; la resta, a dues aigües (o a una, en cases soles)'},
  {clau: 'xemeneies',      grup: 'cases', nom: 'Xemeneies',                      def: 0.60, desc: 'Cobertes amb xemeneia (si no hi ha plaques solars)'},
  {clau: 'balcons',        grup: 'cases', nom: 'Finestres amb balcó',            def: 0.34, max: 0.66, desc: 'Finestres dels pisos de dalt que són balcó (com a molt, un 66 %: la resta de parets poden ser cegues)'},
  {clau: 'finestresArc',   grup: 'cases', nom: 'Cases amb finestres de mig punt', def: 0.22, desc: 'Cases amb les finestres i la porta acabades en arc'},
  {clau: 'socol',          grup: 'cases', nom: 'Cases amb sòcol',                def: 0.55, desc: 'Cases amb el sòcol pintat a la planta baixa'},
  {clau: 'buguenvillees',  grup: 'cases', nom: 'Buguenvíl·lees',                 def: 0.45, desc: 'Façanes que donen al carrer amb una buguenvíl·lea enfilada'},
  {clau: 'fanalsParet',    grup: 'cases', nom: 'Fanals de paret',                def: 0.32, desc: 'Façanes de planta baixa que donen al carrer amb un fanal de forja'},
  {clau: 'llumFinestres',  grup: 'cases', nom: 'Finestres amb llum de nit',      def: 0.55, desc: 'Finestres que de nit tenen el llum encès'},

  {clau: 'testos',         grup: 'carrers', nom: 'Testos',                       def: 0.24, desc: 'Cel·les de carrer amb un o dos testos amb flors'},
  {clau: 'bancs',          grup: 'carrers', nom: 'Bancs',                        def: 0.07, desc: 'Cel·les de carrer amb un banc de pedra'},
  {clau: 'fanals',         grup: 'carrers', nom: 'Fanals',                       def: 0.12, desc: 'Cel·les de carrer que volen un fanal (mai dos de costat)'},
  {clau: 'arbres',         grup: 'carrers', nom: 'Arbres',                       def: 0.10, desc: 'Cel·les de carrer amb un arbre (xiprer, pi o olivera). Testos, bancs, fanals i arbres sumen com a molt el 100 %'},

  {clau: 'barques',        grup: 'port', nom: 'Barques amarrades',               def: 0.70, desc: 'Llocs al costat dels molls on hi ha una barca amarrada (si hi cap)'},
  {clau: 'norais',         grup: 'port', nom: 'Norais',                          def: 0.60, desc: 'Vores de moll amb un norai'},

  {clau: 'casesBandera',   grup: 'diada', nom: 'Cases amb bandera',              def: 0.45, desc: 'Cases que pengen una bandera per la Diada'},
  {clau: 'estelades',      grup: 'diada', nom: 'Estelades',                      def: 0.50, desc: 'De les banderes, les que són estelades; la resta, senyeres'},
  {clau: 'duesBanderes',   grup: 'diada', nom: 'Cases amb dues banderes',        def: 0.35, desc: 'De les cases grans amb bandera, les que en pengen dues'},

  {clau: 'damassos',       grup: 'festa', nom: 'Balcons amb damàs',              def: 0.30, desc: 'Balcons amb un damàs penjat per la Festa Major'},
  {clau: 'banderetes',     grup: 'festa', nom: 'Carrers amb banderetes',         def: 0.85, desc: 'Carrers amb cases prou altes a banda i banda que pengen banderetes'},

  {clau: 'casesNadal',     grup: 'nadal', nom: 'Cases guarnides',                def: 0.35, desc: 'Cases amb una garlanda de llums sota el ràfec'},
  {clau: 'carrersNadal',   grup: 'nadal', nom: 'Carrers amb llums',              def: 0.80, desc: 'Carrers amb cases prou altes a banda i banda que pengen una tira de llums'},
  {clau: 'llumsBlanques',  grup: 'nadal', nom: 'Llums blanques',                 def: 0.45, desc: 'Cases i carrers amb els llums de blanc calent; la resta, de colors'},

  {clau: 'gentCarrer',     grup: 'gent', nom: 'Grups pel carrer, com a molt',    def: 26, min: 0, max: 60, unitat: '', desc: 'Com a molt, quants grups caminen alhora (n\'hi ha més com més cases, i de nit menys)'},
  {clau: 'gentBancs',      grup: 'gent', nom: 'Bancs ocupats',                   def: 0.55, desc: 'Bancs amb gent asseguda quan surt la gent (de nit, menys de la meitat)'},
  {clau: 'gentTerrasses',  grup: 'gent', nom: 'Taules de terrassa ocupades',     def: 0.60, desc: 'Taules dels bars amb gent, de dia (al restaurant, una mica menys; de nit, al revés)'},
  {clau: 'gentPlatja',     grup: 'gent', nom: 'Gent a la platja',                def: 0.60, desc: 'Cel·les de platja amb algú prenent el sol, de dia'},
];

const PAR = {};   // els valors en ús: PAR.terrats, PAR.balcons...
const DEF_PARAMETRES = {};
for(const p of PARAMETRES){ PAR[p.clau] = DEF_PARAMETRES[p.clau] = p.def; }

const esPercent = p => p.unitat === undefined;
const paramDe = clau => PARAMETRES.find(p => p.clau === clau);
// el valor dins dels límits del paràmetre (els que no són un %, enters)
function ajustaParam(p, v){
  v = +v;
  if(!isFinite(v)) return p.def;
  const min = p.min ?? 0, max = p.max ?? 1;
  v = Math.min(max, Math.max(min, v));
  return esPercent(p) ? Math.round(v*1000)/1000 : Math.round(v);
}

function desaParametres(){
  const canviats = {};
  for(const p of PARAMETRES) if(PAR[p.clau] !== p.def) canviats[p.clau] = PAR[p.clau];
  try{
    if(Object.keys(canviats).length) localStorage.setItem('cala:parametres', JSON.stringify(canviats));
    else localStorage.removeItem('cala:parametres');
  } catch(e){}
}
// els valors desats en aquest navegador (els que ja no existeixen o no són vàlids es descarten). Es fa en carregar
function carregaParametres(){
  for(const p of PARAMETRES) PAR[p.clau] = p.def;
  let d = null;
  try{ d = JSON.parse(localStorage.getItem('cala:parametres') || 'null'); } catch(e){}
  if(d && typeof d === 'object') for(const k in d){ const p = paramDe(k); if(p) PAR[k] = ajustaParam(p, d[k]); }
}
carregaParametres();

// després d'un canvi: es desa, es refà el poble i s'actualitza el panell
function aplicaParametres(){
  desaParametres();
  if(typeof pintaParametres === 'function') pintaParametres();
  if(typeof construirMalla === 'function' && typeof cells !== 'undefined' && cells.length) construirMalla();
}

/* --- per fer-los servir des del codi --- */
function parametre(clau){
  if(!(clau in PAR)) throw new Error('No hi ha cap paràmetre «' + clau + '»');
  return PAR[clau];
}
function posaParametre(clau, valor){ return posaParametres({[clau]: valor}); }
function posaParametres(valors){
  for(const k in valors){
    const p = paramDe(k);
    if(!p) throw new Error('No hi ha cap paràmetre «' + k + '»');
    PAR[k] = ajustaParam(p, valors[k]);
  }
  aplicaParametres();
  return {...PAR};
}
function restableixParametres(grup){
  for(const p of PARAMETRES) if(!grup || p.grup === grup) PAR[p.clau] = p.def;
  aplicaParametres();
  return {...PAR};
}

/* ============================================================
   EL PANELL (Configuració → Paràmetres)
   Un grup desplegable per tema; cada paràmetre, amb una barra.
   El poble es refà quan s'acaba de moure la barra.
   ============================================================ */
const textParam = (p, v) => esPercent(p) ? Math.round(v*100) + ' %' : String(v);

function muntaParametres(){
  const cont = document.getElementById('params');
  if(!cont) return;
  cont.textContent = '';
  for(const g of GRUPS_PARAMETRES){
    const det = document.createElement('details');
    det.className = 'pgrup';
    det.dataset.grup = g.id;
    const sum = document.createElement('summary');
    sum.textContent = g.nom;
    det.appendChild(sum);
    for(const p of PARAMETRES.filter(q => q.grup === g.id)){
      const fila = document.createElement('div');
      fila.className = 'pfila';
      fila.dataset.clau = p.clau;
      const id = 'param-' + p.clau;
      const lab = document.createElement('label');
      lab.htmlFor = id; lab.textContent = p.nom; lab.title = p.desc;
      const val = document.createElement('output');
      val.htmlFor = id;
      const tor = document.createElement('button');
      tor.type = 'button'; tor.className = 'ptorna'; tor.textContent = '↺';
      tor.title = 'Torna al valor per defecte (' + textParam(p, p.def) + ')';
      tor.setAttribute('aria-label', 'Torna «' + p.nom + '» al valor per defecte');
      tor.onclick = () => posaParametre(p.clau, p.def);
      const r = document.createElement('input');
      r.type = 'range'; r.id = id;
      const esc = esPercent(p) ? 100 : 1;
      r.min = String((p.min ?? 0)*esc); r.max = String((p.max ?? 1)*esc); r.step = '1';
      r.title = p.desc;
      r.oninput = () => { val.textContent = textParam(p, +r.value/esc); };
      r.onchange = () => posaParametre(p.clau, +r.value/esc);
      const cap = document.createElement('div');
      cap.className = 'pcap';
      cap.append(lab, val, tor);
      fila.append(cap, r);
      det.appendChild(fila);
    }
    const peu = document.createElement('div');
    peu.className = 'row';
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = 'Per defecte'; b.className = 'pdefecte';
    b.title = 'Torna tots els paràmetres de «' + g.nom + '» als valors per defecte';
    b.onclick = () => restableixParametres(g.id);
    peu.appendChild(b);
    det.appendChild(peu);
    cont.appendChild(det);
  }
  pintaParametres();
}
// posa al panell els valors en ús, i marca els canviats
function pintaParametres(){
  const cont = document.getElementById('params');
  if(!cont) return;
  for(const p of PARAMETRES){
    const fila = cont.querySelector('[data-clau="' + p.clau + '"]');
    if(!fila) continue;
    const esc = esPercent(p) ? 100 : 1, canviat = PAR[p.clau] !== p.def;
    fila.querySelector('input').value = String(Math.round(PAR[p.clau]*esc));
    fila.querySelector('output').textContent = textParam(p, PAR[p.clau]);
    fila.classList.toggle('canviat', canviat);
    fila.querySelector('.ptorna').hidden = !canviat;
  }
  for(const g of GRUPS_PARAMETRES){
    const det = cont.querySelector('[data-grup="' + g.id + '"]');
    const n = PARAMETRES.filter(p => p.grup === g.id && PAR[p.clau] !== p.def).length;
    if(det){ det.querySelector('summary').textContent = g.nom + (n ? ' · ' + n + (n > 1 ? ' canviats' : ' canviat') : '');
             det.querySelector('.pdefecte').disabled = !n; }
  }
  const tots = document.getElementById('btn-params-defecte');
  if(tots) tots.disabled = PARAMETRES.every(p => PAR[p.clau] === p.def);
}
