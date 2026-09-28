// ORDER 273 — English sister of eventStream.sv.ts. Same shape: the
// same exports, keys and array lengths (enforced by the SameShape
// types below). The game reads this file; the Swedish file is kept
// for a later Swedish version.
//
// ORDER 043 Addendum A + B — sentence banks for the service
// event stream, in the observer voice.
//
// The stream is the proprietor walking the room. Not a system
// reporting state. Voice has posture: it notices, it wonders, it
// lets some things go and stops at others. Every line has up to
// four movements (§5A.4 revised):
//   1. What happened — concrete, specific, numbers where numbers matter.
//   2. What it did to the room — the consequence lives inside the
//      sentence, before anyone names it.
//   3. Who failed to see it — station-tagged so the failure traces
//      to the team, not to the sim.
//   4. The observer's judgement, as a question — "hm", an unfinished
//      thought. Never a verdict, never an instruction.
//
// Most lines carry at least three movements. Some carry only one or
// two — a quiet evening does that. But the majority must have three
// or four or the voice disappears.

import type * as SV from './eventStream.sv';

// Widens every string literal in the Swedish bank to `string` while
// keeping keys and tuple lengths, so each English bank must match the
// Swedish one line for line.
type SameShape<T> = T extends string ? string : { readonly [K in keyof T]: SameShape<T[K]> };

// -------- ambient banks — one array per event kind ------------------------

