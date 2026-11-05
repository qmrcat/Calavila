/* Cala · escena 3D: llums, mar, barques, gavines i cicle de dia i nit */

/* ---------- 6. Escena ---------- */

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbcdcea);
scene.fog = new THREE.Fog(0xbcdcea, 34, 96);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(42, innerWidth/innerHeight, 0.5, 300);

// materials compartits: les malles es refan a cada clic, els materials no
const matPoble = new THREE.MeshLambertMaterial({vertexColors:true});
const matPick  = new THREE.MeshBasicMaterial({colorWrite:false, depthWrite:false});
const matGrid  = new THREE.LineBasicMaterial({color:0xffffff, transparent:true, opacity:0.42, depthWrite:false});
const matLlum  = new THREE.MeshBasicMaterial({vertexColors:true});
const matBarca = new THREE.MeshLambertMaterial({vertexColors:true, side:THREE.DoubleSide});
// finestres: de dia, el color de material les deixa fosques; de nit, blanc i es veu el to càlid
const FIN_DIA = new THREE.Color(FOSC[0]/CALID[0]*1.3, FOSC[1]/CALID[1]*1.3, FOSC[2]/CALID[2]*1.3);
const matFinestra = new THREE.MeshBasicMaterial({vertexColors:true, color:FIN_DIA.clone()});

// textura d'un disc amb degradat radial (halos dels fanals, lluna)
function texturaRadial(parades, mida = 64){
  const tela = document.createElement('canvas');
  tela.width = tela.height = mida;
  const x = tela.getContext('2d'), g = x.createRadialGradient(mida/2,mida/2,0, mida/2,mida/2,mida/2);
  for(const [o,c] of parades) g.addColorStop(o, c);
  x.fillStyle = g; x.fillRect(0, 0, mida, mida);
  return new THREE.CanvasTexture(tela);
}
const matHalo = new THREE.PointsMaterial({
  map: texturaRadial([[0,'rgba(255,220,160,1)'],[0.22,'rgba(255,196,120,0.6)'],[1,'rgba(255,170,80,0)']]),
  size: 1.6, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending
});

// només es renderitza quan alguna cosa ha canviat (o quan el mar es mou)
let brut = true;
function redibuixa(){ brut = true; }

const llumCel = new THREE.HemisphereLight(0xdff0f7, 0xb08a63, 0.85);
scene.add(llumCel);
const sol = new THREE.DirectionalLight(0xfff2dd, 1.05);
sol.position.set(14, 20, 9);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
const sc = sol.shadow.camera;
sc.left = -24; sc.right = 24; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 70;
scene.add(sol);

// Fins on arriba la quadrícula, en unitats del món (20,5 a la mida normal).
// La boira, les ombres, la llum i els límits de la càmera s'hi adapten.
let radiCala = 20.5;
const escalaVista = () => Math.max(1, radiCala / 20.5);
// La boira comença una mica més enllà d'on mira la càmera: així el poble queda nítid
// a qualsevol zoom i només s'esvaeix l'horitzó (a la mida normal i de prop, com sempre: 34-96)
function ajustaBoira(){
  const f = escalaVista(), d = camera.position.distanceTo(centre);
  scene.fog.near = Math.max(34*f, d + 10);
  scene.fog.far  = Math.max(96*f, d + 60*f);
}
function ajustaMida(){
  radiCala = 0;
  for(const v of posV.values()) radiCala = Math.max(radiCala, Math.hypot(v.x, v.z));
  ajustaBoira();
  const s = radiCala + 4;                         // la càmera d'ombres ha de veure tota la cala
  sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s; sc.far = 2*(radiCala + 25);
  sc.updateProjectionMatrix();
  aplicaHora(hora);                               // torna a posar el sol a la distància nova
}

// mar: prou gran perquè no se li vegi la vora ni amb la cala gran i la càmera lluny
const marGeo = new THREE.PlaneGeometry(400, 400, 86, 86);
marGeo.rotateX(-Math.PI/2);
const marBase = marGeo.attributes.position.array.slice();
const mar = new THREE.Mesh(marGeo, new THREE.MeshPhongMaterial({
  color: 0x1c6c8c, specular: 0x9fd6e6, shininess: 70, flatShading: true
}));
mar.position.y = -0.55;   // la roca queda a la vista
mar.receiveShadow = true;
scene.add(mar);

