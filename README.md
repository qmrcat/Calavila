# Calavila

Constructor de pobles mediterranis ambientat a la Costa Brava. Cliques sobre l'aigua i hi creixen cases emblanquinades amb teulades de teula àrab, carrerons amb escales, voltes, ponts sobre canals, molls amb far i barques amarrades. Tot es genera sol a partir d'on poses cada bloc.

Està fet amb JavaScript pur i [three.js](https://threejs.org/) r128, sense cap pas de compilació.

## Com s'obre

Obre `index.html` al navegador. No cal cap servidor: els scripts no són mòduls i funcionen directament des del disc.

Cal connexió a internet la primera vegada, perquè three.js es carrega des de la CDN de cdnjs.

## Com es juga

Tria un mode al panell i clica sobre la quadrícula. Els modes van en dos grups: el primer, per fer el poble (**Cases**, **Carrers**, **Voltes**, **Pintar**, **Locals**, **Teulades**), i el segon, per a les obres i el relleu (**Ponts**, **Molls**, **Fars**, **Escales**, **Muntanya**, **Platja**, **Energia**). En els modes que tenen condicions, la cel·la sota el cursor es pinta de verd si s'hi pot construir i de vermell si no.

| Mode | Què fa |
|---|---|
| **Cases** | A l'aigua, el primer clic fa el terreny i el segon, la casa. Després, cada clic hi afegeix un pis. Les cases veïnes de la mateixa alçada i del mateix color comparteixen teulada; si són de colors diferents, cadascuna fa la seva. |
| **Carrers** | Pavimenta una cel·la. Si hi tornes a clicar, l'enlaires un nivell. |
| **Voltes** | Fa una volta sobre un carrer que tingui cases de dos pisos o més a banda i banda. Si cliques una casa, n'obre la planta baixa en un porxo (vegeu *Voltes i porxos*). |
| **Pintar** | Canvia el color de la façana de les cases que ja hi ha. |
| **Locals** | Fa un local a la planta baixa d'una casa: bar, restaurant, botiga de queviures, forn de pa, quiosc o hotel. Cada clic el canvia pel següent (vegeu *Locals*). |
| **Teulades** | Tria la teulada o el terrat d'una casa: cada clic el canvia pel següent. El botó dret el torna automàtic (vegeu *Teulades i terrats*). |
| **Ponts** | Posa un pont de pedra sobre un canal. Amb terra a una sola banda, fa d'embarcador. |
| **Molls** | Fa un moll de port sobre l'aigua que toca la costa. A la punta d'un espigó hi surt un far, i al costat, barques amarrades. |
| **Fars** | Posa un far on vulguis. A l'aigua, s'alça damunt d'un illot de roca; en un carrer, una plaça o un moll plans, s'hi aguanta a sobre. No en pot anar cap en una escala ni sota una volta. |
| **Escales** | Posa una escala que puja un nivell des d'un lloc pla: un carrer, un terrat o el cap d'una altra escala (vegeu *Escales*). |
| **Muntanya** | Fa terreny de roca. Si hi tornes a clicar, l'alça un nivell. Les roques veïnes fan muntanya, i a sobre s'hi poden fer cases (vegeu *Muntanya*). |
| **Platja** | Fa platja d'arena a l'aigua arran de costa. Si hi tornes a clicar, hi posa un para-sol, unes gandules, una barca... (vegeu *Platja*). |
| **Energia** | Posa plaques solars a la teulada o al terrat d'una casa, o alça un aerogenerador a la mar o al cim d'una muntanya (vegeu *Energia*). |

### Treure

Per treure, fes clic amb el **botó dret**, sigui quin sigui el mode. Es treu el que hi ha més amunt de la cel·la, en aquest ordre:

1. l'escala de sobre una casa;
2. un pis de la casa (quan no en queden, hi torna a quedar el terreny). En mode **Voltes**, primer el porxo; en mode **Locals**, el local; en mode **Teulades**, la teulada triada a mà; i en mode **Energia**, les plaques solars;
3. la volta;
4. el far o l'aerogenerador;
5. l'escala;
6. el pont;
7. el que hi ha a la platja, i després l'arena;
8. un nivell del terreny, i a la fi el terreny mateix, que torna a ser aigua.

<kbd>Maj</kbd>+clic i el botó **Treure** fan el mateix (al mòbil no hi ha botó dret). L'única excepció és el mode **Pintar**, on tornen la façana al color automàtic.

### Voltes i porxos

**Voltes:** clica el buit que hi ha entre dues cases enfrontades de dos pisos o més. La volta pren el color de la casa més baixa de les dues, que és on s'aguanta, i en comparteix la teulada. Si la pintes en mode **Pintar**, té el seu color i la seva teulada.

**Porxos:** en mode **Voltes**, clica una casa de dos pisos o més i la seva planta baixa es torna un porxo obert, amb arcs i pilars de pedra. A sobre, la casa continua igual.

- No cal que tingui cases al costat: un porxo sol s'aguanta amb quatre pilars.
- Si en fas uns quants seguits, fan una galeria contínua. Així pots fer carrers i places porxats.
- Cada casa amb porxo pot ser d'un color diferent, i cada color fa la seva teulada.
- Si el porxo toca una casa normal, la façana d'aquella casa fa de paret del fons.
- Per sota s'hi passa com per un carrer, al nivell del terreny on és la casa.
- Al porxo no hi cap un bar, ni una escala a sobre de la casa.

Per tancar un porxo, torna-hi a clicar en mode **Voltes**, o fes-hi clic amb el botó dret en aquest mode. Si treus pisos fins que en queda un de sol, el porxo també es perd.

### Locals

En mode **Locals** (tecla <kbd>B</kbd>), clica una casa i la seva planta baixa es torna un local. Cada clic més el canvia pel següent, fins que surt el que vols:

1. **Bar:** rètol BAR, i terrassa amb para-sols si hi ha lloc.
2. **Restaurant:** rètol RESTAURANT, i terrassa amb estovalles si hi ha lloc.
3. **Botiga de queviures:** rètol QUEVIURES, i a fora, caixes de fruita sobre un banc.
4. **Forn de pa:** rètol FORN, i a l'aparador, pans rodons i barres, i un cistell amb més barres.
5. **Quiosc:** rètol QUIOSC, expositors de revistes a banda i banda de la porta, i diaris en un taulell.
6. **Hotel:** portes de vidre amb marc de marbre, marquesina amb llums, dos testos amb arbustos i el rètol HOTEL. El rètol va en vertical a la façana, amb tres estrelles, si la casa té pisos; si no, damunt la marquesina.

Després de l'hotel torna a ser un bar. L'avís diu quin local és i quin sortirà amb el clic següent.

Els cinc primers tenen un aparador de vidre que de nit s'encén i un tendal de ratlles. Tots tenen un rètol que de nit fa llum. A la façana d'un local no hi ha buguenvíl·lea ni fanal de paret, perquè no topin amb el tendal.

**Terrassa:** només els bars i els restaurants. Si davant de la casa hi ha dues cel·les buides seguides, a la que toca la casa s'hi posa una terrassa, i l'altra queda de pas.

- La primera cel·la ha de ser un carrer o una plaça plans, al nivell de la planta baixa.
- La segona pot ser un carrer, una plaça, la platja o l'aigua.
- Al bar, la terrassa té taules amb cadires i para-sols. Al restaurant, taules amb estovalles, una espelma i la pissarra del menú.
- Si no hi ha lloc, el local es fa igualment, sense terrassa.
- La terrassa apareix o desapareix sola quan canvia el que hi ha al davant.

Per treure el local, fes clic amb el botó dret en mode **Locals**. En els altres modes, el botó dret treu un pis com sempre, i el local se'n va amb l'últim pis.

### Escales

Les escales es posen a mà, en mode **Escales**. Cada escala puja un sol nivell i ha d'arrencar d'un lloc pla, que pot ser a qualsevol alçada:

- un carrer (també un d'enlairat) o un pont;
- el terrat d'una casa;
- el capdamunt d'una altra escala. Així es fan trams seguits, i des de terra es pot arribar a un pla tan alt com calgui.

L'escala puja en sentit contrari al lloc d'on arrenca. A dalt no cal que hi hagi res: el carrer de dalt el pots fer després, enlairant-lo en mode **Carrers**.

On pots clicar:

- **Un carrer:** l'escala hi queda al seu nivell.
- **El buit del costat d'un lloc pla:** s'hi fa el carrer i tot, al nivell d'aquell lloc.
- **Una casa:** l'escala va a sobre i arrenca del terrat d'una casa veïna de la mateixa alçada, o d'un carrer d'aquell nivell.
- **Una escala que ja hi és:** gira cap a un altre sentit possible. Primer surten els que a dalt ja troben on arribar, i després els més baixos.

Les cases d'on arrenca o on arriba una escala tenen terrat en lloc de teulada (amb ampit o amb barana), i l'ampit s'obre per on s'hi passa. Si a una casa amb una escala a sobre li poses o li treus un pis, l'escala desapareix.

Els graons són de llosa, amb el nas que sobresurt. Si l'escala dona a un lloc més baix, té murets emblanquinats amb albardilla, i arran de casa hi pot haver algun test.

### Teulades i terrats

Cada grup de cases que comparteix coberta en té un estil, que depèn de la casa que el decideix: sempre és el mateix, i no canvia quan construeixes en un altre lloc. Hi ha:

- **Teulada a quatre aigües:** una piràmide per a una casa sola, i un carener per a un bloc.
- **Teulada a dues aigües:** un carener per casa, amb un cavall (la paret en triangle) a cada punta. Si dues cases del bloc es toquen per la punta del carener, el carener continua; si es toquen pel ràfec, fan dues teulades paral·leles. Si en un bloc irregular el carener no quadra, es fa a quatre aigües.
- **Teulada a una aigua:** en una casa sola. Si al costat n'hi ha una de més alta, s'hi recolza.
- **Terrat amb ampit:** el de sempre, amb testos, arbres o una pèrgola.
- **Terrat amb barana:** barana de ferro sobre un sòcol baix i, sovint, estenedors amb roba estesa.
- **Terrat amb golfes:** una cambra petita en un racó, amb teulada, porta i finestra, que de nit sovint té llum. De vegades, també hi ha roba estesa.

Les teulades porten xemeneia de tant en tant. On arrenca o arriba una escala sempre hi ha terrat, amb ampit o amb barana, perquè s'hi ha de poder passar.

**Triar-la a mà:** mentre construeixes, la teulada surt sola, com sempre. En mode **Teulades** (tecla <kbd>T</kbd>), clica una casa i cada clic li canvia la coberta pel tipus següent, en aquest ordre: quatre aigües, dues aigües, una aigua, terrat amb ampit, terrat amb barana i estenedors, i terrat amb golfes.

- El canvi és per a tot el bloc de cases del mateix color i alçada, perquè comparteixen coberta.
- Només hi surten els tipus que hi caben. La d'una aigua, només en una casa sola. La de dues aigües, si el carener hi quadra. Amb una escala, només terrat.
- Si hi afegeixes pisos, la teulada triada es manté.
- El botó dret, en aquest mode, la torna automàtica.
- Les torres i les cases amb una escala a sobre tenen la seva coberta, i no es poden canviar.

La teulada triada es desa a la partida.

### Muntanya

En mode **Muntanya**, cada clic a l'aigua fa una roca, i cada clic més l'alça un nivell. Un carrer, una plaça o un moll també es poden tornar roca, al nivell que tenien.

La roca no fa esglaons: cada cantó pren l'alçada mitjana de les cel·les que s'hi troben, i les roques veïnes fan un sol pendent. Cap a l'aigua, la roca s'hi enfonsa. Una roca alta i sola fa una agulla; unes quantes de nivells diferents, una muntanya. A dalt hi ha mates, roques soltes i algun pi o olivera. Les parts planeres són més verdes, i les dretes, de roca nua: rovellada a baix i grisa de granit a dalt.

A sobre s'hi pot construir:

- **Cases:** en mode **Cases**, el primer clic sobre la roca ja fa la casa. La casa s'aixeca plana al nivell de la roca, i si la treus, la roca hi torna a quedar.
- **Fars:** van al cim, sobre un sòcol de pedra.
- **Carrers:** en mode **Carrers**, una roca es torna carrer al mateix nivell. Així s'obren camins i placetes a la muntanya, d'on poden arrencar les escales. Per la roca mateixa no s'hi camina, i no hi arrenca cap escala.

El botó dret la baixa un nivell, i a nivell zero la torna aigua. Sobre la roca no s'hi fan voltes soles.

Cada **Poble nou** té un turó de roca a tocar del poble, a l'altra banda de la platja, i de vegades un mas al cim.

### Platja

La platja ja no surt sola: és un terreny que es fa a mà, com el carrer o la muntanya. En mode **Platja** (tecla <kbd>L</kbd>), clica l'aigua arran de costa i s'hi fa arena. Ha de tocar terra, un carrer, un pont o una altra platja, i així pots fer-la tan ampla com vulguis. La platja fa pendent sola cap a l'aigua, i pels costats que donen al mar té un talús d'arena.

Cada clic a la mateixa platja hi canvia el que hi ha a sobre, en aquest ordre:

1. arena llisa;
2. un para-sol amb una tovallola estesa;
3. dues gandules mirant al mar, amb un para-sol al mig;
4. un llaüt varat;
5. un patí de vela;
6. la cadira alta del socorrista, amb para-sol, la bandera verda i un salvavides;
7. un castell de sorra, amb la galleda i la pala.

Després del darrer, torna a ser arena llisa. Les coses es posen a la part més seca de la cel·la, i les que tenen davant i darrere miren cap al mar.

El botó dret primer treu el que hi ha a sobre, i després l'arena. Si hi fas una casa, un carrer, un pont o un far, la platja se'n va. Cada **Poble nou** té una platja en un tram de costa, amb algun para-sol, gandules i barques. Les partides desades abans tenien la platja automàtica, i quan les obres, es torna a fer com sortia llavors.

### Energia

En mode **Energia** (tecla <kbd>E</kbd>) hi ha dues coses:

- **Plaques solars.** Clica una casa i hi surten plaques; un altre clic les treu. A les teulades, van planes sobre l'aiguavés que mira més cap al sol. Als terrats, van en dues fileres inclinades sobre uns peus, en lloc de la roba estesa, els testos o la pèrgola. Si el terrat té golfes, van a la teulada de les golfes. Les cases amb plaques no tenen xemeneia, perquè no s'hi toquin. Les torres i les cases amb una escala a sobre no en porten.
- **Aerogeneradors.** Clica la mar i s'hi alça un aerogenerador sobre un pilot clavat al fons, amb una plataforma groga. També es poden posar al cim d'una muntanya de roca, sobre una base de formigó. Les pales giren de cara al vent (el mateix que fa onejar les banderes de la Diada), i de nit fa pampallugues el llum vermell de dalt. Entre dos aerogeneradors hi ha d'haver prou distància perquè les pales no es toquin, i no se'n poden posar als carrers, a les places, a la platja ni sota una volta.

Amb un aerogenerador a sobre, en els altres modes no s'hi pot construir res: primer cal treure'l amb el botó dret. L'única excepció és el mode **Muntanya**: si fas roca on hi ha un aerogenerador, se'n va al cim, i si alces la roca, puja amb ella. Si tens activada l'opció de reduir el moviment al sistema, les pales no giren.

### Mida de la cala

A **Configuració** pots triar la mida de la quadrícula:

| Mida | Cel·les (aprox.) |
|---|---|
| **Normal** | 890 |
| **Mitjana** | 1.700 |
| **Gran** | 3.000 |

En canviar de mida, la cala és la mateixa (la mateixa llavor), però la quadrícula és tota nova. Per això també es genera un poble nou, proporcionat a la mida. Amb <kbd>Ctrl</kbd>+<kbd>Z</kbd> tornes a la cala d'abans. La boira, les ombres i els límits de la càmera s'adapten a la mida.

### Càmera

- **Girar:** arrossega.
- **Moure't:** arrossega amb el botó dret o amb <kbd>Alt</kbd>, fes servir les fletxes o <kbd>WASD</kbd>, o arrossega amb dos dits. Un clic amb el botó dret sense arrossegar treu (vegeu *Treure*).
- **Acostar i allunyar:** roda del ratolí o pessic.

### Configuració

Al final del panell hi ha la secció **Configuració**, plegada: clica'n l'etiqueta per desplegar-la. Hi ha:

- **Ús:** **Només consulta**, per mirar el poble sense poder-lo canviar (vegeu *Només consulta*).
- **Mida de la cala:** normal, mitjana o gran (vegeu *Mida de la cala*).
- **Construcció:** **Places auto.**, perquè els buits envoltats de cases es pavimentin sols.
- **Hora del dia:** dia, nit o automàtic.
- **Escena:** **Quadrícula** mostra o amaga la quadrícula sobre l'aigua, i **Gavines** les fa volar o les atura. Per defecte volen, i l'opció es recorda en aquest navegador.
- **Festes:** **Guarniments de Nadal** guarneix el poble (vegeu *Nadal*), **Diada** hi penja senyeres i estelades (vegeu *Diada*), **Festa Major** l'engalana i **Gegants** hi porta una trobada de gegants (vegeu *Festa Major*). Es poden activar alhora. Per defecte estan desactivats, i també es recorden en aquest navegador.
- **Imatge de la vila:** **Descarrega** desa una imatge PNG del que es veu ara, sense el panell ni el ressaltat del cursor (`cala-AAAAMMDD-HHMM.png`). **Copia** la posa al porta-retalls, per enganxar-la en un missatge o un document. Si el navegador no deixa copiar imatges, ho diu, i llavors cal fer servir Descarrega.
- **Partida:** desar, copiar i carregar partides (vegeu *Partides*).

### Només consulta

Amb **Només consulta** activat, el poble es pot mirar però no canviar. Va bé per ensenyar-lo sense por que algú el toqui.

- La càmera funciona com sempre: girar, moure't i acostar-te, amb el ratolí, el tàctil o el teclat.
- S'amaguen els modes, la paleta, **Treure**, desfer i refer, **Poble nou**, **Cala nova**, **Buidar**, **Places auto.**, la mida de la cala i carregar una partida. El botó dret no treu res, i les tecles que construeixen no fan res. L'hora, la quadrícula, les gavines, les festes i la imatge de la vila sí que es poden canviar, perquè no toquen el poble.
- **Què és cada cosa:** clica qualsevol cel·la i, al costat del cursor, surt una fitxa que diu què hi ha:
  - **Casa:** els pisos, el color, el porxo, el local de la planta baixa, la teulada (i si s'ha triat a mà), si té plaques solars, i si per Nadal o per la Diada està guarnida.
  - **Torre:** campanar o torre de guaita.
  - **Carrer o plaça:** si està enlairat, i si hi ha fanal, gegants, arbre de Nadal, llums o banderetes.
  - **Escala, moll, terrassa, parada del mercat de Nadal o far.**
  - **Volta, pont o embarcador.**
  - **Muntanya de roca:** amb l'alçada, i si al cim hi ha un far o un aerogenerador.
  - **Platja:** amb el que hi ha a sobre.
  - **Aerogenerador**, a la mar.
  - **Canal o mar.**

  La fitxa s'amaga sola al cap d'una estona, en moure la càmera, clicant el cel o amb <kbd>Esc</kbd>.

A dalt del panell surt una franja que recorda que estàs en mode consulta, amb el botó **Surt**. L'opció es recorda en aquest navegador.

### Nadal

Amb **Guarniments de Nadal** activat:

- **Cases:** més o menys una de cada tres té una garlanda de bombetes sota el ràfec, per les façanes que donen a fora.
- **Carrers:** als carrers que passen entre dues cases prou altes, hi ha una tira de llums penjada d'una façana a l'altra, amb una estrella al mig.
- **Arbres de Nadal:** n'hi ha un per cada quinze places o carrers plans, com a mínim un i mai dos de tocar. Primer van a les places. Tenen boles, una espiral de llums i una estrella al capdamunt.

#### Mercat de Nadal

Amb els guarniments activats, sota els modes apareix el botó **Mercat de Nadal** (tecla <kbd>0</kbd>). Cada clic en un carrer o una plaça plans hi posa una parada. A l'aigua, hi fa el terra i tot. Clicant les cel·les del costat el mercat creix:

- les parades veïnes s'enllacen amb tires de llums;
- cada parada es gira cap a una altra parada, i així queda un passadís al mig.

Les parades són casetes de fusta amb teulada de ratlles vermelles i blanques, que fa de tendal. Tenen llums sota el ràfec i, al taulell, molsa, figures i tions; de vegades, també un tió gros o avets per vendre al davant. No es poden posar a la roca, en una escala ni sota una volta. Una casa a sobre treu la parada, i el botó dret també.

Les parades es desen a la partida. Si desactives els guarniments, no es veuen ni es poden treure amb el botó dret, però no es perden: tornen a sortir quan els tornes a activar.

Les llums de cada casa o carrer són blanques o de colors. De dia es veuen apagades, i de nit s'encenen. Quines cases, carrers i places es guarneixen depèn de cada cel·la: sempre són les mateixes. L'opció de guarnir no es desa a la partida, però les parades del mercat sí.

### Diada

Amb **Diada** activat, com l'Onze de Setembre, més o menys un 45 % de les cases pengen la senyera o l'estelada (meitat i meitat, més o menys):

- **Balcons:** la bandera penja per davant de la barana.
- **Finestres:** penja de l'ampit, sobre la façana.
- **Terrats:** en un pal, en un racó del terrat. Les torres de guaita també en tenen una al capdamunt.

Cada casa en penja una, i les més grans, de vegades, dues. Primer es tria un balcó o el terrat, i si no n'hi ha, una finestra. Una casa d'un sol pis la penja d'una finestra de la planta baixa, més curta perquè no toqui el carrer. Una casa de dins de l'illa, sense cap façana a fora, la penja d'un pal al capdamunt de la teulada.

Les banderes dels pals onegen totes cap al mateix costat, com si fes vent. Quines cases en pengen, quina bandera i on depèn de cada cel·la: sempre són les mateixes. Es pot activar alhora que els guarniments de Nadal. L'opció no es desa a la partida.

### Festa Major

Amb **Festa Major** activat:

- **Damassos:** més o menys un 30 % dels balcons tenen un damàs penjat de la barana. Són granats, vermells, blaus o de color crema, amb la vora i un rombe al mig, d'or o de color, i serrell a baix.
- **Banderetes:** els carrers que passen entre dues cases prou altes tenen dues tires de banderetes de colors d'una façana a l'altra.

Funciona amb les altres dues festes:

- **Nadal:** els llums de Nadal van al mig del carrer, i les banderetes, a banda i banda.
- **Diada:** un balcó que té damàs no hi penja la bandera; la casa la posa en un altre lloc.

Quins balcons i carrers s'engalanen depèn de cada cel·la: sempre són els mateixos. L'opció no es desa a la partida.

#### Gegants

Els gegants tenen el seu propi botó, **Gegants**, a **Configuració → Festes**. Per defecte està apagat, i es recorda en aquest navegador. No depèn de la Festa Major: es poden treure els gegants amb la festa o sense.

Tots van junts, com en una trobada de gegants:

- **On:** a la plaça on hi ha més carrer pla al voltant, i a les cel·les planes del costat.
- **Quants:** dos a cada cel·la, el rei i la reina amb corona d'or, i com a molt 8. Si la plaça és petita, n'hi ha menys.
- **Com:** tots miren cap al mig del grup.
- **Amb Nadal:** no es posen on hi ha un arbre de Nadal.

### Dreceres de teclat

| Tecla | Acció |
|---|---|
| <kbd>1</kbd>–<kbd>4</kbd> | Cases, Carrers, Voltes, Pintar |
| <kbd>5</kbd>–<kbd>9</kbd> | Ponts, Molls, Fars, Escales, Muntanya |
| <kbd>B</kbd> | Locals: bars, restaurants, botigues i hotels |
| <kbd>L</kbd> | Platja |
| <kbd>T</kbd> | Teulades |
| <kbd>E</kbd> | Energia: plaques solars i aerogeneradors |
| <kbd>0</kbd> | Mercat de Nadal (amb els guarniments activats) |
| <kbd>X</kbd> | Activa o desactiva *Treure* |
| <kbd>Ctrl</kbd>+<kbd>Z</kbd> · <kbd>Ctrl</kbd>+<kbd>Maj</kbd>+<kbd>Z</kbd> | Desfés · refés |
| <kbd>G</kbd> | Mostra o amaga la quadrícula |
| <kbd>P</kbd> | Places automàtiques |
| <kbd>N</kbd> | Dia, nit o automàtic |
| <kbd>Esc</kbd> | Tanca el panell de partida |

## Què hi trobaràs

- **Una quadrícula irregular.** Es parteix d'una malla de triangles, s'aparellen a l'atzar, se subdivideix tot en quadrilàters i es relaxa. Així la graella no és quadrada, però tampoc es veuen els triangles.
- **Cases amb caràcter:**
  - Finestres amb marc i ampit i porticons oberts o tancats.
  - Balcons de forja, portes amb arc i sòcol pintat.
  - Buguenvíl·lees que s'enfilen per les façanes.
  - Teulades a quatre, a dues i a una aigua, amb xemeneies; terrats amb pèrgola, amb barana i roba estesa o amb golfes; i cantonades arrodonides.
- **Voltes i porxos:** voltes entre cases enfrontades, i cases amb la planta baixa porxada per fer carrers i places amb porxos.
- **Torres:** una casa alta i aïllada es converteix en un campanar o en una torre de guaita amb merlets.
- **Places automàtiques:** un buit envoltat de tres cases es pavimenta sol, amb testos, bancs, fanals i arbres (xiprers, pins pinyoners i oliveres). Entre dos fanals sempre hi ha com a mínim una cel·la, també als molls i als ponts.
- **Platja:** feta a mà, amb para-sols, gandules, llaüts, patins de vela, la cadira del socorrista i castells de sorra.
- **Canals i ports:**
  - Ponts de pedra amb esquena d'ase.
  - Molls de carreus amb norais, caixes de peix i xarxes.
  - Fars a la punta dels espigons, o posats a mà en illots i places.
  - Barques que es bressolen amb les onades.
- **Dia i nit:**
  - El cel canvia de color i a la posta es tenyeix de taronja.
  - De nit hi ha estrelles i lluna, i s'encenen les finestres, els fanals i els fars.
  - El mode automàtic fa passar un dia sencer en 6 minuts.
- **Muntanyes de roca** amb pendents, mates i pins, on també es pot construir.
- **Energia:** plaques solars a les teulades i als terrats, i aerogeneradors a la mar o a la muntanya, amb les pales que giren.
- **La Diada** opcional, amb senyeres i estelades als balcons, les finestres i els terrats.
- **La Festa Major** opcional, amb damassos als balcons i banderetes als carrers, i una trobada de gegants a la plaça.
- **Guarniments de Nadal** opcionals: garlandes, llums als carrers, arbres a les places i un mercat de Nadal que pots fer créixer.
- **Gavines** que volten la cala. Les pots aturar a **Configuració**.

## Partides

La partida es desa sola al navegador (`localStorage`). Amb el botó **Partida…**, a la secció **Configuració**, pots:

- copiar-la com a text,
- baixar-la com a fitxer `.cala`,
- carregar-ne una d'enganxada o d'un fitxer.

Una partida és una sola línia de text, i ocupa uns quants kB. Conté la llavor i la mida de la cala, que és determinista i es torna a generar igual, i un caràcter per cel·la per a cada camp. Les partides desades amb versions anteriors (sense ponts, molls, mida, fars, escales, roca, mercat, bars, porxos, platja, teulades triades, aerogeneradors o plaques solars) es continuen carregant.

## Estructura del codi

```
index.html        estructura del panell
estils.css        estils del panell
js/
  base.js              utilitats, paleta de colors i mides
  quadricula.js        la quadrícula irregular
  geometria.js         parets, finestres, vegetació, mobiliari, torres
  platja-ponts.js      platja (l'arena i el que hi ha a sobre) i ponts
  port.js              molls, norais, fars, illots i barques amarrades
  muntanya.js          terreny de roca, amb pendents i vegetació
  nadal.js             guarniments de Nadal: llums, arbres i mercat
  bars.js              locals: bars, restaurants (amb terrassa), botigues i hotels
  diada.js             la Diada: senyeres i estelades a balcons, finestres i terrats
  festa.js             la Festa Major: damassos, banderetes i gegants
  cobertes-carrers.js  cantonades, voltes, cobertes, carrers i escales
  teulades.js          tipus de teulades (quatre, dues i una aigua) i de terrats (ampit, barana, golfes)
  energia.js           aerogeneradors (a la mar o a la muntanya) i plaques solars
  consulta.js          només consulta: la fitxa que diu què és cada element
  poble.js             estat del poble, anàlisi i construcció de la malla
  escena.js            llums, mar, barques, gavines, dia i nit
  controls.js          ressaltat, càmera, ratolí i tàctil, botons, teclat
  partida.js           desar, desfer i exportar
  main.js              bucle d'animació i arrencada
```

Els scripts comparteixen les variables globals i s'han de carregar en l'ordre d'`index.html`. El codi que s'executa en carregar un fitxer només pot fer servir el que ja s'ha carregat abans. Si afegeixes un fitxer nou, posa'l després dels fitxers que fa servir.

Tota la geometria es genera per codi: no hi ha models ni textures. Cada vegada que canvia el poble, es torna a construir la malla sencera. Les variacions (colors de porticons, on van les finestres, quin arbre surt…) surten d'un *hash* de la posició de cada cel·la. Per això el mateix poble es veu sempre igual, i afegir una casa no canvia les que no hi toquen.

## Inspiració

La idea de la quadrícula irregular i del poble que es construeix sol ve de [Townscaper](https://www.townscapergame.com/), d'Oskar Stålberg. L'ambientació, la geometria i el codi són propis d'aquest projecte.