export const AMBIENT_TEXTS: SameShape<typeof SV.AMBIENT_TEXTS> = {
  // Ignorance — scientific (kitchen technique)
  kitchen_slip: [
    'The dessert cheese had gone too far — two guests tasted it once and put their spoons down without a word. The chef had had it out since the morning; does he know what is ripe and what is past it, or is it just cheese to him?',
    'Four of six portions went out with a split sauce — the butter had been stirred in too hot. The table by the window left half; strange that neither the chef at the station nor the waiter who carried it saw it on the plate.',
    'A main course went out without anyone mentioning the cashews — the host had noted the allergy in the booking. I wonder if the waiter read the note before she carried out the plate, or if nobody did.',
    'Two fish went out cold — someone plated them too early and they stood under the heat lamp. Table two left half without comment; the chef at the grill did not see it, and the waiter did not notice the plate was cool in the hand.',
    'The roast beef went out cut with the grain — the guest chewed slowly twice and then put the fork down beside it. The waiter noticed on the way out but carried it on anyway; strange that nobody turned back at the pass.',
    'The salad on three starters went out with flat leaves — someone dressed them five minutes too early. The table ate without saying anything and left the bowl half full; strange that the chef who mixed it and the waiter who carried it saw the same thing without stopping.',
    'The reduction on the lamb went too thick — it stuck to the spoon and the guest had to scrape. Two of the tables joked about it; I wonder if the chef at the sauce did not smell it turn, or if he hoped it would work anyway.',
    'A wallenberg went out with a clearly raw edge — the kitchen called it back but the waiter had already set the plate in front of the guest. Hm, that shame costs more in face than a new wallenberg costs in time; someone should teach him to check first.'
  ],
  // Ignorance — cultural (hospitality, pairing, knowing guests)
  service_slip: [
    'The waiter suggested red with the fried herring — the table thanked him politely and ordered water instead. I wonder if the host knows what fried herring is, or if he went by "the table looks like a red-wine table".',
    'A regular was greeted at the door by the wrong name — the older couple smiled stiffly and walked past without correcting it. The host noticed nothing; the guest will not say it, but he will come less often.',
    'The coffee was put down before the digestif at table six — they looked at each other and pushed the cups aside to wait. Hm, the waiter is new; does anyone know if he has learnt the sequence, or have we assumed it?',
    'A table got the tapas tray with the wrong cutlery — the small fork was missing and the guest tried to manage with the big one until the waiter came by. I wonder if the chef noticed the tray went out without all its parts; nobody asked.',
    'A vegetarian guest was offered last week\'s menu — she politely reminded him that she does not eat meat. The waiter apologised without checking today\'s menu beside him; strange that nobody updated him this morning.',
    'The wine was poured for the wrong guest — the host at the table was someone other than the one the waiter chose. Nobody said anything, but the wine will taste wrong for all three now. I wonder if the waiter read the booking or guessed from age.',
    'An allergy noted in the booking was missed when the table was laid — the little bowl of nuts was still there. The table\'s host spotted it and moved it away before the guest arrived. I wonder where in the chain the note got lost; host to chef to waiter is three chances.',
    'The dessert was presented without mentioning the alternative to the nut — the guest asked, and the waiter hesitated a second too long. Hm, that was enough for the table to doubt all of our skill; strange that the kitchen did not prepare the answer this morning.'
  ],
  // Ignorance — cultural (supplier relationships, ecological sourcing)
  delivery_short: [
    'The supplier delivered less than was ordered — the boxes held a kilo less salmon than on the invoice. Nobody rang back and nobody wrote it down; I wonder if we even know to cook one portion fewer before service notices.',
    'The venison came with a green label instead of a hanging mark — it has not been hung as long as last week. The chef took it in without opening the bag; hm, it will show in the bite later tonight if nobody checks now.',
    'The box of lemons was half full — the other box is still at the supplier. Nobody rang to ask why. I wonder if we can manage the fish without acid tonight, or if someone runs to the shop on the square.',
    'A carton of cream was open on arrival — the lid came loose some time during transport. The chef put it in anyway; strange that nobody checked if it had got warm under the lorry\'s plastic, it may already be off.',
    'The chèvre smelled sourer than last week\'s — no certificate came with it and nobody asked for one. The chef cut a piece and tasted it, pulled a face but put it in. I wonder how far we can stretch that before a guest mentions it.',
    'Two crates of lettuce looked frost-bitten from transport — the leaves were dark at the edges. Nobody threw them out, nobody rang. Hm, half the range may go out with wilted lettuce tonight if we do not sort it before mise en place is done.',
    'The fish arrived without an ice pack — only wrapped in plastic. Nobody took the temperature in the box before it went into the fridge. I wonder how many hours it was above four degrees before we took it in; someone should have asked at the door.',
    'The invoice did not match the list — two items had changed names. Nobody checked the lines against the order. Hm, that is how a supplier starts sending what they have rather than what we asked for — we will learn it as a pattern in a month.'
  ],
  // Strain — kitchen bottleneck
  bottleneck: [
    'A main course was held up at pass 3 — the table asked the waiter a second time. She answered with a gesture towards the kitchen and hurried on. The chef at the grill has four orders and an unopened fridge door to open; I wonder if he has asked for help or is trying to save it himself.',
    'Two orders went out in the wrong order — table two got the main before the starter. The table smiled awkwardly and started on the main anyway. Hm, the kitchen cannot hold the list when it is five long; someone should stand with the paper, not with their memory.',
    'The pass piled up — three plates stood waiting under the heat lamp while the waiter was at the door. When she came back, two of them had drifted in temperature. I wonder if the host could have carried them, even if it was outside her station today.',
    'A starter went out cold when the dessert for the last table went first — the chef chose to let it cool rather than mix up the order of the pass. The table ate without comment; hm, it is his second cold starter tonight, both from the same sorting instinct.',
    'The two chefs at the grill lost the rhythm between two orders — the pass sounds more open than usual. The next table will wait two extra minutes for the main. I wonder if it is the equipment, or if someone did not get to eat lunch today.',
    'A dessert was cut short — there was no time for the garnish and the plate went out bare. The table did not notice it was meant to have one more touch, but we know. Hm, it is the third shortcut tonight without anyone mentioning it.',
    'The dish station overflowed — plates stacked up unscraped while the waiters fetched clean ones from the store. Nobody asked for help; I wonder if the dishwasher knows she can say stop, or thinks it counts as weakness.',
    'A table got the main before the starter — the kitchen had skipped it without flagging it. The waiter tried to explain without blaming anyone and the guest asked to keep both at once. Hm, that saves the moment but hides the mistake.'
  ],
  // Strain — service coverage
  wait_stretched: [
    'The waiter missed the table by the bar on the turn — he was on his way to table four with three plates and did not see the guest raising a hand. The table waved once more, then stopped. I wonder how long it was before someone else found them.',
    'A water top-up never came during a conversation — the waiter stood outside the table with the jug but did not dare to interrupt. Another ten minutes passed before she stepped in, and even then it was the wrong moment. Hm, she needs to learn when a conversation is a pause and when it is a wall.',
    'The bill was slow — the table was ready to go and waited with their coats over their arms. One of them looked at the clock for the third time. I wonder if the host keeps track of which table raised a hand first, or if it is first come, first served by feel.',
    'A guest raised her hand at table two — nobody saw. She put it down after half a minute and started looking for eye contact instead. Hm, there are two staff on the floor tonight and three tables need them at once; a raised hand should not be missed, but it was.',
    'Two tables waved at the same time — the waiter chose the nearer one and the other waited three minutes. That table did not lower the hand, but turned their heads. I wonder if the apprentice could have taken the other one if he had been told he could.',
    'A wine order was forgotten on the turn between tables — the waiter nodded and moved on, then something else came up. The table reminded him after ten minutes. Hm, it is fine the first time; it is not fine the second time in the same evening.',
    'The tailcoat at the door disappeared when the host was out in the kitchen — a new guest had to walk in and find someone himself. At first he looked as if he would turn round, but he stayed. I wonder how many have turned round tonight without us seeing.',
    'A table got its dessert without the waiter stopping to present it — she left the plate and hurried on. The table looked at it without knowing what it was. Hm, that little ceremony is half the dish; without it, it is just food.'
  ],
  // Both — house-standard slippage under load
  turnover_stumble: [
    'A table was reset slowly — the next party looked at the door twice before the host waved them in. They asked if there was a problem; he said no, but they came in already suspicious. I wonder if we measure the time between the last bill and the first welcome, or if it just sits there.',
    'A dessert was half eaten when the next guest\'s place card was lying on the table beside it — the first party saw it and went quiet for two minutes before they got up. Hm, the floor moved fast, but it carried a message they should not have had to read.',
    'A table turn that should have taken five minutes took fifteen — the host cleared it himself because the waiters were busy. He did it quickly but thoroughly; strange that we do not have a third person doing it as standard.',
    'Cutlery was laid wrong on the turn — the knife lay on the left on three places. No guest commented, but nobody used them the right way either. I wonder if the apprentice was told which side, or just copied the last person he saw.',
    'The napkin was folded carelessly when the next guest was already in the doorway — the host saw it but let it go. The table noticed without saying anything; hm, it is the kind of detail that does no harm once but becomes a signal if it happens again.',
    'A water glass was left from the last party — it was only noticed when the guest lifted it to drink. The waiter changed it quickly without comment. I wonder how many glasses were left before we noticed.',
    'The candles on the table were not relit — the next guest sat in shadow until the waiter happened to pass and sorted it. Meanwhile the table leaned in their chairs towards the light from the next table. Hm, that little discomfort is what people remember.',
    'The salad side was forgotten between two tables — the kitchen mixed them up and nobody noticed until the guests started eating. One of the guests made a half-joking remark about it; strange that we have no check before the plate leaves the pass.'
  ]
};