// alçada de l'onada en un punt: la fan servir el mar i les barques
const onada = (x, z, s) => Math.sin(x*0.28 + s*2.1)*0.09 + Math.sin(z*0.37 - s*1.6)*0.07;

/* --- llaüts fondejats fora de la quadrícula --- */
let barques = [];

const geomLlaut = rnd => toGeom(llautG(newG(), rnd));

// llaüt de proa i popa punxegudes, en coordenades pròpies (eslora al llarg de x)
function llautG(G, rnd){
  const L = 1.25 + rnd()*0.35, W = 0.46, N = 8;
  const BUCS = [['#f4f1ea','#2f6f8f'],['#2f6f8f','#f4f1ea'],['#f4f1ea','#3d7a68'],
                ['#c9573c','#f4f1ea'],['#f2d68a','#2f6f8f']];
  const [cA, cB] = BUCS[Math.floor(rnd()*BUCS.length)].map(C);
  const sec = [];
  for(let i=0;i<=N;i++){                    // seccions de popa (-1) a proa (1): punxegut pels dos caps
    const u = i/N*2 - 1, w = W/2*Math.pow(Math.max(0, 1-u*u), 0.6);
    sec.push({x: u*L/2, w, yd: 0.16 + 0.10*u*u, yk: 0.02 - 0.13*(1-u*u)});
  }
  for(let i=0;i<N;i++){
    const a = sec[i], b = sec[i+1];
    for(const s of [1,-1]){
      const A0 = [a.x,a.yd,s*a.w], B0 = [b.x,b.yd,s*b.w];
      const A1 = [a.x,(a.yd+a.yk)/2+0.03,s*a.w*0.82], B1 = [b.x,(b.yd+b.yk)/2+0.03,s*b.w*0.82];
      const A2 = [a.x,a.yk,0], B2 = [b.x,b.yk,0];
      quad(G, A0, B0, B1, A1, cA);           // obra morta
      quad(G, A1, B1, B2, A2, cB);           // obra viva
    }
    quad(G, [a.x,a.yd-0.035,a.w*0.92], [b.x,b.yd-0.035,b.w*0.92],
            [b.x,b.yd-0.035,-b.w*0.92], [a.x,a.yd-0.035,-a.w*0.92], FUSTA);   // coberta
  }
  if(rnd() < 0.6){                           // pal i antena amb la vela llatina plegada
    con(G, L*0.12, 0, 0.022, 0.016, 0.1, 1.05, 5, FUSTA, true);
    tronc(G, -L*0.30, 0.32, 0, L*0.45, 1.05, 0, 0.018, 0.012, FUSTA, 5);
    tronc(G, -L*0.20, 0.36, 0, L*0.38, 0.98, 0, 0.045, 0.035, C('#efe8d8'), 6);
  } else {                                   // tambutxo
    caixa(G, -L*0.05, 0, 1, 0, 0.18, 0.13, 0.12, 0.30, cA);
  }
  return G;
}

// tot allò que depèn només de la llavor de la cala: les barques i on cau la platja
function decorarCala(){
  platjaA = mulberry32(seed + 5150)() * 6.283;
  posaBarques();
}

function posaBarques(){
  for(const b of barques){ scene.remove(b.mesh); b.mesh.geometry.dispose(); }
  barques = [];
  const rnd = mulberry32(seed + 4242);
  const n = 3 + Math.floor(rnd()*3);
  for(let i=0;i<n;i++){
    const a = (i + rnd()*0.6)/n * 6.283;
    let rmax = 0;                            // fins on arriba la costa en aquesta direcció
    for(const v of vora){
      const P = posV.get(v);
      const da = Math.abs((((Math.atan2(P.z,P.x) - a) % 6.283) + 9.425) % 6.283 - 3.1416);
      if(da < 0.4) rmax = Math.max(rmax, Math.hypot(P.x, P.z));
    }
    const r = rmax + 1.2 + rnd()*2.4;
    const mesh = new THREE.Mesh(geomLlaut(rnd), matBarca);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.rotation.order = 'YXZ';
    const b = {mesh, x: Math.cos(a)*r, z: Math.sin(a)*r, fase: rnd()*6.283};
    mesh.position.set(b.x, mar.position.y, b.z);
    mesh.rotation.y = rnd()*6.283;
    scene.add(mesh);
    barques.push(b);
  }
  redibuixa();
}

