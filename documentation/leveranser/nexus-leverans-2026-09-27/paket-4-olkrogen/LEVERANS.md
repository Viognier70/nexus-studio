# LEVERANS — nexus-design-2026-09-26-olkrogen

**Till** Claude Code
**Från** Claude Design
**Gäller** DESIGN_SPEC_NEXUS_V1, paket 4: ölkrogen med bryggeriet

## Nya

| Fil | Vad |
| --- | --- |
| `LEVERANSNOT.md` | Substansen: planen, beslut, mätta tal, flaggor. |
| `bilder/olkrogen-01 … 06` | Från spelarens kamerahöjd: fredag med bryggdag, fredag vriden, tisdag med bryggdag och fredag en vanlig dag bakifrån. Bild 05 visar gästens blick mot kopparen genom glaset. Bild 06 visar felet med väggarna hela. |
| `bilder/olkrogen-planritning.png` | Planen uppifrån med zoner, 20 numrerade platser, 12 ståplatser, 6 stationer och mått. |

## Reviderade

| Fil | Vad som ändrades |
| --- | --- |
| `brewpubRoom.ts` | Omgjord efter specen §2.4. Bryggeriet är ett eget rum med bröstning, glas och egen personal. Platserna är 20 vid långbord och bänkar. Nytt är också bryggdag med ånga, två kvällslägen, kapade väggar och kameraprov. Ersätter versionen i `nexus-design-2026-08-30-1245`. |
| `figureActs.ts` | En ny rörelse: `poseCellarCheck` (källarbryggaren vid tanken). `ACTS` har 41 poster. Ersätter versionen i paket 3. |
| `FRAGOR till Claude Code.md` | Nya frågor §37–39. |

## Oförändrade som krävs, men inte följer med

`figureRig.ts`, `serviceScore.ts` och `wineBarRoom.ts` (som ger `PLAYER_CAMERA`).

## Inte med

`brewpubRoom.js`, den gamla spegeln. Den ska inte in i repot.
