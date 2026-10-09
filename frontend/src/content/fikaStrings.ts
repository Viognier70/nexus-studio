// ORDER 316 — fikat efter stängning: spelartexten, svenska och engelska sida
// vid sida (CLAUDE.md regel 7). Metadatan står i content/fika/dilemmas.ts.
//
// Svenskan är utkastets (documentation/blueprints/ORDER_316_UTKAST/DILEMMAN.md)
// med Anders ändringar 2026-10-07 (BESLUT del 1): kylen stod öppen i ungefär
// en timme, diskaren heter Linnea, AFS 2023:2 i stället för AFS 2015:4 och
// beskedet om passen märkt ⚖. "Schemat" heter passen (ORDER 300: ordet
// schema står inte i spelarens text).
//
// `legalNote` är texten om vad lagen säger. Den visas inte förrän dilemmats
// `legalReviewed` är satt (content/fika/dilemmas.ts); granskaren bekräftar den.

type T = { sv: string; en: string };
interface DilemmaText {
  question: T;
  options: Partial<Record<'A' | 'B' | 'C' | 'D', T>>;
  explanation: T;
  legalNote?: T;
}

const DILEMMA_TEXT: Record<string, DilemmaText> = {
  'fika-kylen': {
    question: {
      sv: 'Kylen i kalla köket stod öppen i ungefär en timme i kväll, och termometern visade elva grader när jag stängde den. Det ligger lax och crème fraiche i den. Ska vi slänga allt, eller räcker det att använda det först i morgon?',
      en: 'The fridge in the cold kitchen stood open for about an hour tonight, and the thermometer showed eleven degrees when I shut it. There is salmon and crème fraîche in it. Should we throw it all out, or is it enough to use it first thing tomorrow?'
    },
    options: {
      A: { sv: 'Vi slänger det som ligger över gränsen och skriver upp vad som hände i egenkontrollen. Det kostar, men vi vet vad vi serverar.', en: 'We throw out whatever is over the limit and write down what happened in our own-check log. It costs, but we know what we are serving.' },
      B: { sv: 'Vi luktar och känner på det i morgon bitti och bestämmer då.', en: 'We smell and feel it first thing tomorrow and decide then.' },
      C: { sv: 'Laxen slänger vi, men crème fraichen är syrad och klarar sig. Skriv upp båda.', en: 'The salmon goes, but the crème fraîche is cultured and will keep. Write down both.' },
      D: { sv: 'Använd det först i morgon, men bara i varma rätter.', en: 'Use it first thing tomorrow, but only in hot dishes.' }
    },
    explanation: {
      sv: 'Svinnet vägdes mot gästernas säkerhet och mot att egenkontrollen visar vad som hänt. Lukten avslöjar inte bakterier. Uppvärmning räddar inte allt. Laxen ska förvaras kallare än crème fraichen, men vad som gäller för varje vara behöver bedömas mot egenkontrollprogrammet.',
      en: 'The waste was weighed against the guests’ safety and against an own-check log that shows what happened. Smell does not reveal bacteria. Heating does not save everything. Salmon must be kept colder than crème fraîche, but what applies to each item has to be judged against the own-check programme.'
    },
    legalNote: {
      sv: 'Livsmedelslagen och EU:s förordning om livsmedelshygien kräver att företagaren har en egenkontroll som håller varorna i rätt temperatur och visar vad som gjorts när något gått fel.',
      en: 'The Swedish Food Act and the EU regulation on food hygiene require the operator to run own checks that keep food at the right temperature and record what was done when something went wrong.'
    }
  },
  'fika-allergin': {
    question: {
      sv: 'Jag frågade köket om nötter i desserten, och Jonas sa nej. Sedan såg jag att pralinen är gjord på hasselnöt. Gästen hann inte äta. Jag vet inte om jag ska ta upp det, Jonas hade fullt upp.',
      en: 'I asked the kitchen about nuts in the dessert, and Jonas said no. Then I saw that the praline is made with hazelnut. The guest hadn’t eaten yet. I don’t know whether to bring it up, Jonas was flat out.'
    },
    options: {
      A: { sv: 'Bra att du såg det. Vi tar det med Jonas i morgon, lugnt, och sätter ett kort med allergenerna vid varje rätt så att ingen behöver minnas.', en: 'Good that you spotted it. We’ll take it up with Jonas tomorrow, calmly, and put a card listing the allergens with every dish so that no one has to remember.' },
      B: { sv: 'Det gick ju bra. Vi låter det vara, Jonas blir bara stressad.', en: 'It turned out fine. Let’s leave it, it will only stress Jonas.' },
      C: { sv: 'Jag pratar med Jonas själv i kväll, innan han går.', en: 'I’ll talk to Jonas myself tonight, before he leaves.' }
    },
    explanation: {
      sv: 'Att det gick bra vägdes mot att det kan hända igen. Felet låg i hur svaret gavs, inte i en enskild person. Ett system (allergenkort, rutin) skyddar både gästen och den som svarar under stress. Sara som sa till ska känna att det var rätt.',
      en: 'That it turned out fine was weighed against the chance that it happens again. The fault lay in how the answer was given, not in one person. A system (allergen cards, a routine) protects both the guest and whoever answers under pressure. Sara, who spoke up, should feel that it was right to.'
    },
    legalNote: {
      sv: 'EU:s förordning om livsmedelsinformation kräver att gästen kan få veta om en rätt innehåller något av de fjorton allergener som måste anges.',
      en: 'The EU regulation on food information requires that a guest can find out whether a dish contains any of the fourteen allergens that must be declared.'
    }
  },
  'fika-dricksen': {
    question: {
      sv: 'Dricksen i kväll gick till dem som stod vid borden. Jonas och Linnea i disken fick ingenting, fast de jobbade lika hårt. Hur ska vi dela den?',
      en: 'Tonight’s tips went to the people working the tables. Jonas and Linnea in the dish room got nothing, though they worked just as hard. How should we share them?'
    },
    options: {
      A: { sv: 'Vi delar lika på alla som jobbade i kväll, efter timmar, och skriver upp hur. Då vet alla vad som gäller.', en: 'We share equally among everyone who worked tonight, by hours, and write down how. Then everyone knows the rule.' },
      B: { sv: 'Den som fick dricksen har gjort sig förtjänt av den.', en: 'Whoever got the tips earned them.' },
      C: { sv: 'Köket får en tredjedel. Vi provar det en vecka och frågar laget sedan.', en: 'The kitchen gets a third. We try it for a week and then ask the team.' }
    },
    explanation: {
      sv: 'Att ge till den som gästen ser vägdes mot att kvällen görs av hela laget. En regel som alla känner till skapar mindre misstro än en bedömning varje kväll. Att fråga laget efter en vecka är bra, men tills dess saknas en regel.',
      en: 'Giving to the people the guest sees was weighed against the evening being made by the whole team. A rule everyone knows breeds less mistrust than a judgement every evening. Asking the team after a week is good, but until then there is no rule.'
    }
  },
  'fika-baren': {
    question: {
      sv: 'Per sa att killarna ska stå i baren på fredagar, för att gästerna "vill ha det så". Jag har stått i bar i tre år. Jag vill också få passen där dricksen är bäst.',
      en: 'Per said the guys should work the bar on Fridays, because the guests "like it that way". I have tended bar for three years. I want the shifts where the tips are best too.'
    },
    options: {
      A: { sv: 'Passen fördelas efter vad man kan och vill, inte efter kön. Jag pratar med Per om hur vi fördelar passen.', en: 'Shifts go by what people can do and want to do, not by gender. I’ll talk to Per about how we make the rota.' },
      B: { sv: 'Per har hand om rummet. Jag lägger mig inte i.', en: 'Per runs the floor. I’m not getting involved.' },
      C: { sv: 'Vi turas om på fredagarna, alla som vill.', en: 'We take turns on Fridays, everyone who wants to.' }
    },
    explanation: {
      sv: 'Pers bild av gästerna vägdes mot Saras erfarenhet och rätt att bedömas efter sin förmåga. Att turas om är rättvist i stunden men säger inget om grunden. Som chef är det spelarens ansvar att passen inte fördelas efter kön.',
      en: 'Per’s picture of the guests was weighed against Sara’s experience and her right to be judged by her ability. Taking turns is fair for now but says nothing about the principle. As the manager, it is your responsibility that the rota is not based on gender.'
    },
    legalNote: {
      sv: 'Diskrimineringslagen förbjuder arbetsgivaren att missgynna någon på grund av kön, också när arbetet fördelas.',
      en: 'The Swedish Discrimination Act forbids an employer to disadvantage anyone because of their sex, including in how work is assigned.'
    }
  },
  'fika-gransen': {
    question: {
      sv: 'Gästen vid lounge B sa saker till mig i kväll som jag inte vill upprepa, och tog mig om armen när jag gick förbi. Han är stamgäst och lämnar mycket dricks. Jag vet inte om jag ska säga något.',
      en: 'The guest at lounge B said things to me tonight that I won’t repeat, and grabbed my arm as I walked past. He is a regular and tips well. I don’t know whether to say anything.'
    },
    options: {
      A: { sv: 'Tack för att du säger det. Du ska inte behöva stå ut med det. Nästa gång han kommer pratar jag med honom, och händer det igen är han inte välkommen. Du serverar inte hans bord.', en: 'Thank you for telling me. You shouldn’t have to put up with that. Next time he comes in I’ll talk to him, and if it happens again he is not welcome. You won’t serve his table.' },
      B: { sv: 'Han är nog bara glad. Säg ifrån själv nästa gång.', en: 'He’s probably just in high spirits. Speak up yourself next time.' },
      C: { sv: 'Du slipper hans bord, så får Sara ta det.', en: 'You can skip his table, Sara will take it.' },
      D: { sv: 'Vi skriver upp vad som hände och tar det på nästa personalmöte.', en: 'We write down what happened and raise it at the next staff meeting.' }
    },
    explanation: {
      sv: 'Stamgästens värde för kassan vägdes mot Elins trygghet och arbetsgivarens ansvar för arbetsmiljön. Att flytta Elin skyddar henne men lämpar över problemet på Sara. Att skriva upp är bra, men Elin behöver stöd nu.',
      en: 'The regular’s value to the till was weighed against Elin’s safety and the employer’s responsibility for the working environment. Moving Elin protects her but hands the problem to Sara. Writing it down is good, but Elin needs support now.'
    },
    legalNote: {
      sv: 'Arbetsmiljölagen och Arbetsmiljöverkets föreskrifter (AFS 2023:2) kräver att arbetsgivaren förebygger kränkande särbehandling och har rutiner för hur den hanteras, också när den kommer från en gäst.',
      en: 'The Swedish Work Environment Act and the Work Environment Authority’s provisions (AFS 2023:2) require the employer to prevent victimisation and to have routines for handling it, including when it comes from a guest.'
    }
  },
  'fika-skamten': {
    question: {
      sv: 'Det skämtas mycket i köket om Saras utseende när hon går in med tallrikarna. Hon skrattar, men jag tror inte att hon tycker det är roligt. Ska vi göra något, fast hon inte har sagt något?',
      en: 'There are a lot of jokes in the kitchen about Sara’s looks when she goes in with the plates. She laughs, but I don’t think she finds it funny. Should we do something, even though she hasn’t said anything?'
    },
    options: {
      A: { sv: 'Ja. Jag pratar med Sara först, i enrum, och sedan med köket om vad som är okej här. Det ska inte hänga på att hon säger något.', en: 'Yes. I’ll talk to Sara first, in private, and then to the kitchen about what is okay here. It shouldn’t depend on her saying something.' },
      B: { sv: 'Om Sara inte klagar är det inte vårt problem.', en: 'If Sara doesn’t complain, it isn’t our problem.' },
      C: { sv: 'Jag säger till köket direkt i morgon att det ska upphöra.', en: 'I’ll tell the kitchen first thing tomorrow that it has to stop.' }
    },
    explanation: {
      sv: 'Att respektera Saras eget val vägdes mot att arbetsgivaren ska förebygga kränkningar, också när ingen anmäler. Att gå direkt till köket utan att höra Sara kan göra hennes läge svårare.',
      en: 'Respecting Sara’s own choice was weighed against the employer’s duty to prevent harassment, even when no one reports it. Going straight to the kitchen without hearing Sara out can make her position harder.'
    },
    legalNote: {
      sv: 'Diskrimineringslagen kräver att arbetsgivaren utreder och åtgärdar trakasserier som arbetsgivaren får kännedom om. Arbetsmiljöverkets föreskrifter (AFS 2023:2) kräver att kränkande särbehandling förebyggs.',
      en: 'The Swedish Discrimination Act requires an employer to investigate and act on harassment it becomes aware of. The Work Environment Authority’s provisions (AFS 2023:2) require victimisation to be prevented.'
    }
  },
  'fika-bordet': {
    question: {
      sv: 'Jag sa nej till ett sällskap i kväll, för vi var fulla. De blev arga och sa att de skulle skriva en dålig recension. Jag tror jag var för kort i tonen. Hur borde jag ha gjort?',
      en: 'I turned a party away tonight because we were full. They got angry and said they would write a bad review. I think I was too curt. What should I have done?'
    },
    options: {
      A: { sv: 'Du gjorde rätt som sa nej. Nästa gång kan du ge dem en tid eller tipsa om en annan krog i byn. Ett nej kan vara vänligt.', en: 'You were right to say no. Next time you can offer them a time or point them to another place in the village. A no can be kind.' },
      B: { sv: 'Du skulle ha klämt in dem, gästen har alltid rätt.', en: 'You should have squeezed them in, the guest is always right.' },
      C: { sv: 'Det är deras sak hur de tar det.', en: 'How they take it is their business.' },
      D: { sv: 'Vi kan börja ta bokningar på fredagar, så händer det mer sällan.', en: 'We could start taking bookings on Fridays, so it happens less often.' }
    },
    explanation: {
      sv: 'Gästens besvikelse vägdes mot rummets kapacitet och resten av gästerna. Att klämma in fler gör kvällen sämre för alla. Hur nejet sägs avgör ofta mer än själva nejet.',
      en: 'The guests’ disappointment was weighed against the room’s capacity and the rest of the guests. Squeezing more in makes the evening worse for everyone. How the no is said often matters more than the no itself.'
    }
  },
  'fika-aldre': {
    question: {
      sv: 'Ett äldre par satt i en timme innan någon tog beställningen, för alla sprang förbi. Mannen sa att "det här stället är inte för sådana som oss". Det kändes inte bra.',
      en: 'An older couple sat for an hour before anyone took their order, because everyone rushed past. The man said "this place isn’t for people like us". It didn’t feel good.'
    },
    options: {
      A: { sv: 'Vi gör en regel: varje bord får en blick inom fem minuter, oavsett hur fullt det är. Och jag skickar ett kort till dem med en inbjudan.', en: 'We make a rule: every table gets a glance within five minutes, however full we are. And I’ll send them a card with an invitation.' },
      B: { sv: 'Det var en stressig kväll. Det händer.', en: 'It was a hectic evening. It happens.' },
      C: { sv: 'Nästa gång tar du dem först.', en: 'Next time, see to them first.' }
    },
    explanation: {
      sv: 'Kvällens tempo vägdes mot att alla gäster ska känna sig välkomna. En regel för alla bord skyddar mot att några gäster blir osynliga. Att ge just dem förtur löser det enskilda fallet men inte mönstret.',
      en: 'The evening’s pace was weighed against every guest feeling welcome. A rule for every table guards against some guests becoming invisible. Giving just them priority solves this case but not the pattern.'
    }
  },
  'fika-diskaren': {
    question: {
      sv: 'Linnea, vår nya diskare, är långsam, och vi får vänta på glas hela kvällen. Jag vill inte gå till dig och klaga bakom hennes rygg, men det påverkar mig. Vad ska jag göra?',
      en: 'Linnea, our new dishwasher, is slow, and we wait for glasses all evening. I don’t want to come to you and complain behind her back, but it affects me. What should I do?'
    },
    options: {
      A: { sv: 'Säg det till henne själv, vänligt och konkret: vad du behöver och när. Vill du kan vi prata alla tre. Och jag ser över om hon har fått lära sig rutinen.', en: 'Tell her yourself, kindly and specifically: what you need and when. If you like, the three of us can talk. And I’ll check whether she has been taught the routine.' },
      B: { sv: 'Jag pratar med henne. Du behöver inte göra något.', en: 'I’ll talk to her. You don’t need to do anything.' },
      C: { sv: 'Hon får en vecka på sig, sedan får vi se.', en: 'She gets a week, then we’ll see.' }
    },
    explanation: {
      sv: 'Miras behov vägdes mot Linneas rätt att få veta vad som förväntas och att lära sig. Direkt och konkret återkoppling mellan kollegor bygger förtroende. När chefen tar över helt lär sig ingen av dem att ge eller ta emot återkoppling.',
      en: 'Mira’s needs were weighed against Linnea’s right to know what is expected and to learn. Direct, specific feedback between colleagues builds trust. When the manager takes over completely, neither of them learns to give or receive feedback.'
    }
  },
  'fika-schemat': {
    question: {
      sv: 'Laget hörde från någon annan att vi tar in ny personal och att några får färre pass. Nu är det oro. Varför fick vi inte höra det från dig först?',
      en: 'The team heard from someone else that we are taking on new staff and that some people will get fewer shifts. Now people are worried. Why didn’t we hear it from you first?'
    },
    options: {
      A: { sv: 'Du har rätt, det borde ni ha hört från mig. Jag samlar alla i morgon före öppning och berättar vad som gäller och varför.', en: 'You’re right, you should have heard it from me. I’ll gather everyone tomorrow before opening and explain what applies and why.' },
      B: { sv: 'Det var inte bestämt än, därför sa jag inget.', en: 'It wasn’t decided yet, that’s why I said nothing.' },
      C: { sv: 'Det är mitt beslut. Ni får se passlistan när den är klar.', en: 'It’s my decision. You’ll see the rota when it’s done.' }
    },
    explanation: {
      sv: 'Rätten att fatta beslutet vägdes mot lagets behov av att veta vad som händer med deras arbete. Att erkänna att informationen kom fel väg och rätta det bygger förtroende. Att vänta tills allt är klart lämnar fältet åt rykten.',
      en: 'The right to make the decision was weighed against the team’s need to know what is happening to their work. Admitting that the news came the wrong way, and putting it right, builds trust. Waiting until everything is settled leaves the field to rumours.'
    },
    legalNote: {
      sv: 'Medbestämmandelagen kan kräva att arbetsgivaren förhandlar med eller informerar facket innan arbetet ändras för de anställda, till exempel med färre pass. Ett kollektivavtal kan ha egna regler.',
      en: 'The Swedish Co-determination Act can require the employer to negotiate with or inform the union before changing the employees’ work, for example with fewer shifts. A collective agreement may have rules of its own.'
    }
  },
  'fika-passen': {
    question: {
      sv: 'Jag har jobbat sex kvällar i rad, och i kväll hann jag inte äta. Jag älskar jobbet, men jag orkar inte så här länge till.',
      en: 'I have worked six evenings in a row, and tonight I didn’t get to eat. I love the job, but I can’t keep this up much longer.'
    },
    options: {
      A: { sv: 'Det håller inte. Du är ledig i morgon, och vi ser över passen så att alla får sin vila och sin rast. Om det behövs tar vi in en extra hand.', en: 'That won’t do. You’re off tomorrow, and we’ll go over the rota so everyone gets their rest and their break. If we need to, we’ll bring in an extra hand.' },
      B: { sv: 'Det är högsäsong. Snart blir det lugnare.', en: 'It’s high season. It will calm down soon.' },
      C: { sv: 'Ta en längre rast i morgon, så klarar du resten av veckan.', en: 'Take a longer break tomorrow, and you’ll manage the rest of the week.' }
    },
    explanation: {
      sv: 'Veckans tryck vägdes mot Jonas hälsa och arbetsgivarens ansvar för vila och raster. Att lova att det blir bättre senare flyttar risken framåt. En lång rast hjälper i stunden men inte mot mönstret.',
      en: 'The week’s pressure was weighed against Jonas’s health and the employer’s responsibility for rest and breaks. Promising that it will get better later only moves the risk forward. A long break helps for now but not against the pattern.'
    },
    legalNote: {
      sv: 'Arbetstidslagen ger de anställda rätt till dygnsvila, veckovila och raster. Arbetsmiljölagen kräver att arbetsgivaren ser till att arbetet inte leder till ohälsosam belastning.',
      en: 'The Swedish Working Hours Act gives employees the right to daily rest, weekly rest and breaks. The Work Environment Act requires the employer to make sure the work does not lead to an unhealthy workload.'
    }
  },
  'fika-golvet': {
    question: {
      sv: 'Vi brukar hoppa över att skura golvet i köket på torsdagar, för alla vill hem. Linnea halkade nästan i kväll. Ska vi fortsätta så?',
      en: 'We usually skip scrubbing the kitchen floor on Thursdays, because everyone wants to go home. Linnea nearly slipped tonight. Should we keep doing that?'
    },
    options: {
      A: { sv: 'Nej. Golvet skuras varje kväll, och vi delar upp stängningen så att det går fortare och ingen blir kvar ensam.', en: 'No. The floor is scrubbed every evening, and we split up the closing so it goes faster and no one is left alone.' },
      B: { sv: 'En kväll i veckan gör inget.', en: 'One evening a week does no harm.' },
      C: { sv: 'Vi skurar bara där det är halt.', en: 'We only scrub where it is slippery.' }
    },
    explanation: {
      sv: 'Lagets trötthet vägdes mot halkrisken och hygienen i köket. Att dela upp stängningen tar hand om både tröttheten och säkerheten. En genväg som blivit vana är svår att se förrän något händer.',
      en: 'The team’s tiredness was weighed against the risk of slipping and the hygiene of the kitchen. Splitting up the closing takes care of both the tiredness and the safety. A shortcut that has become a habit is hard to see until something happens.'
    },
    legalNote: {
      sv: 'Livsmedelslagen kräver att lokalerna hålls rena. Arbetsmiljölagen kräver att arbetsgivaren förebygger olycksfall, som halka.',
      en: 'The Swedish Food Act requires the premises to be kept clean. The Work Environment Act requires the employer to prevent accidents, such as slips.'
    }
  },
  // ORDER 323 §5 — vagnens dilemman. Nils, medhjälparen i foodtrucken, frågar.
  // Utkast till Anders: texten är skriven för ordern och inte granskad av
  // projektledningen; lagtexterna visas inte förrän de är granskade.
  'fika-vagn-kylboxen': {
    question: {
      sv: 'Kylboxen under disken stod i solen hela eftermiddagen, och korvarna låg på tolv grader när vi öppnade. Jag grillade dem ändå, de blir ju genomvarma. Gjorde jag fel?',
      en: 'The cool box under the counter stood in the sun all afternoon, and the sausages were at twelve degrees when we opened. I grilled them anyway, they get heated right through. Did I do wrong?'
    },
    options: {
      A: { sv: 'Det som legat varmt slänger vi, och vi skriver upp temperaturen. I morgon står boxen i skuggan, med en termometer i.', en: 'Whatever has been warm goes, and we write down the temperature. Tomorrow the box stands in the shade, with a thermometer in it.' },
      B: { sv: 'Grillen tar det mesta. Det gick ju bra.', en: 'The grill takes care of most of it. It turned out fine.' },
      C: { sv: 'Nästa gång frågar du mig innan du grillar något som legat varmt.', en: 'Next time, ask me before you grill anything that has been warm.' }
    },
    explanation: {
      sv: 'Svinnet vägdes mot gästernas säkerhet. Att korven blir varm på grillen tar inte bort allt som hunnit växa medan den låg varm. En vagn i solen behöver en rutin för kylan, inte en person som ska minnas att fråga.',
      en: 'The waste was weighed against the guests’ safety. Heating the sausage on the grill does not undo everything that grew while it lay warm. A truck in the sun needs a routine for keeping things cold, not one person who has to remember to ask.'
    },
    legalNote: {
      sv: 'Livsmedelslagen och EU:s förordning om livsmedelshygien kräver att företagaren har en egenkontroll som håller varorna i rätt temperatur, också i en vagn.',
      en: 'The Swedish Food Act and the EU regulation on food hygiene require the operator to run own checks that keep food at the right temperature, in a truck as well.'
    }
  },
  'fika-vagn-kon': {
    question: {
      sv: 'Kön var så lång vid sju att några gick innan de hann beställa. En sa att han aldrig kommer tillbaka. Jag stod och vände korv och kunde inte göra något.',
      en: 'The queue was so long at seven that some people left before they could order. One said he would never come back. I was turning sausages and couldn’t do anything.'
    },
    options: {
      A: { sv: 'Nästa gång går en av oss längs kön, tar beställningar och säger hur lång väntan är. Då kan de välja själva.', en: 'Next time one of us walks down the queue, takes orders and says how long the wait is. Then people can choose for themselves.' },
      B: { sv: 'Folk får vänta. Det är en foodtruck.', en: 'People have to wait. It’s a food truck.' },
      C: { sv: 'De kvällar det är mycket stryker vi en rätt från tavlan, så går det fortare.', en: 'On busy evenings we take one dish off the board, so things move faster.' }
    },
    explanation: {
      sv: 'Kön vägdes mot vad vagnen hinner. Den som vet hur lång väntan blir kan välja att stanna; den som inte vet går. En kortare meny hjälper takten men tar bort något som gästerna kom för.',
      en: 'The queue was weighed against what the truck can manage. Someone who knows how long the wait will be can choose to stay; someone who doesn’t, leaves. A shorter menu helps the pace but takes away something the guests came for.'
    }
  },
  'fika-vagn-dricksen': {
    question: {
      sv: 'Det låg mycket i dricksburken i kväll. Förra veckan lade du den i kassan. Är dricksen till vagnen eller till oss som står i luckan?',
      en: 'There was a lot in the tip jar tonight. Last week you put it in the till. Are the tips for the truck or for us at the hatch?'
    },
    options: {
      A: { sv: 'Dricksen delas lika mellan oss som jobbade i kväll, och vi säger det högt, så att alla vet hur det går till.', en: 'The tips are split equally between those of us who worked tonight, and we say so out loud, so everyone knows how it works.' },
      B: { sv: 'Den går till vagnen. Det är vagnens gäster.', en: 'It goes to the truck. They are the truck’s customers.' },
      C: { sv: 'Ta du den i kväll, du slet mest.', en: 'You take it tonight, you worked hardest.' }
    },
    explanation: {
      sv: 'Vad som är rättvist vägdes mot att regeln är känd i förväg. En regel som alla känner till skyddar mot misstankar, också när summan är liten. Att ge den som slet mest kan kännas generöst men gör nästa kväll oklar.',
      en: 'What is fair was weighed against a rule that is known in advance. A rule everyone knows protects against suspicion, even when the sum is small. Giving it to whoever worked hardest can feel generous but leaves the next evening unclear.'
    }
  },
  'fika-vagn-benen': {
    question: {
      sv: 'Mina ben är slut. Vi står fem timmar i luckan utan att sätta oss, och i kväll var det kallt i vagnen. Hur länge ska det vara så här?',
      en: 'My legs are done. We stand at the hatch for five hours without sitting down, and tonight it was cold in the truck. How long is it going to be like this?'
    },
    options: {
      A: { sv: 'Vi tar en paus var, i tur och ordning, varje timme. Och jag skaffar en matta att stå på och ett element vid luckan.', en: 'We each take a break, in turns, every hour. And I’ll get a mat to stand on and a heater by the hatch.' },
      B: { sv: 'Så är det att jobba i en vagn.', en: 'That’s what working in a truck is like.' },
      C: { sv: 'Sätt dig när det är lugnt.', en: 'Sit down when it’s quiet.' }
    },
    explanation: {
      sv: 'Tröttheten vägdes mot att vagnen ska hålla öppet. Pauser som är bestämda i förväg blir av; pauser när det är lugnt blir sällan av. En varm och skonsam plats att stå på är arbetsgivarens sak, inte den anställdes.',
      en: 'The tiredness was weighed against keeping the truck open. Breaks that are set in advance happen; breaks for when it is quiet rarely do. A warm, kind place to stand is the employer’s business, not the employee’s.'
    },
    legalNote: {
      sv: 'Arbetsmiljölagen och Arbetsmiljöverkets föreskrifter kräver att arbetsgivaren förebygger ohälsa, också av långvarigt stående arbete och kyla. Arbetstidslagen kräver rast efter högst fem timmars arbete.',
      en: 'The Work Environment Act and the Work Environment Authority’s provisions require the employer to prevent ill health, including from long periods of standing and from cold. The Working Hours Act requires a break after no more than five hours of work.'
    }
  },
  'fika-vagn-kortet': {
    question: {
      sv: 'När kortläsaren krånglade sa jag åt två gäster att de fick betala med Swish eller gå. Den ena blev sur. Det står ingenstans hur man kan betala hos oss.',
      en: 'When the card reader played up, I told two customers they could pay by Swish or leave. One of them got annoyed. Nowhere does it say how you can pay at our truck.'
    },
    options: {
      A: { sv: 'Vi sätter upp en skylt om hur man kan betala, och har en reserv när tekniken krånglar, en andra läsare eller att de får betala nästa gång.', en: 'We put up a sign saying how you can pay, and keep a fallback for when the technology fails: a second reader, or letting people pay next time.' },
      B: { sv: 'Den som inte kan betala får ingen mat.', en: 'If you can’t pay, you don’t get food.' },
      C: { sv: 'När läsaren krånglar bjuder vi.', en: 'When the reader plays up, it’s on the house.' }
    },
    explanation: {
      sv: 'Gästen vägdes mot kassan. Det som står på skylten i förväg undviker grälet vid luckan, och en reserv gör att ett fel i tekniken inte blir ett fel mot gästen. Att bjuda varje gång blir dyrt och säger inget om nästa gång.',
      en: 'The customer was weighed against the till. What the sign says in advance avoids the argument at the hatch, and a fallback means a fault in the technology doesn’t become a fault against the customer. Treating everyone every time gets expensive and says nothing about next time.'
    }
  }
};