/* --- barques amarrades als molls --- */
// es guarden per clau (cel·la d'aigua + moll + aresta): les que ja hi eren no es refan
let amarrats = new Map();

function posaAmarrats(llista){
  const ara = new Set(llista.map(a => a.clau));
  for(const [k, b] of amarrats) if(!ara.has(k)){ scene.remove(b.mesh); b.mesh.geometry.dispose(); amarrats.delete(k); }
  for(const a of llista){
    if(amarrats.has(a.clau)) continue;
    const rnd = mulberry32(a.llavor);
    const mesh = new THREE.Mesh(geomLlaut(rnd), matBarca);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.rotation.order = 'YXZ';
    mesh.position.set(a.x, mar.position.y, a.z);
    mesh.rotation.y = a.rot;
    scene.add(mesh);
    amarrats.set(a.clau, {mesh, x: a.x, z: a.z, fase: rnd()*6.283});
  }
}

// una barca que es bressola amb l'onada (s: temps de l'onada)
function bressola(b, s){
  b.mesh.position.y = mar.position.y + onada(b.x, b.z, s);
  b.mesh.rotation.z = Math.sin(s*1.7 + b.fase)*0.05;
  b.mesh.rotation.x = Math.sin(s*2.3 + b.fase*1.3)*0.06;
}

/* --- gavines que volten la cala --- */
const matGavina = new THREE.MeshLambertMaterial({vertexColors:true, side:THREE.DoubleSide});
let gavines = [];
let gavinesActives = true;   // es poden amagar des de Configuració
let gavinesDeDia = true;     // de nit no volen
const mostraGavines = () => { for(const b of gavines) b.g.visible = gavinesActives && gavinesDeDia; };

function creaGavines(){
  const BLANC = C('#f4f3ef'), GRIS = C('#a3abb0'), NEGRE = C('#2a2a2a');
  const Gc = newG();                                  // cos, mirant cap a +z
  prisma(Gc, rect(0, 0, 0.07, 0.26), -0.03, 0.03, BLANC, true);
  prisma(Gc, rect(0, 0.15, 0.055, 0.07), -0.01, 0.045, BLANC, true);
  tri(Gc, [-0.012,0.012,0.185], [0.012,0.012,0.185], [0,0.006,0.235], C('#e8b23a'));   // bec
  tri(Gc, [-0.035,0,-0.13], [0.035,0,-0.13], [0,0,-0.2], GRIS);                       // cua
  const ala = s => {                                  // arrenca a x=0; s = +1 dreta, -1 esquerra
    const G = newG();
    quad(G, [0,0,0.06], [0.17*s,0,0.03], [0.17*s,0,-0.05], [0,0,-0.06], GRIS);
    quad(G, [0.17*s,0,0.03], [0.30*s,0,-0.02], [0.30*s,0,-0.05], [0.17*s,0,-0.05], GRIS);
    tri(G, [0.30*s,0,-0.02], [0.37*s,0,-0.065], [0.30*s,0,-0.05], NEGRE);             // punta negra
    return toGeom(G);
  };
  const gc = toGeom(Gc), gd = ala(1), ge = ala(-1);
  const rnd = mulberry32(99);
  for(let i=0;i<7;i++){
    const g = new THREE.Group(), ad = new THREE.Mesh(gd, matGavina), ae = new THREE.Mesh(ge, matGavina);
    ad.position.x = 0.03; ae.position.x = -0.03;
    g.add(new THREE.Mesh(gc, matGavina), ad, ae);
    g.traverse(o => { if(o.isMesh) o.castShadow = true; });
    g.rotation.order = 'YXZ';
    scene.add(g);
    gavines.push({g, ad, ae, R: 5 + rnd()*9, alt: 4.5 + rnd()*4,
                  w: (0.12 + rnd()*0.12) * (rnd() < 0.5 ? -1 : 1), f0: rnd()*6.283,
                  fase: rnd()*100, cx: (rnd()-0.5)*4, cz: (rnd()-0.5)*4});
  }
}