export type AmbientEventKind = keyof typeof AMBIENT_TEXTS;

// -------- prep banks — ignorance-polarity (things not going well) ---------
//
// Fire during the 2-min mise-en-place window. Weighted by team
// competence per axis. Same observer voice as ambient — the
// proprietor walking the empty room, noticing what did or did not
// get set up.

export const PREP_TEXTS: SameShape<typeof SV.PREP_TEXTS> = {
  prep_kitchen: [
    'Mise en place started ten minutes late — the kitchen came in later than usual and nobody took the lead. It is fine today, but it means the last run-through disappears; I wonder if anyone in the team knows which step we skip when it gets busy.',
    'The reduction was started before the stock was strained — the flavour will be cloudy all evening. The chef had it out but turned away a second too long. Hm, that second is the difference between a sauce and a good sauce.',
    'The pass board was written up with half the menu and no times — the kitchen will guess "about three minutes" all evening. Nobody asked anyone to fill it in, and now the orders will come out in bursts rather than in rhythm. I wonder if it is carelessness, or if nobody knew who should write it.',
    'A sauce had been left in the freezer since yesterday — the kitchen brought in a new one without checking if the old one was good. We now have two portions of the same sauce, one thawed and one forgotten. Hm, it is small money, but it is also a habit that says something about the order in the kitchen.',
    'The two chefs started with two different prep lists — someone updated the menu but it did not reach their colleague. Half the station is prepping for Tuesday\'s dishes, the other half for today\'s. I wonder how far into service we get before we notice the bar is dressing the wrong salad.',
    'The spice rack had not been refilled — in the middle of prep the chef went over to fetch salt. It was two minutes, but those two minutes were exactly when he should have been at the grill. Hm, a refill this morning would have saved ten tonight.',
    'A starter is missing its garnish — the fresh produce did not come in today and nobody rang to ask. We go out with empty sides on four of tonight\'s dishes. I wonder if the guest notices, or if we notice that we have got used to being noticed.',
    'The tubs in the fridge were not labelled — what is today\'s and what is yesterday\'s is now a question rather than an answer. The chef will be smelling his way through the whole evening. Hm, it is fine twice, but it is how "it smells good enough" begins.'
  ],
  prep_room: [
    'One table was forgotten when the room was laid — the napkins were on the next one instead. The host noticed when the first booking arrived and had to swap them right in front of the guest. I wonder if we have a list of the tables, or if we go by memory.',
    'The lights at the bar were never switched on — the bartender opened in the dark. Nobody checked until the first guest sat down. Hm, the half-minute it took him to switch them on gave an impression that did not need to be seen.',
    'Two chairs were still there from last night, turned the wrong way — the host sorted it himself while the waiters redid the wine list. Nobody asked why they stood like that; it is the kind of detail that piles up without anyone counting.',
    'The wine list was updated at the last minute — some prices were old and two waiters saw different amounts when they looked. They chose the lower one so as not to lose a guest; I wonder if we have any idea what the evening actually costs us.',
    'The floor by the door had not been mopped — marks from yesterday\'s dinner showed when the first guest stepped in. He said nothing, but he looked down. Hm, that look is hard to forget if you are the one making the first impression.',
    'The booking sheet was printed but left at the host stand — the waiters went out without having seen it. They will be guessing which table is booked all evening. I wonder if there is a briefing, or if we assume everyone reads it.',
    'The place cards were put on the wrong tables — the host managed to swap two before opening, but at the third the guest read the wrong name for a second before they understood. Hm, it is that second you smile apologetically through without knowing why.',
    'The music was on last night\'s playlist — nobody changed it. The first booking came in to a mood that was too late in the evening for a lunch opening. I wonder who is responsible; it is a small thing, but it is also the first thing the guest hears.'
  ],
  prep_delivery: [
    'The cold chain was paused too long while the boxes were sorted — the fresh produce stood out for fifteen minutes. The chef did not check the temperature before putting it away. I wonder if we will notice it in the bite later, or only when someone gets ill.',
    'A crate was unpacked in the wrong order — fresh produce ended up under dry goods in the sorting. Two of us then moved it again without comment. Hm, it is the kind of inefficiency that is hard to point at but easy to count at the end of the month.',
    'Two delivery notes from the supplier lay unsigned on the draining board — nobody checked if the items were right. We do not know if we are paying for what we got or for what we thought we ordered. I wonder if there is a routine for it, or if it is for the manager to do on Sunday.',
    'The supplier left a delivery that did not match the order — two things were missing and a third came twice. Nobody rang. Hm, a third delivery this month with the same mistake says something about the relationship that nobody talks about.',
    'The fish was brought in without being weighed — the next starter gets an estimated portion. Nobody knows if we are over or under the costing until we count this afternoon. I wonder if it is laziness, or if the scales are in the wrong place to count as part of the routine.',
    'The vegetable crates were stacked in the passage and blocked the dish station — during prep everyone had to walk round them. Nobody moved them. Hm, it is the kind of obstacle that adds two minutes to everything, and two minutes in prep is ten in service.',
    'A pallet was left in the yard — the glass bottles did not get in before mise en place closed. The waiter will carry them in, in rounds, during the evening instead. I wonder how much of the evening\'s imbalance was already set in the gravel by the gate.',
    'The supplier\'s temperature log was missing — we took in the fish without being able to check the cold chain. The chef put it in anyway. Hm, that is the kind of thing that is invisible until it is not.'
  ]
};