export const FIKA_TEXT = {
  label: { sv: 'Fikat efter stängning', en: 'Coffee after closing' },
  asks: {
    sv: (name: string, role: string) => `${name}, ${role}, kommer fram med koppen.`,
    en: (name: string, role: string) => `${name}, the ${role}, comes over with a cup.`
  },
  quote: { sv: (q: string) => `”${q}”`, en: (q: string) => `“${q}”` },
  choose: { sv: 'Vad svarar du?', en: 'What do you say?' },
  goHome: { sv: 'Gå hem', en: 'Go home' },
  wentHome: { sv: 'Chefen hade inte tid i kväll.', en: 'The boss had no time tonight.' },
  next: { sv: 'Vidare', en: 'Continue' },
  // Rubrikens nivå, mjukt och utan rött (BESLUT del 1, fråga 1).
  grade: {
    sv: { well: 'Väl grundat', partly: 'Delvis grundat', weakly: 'Svagt grundat' } as Record<string, string>,
    en: { well: 'Well founded', partly: 'Partly founded', weakly: 'Weakly founded' } as Record<string, string>
  },
  // Följderna efter svaret.
  wellbeingUp: { sv: 'Laget trivs bättre.', en: 'The team feels better.' },
  wellbeingDown: { sv: 'Laget trivs sämre.', en: 'The team feels worse.' },
  loyaltyUp: { sv: (name: string) => `${name} litar mer på dig.`, en: (name: string) => `${name} trusts you more.` },
  loyaltyDown: { sv: (name: string) => `${name} litar mindre på dig.`, en: (name: string) => `${name} trusts you less.` },
  credits: {
    sv: (n: number) => `${n === 1 ? 'En kredit' : `${n} krediter`} i Phronesis.`,
    en: (n: number) => `${n === 1 ? 'One credit' : `${n} credits`} in Phronesis.`
  },
  costSek: { sv: (sek: string) => `Det kostar ${sek} kr.`, en: (sek: string) => `It costs ${sek} SEK.` },
  inspectionRisk: { sv: 'Risken för tillsyn är högre de närmaste kvällarna.', en: 'An inspection is more likely over the next few evenings.' },
  quitRisk: { sv: (name: string) => `${name} funderar på att sluta.`, en: (name: string) => `${name} is thinking of leaving.` },
  suggestAbility: { sv: (name: string) => `${name} finns i butiken.`, en: (name: string) => `${name} is in the shop.` },
  // Portfolion: samma dilemma igen (BESLUT del 1, fråga 2).
  before: {
    sv: (day: string, grade: string) => `Förra gången (dag ${day}) svarade du ${grade.toLowerCase()}.`,
    en: (day: string, grade: string) => `Last time (day ${day}) your answer was ${grade.toLowerCase()}.`
  },
  changed: { sv: 'Ditt svar har förändrats.', en: 'Your answer has changed.' },
  same: { sv: 'Du svarade som förra gången.', en: 'You answered as you did last time.' },
  people: {
    // ORDER 323 §5 — Nils, medhjälparen i foodtrucken (nexusStrings 'truck.assistant.name').
    sv: { host: 'Per', server: 'Sara', sommelier: 'Elin', bartender: 'Mira', cook: 'Jonas', dishwasher: 'Linnea', assistant: 'Nils' } as Record<string, string>,
    en: { host: 'Per', server: 'Sara', sommelier: 'Elin', bartender: 'Mira', cook: 'Jonas', dishwasher: 'Linnea', assistant: 'Nils' } as Record<string, string>
  },
  roles: {
    sv: { host: 'hovmästare', server: 'servitör', sommelier: 'sommelier', bartender: 'bartender', cook: 'kock', dishwasher: 'diskare', assistant: 'medhjälpare i vagnen' } as Record<string, string>,
    en: { host: 'head waiter', server: 'waiter', sommelier: 'sommelier', bartender: 'bartender', cook: 'chef', dishwasher: 'dishwasher', assistant: 'assistant in the truck' } as Record<string, string>
  },
  // Lagarna i dilemmana (content/fika/dilemmas.ts legal.laws), visas bara när
  // dilemmat är granskat.
  laws: {
    sv: {
      'SFS 2006:804': 'livsmedelslagen (2006:804)', 'EG 852/2004': '(EG) nr 852/2004 om livsmedelshygien',
      'EU 1169/2011': '(EU) nr 1169/2011 om livsmedelsinformation', 'SFS 2008:567': 'diskrimineringslagen (2008:567)',
      'SFS 1977:1160': 'arbetsmiljölagen (1977:1160)', 'AFS 2023:2': 'AFS 2023:2', 'SFS 1976:580': 'medbestämmandelagen (1976:580)',
      kollektivavtal: 'kollektivavtalet', 'SFS 1982:673': 'arbetstidslagen (1982:673)'
    } as Record<string, string>,
    en: {
      'SFS 2006:804': 'Food Act (SFS 2006:804)', 'EG 852/2004': 'Regulation (EC) No 852/2004 on food hygiene',
      'EU 1169/2011': 'Regulation (EU) No 1169/2011 on food information', 'SFS 2008:567': 'Discrimination Act (SFS 2008:567)',
      'SFS 1977:1160': 'Work Environment Act (SFS 1977:1160)', 'AFS 2023:2': 'AFS 2023:2', 'SFS 1976:580': 'Co-determination Act (SFS 1976:580)',
      kollektivavtal: 'the collective agreement', 'SFS 1982:673': 'Working Hours Act (SFS 1982:673)'
    } as Record<string, string>
  },
  dilemmas: DILEMMA_TEXT
};
