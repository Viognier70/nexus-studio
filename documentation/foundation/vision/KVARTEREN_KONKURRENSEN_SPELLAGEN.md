# Kvarteren, konkurrensen och spellägena

Vision Owner: Anders Crichton-Fock, 11 oktober 2026. Skriven av Claude efter Anders provspel.
Kunskapsbegreppen följer kunskapstriaden (Crichton-Fock, tidigare Herdenstam).

Det här dokumentet är riktningen för spelets nästa stora steg. Det byggs i etapper (avsnitt 6). Varje etapp ska gå att spela och vara färdig innan nästa börjar.

---

## 1. Grundtanken

Restaurangerna ligger på olika platser i Grythyttan. De skiljer sig i yta, storlek och karaktär, och kvarteren skiljer sig i vilka gäster som finns där. Under samma service tävlar spelaren mot andra i samma kvarter, både AI-styrda restauranger och, längre fram, riktiga spelare.

I kvarteren märks kunskapen tydligast. Den som kan sitt ämne lockar de kräsna gästerna, som betalar mer. Den som inte kan det får hålla sig till lågt pris och stora volymer.

Det följer konstitutionen: simuleringen skapar problemen och kunskapen löser dem, och kunskap är kapital. Grundregeln från 11 oktober gäller också. Allt syns i spelet: kön utanför konkurrentens dörr, de tomma borden hos den som satte fel pris och gästerna som går förbi.

## 2. Kvarteren

Det här är förslag. Anders bekräftar namn och gränser, och Code knyter dem till byns karta. Alla tal sätts i balance.ts.

| Kvarter | Gäster | Plånbok | Kräsenhet | Bästa tider |
|---|---|---|---|---|
| Studentkvarteret (Prästgatan, Magasinsgatan) | Studenter, unga | Liten | Låg till medel, nyfikna | Lunch, AW, nattliv, terminstid |
| Torget | Blandat: bybor, förbipasserande, marknadsbesökare | Medel | Medel | Lunch, helger, marknadsdagar |
| Gästgivaregården och kyrkan | Kulturturister, gäster på hotellet | Stor | Hög | Frukost (hotellet), middag, sommar |
| Campus och Måltidens hus | Lärare, konferenser, besökare | Medel till stor | Hög inom ämnet | Lunch, kurs- och konferensdagar |
| Vid sjön | Familjer, badgäster, båtfolk | Medel | Låg | Sommardagar, fint väder |

**Så väljer en gäst:** gästen väger kvaliteten, det vill säga kunskapen och hur den syns i rätten och servicen, mot priset och ryktet. Två saker skiljer kvarteren åt.
- **Kräsenheten** bestämmer hur mycket kvaliteten väger. Vid Gästgivaregården räcker inte ett lågt pris om rätten inte håller. I studentkvarteret räcker det ofta.
- **Plånboken** bestämmer hur mycket priset väger. Studenterna kommer i mängd men har lite att röra sig med.

**Lokalerna:** varje kvarter har några lokaler med olika yta, antal platser, kök och karaktär. Det kan vara en källare, ett glasat hörn eller ett gammalt bageri. Konstitutionens regel om lokaler som kan byggas om gäller.

**Foodtrucken** kan parkeras på olika platser. Spelaren väljer plats för kvällen eller veckan, och valet syns i världen: vagnen står där och kön bildas där. Varje plats har kvarterets gäster, men också ett tillstånd, en avgift och sitt väder och läge. Platsvalet är ett omdöme som kräver att spelaren läser kvarteret.

## 3. Konkurrenterna (AI)

AI-restaurangerna går genom samma simulering som spelaren och har samma kostnader, personal och kunskap. De fuskar inte. Varje AI har en egen profil, till exempel:
- **Prisbrytaren:** lågt pris och hög volym. Stark i studentkvarteret.
- **Kvalitetskrogen:** hög kunskap och högt pris. Stark vid Gästgivaregården.
- **Trendjägaren:** byter meny ofta och har kort livslängd.
- **Den trogna kvarterskrogen:** stabil, med stamgäster och ett långsamt växande rykte.

AI:n lär sig av kvarteret. Tappar den gäster ändrar den pris eller meny, och spelaren ser ändringen på konkurrentens tavla.

## 4. Spellägena

### 4a. En spelare mot AI
- Spelaren och AI-restaurangerna delar byn.
- **Konkurs och exekutiv auktion:** en restaurang som inte kan betala går i konkurs. Lokalen och inventarierna säljs på exekutiv auktion till den som bjuder högst, spelare eller AI. Den som köper kan växa med fler lokaler, fler kvarter och en starkare ställning.
- **Slutmålet:** när bara en ägare finns kvar är spelet vunnet.
- Konstitutionens poäng ligger kvar: portfolion dokumenterar hur spelaren kom dit. Den som vinner med omdöme får en annan profil än den som vinner med dumpade priser.