export type PrepEventKind = keyof typeof PREP_TEXTS;

// -------- prep banks — positive-polarity (things going well) --------------
//
// Fire when the prep floor triggers on a strong-competence team.
// Same observer voice — the proprietor noticing that a station is
// held. Not compliments issued by the system.

export const PREP_POSITIVE_TEXTS: SameShape<typeof SV.PREP_POSITIVE_TEXTS> = {
  prep_kitchen: [
    'Mise en place was ready twenty minutes before opening — the chef had gone through the whole menu before the grill was even hot. He is at the pass now reading the rota; I wonder if the evening will show that he had time to finish thinking before the pace began.',
    'The reduction stood ready and strained in a pot with a lid — the chef had left a teaspoon beside it to taste before service begins. That kind of care shows on the plate six hours later without anyone mentioning it.',
    'The pass board was written up with the whole menu and a time beside each dish — the kitchen will know what they are doing before the guest sits down. I wonder when we started doing that as standard; it looks as if someone taught someone else without me seeing when.',
    'A sauce left over from yesterday was tasted before it was thrown out — the chef decided himself that it should not go out. Hm, that judgement is the whole difference between a chef and someone who cooks; I hope he knows I saw it.',
    'The two chefs went through the menu changes together — they spent five minutes agreeing on who does what. Those five minutes will save fifteen later. I wonder if they know they are doing it, or if it is just how they work.',
    'The spice rack was refilled and neatly sorted before the first guest — someone had done it without asking. It is the kind of quieter work you do not see until you miss it. Hm, it shows now.',
    'A starter\'s garnish was swapped for something that happened to come in this morning — the chef had rethought the menu in twelve minutes. Service will present it as a dish of the day; I wonder if the guests know it was not planned.',
    'The tubs in the fridge were labelled with date and contents — it took the chef three minutes this morning to go through them. He now knows what he is reaching for without looking. That kind of order lets the evening breathe.'
  ],
  prep_room: [
    'Every table was laid ten minutes before opening — the host went round himself checking the angle of the cutlery. Hm, nobody asked him to, but you notice it when he stands still in front of a table and looks until he is happy.',
    'The lights at the bar and in the ceiling came on together as the clock struck — someone had learnt our routine without me telling them. I wonder when it went from something I arranged to something that just happened.',
    'The chairs stood straight at every table and two extra were in the store, just in case — the host had counted the guests in the booking and thought through both the look and an emergency. You do not usually see that kind of care until you miss it.',
    'The wine list was updated in good time — prices were right, the waiters had read it through and both could answer "what do you recommend". They will manage to move at least two tables from beer to wine tonight without the guest thinking about it.',
    'The floor by the door was mopped and nearly dry when we opened — the host did it himself. Hm, that kind of order usually shows in the first guest\'s greeting; she left her coat without checking where she put her handbag.',
    'The booking sheet was out in three places — the host had printed one for each station and gone through it with the floor team. Everyone knows which table is waiting for whom. I wonder if I would even notice if something went wrong tonight, or if the team has covered the gaps before they show.',
    'The place cards were right and the calligraphy leaned at the same angle on all of them — someone had taken time over it. The guest does not register that kind of detail consciously, but it makes the first moment at the table a little more comfortable.',
    'The music was chosen for the evening — not last night\'s playlist but something that fitted the weather report and the menu. I wonder who made that choice; it is usually me, but it is someone else today, and it sounds right.'
  ],
  prep_delivery: [
    'The cold chain was never broken — the supplier brought the cool bags and the chef took them straight into the fridge. The temperature log is beside it for next week. I wonder when he started doing that without being asked.',
    'The crates were unpacked in the right order — fresh produce first, dry goods last. Nobody had to sort anything again. It is the kind of routine that gets calmer every week without anyone mentioning it, and the evening starts quieter for it.',
    'The delivery notes were signed and filed the same minute they arrived — the chef checked every line against the order and spotted a difference of one kilo. He rang straight away. Hm, that one-kilo conversation is what keeps the relationship honest for months to come.',
    'The supplier\'s delivery was exactly right — nothing missing, nothing extra. We asked for what we needed and got what we asked for. I wonder if it is because the chef has built the relationship, or because the supplier has had a good day.',
    'The fish was weighed on arrival and portioned straight away — the chef now knows exactly how many starters he has to work with. It took four minutes this morning and saves two on every order. Hm, that is usually called good housekeeping.',
    'The vegetable crates were stacked neatly out of the walkway — someone had thought about the flow during prep. Nobody has to step over anything. I wonder if it shows as a detail, or if it is one of the things that just makes the evening feel lighter.',
    'Every pallet came in before mise en place closed — the supplier was on time and the team had a line ready to carry things in. The evening starts in good order; it is rarer than you think to be able to say that.',
    'The supplier\'s temperature log lay beside the fish on delivery — we know it was cold the whole way. The chef can lean on a piece of paper instead of his own memory. Hm, it is the kind of small thing that lets a chef trust his own instinct when it really matters.'
  ]
};

