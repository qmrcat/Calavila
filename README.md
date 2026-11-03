# Calavila

Constructor de pobles mediterranis ambientat a la Costa Brava. Cliques sobre l'aigua i hi creixen cases emblanquinades amb teulades de teula àrab, carrerons amb escales, voltes, ponts sobre canals, molls amb far i barques amarrades. Tot es genera sol a partir d'on poses cada bloc.

Està fet amb JavaScript pur i [three.js](https://threejs.org/) r128, sense cap pas de compilació.

## Com s'obre

Obre `index.html` al navegador. No cal cap servidor: els scripts no són mòduls i funcionen directament des del disc.

Cal connexió a internet la primera vegada, perquè three.js es carrega des de la CDN de cdnjs.

## Com es juga

Tria un mode al panell i clica sobre la quadrícula. En els modes que tenen condicions (voltes, ponts, molls), la cel·la sota el cursor es pinta de verd si s'hi pot construir i de vermell si no.

| Mode | Què fa |
|---|---|
| **Cases** | Cada clic afegeix un pis. Les cases veïnes de la mateixa alçada comparteixen teulada. |
| **Carrers** | Pavimenta una cel·la. Si hi tornes a clicar, l'enlaires, i les cel·les del costat es tornen escales soles. |
| **Voltes** | Fa una volta sobre un carrer que tingui cases de dos pisos o més a banda i banda. |
| **Ponts** | Posa un pont de pedra sobre un canal. Amb terra a una sola banda, fa d'embarcador. |
| **Molls** | Fa un moll de port sobre l'aigua que toca la costa. A la punta d'un espigó hi surt un far, i al costat, barques amarrades. |
| **Pintar** | Canvia el color de la façana de les cases que ja hi ha. |

Per treure, fes <kbd>Maj</kbd>+clic o activa el botó **Treure** (al mòbil no hi ha <kbd>Maj</kbd>).

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
- **Moure't:** arrossega amb el botó dret o amb <kbd>Alt</kbd>, fes servir les fletxes o <kbd>WASD</kbd>, o arrossega amb dos dits.
- **Acostar i allunyar:** roda del ratolí o pessic.

### Dreceres de teclat

| Tecla | Acció |
|---|---|
| <kbd>1</kbd>–<kbd>6</kbd> | Cases, Carrers, Voltes, Ponts, Molls, Pintar |
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
  - Fars i barques que es bressolen amb les onades.
- **Dia i nit:**
  - El cel canvia de color i a la posta es tenyeix de taronja.
  - De nit hi ha estrelles i lluna, i s'encenen les finestres, els fanals i els fars.
  - El mode automàtic fa passar un dia sencer en 6 minuts.
- **Gavines** que volten la cala.

## Partides

La partida es desa sola al navegador (`localStorage`). Amb el botó **Partida…** pots:

- copiar-la com a text,
- baixar-la com a fitxer `.cala`,
- carregar-ne una d'enganxada o d'un fitxer.

Una partida és una sola línia de text, i ocupa uns quants kB. Conté la llavor i la mida de la cala, que és determinista i es torna a generar igual, i un caràcter per cel·la per a cada camp. Les partides desades amb versions anteriors (sense ponts, sense molls o sense mida) es continuen carregant.

## Estructura del codi

```
index.html        estructura del panell
estils.css        estils del panell
js/
  base.js              utilitats, paleta de colors i mides
  quadricula.js        la quadrícula irregular
  geometria.js         parets, finestres, vegetació, mobiliari, torres
  platja-ponts.js      platja i ponts
  port.js              molls, norais, far i barques amarrades
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