### 4b. Flera spelare
- Flera spelare i samma by. Lokaler som ingen spelare tar styrs av AI.
- **Samarbete mellan spelare är tillåtet,** till exempel att några tillsammans sänker priserna under några servicar för att tömma de andras restauranger.
- **Simuleringen svarar som verkligheten:** dumpade priser kostar råvaror och personal, och gästerna lär sig att vänta på reapriset.
- **Förslag ⚖:** priser som konkurrenter kommer överens om är en kartell enligt konkurrenslagen. Spelet kan låta Konkurrensverket reagera: risken för granskning ökar när flera spelare samordnar sina priser. Strategin blir då ett verkligt omdöme (phronesis) och inte en gratis genväg. Anders beslutar, och en jurist granskar texten.

### 4c. Online, en levande värld
- Alla kan spela mot alla. Man kan äga restauranger och foodtrucks eller investera i andras.
- **Dygnet följer klockan:** frukost (hotellet), lunch, AW, middag och nattliv i realtid efter svensk tid.
- **När ägaren inte är inloggad** går restaurangen vidare på ägarens beslut:
  - meny, priser, öppettider och schema;
  - personalens kunskap och lojalitet;
  - de meriter som redan finns.
  Ett rykte som inte vårdas sjunker långsamt. Det är rättvist mot den som är inloggad och sant mot verkligheten: en krog utan närvarande ägare tappar skärpa.
- **En ny spelare kan utmana.** Den kan öppna en restaurang med kunskapskredit, och om kunskapen syns tar den gäster från en etablerad krog medan ägaren är borta.
- **Rapporten vid inloggning:** när ägaren loggar in får hen en rapport om vad som har hänt. Hur många gäster kom, vart gick de som valde en annan krog, och varför? Spelaren ska förstå följderna och inte bara se en siffra.
- **Meddelanden mellan spelare,** med krav på blockering, anmälan och moderering. Spelet kan användas i utbildning, så ålder, GDPR och samtycke till forskning måste vara lösta innan det öppnas.

## 5. Vad det kräver tekniskt

- **Simuleringen måste kunna köras på en server.** Det betyder ingen koppling till bildskärmen, ett tillstånd som kan sparas och skickas, och slump som styrs av ett frö. Annars går det inte att spela mot andra, och det går inte att fuska fritt.
- **Backend: Supabase** (Anders beslut 11 oktober 2026, kontot finns redan).
  - Supabase sköter konton och inloggning, databasen (Postgres) för världen, restaurangerna och portfolion, realtid för meddelanden och uppdateringar, och radnivåsäkerhet (RLS) så att var och en bara når sitt eget.
  - Simuleringens takt, alltså dygnet och servicarna, körs på servern. Det kan vara en Edge Function på schema eller en liten worker. Klienten skickar bara spelarens beslut.
  - Projektet ska ligga i en region inom EU, på grund av GDPR och användningen i utbildning.
  - Den hemliga nyckeln (sb_secret_… eller service_role) får bara finnas på servern. Den får aldrig ligga i frontend, i git eller i en rapport. Frontend använder bara den publika nyckeln tillsammans med RLS.
- **Etapp 1–2 kräver ingen server.**

## 6. Etapperna

| Etapp | Innehåll | Kräver |
|---|---|---|
| **0. Förberedelse** (nu, parallellt) | Granska om simuleringen kan köras på en server. Bara en rapport. | Inget nytt |
| **1. Kvarteren** | 3–5 kvarter med gäster, plånbok och kräsenhet. Foodtrucken kan parkeras på olika platser. Lokalerna skiljer sig åt. Gästerna väljer efter kvalitet, pris och rykte. | Code, plus Design för lokalerna |
| **2. AI-konkurrenter** | 2–4 AI-krogar med profiler i samma kvarter, under samma service. Synliga köer, tavlor och priser. | Code |
| **3. Konkurs och auktion** | Konkurs, exekutiv auktion och att äga flera verksamheter. Slutmålet för en spelare. | Code |
| **4. Flera spelare** | Server, samma by för flera, AI i tomma lokaler, meddelanden. | Supabase |
| **5. Online** | Realtid, frånvarande ägare, rapporten vid inloggning, moderering. | Etapp 4, plus juridik och GDPR |

Etapp 1 börjar när vinbarens 306c och fikat är på plats (ORDER 329–330).