// -------- carryover text — the one bottleneck line that fires mid-service
//          when the prep window ended with too many ignorance events.
//
// Same observer voice. Not a rules message; a moment noticed and
// wondered about.
export const PREP_CARRYOVER_TEXT: SameShape<typeof SV.PREP_CARRYOVER_TEXT> =
  'The sauce that was not strained this morning turns up at pass 7 — the kitchen has to leave it off and the guest gets the dish bare. Hm, it is the second trace from prep tonight to reach the plate; I had hoped we would be spared that.';

// -------- value-quota bank — sentences that name the link between
//          price/produce and the guest's choice (§5.1 ORDER 117) -------
//
// Emitted at service close when valueQuota() from valueQuota.ts has
// been below or above the threshold during service. See the Swedish
// file for the full rationale.

export const VALUE_LOW_TEXTS: SameShape<typeof SV.VALUE_LOW_TEXTS> = [
  'Two parties turned at the door — the price of the lamb came up when they looked at the board, and then they walked on towards the square. I wonder if it was the number itself or that it stood there without explanation; a sign saying "up today" might have kept them.',
  'A couple read the price of the special twice — the younger one raised an eyebrow, the older one folded the menu and nodded towards the terrace across the street. Hm, the prices are noticed now in a way they were not last week.',
  'The new table by the door stopped at the menu — they looked at the guest who had just been served, looked at the price, and went out again. I wonder if it was the portion or the number that decided it; from the side it looked like both.',
  'The waiter heard a table compare our truck\'s price with the one at Kalastorget last week — they said "she charged sixty, we are standing here at ninety". Hm, the price lives in the street\'s memory, and we compete with yesterday\'s number without knowing it.',
  'A regular counted out loud at the bill — "two portions for this, is it worth it?" He paid, but he said it. I wonder if he will come back next week, or come with friends who heard his sums.'
];