function mouGavines(s){                               // s: temps en segons
  for(const b of gavines){
    const a = b.f0 + b.w*s;
    b.g.position.set(b.cx + Math.cos(a)*b.R, b.alt + Math.sin(s*0.6 + b.fase)*0.4, b.cz + Math.sin(a)*b.R);
    b.g.rotation.y = Math.atan2(-Math.sin(a)*b.w, Math.cos(a)*b.w);   // de cara on va
    b.g.rotation.z = b.w > 0 ? 0.35 : -0.35;                          // s'inclina cap a dins del gir
    const bat = Math.sin(s*0.45 + b.fase) > 0.1;                      // bateja una estona, plana una altra
    const ang = bat ? Math.sin(s*11 + b.fase)*0.55 : 0.08;
    b.ad.rotation.z = ang; b.ae.rotation.z = -ang;
  }
}
creaGavines();
mouGavines(0);

/* ============================================================
   CICLE DE DIA I NIT
   ------------------------------------------------------------
   Tot surt de l'hora (0-24): l'alçada del sol diu quanta llum
   hi ha, de quin color és el cel i si els fanals i les
   finestres s'encenen. De nit, la llum direccional fa de lluna.
   ============================================================ */

const HORA_DIA = 13, HORA_NIT = 23;
const DIA_AUTO_S = 360;       // segons reals que dura un dia sencer en mode automàtic
let modeHora = 'dia', hora = HORA_DIA, horaAplicada = -1;

const lin = hex => new THREE.Color(hex).convertSRGBToLinear();
const CEL = {
  zDia: lin('#78b9dc'),   hDia: lin('#cde5ee'),
  zPosta: lin('#4f6496'), hPosta: lin('#f0a476'),
  zNit: lin('#050b18'),   hNit: lin('#172540'),
};
// llums i mar: en valors crus, com estaven definits abans
const LLUM_DIA = new THREE.Color(0xfff2dd), LLUM_POSTA = new THREE.Color(0xffa766), LLUM_LLUNA = new THREE.Color(0x9fb6e6);
const CEL_DIA = new THREE.Color(0xdff0f7), CEL_NIT = new THREE.Color(0x3a5a8c);
const TERRA_DIA = new THREE.Color(0xb08a63), TERRA_NIT = new THREE.Color(0x1d1c26);
const MAR_DIA = new THREE.Color(0x1c6c8c), MAR_POSTA = new THREE.Color(0x2c5a7c), MAR_NIT = new THREE.Color(0x0a2236);
const BRILL_DIA = new THREE.Color(0x9fd6e6), BRILL_NIT = new THREE.Color(0x4a6a90);
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x-a)/(b-a))); return t*t*(3-2*t); };

// cúpula del cel amb degradat: segueix la càmera perquè no la talli el pla llunyà
const RADI_CEL = 250;
const cupula = new THREE.Mesh(new THREE.SphereGeometry(RADI_CEL, 32, 16),
  new THREE.MeshBasicMaterial({vertexColors:true, side:THREE.BackSide, fog:false, depthWrite:false}));
cupula.geometry.setAttribute('color',
  new THREE.Float32BufferAttribute(new Float32Array(cupula.geometry.attributes.position.count*3), 3));
cupula.renderOrder = -10;
scene.add(cupula);

const estrelles = (()=>{
  const rnd = mulberry32(7), p = [];
  for(let i=0;i<700;i++){                             // repartides per la mitja esfera de dalt
    const u = rnd()*6.283, y = 0.04 + rnd()*0.96, h = Math.sqrt(1 - y*y), r = 235;
    p.push(Math.cos(u)*h*r, y*r, Math.sin(u)*h*r);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({color:0xffffff, size:1.6, sizeAttenuation:false,
    transparent:true, opacity:0, fog:false, depthWrite:false}));
})();
scene.add(estrelles);

const lluna = new THREE.Sprite(new THREE.SpriteMaterial({
  map: texturaRadial([[0,'#fbf8ec'],[0.40,'#efe9d4'],[0.47,'rgba(239,233,212,0.35)'],[1,'rgba(239,233,212,0)']]),
  fog:false, transparent:true, depthWrite:false, opacity:0}));
lluna.scale.set(16, 16, 1);
scene.add(lluna);
const dirLluna = new THREE.Vector3();

// cel, estrelles i lluna van amb la càmera: són a l'infinit
function posaCel(){
  cupula.position.copy(camera.position);
  estrelles.position.copy(camera.position);
  lluna.position.copy(camera.position).addScaledVector(dirLluna, 200);
}

