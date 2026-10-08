# Trängseln: ingen går igenom någon

**Leverans** 2026-10-08 · **Till** Claude Code · **Från** Claude Design · **Gäller** D9 (`nexus-leverans-2026-10-07-d9-livet-vid-luckan` och `…-d9-tillagg`), och samma fel i restaurangerna

Gäster och personal gick igenom varandra vid vagnen, precis som i restaurangerna. Det är rättat i D9:s prototyp, och regeln står i `personalSpace.ts` så att samma sak kan läggas in i rummen. Kontrollbilderna är i 1440 × 900 och 1280 × 720.

| Fil | Var | Vad |
|---|---|---|
| `personalSpace.ts` | monteras för alla figurer | **Ny.** Väja, hålla till höger och knuffas isär, med mått och massor. |
| `prototyp/Livet vid luckan.html` | läses | D9 med tillägget och trängseln. |
| `kontrollbilder/1440x900/`, `kontrollbilder/1280x720/` | — | Tre bilder per storlek. |

## Regeln

Den gäller varje bild, i den här ordningen:

1. **Väja.** Den som går saktar in när någon står eller går inom 0,85 m framför.
   - Bakom någon som går åt samma håll stannar man helt vid 0,55 m och följer efter.
   - Mötande eller korsande saktar ned till 20 % men stannar aldrig, för annars låser de varandra.
2. **Hålla till höger.** På gångvägen och gatorna går man 0,3 m till höger om mittlinjen, så att de som möts går förbi varandra. Det tonas in och ut över 1,2 m.
3. **Knuffas isär.** Om två ändå kommer närmare än 0,5 m flyttas de isär.
   - Den som rör sig ger efter. Den som äter, sitter eller står i kön flyttas minst.
   - Förskjutningen är högst 0,55 m och tonar bort när det är fritt.
   - Händerna följer med, men inte det som står på bordet.

Personalen i vagnen räknas inte mot dem utanför. Medhjälparen som tänder marschallerna räknas, och väjer för gästerna.

## Kontrollen

D9:s prototyp har körts 4 000 bilder (2 min 13 s) per skärm och väder: sol, regn, blåst och sval kväll, kvällen, de som äter och de nyfikna.

- **Förut:** figurerna kom ned till 0,00 m från varandra, alltså rakt igenom. Det hände oftast på gångvägen och mellan dem som gick från luckan till borden.
- **Nu:** ingen kommer närmare en annan än 0,38 m, mätt mellan figurernas mitt. På skärmen *De som äter* var tre bilder närmare än så, men aldrig under 0,27 m.

Två fel i prototypen är rättade på vägen:
- Gamla förskjutningar följde med när man bytte skärm.
- Tiden kunde gå baklänges vid ett byte.

## Restaurangerna

Rummen behöver samma tre delar. I vinbaren är gångarna 0,88 m (`wineBarHouse.ts`), och där räcker inte hålla till höger, men väja och knuffas isär gäller. Om spelet redan har ett navmesh med undanmanöver kan Code behålla det och lägga på del 3 som sista skydd.

## Kontrollbilder (båda storlekarna)

| Bild | Vad den visar |
|---|---|
| 01 | Livet vid luckan på 12 m: kön, borden och gångvägen med folk åt båda hållen. |
| 02 | De som äter: två vid sopkorgen samtidigt, var och en på sin plats. |
| 03 | Sval kväll vid värmaren: platserna runt värmaren och kön med armarna i kors. |
