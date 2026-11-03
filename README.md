# Calavila

Constructor de pobles mediterranis ambientat a la Costa Brava. Cliques sobre l'aigua i hi creixen cases emblanquinades amb teulades de teula àrab, carrerons amb escales, voltes, ponts sobre canals, molls amb far i barques amarrades. Tot es genera sol a partir d'on poses cada bloc.

Està fet amb JavaScript pur i [three.js](https://threejs.org/) r128, sense cap pas de compilació.

## Com s'obre

Obre `index.html` al navegador. No cal cap servidor: els scripts no són mòduls i funcionen directament des del disc.

Cal connexió a internet la primera vegada, perquè three.js es carrega des de la CDN de cdnjs.

## Com es juga

Tria un mode al panell i clica sobre la quadrícula. Els modes van en dos grups: el primer, per fer el poble (**Cases**, **Carrers**, **Voltes**, **Pintar**), i el segon, per a les obres i el relleu (**Ponts**, **Molls**, **Fars**, **Escales**, **Muntanya**). En els modes que tenen condicions, la cel·la sota el cursor es pinta de verd si s'hi pot construir i de vermell si no.

| Mode | Què fa |
|---|---|
| **Cases** | A l'aigua, el primer clic fa el terreny i el segon, la casa. Després, cada clic hi afegeix un pis. Les cases veïnes de la mateixa alçada comparteixen teulada. |
| **Carrers** | Pavimenta una cel·la. Si hi tornes a clicar, l'enlaires un nivell. |
| **Voltes** | Fa una volta sobre un carrer que tingui cases de dos pisos o més a banda i banda. |
| **Pintar** | Canvia el color de la façana de les cases que ja hi ha. |
| **Ponts** | Posa un pont de pedra sobre un canal. Amb terra a una sola banda, fa d'embarcador. |
| **Molls** | Fa un moll de port sobre l'aigua que toca la costa. A la punta d'un espigó hi surt un far, i al costat, barques amarrades. |
| **Fars** | Posa un far on vulguis. A l'aigua, s'alça damunt d'un illot de roca; en un carrer, una plaça o un moll plans, s'hi aguanta a sobre. No en pot anar cap en una escala ni sota una volta. |
| **Escales** | Posa una escala que puja un nivell des d'un lloc pla: un carrer, un terrat o el cap d'una altra escala (vegeu *Escales*). |
| **Muntanya** | Fa terreny de roca. Si hi tornes a clicar, l'alça un nivell. Les roques veïnes fan muntanya, i a sobre s'hi poden fer cases (vegeu *Muntanya*). |

### Treure

Per treure, fes clic amb el **botó dret**, sigui quin sigui el mode. Es treu el que hi ha més amunt de la cel·la, en aquest ordre:

1. l'escala de sobre una casa;
2. un pis de la casa (quan no en queden, hi torna a quedar el terreny);
3. la volta;
4. el far;
5. l'escala;
6. el pont;
7. un nivell del terreny, i a la fi el terreny mateix, que torna a ser aigua.

<kbd>Maj</kbd>+clic i el botó **Treure** fan el mateix (al mòbil no hi ha botó dret). L'única excepció és el mode **Pintar**, on tornen la façana al color automàtic.

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

Les cases d'on arrenca o on arriba una escala tenen terrat en lloc de teulada, i l'ampit s'obre per on s'hi passa. Si a una casa amb una escala a sobre li poses o li treus un pis, l'escala desapareix.

Els graons són de llosa, amb el nas que sobresurt. Si l'escala dona a un lloc més baix, té murets emblanquinats amb albardilla, i arran de casa hi pot haver algun test.

### Muntanya

En mode **Muntanya**, cada clic a l'aigua fa una roca, i cada clic més l'alça un nivell. Un carrer, una plaça o un moll també es poden tornar roca, al nivell que tenien.

La roca no fa esglaons: cada cantó pren l'alçada mitjana de les cel·les que s'hi troben, i les roques veïnes fan un sol pendent. Cap a l'aigua, la roca s'hi enfonsa. Una roca alta i sola fa una agulla; unes quantes de nivells diferents, una muntanya. A dalt hi ha mates, roques soltes i algun pi o olivera. Les parts planeres són més verdes, i les dretes, de roca nua: rovellada a baix i grisa de granit a dalt.

A sobre s'hi pot construir:

- **Cases:** en mode **Cases**, el primer clic sobre la roca ja fa la casa. La casa s'aixeca plana al nivell de la roca, i si la treus, la roca hi torna a quedar.
- **Fars:** van al cim, sobre un sòcol de pedra.
- **Carrers:** en mode **Carrers**, una roca es torna carrer al mateix nivell. Així s'obren camins i placetes a la muntanya, d'on poden arrencar les escales. Per la roca mateixa no s'hi camina, i no hi arrenca cap escala.

El botó dret la baixa un nivell, i a nivell zero la torna aigua. Sobre la roca no s'hi fan voltes soles.

Cada **Poble nou** té un turó de roca a tocar del poble, a l'altra banda de la platja, i de vegades un mas al cim.

### Mida de la cala

Al panell pots triar la mida de la quadrícula:

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

### Dreceres de teclat

| Tecla | Acció |
|---|---|
| <kbd>1</kbd>–<kbd>4</kbd> | Cases, Carrers, Voltes, Pintar |
| <kbd>5</kbd>–<kbd>9</kbd> | Ponts, Molls, Fars, Escales, Muntanya |
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
  - Xemeneies, terrats amb pèrgola i cantonades arrodonides.
- **Torres:** una casa alta i aïllada es converteix en un campanar o en una torre de guaita amb merlets.
- **Places automàtiques:** un buit envoltat de tres cases es pavimenta sol, amb testos, bancs, fanals i arbres (xiprers, pins pinyoners i oliveres).
- **Platja:** a cada cala, un tram de costa té arena, para-sols i alguna barca varada.
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
- **Gavines** que volten la cala.

## Partides

La partida es desa sola al navegador (`localStorage`). Amb el botó **Partida…** pots:

- copiar-la com a text,
- baixar-la com a fitxer `.cala`,
- carregar-ne una d'enganxada o d'un fitxer.

Una partida és una sola línia de text, i ocupa uns quants kB. Conté la llavor i la mida de la cala, que és determinista i es torna a generar igual, i un caràcter per cel·la per a cada camp. Les partides desades amb versions anteriors (sense ponts, molls, mida, fars, escales o roca) es continuen carregant.

## Estructura del codi

```
index.html        estructura del panell
estils.css        estils del panell
js/
  base.js              utilitats, paleta de colors i mides
  quadricula.js        la quadrícula irregular
  geometria.js         parets, finestres, vegetació, mobiliari, torres
  platja-ponts.js      platja i ponts
  port.js              molls, norais, fars, illots i barques amarrades
  muntanya.js          terreny de roca, amb pendents i vegetació
  cobertes-carrers.js  cantonades, voltes, cobertes, carrers i escales
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