const rellotgeEl = document.getElementById('rellotge');
function aplicaHora(h){
  horaAplicada = h;
  const th = (h - 6)/12*Math.PI, e = Math.sin(th);   // e: 1 al migdia, -1 a mitjanit
  const dia = ss(-0.18, 0.22, e), nit = 1 - dia;
  const posta = Math.max(0, 1 - Math.abs(e)/0.32);    // a tocar de l'horitzó

  // cel i boira
  const zen = CEL.zNit.clone().lerp(CEL.zDia, dia).lerp(CEL.zPosta, posta*0.75);
  const hor = CEL.hNit.clone().lerp(CEL.hDia, dia).lerp(CEL.hPosta, posta*0.85);
  const pp = cupula.geometry.attributes.position, pc = cupula.geometry.attributes.color;
  for(let i=0;i<pp.count;i++){
    const t = Math.pow(Math.max(0, pp.getY(i)/RADI_CEL), 0.55);
    pc.setXYZ(i, hor.r + (zen.r-hor.r)*t, hor.g + (zen.g-hor.g)*t, hor.b + (zen.b-hor.b)*t);
  }
  pc.needsUpdate = true;
  // en r128 la boira s'aplica després de passar a sRGB: el seu color va en sRGB (i el fons també)
  const horS = hor.clone().convertLinearToSRGB();
  scene.fog.color.copy(horS);
  scene.background.copy(horS);

  // sol de dia, lluna de nit; al pas per l'horitzó la intensitat val zero i no hi ha salt
  const sx = Math.cos(th)*22, sy = Math.sin(th)*20, sz = 9;
  dirLluna.set(-sx, -sy, -sz).normalize();
  if(e >= 0){
    sol.position.set(sx, sy, sz).setLength(radiCala + 25);   // sempre per fora de la cala
    sol.color.copy(LLUM_POSTA).lerp(LLUM_DIA, ss(0.05, 0.5, e));
    sol.intensity = 1.05 * ss(0, 0.3, e);
  } else {
    sol.position.set(-sx, -sy, -sz).setLength(radiCala + 25);
    sol.color.copy(LLUM_LLUNA);
    sol.intensity = 0.34 * ss(0, 0.3, -e);
  }
  llumCel.intensity = 0.32 + 0.53*dia;
  llumCel.color.copy(CEL_NIT).lerp(CEL_DIA, dia);
  llumCel.groundColor.copy(TERRA_NIT).lerp(TERRA_DIA, dia);

  mar.material.color.copy(MAR_NIT).lerp(MAR_DIA, dia).lerp(MAR_POSTA, posta*0.5);
  mar.material.specular.copy(BRILL_NIT).lerp(BRILL_DIA, dia);
  matGrid.opacity = 0.14 + 0.28*dia;

  // el que s'encén de nit
  const encesa = ss(0.25, 0.75, nit);
  matLlum.color.setScalar(0.55 + 0.45*encesa);
  matFinestra.color.copy(FIN_DIA).lerp(new THREE.Color(1,1,1), encesa);
  matHalo.opacity = encesa*0.95;
  if(haloMesh) haloMesh.visible = encesa > 0.01;
  posaLlumsMoli(encesa);                     // i el llum vermell dels aerogeneradors
  estrelles.material.opacity = ss(0.45, 1, nit)*0.9;
  lluna.material.opacity = ss(0, 0.2, -e);
  gavinesDeDia = dia > 0.35;   // de nit les gavines no volen
  mostraGavines();
  posaCel();

  const hh = Math.floor(h), mm = Math.floor((h - hh)*60);
  const txt = String(hh).padStart(2,'0') + ':' + String(mm).padStart(2,'0');
  if(rellotgeEl.textContent !== txt) rellotgeEl.textContent = txt;
  redibuixa();
}

// avança el rellotge: en automàtic, a poc a poc; si no, cap endavant fins a l'hora triada
function passaTemps(dt){
  if(modeHora === 'auto'){
    hora = (hora + dt*24/DIA_AUTO_S) % 24;
  } else {
    const falta = ((modeHora === 'dia' ? HORA_DIA : HORA_NIT) - hora + 24) % 24;
    if(falta > 1e-3) hora = (hora + (calma ? falta : Math.min(falta, dt*5))) % 24;
  }
  if(Math.abs(hora - horaAplicada) > 0.004) aplicaHora(hora);
}
