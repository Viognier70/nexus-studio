# Nexus v1 — öppna frågor

**Ordern** `documentation/orders/ORDER_NEXUS_V1_HELA_SPELET.md` §1.5
**Speldesign** `documentation/foundation/vision/NEXUS_SPELDESIGN_V1.md`

Här står varje beslut som speldesignen inte täcker och som en etapp har fattat för att kunna fortsätta. Alla beslut här går att ändra senare: talen ligger i `frontend/src/sim/balance.ts`, där motsvarande grupp har samma nummer i `openQuestion`. Beslut som inte går att ändra senare stoppar etappen i stället och hamnar inte här.

Vision Owner svarar genom att skriva sitt beslut under **Svar**. Svaret förs sedan in i speldesignen och i `balance.ts`.

| Nr | Etapp | Fråga | Vald tolkning | Var |
| --- | --- | --- | --- | --- |
| F1 | 0 | Gästfaktor per veckodag. Speldesignen: "Måndag är lugn, fredag och lördag är tunga." | mån 0,7 · tis 0,8 · ons 0,9 · tor 1,0 · fre 1,3 · lör 1,4 · sön 0 (stängd) | `WEEK.guestFactor` |
| F2 | 0 | Gäller en högtid hela veckan eller vissa dagar, och hur mycket ändras gästflödet? | Midsommar fre–lör ×1,5 · Grythyttedagarna fre–lör ×1,6 · Vinprovning tor–lör ×1,2 · Kräftskiva lör vecka 8 ×1,8 ("säsongens sista och största kväll") | `HOLIDAYS.list` |
| F3 | 0 | "Fem procents ränta": per år, per vecka eller på hela lånet? | 5 % av lånebeloppet över säsongen, lika fördelat på de åtta veckorna. Årsränta hade blivit under en procent på åtta veckor och inte märkts. | `LOAN.interestRate` |
| F4 | 0 | Marknadstaket, "3 procentenheter per medaljsteg": summeras stegen över alla paviljonger eller räknas bara huvudpaviljongen? | Summa över alla paviljonger. Med fem paviljonger på platina blir taket 20 % + 20 × 3 = 80 %. | `MARKET` |
| F5 | 0 | "Första veckan har färre gäster" — hur många färre? Vecka 1 är också midsommar med hög efterfrågan. | Första veckan ×0,7 på alla dagar. Faktorerna multipliceras, så midsommarhelgen ger 0,7 × 1,5 ≈ 1,05 av en vanlig helg. | `INTRODUCTION.firstWeekGuestFactor` |
| F6 | 0 | Teatern har inga bronsfrågor. Vad ska dess prov visa tills Vision Owner har skrivit frågor? | Inget i etapp 0. Frågan avgörs i etapp 2: förslaget är att Teaterns prov blandar två andra paviljongers frågor, eftersom "Teaterns frågor kombinerar två områden". | `questionBank.ts` `questionsFor` |
| F7 | 0 | Vem ställer frågan? Speldesignen nämner Bibliotekarien och Köksmästaren, men bronsbanken har frågeställarna kock, sommelier, gäst, värd, servitör och lärling. | Bronsbankens frågeställare behålls. De nya rollerna läggs till när frågeställaren visas i etapp 11. | `bank.meta.json` `asker` |
| F8 | 0 | Klassens "normala veckointäkt" (grund för golvet) och startlånet per klass saknar tal i speldesignen. | Inget valt ännu. Talen sätts i etapp 3 och förs in här. | — |

## Svar

*(tomt)*
