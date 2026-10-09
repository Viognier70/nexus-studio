// ORDER 323 §1 — spelet startar på svenska (DEFAULT_LANG = 'sv'). Testsviten
// skrevs mot engelskan som standard (ORDER 273) och läser spelartexten på
// engelska; här sätts engelskan före varje testfil, så att testerna prövar
// samma text som förut. Testerna som gäller språket självt
// (order273Language, order323) sätter språket uttryckligen.
import { setLanguage } from '../content/language';

setLanguage('en');