export const VALUE_HIGH_TEXTS: SameShape<typeof SV.VALUE_HIGH_TEXTS> = [
  'A table asked where we bought the lamb — they tasted and nodded at each other before they said anything. The waiter answered "locally, from the farm up by the lake" and they smiled; hm, that answer pays for itself in ten new guests by the weekend.',
  'A guest raised a hand after the starter and asked to thank the chef in person — she mentioned the cream. I wonder if he knows it shows right away in the first half spoonful, or if he just smiles and takes it for granted.',
  'Two new parties joined the queue after talking to the couple in front — the price never came up, only "did it really taste that good". Hm, that recommendation is how organic pays for itself, not in the margin but in the queue.',
  'A table asked for our supplier list after dessert — they run a catering business and wanted to buy from the same people. The waiter wrote it down on a strip of receipt paper; I wonder if we think of ourselves as one of the links in their chain, or if it is time to.',
  'The bill was paid without anyone counting — the table said "that was worth every penny" on the way out. Hm, that is the sentence the price is there for; it will be said to others this week without us hearing it.'
];

// -------- positive-events bank — ambient positive during service ----------
//
// The good moments a service produces when things are going right.
// Same voice as ambient — the proprietor noticing, not the system
// congratulating. Fires only during service post-prep, gated by
// calmness × competence.

export const POSITIVE_TEXTS: SameShape<typeof SV.POSITIVE_TEXTS> = [
  'The table by the window ordered another bottle — they have sat for two hours and seem to have nowhere to go. The waiter suggested one of the dearer wines without asking about budget; hm, she learnt that without us teaching her.',
  'A regular greeted the host by name at the door and they started talking about the weekend — the conversation went on until the couple had sat down. I wonder if the host knows it is one of the guests who will mention us to others this week.',
  'The chef tasted from the pan in the middle of the turn — he corrected himself with a pinch of salt without anyone asking. Hm, that automatic self-correction is what separates a third time from a fiftieth.',
  'A table asked to stay on a while after coffee — they want to sit out the wine before going out into the cold. The waiter said of course without looking at the clock. I wonder if the next booking will mind; for us it is a gesture that counts.',
  'A starter went out with a spontaneous upgrade — the kitchen had a little beef fillet left over and added it to a tray that had ordered something simpler. Nobody asked for it; the guest looked up and smiled. Hm, that kind of generosity shows in the tips in two weeks.',
  'The bill was left with two notes of tip on top — the table said something about the evening being exactly what they had needed. I wonder which of the small moments we should credit that response to.',
  'A table asked to book again for next week before they left — they had not eaten here before. The host booked them in himself on the phone and wrote a note about what they had liked. Hm, that is how a regular begins.',
  'A guest caught the host\'s eye and nodded towards the wine list — she understood without him saying anything. The second bottle is already on its way before the table knew it wanted it. I wonder where in the host that instinct sits; I cannot point to where we train it.'
];
