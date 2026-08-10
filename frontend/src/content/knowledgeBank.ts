// GENERATED — do not edit by hand.
// Source: reports/knowledge/questions.json (status === 'approved')
// Generator: scripts/knowledge-package.mjs
// Approved bank per ORDER 049 §3–§7 (2026-08-10). Frame contract in
// ORDER 049 §3.3.a: bank question is fixed; frame varies by context
// (bank meeting / service / morning). Sender comes from topic per
// the mapping approved 2026-08-10.
//
// Regenerate: node scripts/knowledge-package.mjs

import type { StaffRole } from '../strategic/types';

export type BankRegister = 'episteme' | 'techne' | 'phronesis';

// Bank sender is the staff role that plausibly asks the question
// during a service frame. Bank does not attribute to lärling (the
// apprentice asks about things, not from expertise).
export type BankSender = Exclude<StaffRole, 'lärling'>;

export type BankContext = 'bank_meeting' | 'service' | 'morning';

export interface BankOption {
  readonly label: string;
  // Episteme and techne have exactly one correct option; phronesis
  // options are judgement calls with no single right answer, so
  // `correct` is undefined on those.
  readonly correct?: boolean;
}

export interface BankQuestion {
  readonly id: string;
  readonly register: BankRegister;
  readonly sender: BankSender;
  readonly question: string;
  readonly options: readonly BankOption[];
  // Undefined for phronesis (see BankOption).
  readonly correctIndex?: number;
  readonly citation: string;
  readonly articleId: string;
  readonly articleTitle: string;
  readonly articleUrl: string;
  readonly topic: string;
  readonly needsRetag: boolean;
}

export const KNOWLEDGE_BANK: readonly BankQuestion[] = [
  {
    id: "003e76e7-d8e6-4826-bc03-fe04b63bae15::episteme::0",
    register: "episteme",
    sender: "kock",
    question: "In Daqu fermentation, which bacterium is linked to the production of 2,3,5,6-tetramethylpyrazine, a flavor-active compound?",
    options: [
    { label: "Bacillus subtilis", correct: false },
    { label: "Bacillus amyloliquefaciens", correct: true },
    { label: "Lactobacillus plantarum", correct: false },
    { label: "Acetobacter pasteurianus", correct: false }
    ],
    correctIndex: 1,
    citation: "Ying Wang, Xuhan Xia, Minghua Wu, Qiyao Sun, Wei Zhang, Yong Qiu, Ruijie Deng, Aimin Luo. (2023). Species-Level Monitoring of Key Bacteria in Fermentation Processes Using Single-Nucleotide Resolved Nucleic Acid Assays Based on CRISPR/Cas12. Journal of Agricultural and Food Chemistry. https://doi.org/10.1021/acs.jafc.3c04775",
    articleId: "003e76e7-d8e6-4826-bc03-fe04b63bae15",
    articleTitle: "Species-Level Monitoring of Key Bacteria in Fermentation Processes Using Single-Nucleotide Resolved Nucleic Acid Assays Based on CRISPR/Cas12",
    articleUrl: "https://doi.org/10.1021/acs.jafc.3c04775",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "00cfe3d6-edb2-4eb3-9267-debb72742f88::episteme::1",
    register: "episteme",
    sender: "kock",
    question: "When sensory feedback is gathered in a kitchen or production setting, what determines whether the results are actionable rather than anecdotal?",
    options: [
    { label: "The number of tasters involved in the evaluation", correct: false },
    { label: "Applying the right test from a structured typology of sensory tests", correct: true },
    { label: "Using only consumer-focused tests rather than product-focused ones", correct: false },
    { label: "Recording responses in a standardized written format", correct: false }
    ],
    correctIndex: 1,
    citation: "M.A. Drake, M.E. Watson, Yaozheng Liu. (2023). Sensory Analysis and Consumer Preference: Best Practices. Annual Review of Food Science and Technology. https://doi.org/10.1146/annurev-food-060721-023619",
    articleId: "00cfe3d6-edb2-4eb3-9267-debb72742f88",
    articleTitle: "Sensory Analysis and Consumer Preference: Best Practices",
    articleUrl: "https://doi.org/10.1146/annurev-food-060721-023619",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "01cb69fb-9ff5-4bf6-9570-848ff29f4f82::episteme::2",
    register: "episteme",
    sender: "kock",
    question: "According to current food science, how is fermentation — including bio-fermentation informed by gene science — best described in terms of its industrial role?",
    options: [
    { label: "A traditional craft with limited scalability, mainly used for preserving foods.", correct: false },
    { label: "A scientifically validated, industrially scalable platform for generating functional food ingredients and modifying food composition at reduced cost and environmental impact.", correct: true },
    { label: "A niche processing technique valued primarily for its cultural heritage rather than scientific merit.", correct: false },
    { label: "An emerging method still awaiting industrial validation before it can be applied at scale.", correct: false }
    ],
    correctIndex: 1,
    citation: "G. Enne, Serrantoni Monica, Gianfranco Greppi. (2010). Science for Food Safety, Security and Quality: a Review - Part 1. Quality of Life (Banja Luka) - APEIRON. https://doi.org/10.7251/qol1001026g",
    articleId: "01cb69fb-9ff5-4bf6-9570-848ff29f4f82",
    articleTitle: "Science for Food Safety, Security and Quality: a Review - Part 1",
    articleUrl: "https://doi.org/10.7251/qol1001026g",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "e379e343-05b5-4159-b277-961c33b60e9c::episteme::3",
    register: "episteme",
    sender: "värd",
    question: "Hakka Baked Chicken is classified under which cultural designation, and what ingredient defines it above all others?",
    options: [
    { label: "UNESCO World Heritage site dish, defined by its specific clay-pot cooking vessel", correct: false },
    { label: "Intangible Cultural Heritage, with salt as its defining characteristic", correct: true },
    { label: "Intangible Cultural Heritage, with smoke as its defining characteristic", correct: false },
    { label: "A protected geographical indication product, defined by the breed of chicken used", correct: false }
    ],
    correctIndex: 1,
    citation: "Sijia Liu, XiaoKe Zeng. (2025). \"Salt is the Soul of Hakka Baked Chicken\": Reimagining Traditional Chinese Culinary ICH for Modern Contexts Without Losing Tradition. arXiv. http://arxiv.org/abs/2505.02542v1",
    articleId: "e379e343-05b5-4159-b277-961c33b60e9c",
    articleTitle: "\"Salt is the Soul of Hakka Baked Chicken\": Reimagining Traditional Chinese Culinary ICH for Modern Contexts Without Losing Tradition",
    articleUrl: "http://arxiv.org/abs/2505.02542v1",
    topic: "food_anthropology",
    needsRetag: false
  },
  {
    id: "00ea7c69-44e2-4c2a-8f39-00f653ccd9f2::techne::4",
    register: "techne",
    sender: "värd",
    question: "You are plating a sparkling water service and want to maximise the guest's perception of freshness before they taste anything. Which presentation approach is most directly supported by research on audiovisual cues?",
    options: [
    { label: "Serve in an opaque vessel to keep carbonation contained longer, preserving freshness for the palate.", correct: false },
    { label: "Make effervescence both visible and audible at the moment of service, treating those two cues as deliberate craft variables.", correct: true },
    { label: "Chill the glass as low as possible and say nothing, letting temperature alone signal freshness.", correct: false },
    { label: "Pour tableside only after the bubbles have settled, so the guest focuses on colour rather than carbonation.", correct: false }
    ],
    correctIndex: 1,
    citation: "Jérémy Roque, Jérémie Lafraire, Charles Spence, Malika Auvray. (2018). The influence of audiovisual stimuli cuing temperature, carbonation, and color on the categorization of freshness in beverages. Journal of Sensory Studies. https://doi.org/10.1111/joss.12469",
    articleId: "00ea7c69-44e2-4c2a-8f39-00f653ccd9f2",
    articleTitle: "The influence of audiovisual stimuli cuing temperature, carbonation, and color on the categorization of freshness in beverages",
    articleUrl: "https://doi.org/10.1111/joss.12469",
    topic: "multisensory",
    needsRetag: false
  },
  {
    id: "012d6b00-35d3-4b45-844f-284bfb28cebe::episteme::5",
    register: "episteme",
    sender: "värd",
    question: "According to research on cooking practices in Western Kenyan marketplaces, what does the act of combining culinary parts into wholes primarily reflect?",
    options: [
    { label: "Specific temperature and timing protocols developed within local homesteads", correct: false },
    { label: "The relational and structural dimension of social relations within homesteads", correct: true },
    { label: "A set of ingredient pairings unique to the regional market economy", correct: false },
    { label: "Technical execution methods passed down through formal culinary training", correct: false }
    ],
    correctIndex: 1,
    citation: "Schmidt M.. (2020). Being one while being many–social and culinary parts and wholes in Western Kenya. Food Culture and Society. https://doi.org/10.1080/15528014.2020.1775410",
    articleId: "012d6b00-35d3-4b45-844f-284bfb28cebe",
    articleTitle: "Being one while being many–social and culinary parts and wholes in Western Kenya",
    articleUrl: "https://doi.org/10.1080/15528014.2020.1775410",
    topic: "food_anthropology",
    needsRetag: false
  },
  {
    id: "a8a67346-a564-4900-b1f5-e55d14d01f38::episteme::6",
    register: "episteme",
    sender: "kock",
    question: "When you add soy sauce, herbs, or spices to a dish to make it taste saltier without adding more salt, which pathway is primarily responsible for that enhanced saltiness perception?",
    options: [
    { label: "Peripheral taste receptors on the tongue responding directly to sodium ions", correct: false },
    { label: "Central nervous system pathways triggered by retronasal olfaction", correct: true },
    { label: "Salivary enzyme activity breaking down flavor compounds into sodium precursors", correct: false },
    { label: "Chemesthetic sensations such as tingling overriding bitterness at the receptor level", correct: false }
    ],
    correctIndex: 1,
    citation: "Xiaohan Li, Bolin Shi, Rui Chen, Hehe Li, Lulu Zhang, Lei Zhao. (2025). Sodium Reduction Through Sensory Interactions With NaCl: Strategies and Underlying Mechanisms.. Food science & nutrition. https://doi.org/10.1002/fsn3.70548",
    articleId: "a8a67346-a564-4900-b1f5-e55d14d01f38",
    articleTitle: "Sodium Reduction Through Sensory Interactions With NaCl: Strategies and Underlying Mechanisms.",
    articleUrl: "https://doi.org/10.1002/fsn3.70548",
    topic: "flavor_science",
    needsRetag: false
  },
  {
    id: "e45b0e11-1629-4c5e-abac-6997891f08bf::phronesis::7",
    register: "phronesis",
    sender: "kock",
    question: "You are sourcing honey for a mead that will ferment for eight months. A supplier offers a blend at a good price and assures you it passed standard sugar testing. What is the core tension in this decision?",
    options: [
    { label: "Standard sugar tests may clear an adulterated honey, but the floral character that defines your ferment's flavor architecture could still be absent or distorted — something only time and your palate will reveal." },
    { label: "The blend is likely fine for a long ferment because sugar composition is the only variable that affects how honey expresses itself once fermentation begins." },
    { label: "Sourcing from a blend is acceptable as long as the supplier can name the dominant floral variety, since the minor components won't survive eight months of fermentation anyway." }
    ],
    citation: "Ammar Zakaria, Ali Yeon Md Shakaff, Maz Jamilah Masnan, Mohd Noor Ahmad, Abdul Hamid Adom, Mahmad Nor Jaafar, Supri A. Ghani, Abu Hassan Abdullah, Abdul Aziz, Latifah Munirah Kamarudin, Norazian Subari, N. A. Fikri. (2011). A Biomimetic Sensor for the Classification of Honeys of Different Floral Origin and the Detection of Adulteration. Sensors. https://doi.org/10.3390/s110807799",
    articleId: "e45b0e11-1629-4c5e-abac-6997891f08bf",
    articleTitle: "A Biomimetic Sensor for the Classification of Honeys of Different Floral Origin and the Detection of Adulteration",
    articleUrl: "https://doi.org/10.3390/s110807799",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "4a580989-bb76-42b1-b949-2410db90e3a0::techne::8",
    register: "techne",
    sender: "kock",
    question: "You are sourcing a soy sauce for a dish where deep umami and aroma complexity are the priority. Which substrate characteristic should guide your selection?",
    options: [
    { label: "Whether the koji was made with defatted soybean meal and wheat bran, as this substrate yields higher amino nitrogen and reducing sugars, indicating greater savory intensity.", correct: true },
    { label: "Whether the soy sauce was aged for the longest available period, since fermentation time is the primary driver of amino nitrogen content regardless of substrate.", correct: false },
    { label: "Whether whole soybeans were used, since their higher fat content converts directly into aroma compounds during fermentation.", correct: false },
    { label: "Whether salt concentration during moromi was kept at the minimum threshold, as lower salinity maximises umami compound production across all substrate types.", correct: false }
    ],
    correctIndex: 0,
    citation: "Kai-Yao Chen, Na Zhang, Wen-Hu Liu, Cheng Wang, Yongxian Hu, Caihong Shen, Li Zeng, Ran Xu. (2025). Defatted Soybean Meal-Based Koji Promotes Flavor Development in Deyang Baiwo Soy Sauce: A Comparative Multi-Omics Study. Fermentation. https://doi.org/10.3390/fermentation11120685",
    articleId: "4a580989-bb76-42b1-b949-2410db90e3a0",
    articleTitle: "Defatted Soybean Meal-Based Koji Promotes Flavor Development in Deyang Baiwo Soy Sauce: A Comparative Multi-Omics Study",
    articleUrl: "https://doi.org/10.3390/fermentation11120685",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "ab6efa97-5151-4b25-8957-88477e38531b::episteme::9",
    register: "episteme",
    sender: "värd",
    question: "According to current research, how should a restaurant be understood in relation to the dining experience?",
    options: [
    { label: "As a holistic sensory system, where elements like music, lighting, aroma, and temperature contribute to the overall experience and potentially to taste itself.", correct: true },
    { label: "As a delivery mechanism for food, where the quality of the dish is the sole determinant of the dining experience.", correct: false },
    { label: "As a social environment where guest interaction is the primary factor shaping perceived taste.", correct: false },
    { label: "As a controlled setting where temperature and lighting are managed primarily for food safety, not sensory impact.", correct: false }
    ],
    correctIndex: 0,
    citation: "Charles Spence, Betina Piqueras‐Fiszman. (2014). How Important is Atmosphere to the Perfect Meal?. https://doi.org/10.1002/9781118491003.ch9",
    articleId: "ab6efa97-5151-4b25-8957-88477e38531b",
    articleTitle: "How Important is Atmosphere to the Perfect Meal?",
    articleUrl: "https://doi.org/10.1002/9781118491003.ch9",
    topic: "multisensory",
    needsRetag: false
  },
  {
    id: "6c010c0b-b031-4e76-83e9-011c2bbc85bd::episteme::10",
    register: "episteme",
    sender: "kock",
    question: "You're finishing a braise with a red wine reduction and notice a drying, coating sensation on the palate. What actually drives the quality of that astringent effect — tannin concentration or tannin structure?",
    options: [
    { label: "Tannin concentration alone determines the intensity and quality of astringency.", correct: false },
    { label: "Tannin structure determines the quality of the astringent effect, independently of concentration alone.", correct: true },
    { label: "Astringency is driven by the alcohol content interacting with salivary proteins, not by tannins directly.", correct: false },
    { label: "The aggregation of tannin complexes is caused by heat during cooking, not by tannin type.", correct: false }
    ],
    correctIndex: 1,
    citation: "Jacqui M. McRae, James A. Kennedy. (2011). Wine and Grape Tannin Interactions with Salivary Proteins and Their Impact on Astringency: A Review of Current Research. Molecules. https://doi.org/10.3390/molecules16032348",
    articleId: "6c010c0b-b031-4e76-83e9-011c2bbc85bd",
    articleTitle: "Wine and Grape Tannin Interactions with Salivary Proteins and Their Impact on Astringency: A Review of Current Research",
    articleUrl: "https://doi.org/10.3390/molecules16032348",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "05f55d82-530a-4f3a-a407-7e8a279eb3c3::episteme::11",
    register: "episteme",
    sender: "servitör",
    question: "What does current research identify as the primary driver of foam collar stability in Champagne?",
    options: [
    { label: "The level of carbonation and serving temperature", correct: false },
    { label: "Amphiphilic macromolecules acting at the liquid-air interface", correct: true },
    { label: "The sugar content introduced during dosage", correct: false },
    { label: "The pressure maintained during secondary fermentation", correct: false }
    ],
    correctIndex: 1,
    citation: "Véronique Aguié-Beghin, Zouleika Abdallah. (2019). Champagne Bubbles : Isolation and Characterization of amphiphilic macromolecules responsible for the stability of the collar at the Champagne / air interface. arXiv. http://arxiv.org/abs/1904.09194v1",
    articleId: "05f55d82-530a-4f3a-a407-7e8a279eb3c3",
    articleTitle: "Champagne Bubbles : Isolation and Characterization of amphiphilic macromolecules responsible for the stability of the collar at the Champagne / air interface",
    articleUrl: "http://arxiv.org/abs/1904.09194v1",
    topic: "sommellerie",
    needsRetag: false
  },
  {
    id: "168a5cfb-f6df-4b95-be1f-71e68eae8961::episteme::12",
    register: "episteme",
    sender: "kock",
    question: "According to current research, how are fermented pickles and bamboo beverages from northeast India now classified beyond their traditional culinary role?",
    options: [
    { label: "As heritage ingredients protected under regional food law", correct: false },
    { label: "As functional fermented foods with probiotic potential worth scientific investigation", correct: true },
    { label: "As medicinal preparations requiring pharmaceutical regulation", correct: false },
    { label: "As standard fermented condiments with no distinguished health claim", correct: false }
    ],
    correctIndex: 1,
    citation: "Jain Priyanshi M, Kammara Rajagopal. (2023). Probiotic Potential of Indian Traditional Fermented Foods to Combat Listeriosis. Annals of Microbiology and Research. https://doi.org/10.36959/958/587",
    articleId: "168a5cfb-f6df-4b95-be1f-71e68eae8961",
    articleTitle: "Probiotic Potential of Indian Traditional Fermented Foods to Combat Listeriosis",
    articleUrl: "https://doi.org/10.36959/958/587",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "fe0f64f9-2ab7-46b1-9f8f-778758b9ec8c::episteme::13",
    register: "episteme",
    sender: "värd",
    question: "According to research on food images shared by diners on social media, what does the visual output of a kitchen signal?",
    options: [
    { label: "It reflects the chef's plating technique too inconsistently to be classified by automated tools.", correct: false },
    { label: "It carries a signal distinctive enough to be classified by a deep learning model, with different restaurant types producing measurably different aesthetic qualities.", correct: true },
    { label: "It is indistinguishable across restaurant types once images are filtered through social media compression.", correct: false },
    { label: "It primarily signals the diner's photography skill rather than any quality originating in the kitchen.", correct: false }
    ],
    correctIndex: 1,
    citation: "Alessandro Gambetti, Qiwei Han. (2022). Camera eats first: exploring food aesthetics portrayed on social media using deep learning. International Journal of Contemporary Hospitality Management. https://doi.org/10.1108/ijchm-09-2021-1206",
    articleId: "fe0f64f9-2ab7-46b1-9f8f-778758b9ec8c",
    articleTitle: "Camera eats first: exploring food aesthetics portrayed on social media using deep learning",
    articleUrl: "https://doi.org/10.1108/ijchm-09-2021-1206",
    topic: "art_science",
    needsRetag: false
  },
  {
    id: "012305e0-767b-4a33-9662-65a3a155a247::episteme::14",
    register: "episteme",
    sender: "kock",
    question: "A cook on your team has strong food safety knowledge and a positive attitude but still cuts corners on hygiene. According to recent research on food safety compliance, what best explains the gap between knowing the right thing and actually doing it?",
    options: [
    { label: "Insufficient technical training in hygiene procedures", correct: false },
    { label: "Affective and normative commitment — emotional investment and felt obligation — only partially mediate the link between knowledge, attitude, and hygienic practice", correct: true },
    { label: "Lack of knowledge about food safety standards", correct: false },
    { label: "Poor attitude toward food safety as the primary driver of non-compliance", correct: false }
    ],
    correctIndex: 1,
    citation: "Sadi Taha, Malak Angor, Khaled M. Al‐Marazeeq, Tareq M. Osaili, Ahmad Albloush, Walid M. Al‐Rousan, Radwan Ajo, Richard A. Holley, Arif Fadhel, Omar Alboqai. (2024). Improving food safety compliance of potential employees through a novel model of knowledge, attitude, commitment, and practice. Journal of Food Science. https://doi.org/10.1111/1750-3841.17536",
    articleId: "012305e0-767b-4a33-9662-65a3a155a247",
    articleTitle: "Improving food safety compliance of potential employees through a novel model of knowledge, attitude, commitment, and practice",
    articleUrl: "https://doi.org/10.1111/1750-3841.17536",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "5435632f-15be-476b-81c3-f1af1fd68e57::phronesis::15",
    register: "phronesis",
    sender: "kock",
    question: "Your reduced-fat house Cheddar tastes thin and underdeveloped no matter how long you age it. A study you've read suggests fat reduction has restructured the aroma compound environment, not just slowed ripening. You could keep extending the aging time hoping the flavor fills in, adjust your fermentation or affinage conditions to favor the volatile compounds the study identifies as key, or pull the cheese earlier and compensate with accompaniments on the plate. Which approach addresses the root cause the study points to, and what are you giving up with each path?",
    options: [
    { label: "Extend aging further — it may simply need more time than a full-fat Cheddar, and patience is low-risk, though the study suggests time alone may not resolve a restructured aroma environment." },
    { label: "Investigate adjustments to fermentation or affinage conditions to favor the key volatile compound class — this targets the mechanism the study identifies, though the full protocol requires consulting the primary source and may demand significant R&D investment." },
    { label: "Accept the flavor gap and build the course around accompaniments that mask the thin profile — fastest solution, but sidesteps the cheese development problem entirely and may not satisfy a health-focused menu concept built on the Cheddar itself." }
    ],
    citation: "Myung-joo KIM, S.L. Drake, M.A. Drake. (2011). EVALUATION OF KEY FLAVOR COMPOUNDS IN REDUCED- AND FULL-FAT CHEDDAR CHEESES USING SENSORY STUDIES ON MODEL SYSTEMS. Journal of Sensory Studies. https://doi.org/10.1111/j.1745-459x.2011.00343.x",
    articleId: "5435632f-15be-476b-81c3-f1af1fd68e57",
    articleTitle: "EVALUATION OF KEY FLAVOR COMPOUNDS IN REDUCED- AND FULL-FAT CHEDDAR CHEESES USING SENSORY STUDIES ON MODEL SYSTEMS",
    articleUrl: "https://doi.org/10.1111/j.1745-459x.2011.00343.x",
    topic: "sensory_evaluation",
    needsRetag: false
  },
  {
    id: "00c315d1-c736-45cd-871b-676659b924f7::episteme::16",
    register: "episteme",
    sender: "värd",
    question: "What primary social function did dinner party menus serve during the Gilded Age, beyond expressing culinary preference?",
    options: [
    { label: "They served as a test of cultural legitimacy, used to assess newcomers and perform elite identity.", correct: true },
    { label: "They functioned mainly as logistical tools to coordinate kitchen staff and service timing.", correct: false },
    { label: "They were primarily designed to showcase the chef's technical range to a professional audience.", correct: false },
    { label: "They acted as neutral culinary documents reflecting regional ingredient availability.", correct: false }
    ],
    correctIndex: 0,
    citation: "Stewart C.. (2024). Minding your manners in the Gilded Age. Food Culture and Society. https://doi.org/10.1080/15528014.2023.2300105",
    articleId: "00c315d1-c736-45cd-871b-676659b924f7",
    articleTitle: "Minding your manners in the Gilded Age",
    articleUrl: "https://doi.org/10.1080/15528014.2023.2300105",
    topic: "food_anthropology",
    needsRetag: false
  },
  {
    id: "634ac110-c6e8-409f-b7e0-2f67d532b7de::episteme::17",
    register: "episteme",
    sender: "kock",
    question: "A guest challenges you on why an herb considered 'stinking' in one culinary tradition might still have genuine kitchen value. What is the most accurate way to frame the situation?",
    options: [
    { label: "The 'stinking' label reflects a social and historical inheritance, not a verdict on the ingredient's actual culinary value.", correct: true },
    { label: "The label is accurate because malodorous herbs have been consistently rejected across all cultures for the same aromatic reasons.", correct: false },
    { label: "Cultural rejection of an herb always corresponds to a measurable defect in its flavor profile.", correct: false },
    { label: "An herb's reputation is fixed once established in a culinary tradition and cannot be separated from its intrinsic quality.", correct: false }
    ],
    correctIndex: 0,
    citation: "Helen Leach. (2001). Rehabilitating the \"Stinking Herbe\": A Case Study of Culinary Prejudice. Gastronomica The Journal of Food and Culture. https://doi.org/10.1525/gfc.2001.1.2.10",
    articleId: "634ac110-c6e8-409f-b7e0-2f67d532b7de",
    articleTitle: "Rehabilitating the \"Stinking Herbe\": A Case Study of Culinary Prejudice",
    articleUrl: "https://doi.org/10.1525/gfc.2001.1.2.10",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "01e716da-8c88-45ad-bacc-64d9b649f0f4::phronesis::18",
    register: "phronesis",
    sender: "kock",
    question: "You are developing two bread lines for a client: one marketed as a high-fiber, mineral-rich functional loaf, the other as a premium soft sandwich bread where crumb texture is the main selling point. You have access to a wheat-millet-sorghum composite flour blend tested at several substitution levels. How do you approach the formulation decision differently for each product?",
    options: [
    { label: "Use the same substitution level for both products, since sensory panelists in the study did not distinguish between lower and higher composite ratios." },
    { label: "Push the composite flour substitution higher in the nutritionally positioned loaf, where texture trade-offs are more acceptable, and stay closer to the lower end for the soft sandwich bread, where crumb softness is the market promise." },
    { label: "Maximize composite flour in both products to fully leverage the fat, fiber, and mineral profiles of millet and sorghum, and adjust hydration alone to compensate for any texture loss." }
    ],
    citation: "Aneeq Ahmad, Shahid Bashir, Kanza Saeed, Hafiza Haima, Rai Muhammad Amir, Waseem Khalid, Muhammad Ishfaq Ahmad, Amanullah Sabir, Muhammad Zubair Khalid, Naz̲īr Aḥmad, Isam A. Mohamed Ahmed, Mahmoud Younis. (2025). Nutritional, textural, and sensory properties of bread from wheat-, millet-, and sorghum-based composite flour. Italian Journal of Food Science. https://doi.org/10.15586/ijfs.v37i4.2974",
    articleId: "01e716da-8c88-45ad-bacc-64d9b649f0f4",
    articleTitle: "Nutritional, textural, and sensory properties of bread from wheat-, millet-, and sorghum-based composite flour",
    articleUrl: "https://doi.org/10.15586/ijfs.v37i4.2974",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "00ea7c69-44e2-4c2a-8f39-00f653ccd9f2::episteme::19",
    register: "episteme",
    sender: "värd",
    question: "A study on beverage freshness found that audiovisual cues — such as visible effervescence and ambient sound — act on freshness perception in which way?",
    options: [
    { label: "They override chemosensory cues entirely, making chemical composition irrelevant.", correct: false },
    { label: "They add to one another in shaping freshness categorization, independently of the drink's chemical or fermentation profile.", correct: true },
    { label: "They only influence freshness perception when chemosensory cues are absent.", correct: false },
    { label: "Their effect depends on the drink's carbonation level as measured chemically.", correct: false }
    ],
    correctIndex: 1,
    citation: "Jérémy Roque, Jérémie Lafraire, Charles Spence, Malika Auvray. (2018). The influence of audiovisual stimuli cuing temperature, carbonation, and color on the categorization of freshness in beverages. Journal of Sensory Studies. https://doi.org/10.1111/joss.12469",
    articleId: "00ea7c69-44e2-4c2a-8f39-00f653ccd9f2",
    articleTitle: "The influence of audiovisual stimuli cuing temperature, carbonation, and color on the categorization of freshness in beverages",
    articleUrl: "https://doi.org/10.1111/joss.12469",
    topic: "multisensory",
    needsRetag: false
  },
  {
    id: "00c315d1-c736-45cd-871b-676659b924f7::phronesis::20",
    register: "phronesis",
    sender: "värd",
    question: "You are designing a tasting menu for a corporate client who wants the evening to project authority and tradition. A colleague suggests anchoring the menu around familiar, conservative dishes to signal stability. Another pushes for bold, avant-garde courses to signal innovation and ambition. You are aware that guests will read your choices as social and cultural signals, not just culinary ones. How do you weigh these competing directions?",
    options: [
    { label: "Default to the conservative menu — guests in a corporate context are more likely to interpret familiar dishes as respectful and safe, which protects the client's social image even if it sacrifices culinary distinction." },
    { label: "Lean toward the avant-garde menu — a bold selection signals that the client is forward-thinking, and the culinary risk is worth the cultural statement it makes on their behalf." },
    { label: "Treat the menu as a deliberate communication tool, aligning dish choices with the specific message the client wants to send, since both conservative and bold choices carry cultural meaning that reflects on the host, not just the kitchen." }
    ],
    citation: "Stewart C.. (2024). Minding your manners in the Gilded Age. Food Culture and Society. https://doi.org/10.1080/15528014.2023.2300105",
    articleId: "00c315d1-c736-45cd-871b-676659b924f7",
    articleTitle: "Minding your manners in the Gilded Age",
    articleUrl: "https://doi.org/10.1080/15528014.2023.2300105",
    topic: "food_anthropology",
    needsRetag: false
  },
  {
    id: "02107df8-3396-401b-93e6-407336960fd2::episteme::21",
    register: "episteme",
    sender: "värd",
    question: "A guest has just finished a chocolate mousse. Compared to a calorie-matched portion of cottage cheese, how broadly does the chocolate mousse suppress their desire to eat?",
    options: [
    { label: "It suppresses 'wanting' across several food categories, while cottage cheese suppresses it only in the bread category.", correct: true },
    { label: "It suppresses 'wanting' only in the dessert category, while cottage cheese suppresses it across several categories.", correct: false },
    { label: "Both suppress 'wanting' equally broadly, because they are matched for caloric content.", correct: false },
    { label: "It suppresses 'wanting' only in the bread category, the same as cottage cheese.", correct: false }
    ],
    correctIndex: 0,
    citation: "Sofie G T Lemmens, Paul F M Schoffelen, Loek Wouters, Jurriaan M Born, Mieke J I Martens, Femke Rutters, Margriet S Westerterp-Plantenga. (2009). Eating what you like induces a stronger decrease of 'wanting' to eat.. Physiology & behavior. https://doi.org/10.1016/j.physbeh.2009.06.008",
    articleId: "02107df8-3396-401b-93e6-407336960fd2",
    articleTitle: "Eating what you like induces a stronger decrease of 'wanting' to eat.",
    articleUrl: "https://doi.org/10.1016/j.physbeh.2009.06.008",
    topic: "food_psychology",
    needsRetag: false
  },
  {
    id: "000747dd-bbe6-4703-9a11-bbecefdc6959::phronesis::22",
    register: "phronesis",
    sender: "värd",
    question: "The winery owner wants to evaluate whether your new fermentation dinner series is worth continuing. She pulls up direct sales numbers from the nights you ran it and sees no clear uplift. She asks you to make the case — or agree to cut the programme. How do you approach this conversation?",
    options: [
    { label: "Acknowledge the flat direct sales figures, then argue that the programme's value likely shows up in winery image and word-of-mouth, which are real but harder to capture in a single sales metric." },
    { label: "Concede that direct sales are the only reliable measure of commercial value for an experience like this, and propose a redesign focused on upselling wine at the table." },
    { label: "Request a longer trial period on the grounds that direct sales always lag behind hospitality investment, without addressing what the programme actually contributes in the meantime." }
    ],
    citation: "Sławomir Smyczek, Giuseppe Festa, Matteo Rossi, Filippo Monge. (2020). Economic sustainability of wine tourism services and direct sales performance – emergent profiles from Italy. British Food Journal. https://doi.org/10.1108/BFJ-08-2019-0651",
    articleId: "000747dd-bbe6-4703-9a11-bbecefdc6959",
    articleTitle: "Economic sustainability of wine tourism services and direct sales performance – emergent profiles from Italy",
    articleUrl: "https://doi.org/10.1108/BFJ-08-2019-0651",
    topic: "gastronomy",
    needsRetag: false
  },
  {
    id: "00118249-9d64-4d64-b11f-99d51ef4e232::episteme::23",
    register: "episteme",
    sender: "kock",
    question: "You are comparing processing methods for chickpea flour — soaking, germination, cooking, and lactic acid bacteria fermentation. Which method most effectively reduces trypsin inhibitors and tannins while also increasing total phenolic content?",
    options: [
    { label: "Soaking", correct: false },
    { label: "Germination", correct: false },
    { label: "Cooking", correct: false },
    { label: "Fermentation with Lactiplantibacillus plantarum CRL2211 and Weissella paramesenteroides CRL2182 for 24 hours at 37°C", correct: true }
    ],
    correctIndex: 3,
    citation: "Gabriel Dario Saez, Carlos Sabater, Agustina Fara, Gabriela Zárate. (2021). Fermentation of chickpea flour with selected lactic acid bacteria for improving its nutritional and functional properties. Journal of Applied Microbiology. https://doi.org/10.1111/jam.15401",
    articleId: "00118249-9d64-4d64-b11f-99d51ef4e232",
    articleTitle: "Fermentation of chickpea flour with selected lactic acid bacteria for improving its nutritional and functional properties",
    articleUrl: "https://doi.org/10.1111/jam.15401",
    topic: "nutritional_science",
    needsRetag: false
  },
  {
    id: "00118249-9d64-4d64-b11f-99d51ef4e232::techne::24",
    register: "techne",
    sender: "kock",
    question: "You are fermenting chickpea flour with lactic acid bacteria to improve its nutritional profile. According to the research, which conditions are reported as optimal for this process?",
    options: [
    { label: "25°C for 48 hours", correct: false },
    { label: "37°C for 24 hours", correct: true },
    { label: "42°C for 12 hours", correct: false },
    { label: "30°C for 72 hours", correct: false }
    ],
    correctIndex: 1,
    citation: "Gabriel Dario Saez, Carlos Sabater, Agustina Fara, Gabriela Zárate. (2021). Fermentation of chickpea flour with selected lactic acid bacteria for improving its nutritional and functional properties. Journal of Applied Microbiology. https://doi.org/10.1111/jam.15401",
    articleId: "00118249-9d64-4d64-b11f-99d51ef4e232",
    articleTitle: "Fermentation of chickpea flour with selected lactic acid bacteria for improving its nutritional and functional properties",
    articleUrl: "https://doi.org/10.1111/jam.15401",
    topic: "nutritional_science",
    needsRetag: false
  },
  {
    id: "00118249-9d64-4d64-b11f-99d51ef4e232::phronesis::25",
    register: "phronesis",
    sender: "kock",
    question: "You want to add a fermented chickpea cracker to a health-focused menu and the study shows LAB fermentation lowers antinutritional factors and raises antioxidant activity. Your kitchen runs at variable temperatures and you have no dedicated fermentation chamber. How do you weigh the decision to proceed?",
    options: [
    { label: "Proceed using your standard ambient conditions — the fermentation will happen regardless and the nutritional gains will follow." },
    { label: "Pause and assess whether your kitchen can reliably hold the temperature and microbial conditions the study specifies before committing to the process." },
    { label: "Skip fermentation entirely and rely on extended soaking and cooking, which the study indicates delivers equivalent results." }
    ],
    citation: "Gabriel Dario Saez, Carlos Sabater, Agustina Fara, Gabriela Zárate. (2021). Fermentation of chickpea flour with selected lactic acid bacteria for improving its nutritional and functional properties. Journal of Applied Microbiology. https://doi.org/10.1111/jam.15401",
    articleId: "00118249-9d64-4d64-b11f-99d51ef4e232",
    articleTitle: "Fermentation of chickpea flour with selected lactic acid bacteria for improving its nutritional and functional properties",
    articleUrl: "https://doi.org/10.1111/jam.15401",
    topic: "nutritional_science",
    needsRetag: false
  },
  {
    id: "0034fed1-bbeb-4354-906d-f3957ad68210::episteme::26",
    register: "episteme",
    sender: "kock",
    question: "Compared to a standard vinegar-based hot sauce, what happens to pH and viscosity when you swap in a liquor — tequila, rum, vodka, or bourbon — as the base preservative?",
    options: [
    { label: "pH drops and viscosity decreases", correct: false },
    { label: "pH rises and viscosity increases", correct: true },
    { label: "pH drops and viscosity increases", correct: false },
    { label: "pH and viscosity remain unchanged", correct: false }
    ],
    correctIndex: 1,
    citation: "Ricardo S. Alemán, Jhunior Marcía, Ismael Montero-Fernández, Joan M. King, Shirin Kazemzadeh Pournaki, Roberta Targino Hoskin, Marvin Moncada. (2023). Novel Liquor-Based Hot Sauce: Physicochemical Attributes, Volatile Compounds, Sensory Evaluation, Consumer Perception, Emotions, and Purchase Intent. Foods. https://doi.org/10.3390/foods12020369",
    articleId: "0034fed1-bbeb-4354-906d-f3957ad68210",
    articleTitle: "Novel Liquor-Based Hot Sauce: Physicochemical Attributes, Volatile Compounds, Sensory Evaluation, Consumer Perception, Emotions, and Purchase Intent",
    articleUrl: "https://doi.org/10.3390/foods12020369",
    topic: "sensory_evaluation",
    needsRetag: false
  },
  {
    id: "0034fed1-bbeb-4354-906d-f3957ad68210::techne::27",
    register: "techne",
    sender: "kock",
    question: "You are switching your hot sauce base from vinegar to a distilled liquor. Which quality indicator should you monitor most closely to distinguish how the two productions differ?",
    options: [
    { label: "Acidity level, since the liquor base will produce a more acidic sauce than vinegar", correct: false },
    { label: "Paste formation behavior, as a key rheological marker that sets liquor-based sauce apart from vinegar-based", correct: true },
    { label: "Color deepening, because a liquor base will yield a darker product than vinegar", correct: false },
    { label: "Fermentation temperature, which is the primary variable the article identifies for process control", correct: false }
    ],
    correctIndex: 1,
    citation: "Ricardo S. Alemán, Jhunior Marcía, Ismael Montero-Fernández, Joan M. King, Shirin Kazemzadeh Pournaki, Roberta Targino Hoskin, Marvin Moncada. (2023). Novel Liquor-Based Hot Sauce: Physicochemical Attributes, Volatile Compounds, Sensory Evaluation, Consumer Perception, Emotions, and Purchase Intent. Foods. https://doi.org/10.3390/foods12020369",
    articleId: "0034fed1-bbeb-4354-906d-f3957ad68210",
    articleTitle: "Novel Liquor-Based Hot Sauce: Physicochemical Attributes, Volatile Compounds, Sensory Evaluation, Consumer Perception, Emotions, and Purchase Intent",
    articleUrl: "https://doi.org/10.3390/foods12020369",
    topic: "sensory_evaluation",
    needsRetag: false
  },
  {
    id: "0034fed1-bbeb-4354-906d-f3957ad68210::phronesis::28",
    register: "phronesis",
    sender: "kock",
    question: "You're developing a new bourbon-based hot sauce for the restaurant. Your apprentice asks whether it's safe to move forward with testing, pointing out that no one on the team has verified shelf stability or microbiological safety. You know a study tracked these properties over 20 weeks. How do you handle the tension between moving the project forward and ensuring the team works responsibly?",
    options: [
    { label: "Use the study's findings as a reasonable basis to continue developing the sauce, but require the team to review the full study data before locking in any production protocol." },
    { label: "Halt development entirely until you commission your own independent microbiological testing, since published research cannot be applied directly to your kitchen's specific conditions." },
    { label: "Proceed without additional review — a 20-week study tracking physicochemical and microbiological quality is sufficient validation to finalize the recipe and begin service." }
    ],
    citation: "Ricardo S. Alemán, Jhunior Marcía, Ismael Montero-Fernández, Joan M. King, Shirin Kazemzadeh Pournaki, Roberta Targino Hoskin, Marvin Moncada. (2023). Novel Liquor-Based Hot Sauce: Physicochemical Attributes, Volatile Compounds, Sensory Evaluation, Consumer Perception, Emotions, and Purchase Intent. Foods. https://doi.org/10.3390/foods12020369",
    articleId: "0034fed1-bbeb-4354-906d-f3957ad68210",
    articleTitle: "Novel Liquor-Based Hot Sauce: Physicochemical Attributes, Volatile Compounds, Sensory Evaluation, Consumer Perception, Emotions, and Purchase Intent",
    articleUrl: "https://doi.org/10.3390/foods12020369",
    topic: "sensory_evaluation",
    needsRetag: false
  },
  {
    id: "003790eb-13f8-4883-bc05-86547d1565f0::episteme::29",
    register: "episteme",
    sender: "kock",
    question: "At what flaxseed inclusion level did a bagel show no statistically significant difference from a control bagel in sensory attributes — including texture — when rated by adults aged 50 and older?",
    options: [
    { label: "10%", correct: false },
    { label: "15%", correct: false },
    { label: "23%", correct: true },
    { label: "30%", correct: false }
    ],
    correctIndex: 2,
    citation: "Jenny Nguyen, Cheryl Rock, Virginia Gray, Maria Claver, Christine Costa. (2019). Product Development Considerations of Flaxseed Supplementation for the Aging Population: A Pilot Study. Journal of Food Research. https://doi.org/10.5539/jfr.v8n3p42",
    articleId: "003790eb-13f8-4883-bc05-86547d1565f0",
    articleTitle: "Product Development Considerations of Flaxseed Supplementation for the Aging Population: A Pilot Study",
    articleUrl: "https://doi.org/10.5539/jfr.v8n3p42",
    topic: "nutritional_science",
    needsRetag: false
  },
  {
    id: "003790eb-13f8-4883-bc05-86547d1565f0::phronesis::30",
    register: "phronesis",
    sender: "kock",
    question: "You are developing a functional breakfast item for your senior dining program. A recent study shows a 23% flaxseed bagel was acceptable to older adults, but the study involved only twenty participants. You are considering whether to add it to the menu immediately, run your own tasting first, or drop the idea entirely because the evidence is too thin. How do you proceed?",
    options: [
    { label: "Roll the item out immediately — a peer-reviewed finding of acceptability is sufficient justification for a menu commitment." },
    { label: "Treat the study finding as directional, run a small tasting with your actual guest population using sensory dimensions as your evaluation checklist, and then decide on a rollout." },
    { label: "Discard the concept entirely — a sample of twenty provides no usable signal and the development cost is not worth the risk." }
    ],
    citation: "Jenny Nguyen, Cheryl Rock, Virginia Gray, Maria Claver, Christine Costa. (2019). Product Development Considerations of Flaxseed Supplementation for the Aging Population: A Pilot Study. Journal of Food Research. https://doi.org/10.5539/jfr.v8n3p42",
    articleId: "003790eb-13f8-4883-bc05-86547d1565f0",
    articleTitle: "Product Development Considerations of Flaxseed Supplementation for the Aging Population: A Pilot Study",
    articleUrl: "https://doi.org/10.5539/jfr.v8n3p42",
    topic: "nutritional_science",
    needsRetag: false
  },
  {
    id: "003e76e7-d8e6-4826-bc03-fe04b63bae15::phronesis::31",
    register: "phronesis",
    sender: "kock",
    question: "You are overseeing production of a Daqu-fermented condiment and notice that the depth of pyrazine character shifts unpredictably from one batch to the next, even though your time, temperature, and moisture parameters have not changed. A researcher suggests the cause may be shifts in Bacillus species composition rather than process drift. Your purchasing manager wants to continue using the current generic microbiological testing protocol because it is cheaper. Your quality lead wants to move to species-resolved microbial monitoring. How do you weigh these positions?",
    options: [
    { label: "Maintain the generic testing protocol, since process parameters are already controlled and the additional cost of species-resolved monitoring is not justified until batch failures become more frequent." },
    { label: "Advocate for species-resolved microbial monitoring as a diagnostic tool, on the basis that generic testing cannot distinguish between Bacillus species and therefore cannot explain pyrazine variation that process parameters alone do not account for." },
    { label: "Suspend Daqu-fermented production until the exact Bacillus species responsible for pyrazine development is isolated and a controlled inoculation protocol is established, rather than invest in ongoing monitoring." }
    ],
    citation: "Ying Wang, Xuhan Xia, Minghua Wu, Qiyao Sun, Wei Zhang, Yong Qiu, Ruijie Deng, Aimin Luo. (2023). Species-Level Monitoring of Key Bacteria in Fermentation Processes Using Single-Nucleotide Resolved Nucleic Acid Assays Based on CRISPR/Cas12. Journal of Agricultural and Food Chemistry. https://doi.org/10.1021/acs.jafc.3c04775",
    articleId: "003e76e7-d8e6-4826-bc03-fe04b63bae15",
    articleTitle: "Species-Level Monitoring of Key Bacteria in Fermentation Processes Using Single-Nucleotide Resolved Nucleic Acid Assays Based on CRISPR/Cas12",
    articleUrl: "https://doi.org/10.1021/acs.jafc.3c04775",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "004073aa-8209-45bb-97e3-fb6fc78ac0a2::episteme::32",
    register: "episteme",
    sender: "kock",
    question: "When you pitch yeast at a higher initial cell density, what happens to the timeline for secondary metabolite formation and reabsorption?",
    options: [
    { label: "It extends, giving secondary metabolites more time to develop", correct: false },
    { label: "It is compressed, shortening the window for secondary metabolites to form and be reabsorbed", correct: true },
    { label: "It remains unchanged because secondary metabolites depend on temperature, not cell density", correct: false },
    { label: "It becomes unpredictable and cannot be managed as a production variable", correct: false }
    ],
    correctIndex: 1,
    citation: "Pieter J. Verbelen, Sebastiaan E. Van Mulders, Daan Saison, Stijn D. M. Van Laere, Filip Delvaux, Freddy R. Delvaux. (2008). Characteristics of High Cell Density Fermentations with Different Lager Yeast Strains. Journal of the Institute of Brewing. https://doi.org/10.1002/j.2050-0416.2008.tb00317.x",
    articleId: "004073aa-8209-45bb-97e3-fb6fc78ac0a2",
    articleTitle: "Characteristics of High Cell Density Fermentations with Different Lager Yeast Strains",
    articleUrl: "https://doi.org/10.1002/j.2050-0416.2008.tb00317.x",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "004073aa-8209-45bb-97e3-fb6fc78ac0a2::techne::33",
    register: "techne",
    sender: "kock",
    question: "You're setting up a high-cell-density fermentation. You've confirmed your yeast viability is above 95% and you're pitching at 80 million cells per milliliter. What do you need to watch closely during fermentation because the faster activity compresses your working window?",
    options: [
    { label: "Diacetyl rest timing, since the accelerated fermentation shortens the window for vicinal diketone reduction before conditioning begins.", correct: true },
    { label: "Hop utilization rate, since higher cell counts extract more iso-alpha acids during fermentation.", correct: false },
    { label: "Yeast autolysis risk, since pitching above 80 million cells per milliliter causes immediate cell death.", correct: false },
    { label: "Clarification timing, since high cell density fermentations produce more protein haze that must be removed before conditioning.", correct: false }
    ],
    correctIndex: 0,
    citation: "Pieter J. Verbelen, Sebastiaan E. Van Mulders, Daan Saison, Stijn D. M. Van Laere, Filip Delvaux, Freddy R. Delvaux. (2008). Characteristics of High Cell Density Fermentations with Different Lager Yeast Strains. Journal of the Institute of Brewing. https://doi.org/10.1002/j.2050-0416.2008.tb00317.x",
    articleId: "004073aa-8209-45bb-97e3-fb6fc78ac0a2",
    articleTitle: "Characteristics of High Cell Density Fermentations with Different Lager Yeast Strains",
    articleUrl: "https://doi.org/10.1002/j.2050-0416.2008.tb00317.x",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "004073aa-8209-45bb-97e3-fb6fc78ac0a2::phronesis::34",
    register: "phronesis",
    sender: "kock",
    question: "It's day three of a seven-day fermentation and your gravity readings show the beer is nearly done. The tank smells right, the numbers look solid, but the schedule says you still have four days to go. Do you trust the data and consider moving forward, hold and add a buffer day for safety, or split the difference and recheck every few hours before deciding?",
    options: [
    { label: "Trust the gravity readings and move forward — the yeast have done their work and waiting risks over-conditioning." },
    { label: "Add a buffer day regardless — a single set of readings on day three isn't enough to override a seven-day protocol." },
    { label: "Neither commit nor move on — recheck readings and sensory cues at short intervals and let the trend decide." }
    ],
    citation: "Pieter J. Verbelen, Sebastiaan E. Van Mulders, Daan Saison, Stijn D. M. Van Laere, Filip Delvaux, Freddy R. Delvaux. (2008). Characteristics of High Cell Density Fermentations with Different Lager Yeast Strains. Journal of the Institute of Brewing. https://doi.org/10.1002/j.2050-0416.2008.tb00317.x",
    articleId: "004073aa-8209-45bb-97e3-fb6fc78ac0a2",
    articleTitle: "Characteristics of High Cell Density Fermentations with Different Lager Yeast Strains",
    articleUrl: "https://doi.org/10.1002/j.2050-0416.2008.tb00317.x",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "0058d7fd-37e8-44c5-8ae0-80eddafa7875::episteme::35",
    register: "episteme",
    sender: "kock",
    question: "You are sourcing kombucha SCOBYs from different regions for a fermentation project. Which bacterial genus appears in every SCOBY regardless of its climate of origin?",
    options: [
    { label: "Gluconobacter", correct: false },
    { label: "Komagataeibacter", correct: true },
    { label: "Lactobacillus", correct: false },
    { label: "Acetobacter", correct: false }
    ],
    correctIndex: 1,
    citation: "Qian Wang, Haorui Ma, Yue Zhang, Lanlan Feng, Lili Zhao, Baoshan Zhang, Yu Zhao. (2025). Effect of kombucha SCOBY from different climatic sources on the microbial diversity and quality of kombucha. International Journal of Food Science and Technology. https://doi.org/10.1093/ijfood/vvaf138",
    articleId: "0058d7fd-37e8-44c5-8ae0-80eddafa7875",
    articleTitle: "Effect of kombucha SCOBY from different climatic sources on the microbial diversity and quality of kombucha",
    articleUrl: "https://doi.org/10.1093/ijfood/vvaf138",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "0058d7fd-37e8-44c5-8ae0-80eddafa7875::phronesis::36",
    register: "phronesis",
    sender: "kock",
    question: "You are building a kombucha-forward pairing where a high, consistent acid profile is essential to the dish's balance. Research indicates that a subtropical SCOBY produces significantly elevated acetic, succinic, and glucuronic acids compared to other climatic sources. Your current supplier is local and reliable, but their SCOBY comes from a temperate region. Do you switch to a subtropical SCOBY source for chemical consistency, stay with the local temperate SCOBY and adjust the dish to fit what it delivers, or blend batches from both sources to seek a middle ground?",
    options: [
    { label: "Source the subtropical SCOBY specifically, accepting the supply complexity in order to lock in the elevated acid profile the dish requires." },
    { label: "Stay with the locally available temperate SCOBY and redesign the pairing to work within its actual acid output rather than the target profile." },
    { label: "Blend fermentation batches from both subtropical and temperate SCOBYs, aiming for a compromise between consistency and supply reliability." }
    ],
    citation: "Qian Wang, Haorui Ma, Yue Zhang, Lanlan Feng, Lili Zhao, Baoshan Zhang, Yu Zhao. (2025). Effect of kombucha SCOBY from different climatic sources on the microbial diversity and quality of kombucha. International Journal of Food Science and Technology. https://doi.org/10.1093/ijfood/vvaf138",
    articleId: "0058d7fd-37e8-44c5-8ae0-80eddafa7875",
    articleTitle: "Effect of kombucha SCOBY from different climatic sources on the microbial diversity and quality of kombucha",
    articleUrl: "https://doi.org/10.1093/ijfood/vvaf138",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "343bf5cd-5ffa-47d9-b531-066071a980bd::episteme::37",
    register: "episteme",
    sender: "värd",
    question: "According to research on YouTube food channel followers, which dimensions were found to positively influence tasting behavioral intention?",
    options: [
    { label: "Visual presentation and informational content", correct: false },
    { label: "Experience-sharing, empathy-building, and cyber-community effect", correct: true },
    { label: "Guidance content and cyber-community effect", correct: false },
    { label: "Visual presentation and empathy-building", correct: false }
    ],
    correctIndex: 1,
    citation: "Berre Zeynep UÇAN KAYAALP, Göksel Kemal Girgin, Nilgün Karaman. (2021). Youtube Yemek Kanallarının Tatma Davranışsal Niyeti Üzerine Etkisi. Kırklareli Üniversitesi Sosyal Bilimler Dergisi. https://doi.org/10.47140/kusbder.887291",
    articleId: "343bf5cd-5ffa-47d9-b531-066071a980bd",
    articleTitle: "Youtube Yemek Kanallarının Tatma Davranışsal Niyeti Üzerine Etkisi",
    articleUrl: "https://doi.org/10.47140/kusbder.887291",
    topic: "gastronomy",
    needsRetag: false
  },
  {
    id: "343bf5cd-5ffa-47d9-b531-066071a980bd::phronesis::38",
    register: "phronesis",
    sender: "värd",
    question: "You run a small restaurant and you're deciding where to put your energy on your new YouTube channel. You have limited time, so you must choose a focus. Your video editor says polish the visuals and make every recipe step crystal clear. Your front-of-house manager says stop worrying about production quality and just make the audience feel like they're part of something — share the real story behind each dish and build a community around it. Where do you put your limited hours, and what are you giving up?",
    options: [
    { label: "Invest in high-quality food shots and detailed recipe walkthroughs, accepting that the content may feel less personal and community-driven." },
    { label: "Focus on authentic storytelling and fostering a sense of shared experience among viewers, accepting that production values and recipe clarity may suffer." },
    { label: "Split time evenly between both, accepting that neither the production quality nor the community feel will be fully developed." }
    ],
    citation: "Berre Zeynep UÇAN KAYAALP, Göksel Kemal Girgin, Nilgün Karaman. (2021). Youtube Yemek Kanallarının Tatma Davranışsal Niyeti Üzerine Etkisi. Kırklareli Üniversitesi Sosyal Bilimler Dergisi. https://doi.org/10.47140/kusbder.887291",
    articleId: "343bf5cd-5ffa-47d9-b531-066071a980bd",
    articleTitle: "Youtube Yemek Kanallarının Tatma Davranışsal Niyeti Üzerine Etkisi",
    articleUrl: "https://doi.org/10.47140/kusbder.887291",
    topic: "gastronomy",
    needsRetag: false
  },
  {
    id: "c3e0551c-6b0c-405f-a790-5e76c0a0a7e7::episteme::39",
    register: "episteme",
    sender: "kock",
    question: "Compared to Saccharomyces cerevisiae fermentation, what does Torulaspora delbrueckii tend to produce in terms of acetic acid and glycerol?",
    options: [
    { label: "Higher acetic acid and higher glycerol", correct: false },
    { label: "Lower acetic acid and higher glycerol", correct: true },
    { label: "Lower acetic acid and lower glycerol", correct: false },
    { label: "Higher acetic acid and lower glycerol", correct: false }
    ],
    correctIndex: 1,
    citation: "Flávia Silva-Sousa, Bruna Silveira de Oliveira, Ricardo Franco‐Duarte, Carole Camarasa, Maria João Sousa. (2024). Bridging the gap: linking Torulaspora delbrueckii genotypes to fermentation phenotypes and wine aroma. FEMS Yeast Research. https://doi.org/10.1093/femsyr/foae034",
    articleId: "c3e0551c-6b0c-405f-a790-5e76c0a0a7e7",
    articleTitle: "Bridging the gap: linking Torulaspora delbrueckii genotypes to fermentation phenotypes and wine aroma",
    articleUrl: "https://doi.org/10.1093/femsyr/foae034",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "c3e0551c-6b0c-405f-a790-5e76c0a0a7e7::phronesis::40",
    register: "phronesis",
    sender: "kock",
    question: "You're developing a wine-based sauce and sourcing a non-Saccharomyces yeast to keep volatile acidity low while adding body. A supplier offers you a Torulaspora delbrueckii product and assures you the species is well-documented for those traits. Do you commit to it, ask for more, or switch direction entirely?",
    options: [
    { label: "Commit to the product based on the species reputation alone — the directional evidence for low volatile acidity and glycerol production is consistent enough to proceed without strain-level detail." },
    { label: "Request strain-specific fermentation data before committing — species-level confidence is useful but strain identity matters significantly, and you treat Torulaspora delbrueckii as a category, not a monolith." },
    { label: "Drop the idea and use a conventional Saccharomyces cerevisiae starter — the variability within Torulaspora delbrueckii makes it too unpredictable for a controlled kitchen application." }
    ],
    citation: "Flávia Silva-Sousa, Bruna Silveira de Oliveira, Ricardo Franco‐Duarte, Carole Camarasa, Maria João Sousa. (2024). Bridging the gap: linking Torulaspora delbrueckii genotypes to fermentation phenotypes and wine aroma. FEMS Yeast Research. https://doi.org/10.1093/femsyr/foae034",
    articleId: "c3e0551c-6b0c-405f-a790-5e76c0a0a7e7",
    articleTitle: "Bridging the gap: linking Torulaspora delbrueckii genotypes to fermentation phenotypes and wine aroma",
    articleUrl: "https://doi.org/10.1093/femsyr/foae034",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "343c4d0f-8160-460e-b526-498d3e9ad931::episteme::41",
    register: "episteme",
    sender: "kock",
    question: "What is the functional significance of pectinolytic activity in specific yeast strains during cocoa fermentation?",
    options: [
    { label: "It acidifies the pulp to inhibit unwanted bacteria from colonizing the beans.", correct: false },
    { label: "It breaks down cocoa pulp pectin, which is essential for the fermentation process to proceed.", correct: true },
    { label: "It converts sugars directly into acetic acid, raising the fermentation temperature.", correct: false },
    { label: "It generates floral esters by metabolizing the bean's fat content.", correct: false }
    ],
    correctIndex: 1,
    citation: "Haode Chang, Chunhe Gu, Mengrui Wang, Junxia Chen, Mingzhe Yue, Junping Zhou, Ziqing Chang, Chao Zhang, Fei Liu, Zhen Feng. (2025). Screening and characterizing indigenous yeasts, lactic acid bacteria, and acetic acid bacteria from cocoa fermentation in Hainan for aroma Development. Journal of Food Science. https://doi.org/10.1111/1750-3841.17612",
    articleId: "343c4d0f-8160-460e-b526-498d3e9ad931",
    articleTitle: "Screening and characterizing indigenous yeasts, lactic acid bacteria, and acetic acid bacteria from cocoa fermentation in Hainan for aroma Development",
    articleUrl: "https://doi.org/10.1111/1750-3841.17612",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "343c4d0f-8160-460e-b526-498d3e9ad931::phronesis::42",
    register: "phronesis",
    sender: "kock",
    question: "You are sourcing Hainan Trinitario beans and considering whether to specify spontaneous or inoculated fermentation to your producer. Research on this region's native microbiota shows that spontaneous fermentation already carries functionally valuable strains, but their individual contributions are uneven. How do you advise the producer?",
    options: [
    { label: "Keep spontaneous fermentation as-is — the native microbiota is sufficient and any intervention risks losing regional character." },
    { label: "Move toward a curated starter cocktail that prioritizes strains shown to be both aromatically productive and acid-balanced, rather than relying on uncontrolled microbial succession." },
    { label: "Abandon local strains entirely and import a standardized commercial starter to ensure batch consistency." }
    ],
    citation: "Haode Chang, Chunhe Gu, Mengrui Wang, Junxia Chen, Mingzhe Yue, Junping Zhou, Ziqing Chang, Chao Zhang, Fei Liu, Zhen Feng. (2025). Screening and characterizing indigenous yeasts, lactic acid bacteria, and acetic acid bacteria from cocoa fermentation in Hainan for aroma Development. Journal of Food Science. https://doi.org/10.1111/1750-3841.17612",
    articleId: "343c4d0f-8160-460e-b526-498d3e9ad931",
    articleTitle: "Screening and characterizing indigenous yeasts, lactic acid bacteria, and acetic acid bacteria from cocoa fermentation in Hainan for aroma Development",
    articleUrl: "https://doi.org/10.1111/1750-3841.17612",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "007443cd-a709-4376-90c6-8eb1d067a78b::episteme::43",
    register: "episteme",
    sender: "kock",
    question: "In Zhenba bacon, at which stage of production are phenolic compounds predominantly generated?",
    options: [
    { label: "During the curing stage", correct: false },
    { label: "During smoking", correct: true },
    { label: "During lipid oxidation prior to curing", correct: false },
    { label: "Equally across curing and smoking stages", correct: false }
    ],
    correctIndex: 1,
    citation: "Linjie Xi, Jing Zhang, Ruixiao Wu, Tian Wang, Wu Ding. (2021). Characterization of the Volatile Compounds of Zhenba Bacon at Different Process Stages Using GC–MS and GC–IMS. Foods. https://doi.org/10.3390/foods10112869",
    articleId: "007443cd-a709-4376-90c6-8eb1d067a78b",
    articleTitle: "Characterization of the Volatile Compounds of Zhenba Bacon at Different Process Stages Using GC–MS and GC–IMS",
    articleUrl: "https://doi.org/10.3390/foods10112869",
    topic: "flavor_science",
    needsRetag: false
  },
  {
    id: "007443cd-a709-4376-90c6-8eb1d067a78b::phronesis::44",
    register: "phronesis",
    sender: "kock",
    question: "You are developing a house-cured smoked bacon and the smokiness is burying the delicate ester notes your team worked hard to build during curing. You know from process analysis that phenolic compounds from smoking and esters from curing represent distinct aromatic registers tied to separate production phases. How do you approach the fix?",
    options: [
    { label: "Shorten the total process time equally across both curing and smoking to reduce all volatile intensity at once, accepting that ester complexity will also diminish." },
    { label: "Treat smoking and curing as separable variables — adjust smoking parameters independently to pull back phenolic intensity without touching the curing phase that drives ester development." },
    { label: "Switch wood type and simultaneously reduce salt concentration in the cure, reasoning that both changes together will rebalance the overall aromatic profile more efficiently." }
    ],
    citation: "Linjie Xi, Jing Zhang, Ruixiao Wu, Tian Wang, Wu Ding. (2021). Characterization of the Volatile Compounds of Zhenba Bacon at Different Process Stages Using GC–MS and GC–IMS. Foods. https://doi.org/10.3390/foods10112869",
    articleId: "007443cd-a709-4376-90c6-8eb1d067a78b",
    articleTitle: "Characterization of the Volatile Compounds of Zhenba Bacon at Different Process Stages Using GC–MS and GC–IMS",
    articleUrl: "https://doi.org/10.3390/foods10112869",
    topic: "flavor_science",
    needsRetag: false
  },
  {
    id: "007962f2-b597-4e44-aea6-0b26314913fd::episteme::45",
    register: "episteme",
    sender: "kock",
    question: "When cooking organic oyster mushrooms sous-vide with oregano and thyme, what role does the herb addition play beyond flavoring?",
    options: [
    { label: "It contributes functionally to food safety outcomes by improving antimicrobial attributes.", correct: true },
    { label: "It acts solely as a flavor enhancer with no measurable effect on food safety.", correct: false },
    { label: "It improves texture by breaking down the mushroom cell walls during cooking.", correct: false },
    { label: "It extends shelf life by reducing moisture content in the final product.", correct: false }
    ],
    correctIndex: 0,
    citation: "Ana Doroški, Anita Klaus, Biljana Nikolić, Igor Tomašević, Vesna Lazić, Jovana Vunduk, Ilija Đjekić. (2022). How do sous‐vide treatment and herb spices addition improve sensory acceptance and antimicrobial attributes of organic oyster mushrooms ( Pleurotus ostreatus )?. Journal of Food Processing and Preservation. https://doi.org/10.1111/jfpp.17142",
    articleId: "007962f2-b597-4e44-aea6-0b26314913fd",
    articleTitle: "How do sous‐vide treatment and herb spices addition improve sensory acceptance and antimicrobial attributes of organic oyster mushrooms ( Pleurotus ostreatus )?",
    articleUrl: "https://doi.org/10.1111/jfpp.17142",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "007962f2-b597-4e44-aea6-0b26314913fd::techne::46",
    register: "techne",
    sender: "kock",
    question: "You are preparing herb-inclusive oyster mushroom pouches sous-vide. The study tested 60°C as its target temperature for these preparations — which durations at that temperature does the research specifically report for herb-inclusive treatments?",
    options: [
    { label: "10 and 20 minutes", correct: false },
    { label: "20 and 30 minutes", correct: true },
    { label: "30 and 45 minutes", correct: false },
    { label: "15 and 25 minutes", correct: false }
    ],
    correctIndex: 1,
    citation: "Ana Doroški, Anita Klaus, Biljana Nikolić, Igor Tomašević, Vesna Lazić, Jovana Vunduk, Ilija Đjekić. (2022). How do sous‐vide treatment and herb spices addition improve sensory acceptance and antimicrobial attributes of organic oyster mushrooms ( Pleurotus ostreatus )?. Journal of Food Processing and Preservation. https://doi.org/10.1111/jfpp.17142",
    articleId: "007962f2-b597-4e44-aea6-0b26314913fd",
    articleTitle: "How do sous‐vide treatment and herb spices addition improve sensory acceptance and antimicrobial attributes of organic oyster mushrooms ( Pleurotus ostreatus )?",
    articleUrl: "https://doi.org/10.1111/jfpp.17142",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "007962f2-b597-4e44-aea6-0b26314913fd::phronesis::47",
    register: "phronesis",
    sender: "kock",
    question: "You are finalising a new oyster mushroom dish for a menu that emphasises both flavour complexity and food safety. You have read a study using oregano and thyme with sous-vide at 60°C for either 20 or 30 minutes, but the abstract does not identify a single optimal duration. A supplier is pushing you to lock in a recipe card tonight — herb choice, temperature, and exact time — for print tomorrow. How do you handle this?",
    options: [
    { label: "Commit to 60°C and pick 30 minutes as the default time, since longer cooking is generally safer, and proceed with oregano and thyme on the recipe card." },
    { label: "Delay finalising the duration until you have reviewed the full study results, while confirming 60°C and the use of oregano and thyme as the studied agents." },
    { label: "Substitute a broader herb blend for oregano and thyme to give the dish more flexibility, and set the time at 25 minutes as a midpoint between the two tested variables." }
    ],
    citation: "Ana Doroški, Anita Klaus, Biljana Nikolić, Igor Tomašević, Vesna Lazić, Jovana Vunduk, Ilija Đjekić. (2022). How do sous‐vide treatment and herb spices addition improve sensory acceptance and antimicrobial attributes of organic oyster mushrooms ( Pleurotus ostreatus )?. Journal of Food Processing and Preservation. https://doi.org/10.1111/jfpp.17142",
    articleId: "007962f2-b597-4e44-aea6-0b26314913fd",
    articleTitle: "How do sous‐vide treatment and herb spices addition improve sensory acceptance and antimicrobial attributes of organic oyster mushrooms ( Pleurotus ostreatus )?",
    articleUrl: "https://doi.org/10.1111/jfpp.17142",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "007b0828-b76a-475f-aec2-28b90570b863::episteme::48",
    register: "episteme",
    sender: "värd",
    question: "A study comparing Wenzhou/Zhejiang and South Indian food cultures found that Indians living in Wenzhou develop distinct Chinese dish preferences. What does this suggest about their culinary behaviour?",
    options: [
    { label: "They reject Chinese cuisine and maintain their original South Indian preferences unchanged.", correct: false },
    { label: "They show adaptive culinary behaviour under cross-cultural exposure.", correct: true },
    { label: "They adopt the full range of local Chinese preferences identical to native Wenzhou residents.", correct: false },
    { label: "They develop preferences that eliminate the medicinal dimension found in both cultures.", correct: false }
    ],
    correctIndex: 1,
    citation: "Xu Hui, A. Dhanalakshmi, Mao Jiguang. (2018). Food Culture of Wenzhou/Zhejiang and South India - A Comparative Study. International Journal of Engineering and Management Research. https://doi.org/10.31033/ijemr.8.5.13",
    articleId: "007b0828-b76a-475f-aec2-28b90570b863",
    articleTitle: "Food Culture of Wenzhou/Zhejiang and South India - A Comparative Study",
    articleUrl: "https://doi.org/10.31033/ijemr.8.5.13",
    topic: "food_psychology",
    needsRetag: false
  },
  {
    id: "007b0828-b76a-475f-aec2-28b90570b863::phronesis::49",
    register: "phronesis",
    sender: "värd",
    question: "You are building a fusion fermentation programme that pairs Wenzhou techniques with Indian ingredients. A colleague argues that because the study notes similarities between northeastern Indian and Chinese cuisines, you can apply the same assumptions to your South Indian suppliers and their guests. How do you respond?",
    options: [
    { label: "Accept the reasoning — if the similarity holds for northeastern India, it is a safe working assumption for South Indian cuisine until a guest complains." },
    { label: "Reject the reasoning — the study explicitly treats northeastern Indian and South Indian cuisines as distinct cases, so the similarity finding does not transfer." },
    { label: "Defer the decision — globalisation is already shifting what Indian diners in China accept, so preference hierarchies will converge quickly enough to make the distinction irrelevant." }
    ],
    citation: "Xu Hui, A. Dhanalakshmi, Mao Jiguang. (2018). Food Culture of Wenzhou/Zhejiang and South India - A Comparative Study. International Journal of Engineering and Management Research. https://doi.org/10.31033/ijemr.8.5.13",
    articleId: "007b0828-b76a-475f-aec2-28b90570b863",
    articleTitle: "Food Culture of Wenzhou/Zhejiang and South India - A Comparative Study",
    articleUrl: "https://doi.org/10.31033/ijemr.8.5.13",
    topic: "food_psychology",
    needsRetag: false
  },
  {
    id: "7bd00a26-1f7b-4f30-a1f3-36ac58514dc1::phronesis::50",
    register: "phronesis",
    sender: "kock",
    question: "A wine-pairing dinner is being designed around a Tuscan theme. The producer you've worked with for years has shifted their style — moving away from traditional blends toward a more internationally influenced expression. Your menu was built around the old style. Mid-service, a well-informed guest asks whether the pairing still makes sense. What guides your response?",
    options: [
    { label: "Defend the original pairing on the grounds that tradition defines Tuscan identity, and the producer's shift is a temporary market response that doesn't alter the wine's fundamental character." },
    { label: "Acknowledge that Tuscan wine identity is evolving, and frame the pairing as a dialogue between your culinary choices and where the wine currently sits — inviting the guest into that tension rather than resolving it with false certainty." },
    { label: "Replace the wine immediately with a more traditional producer to preserve the integrity of the menu concept, treating stylistic consistency as the primary obligation to the guest." }
    ],
    citation: "William Nesto. (2001). Tuscan Wine: Tradition and Innovation. Gastronomica The Journal of Food and Culture. https://doi.org/10.1525/gfc.2001.1.1.83",
    articleId: "7bd00a26-1f7b-4f30-a1f3-36ac58514dc1",
    articleTitle: "Tuscan Wine: Tradition and Innovation",
    articleUrl: "https://doi.org/10.1525/gfc.2001.1.1.83",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "c40b94f2-9b27-41e2-a165-e44e36ae3b2e::episteme::51",
    register: "episteme",
    sender: "kock",
    question: "When producing prickly pear vinegar, surface culture and submerged culture are sometimes treated as interchangeable methods. According to research on Opuntia ficus-indica acetification, how do their chemical outcomes actually differ?",
    options: [
    { label: "Surface culture preserves and amplifies phenolic content, while submerged culture shifts the outcome toward esters and acids.", correct: true },
    { label: "Submerged culture preserves and amplifies phenolic content, while surface culture shifts the outcome toward esters and acids.", correct: false },
    { label: "Both methods produce equivalent phenolic, ester, and acid profiles — the process choice affects only production speed.", correct: false },
    { label: "Surface culture favors ester formation, while submerged culture favors phenolic retention and acidity.", correct: false }
    ],
    correctIndex: 0,
    citation: "Ikram Es‐sbata, Remedios Castro, Rachid Zouhair, Enrique Durán. (2022). Effect of the type of acetic fermentation process on the chemical composition of prickly pear vinegar (Opuntia ficus‐indica). Journal of the Science of Food and Agriculture. https://doi.org/10.1002/jsfa.12138",
    articleId: "c40b94f2-9b27-41e2-a165-e44e36ae3b2e",
    articleTitle: "Effect of the type of acetic fermentation process on the chemical composition of prickly pear vinegar (Opuntia ficus‐indica)",
    articleUrl: "https://doi.org/10.1002/jsfa.12138",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "c40b94f2-9b27-41e2-a165-e44e36ae3b2e::techne::52",
    register: "techne",
    sender: "kock",
    question: "You are developing a prickly pear vinegar in-house and want it to carry strong phenolic richness — noticeable bitterness, antioxidant character, and body. Which fermentation process does the research support for that goal?",
    options: [
    { label: "Surface culture acetification", correct: true },
    { label: "Submerged culture acetification", correct: false },
    { label: "Either process delivers equivalent phenolic content", correct: false },
    { label: "Spontaneous mixed fermentation without bacterial inoculation", correct: false }
    ],
    correctIndex: 0,
    citation: "Ikram Es‐sbata, Remedios Castro, Rachid Zouhair, Enrique Durán. (2022). Effect of the type of acetic fermentation process on the chemical composition of prickly pear vinegar (Opuntia ficus‐indica). Journal of the Science of Food and Agriculture. https://doi.org/10.1002/jsfa.12138",
    articleId: "c40b94f2-9b27-41e2-a165-e44e36ae3b2e",
    articleTitle: "Effect of the type of acetic fermentation process on the chemical composition of prickly pear vinegar (Opuntia ficus‐indica)",
    articleUrl: "https://doi.org/10.1002/jsfa.12138",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "c40b94f2-9b27-41e2-a165-e44e36ae3b2e::phronesis::53",
    register: "phronesis",
    sender: "kock",
    question: "You are developing a prickly pear vinegar in-house and need to lock in your acetification method before scaling production. The research shows that phenolic depth and volatile aromatic character pull in opposite directions depending on which process you choose. You have three planned uses: a hot reduction for a meat glaze, a cold dressing for a raw vegetable salad, and a pickling brine for preservation. Which use case most clearly dictates which chemical dimension to prioritize, and how does that drive your method choice?",
    options: [
    { label: "The hot reduction — volatile aromatics burn off during cooking anyway, so you prioritize phenolic depth and choose the method that maximizes it, accepting lower aromatic complexity." },
    { label: "The cold dressing — aromatics are fully present on the palate and carry the dish, so you prioritize volatile aromatic character and choose the method that favors it, accepting lower phenolic concentration." },
    { label: "The pickling brine — preservation relies on acidity and phenolic antimicrobial activity, so you prioritize phenolic depth and select the method that delivers it, treating aroma as secondary." }
    ],
    citation: "Ikram Es‐sbata, Remedios Castro, Rachid Zouhair, Enrique Durán. (2022). Effect of the type of acetic fermentation process on the chemical composition of prickly pear vinegar (Opuntia ficus‐indica). Journal of the Science of Food and Agriculture. https://doi.org/10.1002/jsfa.12138",
    articleId: "c40b94f2-9b27-41e2-a165-e44e36ae3b2e",
    articleTitle: "Effect of the type of acetic fermentation process on the chemical composition of prickly pear vinegar (Opuntia ficus‐indica)",
    articleUrl: "https://doi.org/10.1002/jsfa.12138",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "5435632f-15be-476b-81c3-f1af1fd68e57::episteme::54",
    register: "episteme",
    sender: "kock",
    question: "A guest asks why your reduced-fat Cheddar tastes milder even though the same aroma compounds are still present. What is the correct explanation?",
    options: [
    { label: "Reducing fat destroys volatile compounds through oxidation, so fewer aroma molecules actually exist in the cheese.", correct: false },
    { label: "Fat acts as a delivery matrix that controls which volatile compounds reach perceptible concentrations, so removing it suppresses apparent aroma intensity even when compounds are chemically present.", correct: true },
    { label: "Reduced-fat cheeses age faster, which accelerates flavor loss before the cheese reaches the guest.", correct: false },
    { label: "Lower fat content raises the sensory threshold for all flavor compounds equally, making every note harder to detect.", correct: false }
    ],
    correctIndex: 1,
    citation: "Myung-joo KIM, S.L. Drake, M.A. Drake. (2011). EVALUATION OF KEY FLAVOR COMPOUNDS IN REDUCED- AND FULL-FAT CHEDDAR CHEESES USING SENSORY STUDIES ON MODEL SYSTEMS. Journal of Sensory Studies. https://doi.org/10.1111/j.1745-459x.2011.00343.x",
    articleId: "5435632f-15be-476b-81c3-f1af1fd68e57",
    articleTitle: "EVALUATION OF KEY FLAVOR COMPOUNDS IN REDUCED- AND FULL-FAT CHEDDAR CHEESES USING SENSORY STUDIES ON MODEL SYSTEMS",
    articleUrl: "https://doi.org/10.1111/j.1745-459x.2011.00343.x",
    topic: "sensory_evaluation",
    needsRetag: false
  },
  {
    id: "0082a49e-c874-454e-9af0-f4f23f36b15a::episteme::55",
    register: "episteme",
    sender: "kock",
    question: "A supplier is offering broken rice — a milling byproduct — for use in an extruded snack. Which of the following correctly describes what turmeric powder contributes when used as a partial substitution in that formulation?",
    options: [
    { label: "It contributes dietary fibre, antioxidant compounds, and sensory qualities without compromising the product's feasibility.", correct: true },
    { label: "It contributes gluten structure, dietary fibre, and antioxidant compounds.", correct: false },
    { label: "It contributes protein and lipid fractions while reducing carbohydrate content.", correct: false },
    { label: "It contributes colour only, with no measurable effect on fibre or antioxidant levels.", correct: false }
    ],
    correctIndex: 0,
    citation: "Aryane Ribeiro Oliveira, Alline Emannuele Chaves Ribeiro, Érica Resende Oliveira, Keyla Oliveira Ribeiro, Marina Costa GARCIA, Ítalo Careli‐Gondim, Manoel Soares Soares Júnior, Márcio Caliari. (2020). Physicochemical, microbiological and sensory characteristics of snacks developed from broken rice grains and turmeric powder. International Journal of Food Science and Technology. https://doi.org/10.1111/ijfs.14525",
    articleId: "0082a49e-c874-454e-9af0-f4f23f36b15a",
    articleTitle: "Physicochemical, microbiological and sensory characteristics of snacks developed from broken rice grains and turmeric powder",
    articleUrl: "https://doi.org/10.1111/ijfs.14525",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "0082a49e-c874-454e-9af0-f4f23f36b15a::phronesis::56",
    register: "phronesis",
    sender: "kock",
    question: "You are developing a turmeric-enriched snack for the menu and a colleague suggests stopping at 6% turmeric because that is what the study recommends. Your production setup uses a different process than the extrusion parameters in the research. How do you approach the 6% figure?",
    options: [
    { label: "Use 6% as a fixed target — the study's finding is precise enough to apply directly regardless of process differences." },
    { label: "Treat 6% as a directional signal and adjust through your own trials, since your setup differs from the study's extrusion parameters." },
    { label: "Discard the figure entirely — turmeric levels from snack research have no relevance to professional kitchen development." }
    ],
    citation: "Aryane Ribeiro Oliveira, Alline Emannuele Chaves Ribeiro, Érica Resende Oliveira, Keyla Oliveira Ribeiro, Marina Costa GARCIA, Ítalo Careli‐Gondim, Manoel Soares Soares Júnior, Márcio Caliari. (2020). Physicochemical, microbiological and sensory characteristics of snacks developed from broken rice grains and turmeric powder. International Journal of Food Science and Technology. https://doi.org/10.1111/ijfs.14525",
    articleId: "0082a49e-c874-454e-9af0-f4f23f36b15a",
    articleTitle: "Physicochemical, microbiological and sensory characteristics of snacks developed from broken rice grains and turmeric powder",
    articleUrl: "https://doi.org/10.1111/ijfs.14525",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "a96854fd-0366-4ac9-b377-20692208b521::episteme::57",
    register: "episteme",
    sender: "kock",
    question: "According to one interpretive reading of Adrià's work, what is the core intellectual purpose of his deconstruction approach?",
    options: [
    { label: "To introduce novelty for its own sake by replacing traditional ingredients with unexpected ones.", correct: false },
    { label: "To make the assumptions embedded in a familiar dish visible by isolating, reordering, or transforming its constituent elements.", correct: true },
    { label: "To simplify complex dishes into fewer components so they are easier to execute consistently.", correct: false },
    { label: "To replace the dish category entirely with a new form that shares none of the original's characteristics.", correct: false }
    ],
    correctIndex: 1,
    citation: "Fabio Parasecoli. (2001). Deconstructing Soup: Ferran Adriàà's Culinary Challenges. Gastronomica The Journal of Food and Culture. https://doi.org/10.1525/gfc.2001.1.1.60",
    articleId: "a96854fd-0366-4ac9-b377-20692208b521",
    articleTitle: "Deconstructing Soup: Ferran Adriàà's Culinary Challenges",
    articleUrl: "https://doi.org/10.1525/gfc.2001.1.1.60",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "a96854fd-0366-4ac9-b377-20692208b521::phronesis::58",
    register: "phronesis",
    sender: "kock",
    question: "You're finalizing a dish that deconstructs a classic braised preparation — the sauce is set as a gel, the protein is compressed, the aromatics arrive as a cold foam. The technique is precise. But your restaurant draws a mixed crowd: some regulars who eat widely, some guests for whom this is a special-occasion dinner with little fine-dining exposure. Do you send the dish as is, add a brief tableside verbal frame that names the original dish, or hold the dish from the menu until you can profile the table first?",
    options: [
    { label: "Send it without explanation — the visual cues in the plating are enough to signal the reference, and over-explaining undermines the guest's discovery." },
    { label: "Brief the front-of-house to name the original preparation when presenting the dish, so the guest has the cultural anchor the deconstruction needs to land as intended." },
    { label: "Pull the dish from the general menu and reserve it for tasting menus where the progression itself builds the familiarity context before the deconstructed version arrives." }
    ],
    citation: "Fabio Parasecoli. (2001). Deconstructing Soup: Ferran Adriàà's Culinary Challenges. Gastronomica The Journal of Food and Culture. https://doi.org/10.1525/gfc.2001.1.1.60",
    articleId: "a96854fd-0366-4ac9-b377-20692208b521",
    articleTitle: "Deconstructing Soup: Ferran Adriàà's Culinary Challenges",
    articleUrl: "https://doi.org/10.1525/gfc.2001.1.1.60",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "8dad487d-b02d-4b20-af10-5cf289e5f075::phronesis::59",
    register: "phronesis",
    sender: "kock",
    question: "You walk into the prep kitchen mid-service and see uncovered garbage bins next to an open bench where finished plates are resting while a commis handles raw protein nearby. You have no microbiological data on the kitchen. What is the most defensible first move?",
    options: [
    { label: "Wait for a microbiological report before intervening, so any corrective action is evidence-based rather than reactive." },
    { label: "Cover the prepared dishes and waste bins immediately, and physically separate the raw-handling zone — treating the observable layout itself as sufficient signal to act." },
    { label: "Continue service and log the observation for the next scheduled hygiene audit, since a single instance does not confirm systemic contamination risk." }
    ],
    citation: "(2017). HYGIENE STATUS OF KITCHEN PRODUCTION AREAS OF HOSPITALITY FACILITIES. International tourism and hospitality managment conference. Book of proceedings. https://doi.org/10.35666/25662880.2017.3.48",
    articleId: "8dad487d-b02d-4b20-af10-5cf289e5f075",
    articleTitle: "HYGIENE STATUS OF KITCHEN PRODUCTION AREAS OF HOSPITALITY FACILITIES",
    articleUrl: "https://doi.org/10.35666/25662880.2017.3.48",
    topic: "hospitality",
    needsRetag: false
  },
  {
    id: "008a5c9b-e7f2-40fb-9e48-1606388a1dd2::episteme::60",
    register: "episteme",
    sender: "kock",
    question: "Which microorganisms form the core consortium responsible for kombucha's fermentation outcomes?",
    options: [
    { label: "Acetobacter xylinum, Lactobacillus, Leuconostoc, Saccharomyces, Brettanomyces, and Zygosaccharomyces", correct: true },
    { label: "Acetobacter xylinum, Lactobacillus, and Saccharomyces only", correct: false },
    { label: "Leuconostoc, Brettanomyces, and Aspergillus", correct: false },
    { label: "Lactobacillus, Streptococcus, and Saccharomyces", correct: false }
    ],
    correctIndex: 0,
    citation: "Kim S.Y.. (2026). Evaluation of the Quality Characteristics of Commercial Kombucha Beverage. Journal of the Korean Society of Food Science and Nutrition. https://doi.org/10.3746/jkfn.2026.55.1.28",
    articleId: "008a5c9b-e7f2-40fb-9e48-1606388a1dd2",
    articleTitle: "Evaluation of the Quality Characteristics of Commercial Kombucha Beverage",
    articleUrl: "https://doi.org/10.3746/jkfn.2026.55.1.28",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "008a5c9b-e7f2-40fb-9e48-1606388a1dd2::phronesis::61",
    register: "phronesis",
    sender: "kock",
    question: "You are tasting a batch of commercial kombucha before service and something is off — the flavor is sharper and more barnyard-like than previous batches, though acidity and carbonation seem normal. You know the culture contains Brettanomyces and Zygosaccharomyces alongside lactic and acetic bacteria, and the gel matrix looks intact. How do you handle this?",
    options: [
    { label: "Serve the batch as-is — if acidity and carbonation are within range, the off-note is within acceptable variation for a live ferment." },
    { label: "Hold the batch and cross-check it against your baseline flavor profile; the barnyard note may signal that one organism is dominating rather than the consortium operating in balance." },
    { label: "Discard the batch immediately — any deviation from expected flavor means the culture has failed and cannot be recovered or used." }
    ],
    citation: "Kim S.Y.. (2026). Evaluation of the Quality Characteristics of Commercial Kombucha Beverage. Journal of the Korean Society of Food Science and Nutrition. https://doi.org/10.3746/jkfn.2026.55.1.28",
    articleId: "008a5c9b-e7f2-40fb-9e48-1606388a1dd2",
    articleTitle: "Evaluation of the Quality Characteristics of Commercial Kombucha Beverage",
    articleUrl: "https://doi.org/10.3746/jkfn.2026.55.1.28",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "a75925e9-5b86-46fc-8833-64d2af794e98::episteme::62",
    register: "episteme",
    sender: "kock",
    question: "A guest asks why the same tomato variety tastes different depending on the farm it comes from, but holds up similarly in cooking regardless of origin. What is the best explanation?",
    options: [
    { label: "Flavour compounds are strongly shaped by growing conditions, while texture is more fixed by the plant's genetic background.", correct: true },
    { label: "Both flavour and texture vary equally with growing conditions, making variety selection irrelevant.", correct: false },
    { label: "Texture is primarily determined by growing conditions, while flavour is fixed by the variety's genetics.", correct: false },
    { label: "Sugars and acids are genetically fixed, while volatiles and texture respond to the environment.", correct: false }
    ],
    correctIndex: 0,
    citation: "Paola Carli, Amalia Barone, Vincenzo Fogliano, Luigi Frusciante, Maria Raffaella Ercolano. (2011). Dissection of genetic and environmental factors involved in tomato organoleptic quality. BMC Plant Biology. https://doi.org/10.1186/1471-2229-11-58",
    articleId: "a75925e9-5b86-46fc-8833-64d2af794e98",
    articleTitle: "Dissection of genetic and environmental factors involved in tomato organoleptic quality",
    articleUrl: "https://doi.org/10.1186/1471-2229-11-58",
    topic: "nutritional_science",
    needsRetag: false
  },
  {
    id: "a75925e9-5b86-46fc-8833-64d2af794e98::techne::63",
    register: "techne",
    sender: "kock",
    question: "You are sourcing tomatoes for a dish where the flavour profile matters most. Which factor should you prioritise investigating alongside the variety name?",
    options: [
    { label: "Growing conditions such as field environment, nutritional regime, and ripening stage at harvest", correct: true },
    { label: "The variety name alone, since genetics are the primary driver of flavour", correct: false },
    { label: "Post-harvest cold storage duration, as this overrides field conditions for flavour", correct: false },
    { label: "Fruit size and colour at point of sale, as these are reliable proxies for flavour development", correct: false }
    ],
    correctIndex: 0,
    citation: "Paola Carli, Amalia Barone, Vincenzo Fogliano, Luigi Frusciante, Maria Raffaella Ercolano. (2011). Dissection of genetic and environmental factors involved in tomato organoleptic quality. BMC Plant Biology. https://doi.org/10.1186/1471-2229-11-58",
    articleId: "a75925e9-5b86-46fc-8833-64d2af794e98",
    articleTitle: "Dissection of genetic and environmental factors involved in tomato organoleptic quality",
    articleUrl: "https://doi.org/10.1186/1471-2229-11-58",
    topic: "nutritional_science",
    needsRetag: false
  },
  {
    id: "a75925e9-5b86-46fc-8833-64d2af794e98::phronesis::64",
    register: "phronesis",
    sender: "kock",
    question: "Mid-season, you are receiving deliveries of the same heirloom tomato variety from two farms. Last week's reduction was balanced; today's batch from a different farm tastes flat using the same recipe. How do you handle intake and production going forward?",
    options: [
    { label: "Reject the second farm's fruit and source exclusively from the farm whose tomatoes matched last week's result, treating variety name as the reliable quality guarantee." },
    { label: "Taste each farm's fruit separately at intake, treat them as distinct flavour propositions, and adjust seasoning and reduction timing based on what each batch actually delivers rather than assuming the variety name guarantees a consistent result." },
    { label: "Use the flat reduction as a base and correct it with added acids and sugars after cooking, without changing your intake assessment or timing protocol." }
    ],
    citation: "Paola Carli, Amalia Barone, Vincenzo Fogliano, Luigi Frusciante, Maria Raffaella Ercolano. (2011). Dissection of genetic and environmental factors involved in tomato organoleptic quality. BMC Plant Biology. https://doi.org/10.1186/1471-2229-11-58",
    articleId: "a75925e9-5b86-46fc-8833-64d2af794e98",
    articleTitle: "Dissection of genetic and environmental factors involved in tomato organoleptic quality",
    articleUrl: "https://doi.org/10.1186/1471-2229-11-58",
    topic: "nutritional_science",
    needsRetag: false
  },
  {
    id: "00a63b81-5a88-4894-b32d-8d1d9b4fab3e::episteme::65",
    register: "episteme",
    sender: "kock",
    question: "What does current research say is the scientific basis for intentional aroma construction in fermented foods?",
    options: [
    { label: "Fermented food aroma is primarily governed by a single dominant volatile compound unique to each fermentation tradition.", correct: false },
    { label: "Fermented food aroma is governed by interaction mechanisms among multiple volatile compounds, with both bottom-up and top-down flavor design strategies now analytically grounded.", correct: true },
    { label: "Aroma construction in fermented foods relies on tradition alone, as analytical methods have not yet provided a workable scientific framework.", correct: false },
    { label: "Only the top-down flavor design strategy has been analytically validated for fermented food aroma construction.", correct: false }
    ],
    correctIndex: 1,
    citation: "Xin Li, Gailing Shi, Jia Zheng, Shuang Xing, Lijing Sun, Shiming Shen, Jian Su, Liangcai Lin, Cuiying Zhang. (2025). Recent advances in analytical approaches for aroma interaction of fermented foods: A review.. Food chemistry. https://doi.org/10.1016/j.foodchem.2025.146544",
    articleId: "00a63b81-5a88-4894-b32d-8d1d9b4fab3e",
    articleTitle: "Recent advances in analytical approaches for aroma interaction of fermented foods: A review.",
    articleUrl: "https://doi.org/10.1016/j.foodchem.2025.146544",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "00a63b81-5a88-4894-b32d-8d1d9b4fab3e::phronesis::66",
    register: "phronesis",
    sender: "kock",
    question: "You are a chef developing a new fermented condiment for the menu. Each time you adjust one ingredient or fermentation variable, the aroma shifts in unexpected directions — fixing one note seems to unbalance another. You have limited time before the product needs to be finalised. What is the most defensible next step?",
    options: [
    { label: "Continue iterative tasting adjustments, accepting that enough rounds of trial and error will eventually isolate the problematic variable." },
    { label: "Bring in a sensory scientist or use a computational aroma-mapping tool to help model the interaction system, rather than treating it as a linear problem." },
    { label: "Simplify the recipe by removing ingredients until the aroma stabilises, then rebuild from the reduced base." }
    ],
    citation: "Xin Li, Gailing Shi, Jia Zheng, Shuang Xing, Lijing Sun, Shiming Shen, Jian Su, Liangcai Lin, Cuiying Zhang. (2025). Recent advances in analytical approaches for aroma interaction of fermented foods: A review.. Food chemistry. https://doi.org/10.1016/j.foodchem.2025.146544",
    articleId: "00a63b81-5a88-4894-b32d-8d1d9b4fab3e",
    articleTitle: "Recent advances in analytical approaches for aroma interaction of fermented foods: A review.",
    articleUrl: "https://doi.org/10.1016/j.foodchem.2025.146544",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "e7729ec5-7891-411d-bca5-c757cac66716::episteme::67",
    register: "episteme",
    sender: "kock",
    question: "When you physically damage a strawberry — by cutting or crushing — which aromatic compounds increase noticeably, and which do not?",
    options: [
    { label: "Both LOX aldehydes and fruity esters increase significantly.", correct: false },
    { label: "LOX aldehydes increase, but ester concentrations do not increase significantly.", correct: true },
    { label: "Fruity esters increase, but LOX aldehydes remain unchanged.", correct: false },
    { label: "Neither LOX aldehydes nor fruity esters change when the fruit is damaged.", correct: false }
    ],
    correctIndex: 1,
    citation: "Gonca Ece Özcan, Sheryl A. Barringer. (2011). Effect of Enzymes on Strawberry Volatiles during Storage, at Different Ripeness Level, in Different Cultivars, and during Eating. Journal of Food Science. https://doi.org/10.1111/j.1750-3841.2010.01999.x",
    articleId: "e7729ec5-7891-411d-bca5-c757cac66716",
    articleTitle: "Effect of Enzymes on Strawberry Volatiles during Storage, at Different Ripeness Level, in Different Cultivars, and during Eating",
    articleUrl: "https://doi.org/10.1111/j.1750-3841.2010.01999.x",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "e7729ec5-7891-411d-bca5-c757cac66716::techne::68",
    register: "techne",
    sender: "kock",
    question: "You are building a strawberry dish and need to decide between maximizing fruity, sweet aroma versus a fresher, green note. Which preparation lever most directly controls each outcome?",
    options: [
    { label: "Ripeness level drives fruity ester expression; degree and timing of cell disruption drive fresh-green volatiles.", correct: true },
    { label: "Degree of cell disruption drives fruity ester expression; ripeness level drives fresh-green volatiles.", correct: false },
    { label: "Both outcomes are controlled primarily by storage temperature, not by ripeness or cutting method.", correct: false },
    { label: "Ripeness level and cell disruption both target the same aromatic register, so either lever produces the same result.", correct: false }
    ],
    correctIndex: 0,
    citation: "Gonca Ece Özcan, Sheryl A. Barringer. (2011). Effect of Enzymes on Strawberry Volatiles during Storage, at Different Ripeness Level, in Different Cultivars, and during Eating. Journal of Food Science. https://doi.org/10.1111/j.1750-3841.2010.01999.x",
    articleId: "e7729ec5-7891-411d-bca5-c757cac66716",
    articleTitle: "Effect of Enzymes on Strawberry Volatiles during Storage, at Different Ripeness Level, in Different Cultivars, and during Eating",
    articleUrl: "https://doi.org/10.1111/j.1750-3841.2010.01999.x",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "e7729ec5-7891-411d-bca5-c757cac66716::phronesis::69",
    register: "phronesis",
    sender: "kock",
    question: "You are plating a composed strawberry dessert mid-service. The pastry section has two batches ready: one fully ripe, one underripe. The dish is meant to cut through a rich cream base and needs a bright, green lift rather than round fruit depth. The underripe batch looks paler and less appealing on the board. Which batch do you reach for, and what are you accepting as a consequence?",
    options: [
    { label: "Use the underripe batch for its higher LOX aldehyde concentration, accepting that the visual appearance will be less appealing and that the effect may vary across cultivars." },
    { label: "Use the ripe batch because the higher ester levels will still provide enough brightness, and the visual presentation justifies the choice at the pass." },
    { label: "Blend both batches to balance ester and aldehyde levels, accepting that neither the green lift nor the fruity depth will be fully expressed." }
    ],
    citation: "Gonca Ece Özcan, Sheryl A. Barringer. (2011). Effect of Enzymes on Strawberry Volatiles during Storage, at Different Ripeness Level, in Different Cultivars, and during Eating. Journal of Food Science. https://doi.org/10.1111/j.1750-3841.2010.01999.x",
    articleId: "e7729ec5-7891-411d-bca5-c757cac66716",
    articleTitle: "Effect of Enzymes on Strawberry Volatiles during Storage, at Different Ripeness Level, in Different Cultivars, and during Eating",
    articleUrl: "https://doi.org/10.1111/j.1750-3841.2010.01999.x",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "00adb668-5a9a-47e4-978a-0d7f9dbf01dc::phronesis::70",
    register: "phronesis",
    sender: "kock",
    question: "You are developing a fermented rye flatbread and want to use a starter culture that could support a gut-health angle on the menu description. A colleague suggests Weissella cibaria strain 92, noting it processes multiple fibre-derived oligosaccharides and originates from Indian fermented food. How do you weigh that against what you can actually say to guests?",
    options: [
    { label: "Use the strain and describe it on the menu as a probiotic culture — the oligosaccharide metabolism is strong enough evidence." },
    { label: "Use the strain as a candidate worth trialling for acidity and fibre-pairing potential, but keep menu language to 'fermented with a selected culture' until validation is complete." },
    { label: "Reject the strain entirely because it has no validated safety record in a European fermented grain context." }
    ],
    citation: "Anna Månberger, Phebe Verbrugghe, Elísabet Eik Guðmundsdóttir, Sara Santesson, Å. Nilsson, Guðmundur Ó. Hreggviðsson, Javier A. Linares‐Pastén, Eva Nordberg Karlsson. (2020). Taxogenomic assessment and genomic characterisation of Weissella cibaria strain 92 able to metabolise oligosaccharides derived from dietary fibres. Scientific Reports. https://doi.org/10.1038/s41598-020-62610-x",
    articleId: "00adb668-5a9a-47e4-978a-0d7f9dbf01dc",
    articleTitle: "Taxogenomic assessment and genomic characterisation of Weissella cibaria strain 92 able to metabolise oligosaccharides derived from dietary fibres",
    articleUrl: "https://doi.org/10.1038/s41598-020-62610-x",
    topic: "nutritional_science",
    needsRetag: false
  },
  {
    id: "00afec6e-a863-4a65-8db8-db328ee298fe::episteme::71",
    register: "episteme",
    sender: "kock",
    question: "When hydrolyzing wheat gluten, which enzyme produces a more bitter hydrolysate — Alcalase or Trypsin?",
    options: [
    { label: "Alcalase produces stronger bitterness than Trypsin.", correct: true },
    { label: "Trypsin produces stronger bitterness than Alcalase.", correct: false },
    { label: "Both enzymes produce the same level of bitterness regardless of hydrolysis time.", correct: false },
    { label: "Bitterness is determined only by hydrolysis time, not by enzyme choice.", correct: false }
    ],
    correctIndex: 0,
    citation: "Xiaorui Sun, Jiayi Zheng, Boye Liu, Zehua Huang, Fusheng Chen. (2022). Characteristics of the enzyme-induced release of bitter peptides from wheat gluten hydrolysates. Frontiers in Nutrition. https://doi.org/10.3389/fnut.2022.1022257",
    articleId: "00afec6e-a863-4a65-8db8-db328ee298fe",
    articleTitle: "Characteristics of the enzyme-induced release of bitter peptides from wheat gluten hydrolysates",
    articleUrl: "https://doi.org/10.3389/fnut.2022.1022257",
    topic: "nutritional_science",
    needsRetag: false
  },
  {
    id: "00afec6e-a863-4a65-8db8-db328ee298fe::techne::72",
    register: "techne",
    sender: "kock",
    question: "You are developing a wheat gluten hydrolysate for a savory dish and want to minimize bitterness. Which two controls does the article identify as your main levers?",
    options: [
    { label: "Salt concentration and processing temperature", correct: false },
    { label: "Enzyme selection and degree of hydrolysis", correct: true },
    { label: "pH level and hydration time", correct: false },
    { label: "Particle size and storage temperature", correct: false }
    ],
    correctIndex: 1,
    citation: "Xiaorui Sun, Jiayi Zheng, Boye Liu, Zehua Huang, Fusheng Chen. (2022). Characteristics of the enzyme-induced release of bitter peptides from wheat gluten hydrolysates. Frontiers in Nutrition. https://doi.org/10.3389/fnut.2022.1022257",
    articleId: "00afec6e-a863-4a65-8db8-db328ee298fe",
    articleTitle: "Characteristics of the enzyme-induced release of bitter peptides from wheat gluten hydrolysates",
    articleUrl: "https://doi.org/10.3389/fnut.2022.1022257",
    topic: "nutritional_science",
    needsRetag: false
  },
  {
    id: "00afec6e-a863-4a65-8db8-db328ee298fe::phronesis::73",
    register: "phronesis",
    sender: "kock",
    question: "You are running a fermentation kitchen and your wheat protein umami base keeps coming back from tastings with complaints about bitterness. You have already tried adjusting salt levels and adding a small amount of acid to balance, but the bitterness persists. What should you examine first before reaching for any further masking solutions?",
    options: [
    { label: "Review the hydrolysis protocol — which enzyme you used and how far you let hydrolysis run — since these are the upstream drivers of bitter peptide release." },
    { label: "Increase the salt concentration further, as salt suppression of bitterness is dose-dependent and you may not have reached the effective threshold." },
    { label: "Switch to a plant-based acid like citric acid instead of the current acid, since different acids interact differently with bitter peptides." }
    ],
    citation: "Xiaorui Sun, Jiayi Zheng, Boye Liu, Zehua Huang, Fusheng Chen. (2022). Characteristics of the enzyme-induced release of bitter peptides from wheat gluten hydrolysates. Frontiers in Nutrition. https://doi.org/10.3389/fnut.2022.1022257",
    articleId: "00afec6e-a863-4a65-8db8-db328ee298fe",
    articleTitle: "Characteristics of the enzyme-induced release of bitter peptides from wheat gluten hydrolysates",
    articleUrl: "https://doi.org/10.3389/fnut.2022.1022257",
    topic: "nutritional_science",
    needsRetag: false
  },
  {
    id: "00b263cb-5838-438e-8a00-e66275b772da::episteme::74",
    register: "episteme",
    sender: "värd",
    question: "According to research on Norwegian consumers, which group shows greater willingness to try insect-based food?",
    options: [
    { label: "Consumers who prioritize natural ingredients and familiarity", correct: false },
    { label: "Consumers who prioritize health and environmental friendliness", correct: true },
    { label: "Consumers who prioritize price and convenience", correct: false },
    { label: "Consumers who prioritize taste and texture", correct: false }
    ],
    correctIndex: 1,
    citation: "Muiruri S.W.. (2024). Norwegian consumers’ willingness to try food made from insects: The role of trust, food choice motives and OCEAN personality traits. Journal of Agriculture and Food Research. https://doi.org/10.1016/j.jafr.2024.101381",
    articleId: "00b263cb-5838-438e-8a00-e66275b772da",
    articleTitle: "Norwegian consumers’ willingness to try food made from insects: The role of trust, food choice motives and OCEAN personality traits",
    articleUrl: "https://doi.org/10.1016/j.jafr.2024.101381",
    topic: "food_psychology",
    needsRetag: false
  },
  {
    id: "00b263cb-5838-438e-8a00-e66275b772da::phronesis::75",
    register: "phronesis",
    sender: "värd",
    question: "You are finalizing a new Scandinavian tasting menu and you want to include an insect-based course. You know that some guests are drawn by health and sustainability credentials, while others are put off by anything unfamiliar or visually confronting. Do you plate the insects visibly — signaling transparency and novelty — embed them in a familiar format like a mousse or a crumb to lower resistance, or hold them off the menu entirely until guest sentiment is clearer?",
    options: [
    { label: "Plate the insects visibly and use table-side communication to highlight environmental and health benefits, accepting that familiarity-seekers may decline the course." },
    { label: "Embed the insects in a familiar preparation — a crumb, a paste, a mousse — so the texture and format feel recognizable, then mention the ingredient openly on the menu card." },
    { label: "Keep insects off the current menu and instead introduce them first through a staff tasting and a guest-opt-in sneak preview before committing to the course." }
    ],
    citation: "Muiruri S.W.. (2024). Norwegian consumers’ willingness to try food made from insects: The role of trust, food choice motives and OCEAN personality traits. Journal of Agriculture and Food Research. https://doi.org/10.1016/j.jafr.2024.101381",
    articleId: "00b263cb-5838-438e-8a00-e66275b772da",
    articleTitle: "Norwegian consumers’ willingness to try food made from insects: The role of trust, food choice motives and OCEAN personality traits",
    articleUrl: "https://doi.org/10.1016/j.jafr.2024.101381",
    topic: "food_psychology",
    needsRetag: false
  },
  {
    id: "c6d0dd8e-e464-4dd8-b879-3a4a4521a84a::episteme::76",
    register: "episteme",
    sender: "kock",
    question: "You are sourcing yeasts for a fermented cereal project. According to recent research on West African fermented products, which source yields strains with the strongest overall probiotic profile?",
    options: [
    { label: "Lait caillé, a fermented milk product", correct: false },
    { label: "Nunu, a fermented milk product", correct: false },
    { label: "Mawè, a fermented cereal product", correct: true },
    { label: "A blend of dairy and cereal isolates combined", correct: false }
    ],
    correctIndex: 2,
    citation: "Grace Adzo Motey, Pernille Johansen, James Owusu‐Kwarteng, Linda Aurelia Ofori, Kwasi Obiri‐Danso, Henrik Siegumfeldt, Nadja Larsen, Lene Jespersen. (2020). Probiotic potential of Saccharomyces cerevisiae and Kluyveromyces marxianus isolated from West African spontaneously fermented cereal and milk products. Yeast. https://doi.org/10.1002/yea.3513",
    articleId: "c6d0dd8e-e464-4dd8-b879-3a4a4521a84a",
    articleTitle: "Probiotic potential of Saccharomyces cerevisiae and Kluyveromyces marxianus isolated from West African spontaneously fermented cereal and milk products",
    articleUrl: "https://doi.org/10.1002/yea.3513",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "c6d0dd8e-e464-4dd8-b879-3a4a4521a84a::phronesis::77",
    register: "phronesis",
    sender: "kock",
    question: "You are developing a fermented porridge dish for your menu and your supplier offers you two options: a commercially standardized yeast starter with documented probiotic certification, or a spontaneous mawè culture from a West African producer whose microbial profile has been studied but not yet fully characterized. Your kitchen values both guest safety and culinary authenticity. How do you weigh this choice?",
    options: [
    { label: "Use the commercial starter — documented certification removes liability and the spontaneous culture carries unknown risks that cannot be communicated clearly to guests." },
    { label: "Use the mawè culture — the emerging scientific documentation of its microbial intelligence means it is not a primitive precursor but a reservoir worth centering, even if full characterization is incomplete." },
    { label: "Blend both cultures — offsetting the unpredictability of the spontaneous ferment with the standardized starter until the mawè profile is fully mapped." }
    ],
    citation: "Grace Adzo Motey, Pernille Johansen, James Owusu‐Kwarteng, Linda Aurelia Ofori, Kwasi Obiri‐Danso, Henrik Siegumfeldt, Nadja Larsen, Lene Jespersen. (2020). Probiotic potential of Saccharomyces cerevisiae and Kluyveromyces marxianus isolated from West African spontaneously fermented cereal and milk products. Yeast. https://doi.org/10.1002/yea.3513",
    articleId: "c6d0dd8e-e464-4dd8-b879-3a4a4521a84a",
    articleTitle: "Probiotic potential of Saccharomyces cerevisiae and Kluyveromyces marxianus isolated from West African spontaneously fermented cereal and milk products",
    articleUrl: "https://doi.org/10.1002/yea.3513",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "00bb5f27-f326-43d7-8cce-515cce461553::episteme::78",
    register: "episteme",
    sender: "kock",
    question: "When working with malt in a mash, why can't you simply substitute higher-quality malt for more precise milling?",
    options: [
    { label: "Malt quality and milling precision are interchangeable inputs that both raise enzyme activity equally.", correct: false },
    { label: "Malt quality affects flavor, while milling precision affects only lautering speed.", correct: false },
    { label: "They are mechanistically distinct variables — malt quality determines which enzymes are present, while milling precision governs whether particle size falls within ranges that allow those enzymes to be liberated and diffuse into the mash.", correct: true },
    { label: "Milling precision matters only for high-adjunct recipes where malt enzymes are already insufficient.", correct: false }
    ],
    correctIndex: 2,
    citation: "Yin Tan W.. (2023). Mashing performance as a function of malt particle size in beer production. Critical Reviews in Food Science and Nutrition. https://doi.org/10.1080/10408398.2021.2018673",
    articleId: "00bb5f27-f326-43d7-8cce-515cce461553",
    articleTitle: "Mashing performance as a function of malt particle size in beer production",
    articleUrl: "https://doi.org/10.1080/10408398.2021.2018673",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "00bb5f27-f326-43d7-8cce-515cce461553::phronesis::79",
    register: "phronesis",
    sender: "kock",
    question: "You are brewing in-house and the wort coming off the mash is running low on fermentable sugars — the gravity is short of target two batches in a row. Before you call the yeast supplier or adjust your fermentation schedule, where do you look first?",
    options: [
    { label: "Review the malt lot to check whether grain plumpness met the recommended threshold, and inspect mill settings to confirm particle sizes fell within the optimal range." },
    { label: "Extend the fermentation time and increase pitching rate to compensate for the shortfall in fermentable sugars." },
    { label: "Lower the mash temperature on the next batch to push enzyme activity and recover fermentability." }
    ],
    citation: "Yin Tan W.. (2023). Mashing performance as a function of malt particle size in beer production. Critical Reviews in Food Science and Nutrition. https://doi.org/10.1080/10408398.2021.2018673",
    articleId: "00bb5f27-f326-43d7-8cce-515cce461553",
    articleTitle: "Mashing performance as a function of malt particle size in beer production",
    articleUrl: "https://doi.org/10.1080/10408398.2021.2018673",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "00cfe3d6-edb2-4eb3-9267-debb72742f88::phronesis::80",
    register: "phronesis",
    sender: "kock",
    question: "You've been running tastings on a new fermented hot sauce for two weeks. Half your tasters say the heat level is too high; the other half say they love it. Before the next session, your sous chef asks whether you want the team to rate it against your house benchmark or simply score how much they enjoy it. You're not sure yet — you just want 'useful feedback.' What is the most important thing to settle before the tasting begins?",
    options: [
    { label: "Decide whether you are asking whether the product meets a sensory benchmark or whether people like it, and structure the session accordingly." },
    { label: "Increase the number of tasters so the mixed results average out before you commit to a method." },
    { label: "Run both approaches simultaneously and compare the results afterward to save time." }
    ],
    citation: "M.A. Drake, M.E. Watson, Yaozheng Liu. (2023). Sensory Analysis and Consumer Preference: Best Practices. Annual Review of Food Science and Technology. https://doi.org/10.1146/annurev-food-060721-023619",
    articleId: "00cfe3d6-edb2-4eb3-9267-debb72742f88",
    articleTitle: "Sensory Analysis and Consumer Preference: Best Practices",
    articleUrl: "https://doi.org/10.1146/annurev-food-060721-023619",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "000f6e9b-d7b1-440f-a6ad-d49434950c44::episteme::81",
    register: "episteme",
    sender: "kock",
    question: "Which of the following correctly identifies a key odorant group found across Chinese truffle varieties, according to flavoromics research?",
    options: [
    { label: "Sulfur compounds such as dimethyl sulfide, dimethyl disulfide, and bis(methylthio)methane", correct: true },
    { label: "Terpene compounds such as linalool, geraniol, and alpha-pinene", correct: false },
    { label: "Ester compounds such as ethyl acetate, isoamyl acetate, and ethyl butyrate", correct: false },
    { label: "Phenolic compounds such as guaiacol, eugenol, and 4-methylguaiacol", correct: false }
    ],
    correctIndex: 0,
    citation: "Tao Feng, Mengzhu Shui, Shiqing Song, Haining Zhuang, Min Sun, Lingyun Yao. (2019). Characterization of the Key Aroma Compounds in Three Truffle Varieties from China by Flavoromics Approach. Molecules. https://doi.org/10.3390/molecules24183305",
    articleId: "000f6e9b-d7b1-440f-a6ad-d49434950c44",
    articleTitle: "Characterization of the Key Aroma Compounds in Three Truffle Varieties from China by Flavoromics Approach",
    articleUrl: "https://doi.org/10.3390/molecules24183305",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "000f6e9b-d7b1-440f-a6ad-d49434950c44::phronesis::82",
    register: "phronesis",
    sender: "kock",
    question: "A supplier delivers a mixed batch of Chinese truffles without specifying variety. Your current menu concept calls for a dish built on clean, nutty-floral notes to complement a delicate fish preparation. You have the option to send the batch back, ask the supplier to identify and separate the varieties, or use the truffles as-is and adjust seasoning to mask any off-notes. What drives your decision, and what do you trade off with each path?",
    options: [
    { label: "Send the batch back — unidentified varieties introduce aromatic unpredictability that could undermine the dish concept, though this risks straining the supplier relationship and delaying service." },
    { label: "Ask the supplier to specify and separate the varieties — this aligns selection with the aromatic register the dish requires, but adds lead time and assumes the supplier can reliably distinguish them." },
    { label: "Use the batch as-is and adjust seasoning — this preserves availability and keeps service on schedule, but sulfuric-musty or fatty-green notes from the wrong variety may be difficult to mask without altering the dish concept entirely." }
    ],
    citation: "Tao Feng, Mengzhu Shui, Shiqing Song, Haining Zhuang, Min Sun, Lingyun Yao. (2019). Characterization of the Key Aroma Compounds in Three Truffle Varieties from China by Flavoromics Approach. Molecules. https://doi.org/10.3390/molecules24183305",
    articleId: "000f6e9b-d7b1-440f-a6ad-d49434950c44",
    articleTitle: "Characterization of the Key Aroma Compounds in Three Truffle Varieties from China by Flavoromics Approach",
    articleUrl: "https://doi.org/10.3390/molecules24183305",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "00d78847-02f9-460a-ba05-a2eae133139c::episteme::83",
    register: "episteme",
    sender: "kock",
    question: "When cysteine is added to chicken carcass hydrolysate before heat treatment, what direction does flavor development take?",
    options: [
    { label: "It introduces allium character similar to onion.", correct: false },
    { label: "It directs flavor development toward recognized meaty volatiles.", correct: true },
    { label: "It acts as a rate-limiting factor by reducing precursor stability.", correct: false },
    { label: "It suppresses Maillard chemistry and produces fewer aroma compounds.", correct: false }
    ],
    correctIndex: 1,
    citation: "Xing Zhang, Shengwei Ma, Shao‐Quan Liu. (2025). Sulfur Supplementation Potentiates the Formation of Meat Aroma Compounds in Thermally Treated Chicken Carcass Hydrolysate. Journal of Food Science. https://doi.org/10.1111/1750-3841.70564",
    articleId: "00d78847-02f9-460a-ba05-a2eae133139c",
    articleTitle: "Sulfur Supplementation Potentiates the Formation of Meat Aroma Compounds in Thermally Treated Chicken Carcass Hydrolysate",
    articleUrl: "https://doi.org/10.1111/1750-3841.70564",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "00d78847-02f9-460a-ba05-a2eae133139c::techne::84",
    register: "techne",
    sender: "kock",
    question: "You are developing a chicken carcass hydrolysate-based sauce and want to push it toward a meaty rather than a garlic-onion profile. Which sulfur-precursor input is your best lever?",
    options: [
    { label: "Add cysteine-rich inputs to the hydrolysate", correct: true },
    { label: "Add onion to the hydrolysate", correct: false },
    { label: "Add djenkol bean as the primary sulfur source", correct: false },
    { label: "Increase thermal processing time without changing the sulfur source", correct: false }
    ],
    correctIndex: 0,
    citation: "Xing Zhang, Shengwei Ma, Shao‐Quan Liu. (2025). Sulfur Supplementation Potentiates the Formation of Meat Aroma Compounds in Thermally Treated Chicken Carcass Hydrolysate. Journal of Food Science. https://doi.org/10.1111/1750-3841.70564",
    articleId: "00d78847-02f9-460a-ba05-a2eae133139c",
    articleTitle: "Sulfur Supplementation Potentiates the Formation of Meat Aroma Compounds in Thermally Treated Chicken Carcass Hydrolysate",
    articleUrl: "https://doi.org/10.1111/1750-3841.70564",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "00d78847-02f9-460a-ba05-a2eae133139c::phronesis::85",
    register: "phronesis",
    sender: "kock",
    question: "Your chicken carcass sauce is lacking meaty depth. You've identified the problem as insufficient reactive sulfur precursors — not a roasting or reduction issue. You have onion on hand and access to cysteine-based ingredients. A senior chef is waiting for your call. What drives your choice between the two approaches?",
    options: [
    { label: "Reach for onion — it's accessible, practical, and will add complexity even if the profile shifts toward allium rather than pure meat." },
    { label: "Pursue a cysteine-based addition — it targets the meaty register directly and addresses the biochemical gap you've identified." },
    { label: "Extend roasting time and reduce the stock further before introducing any new ingredient — the sulfur precursors may develop on their own." }
    ],
    citation: "Xing Zhang, Shengwei Ma, Shao‐Quan Liu. (2025). Sulfur Supplementation Potentiates the Formation of Meat Aroma Compounds in Thermally Treated Chicken Carcass Hydrolysate. Journal of Food Science. https://doi.org/10.1111/1750-3841.70564",
    articleId: "00d78847-02f9-460a-ba05-a2eae133139c",
    articleTitle: "Sulfur Supplementation Potentiates the Formation of Meat Aroma Compounds in Thermally Treated Chicken Carcass Hydrolysate",
    articleUrl: "https://doi.org/10.1111/1750-3841.70564",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "5c153c1c-8f12-41c1-aff2-975d60674325::episteme::86",
    register: "episteme",
    sender: "kock",
    question: "When brewers spent grain is fermented before being added to pasta, what does the research show happens to the predicted glycaemic index compared to using unfermented brewers spent grain?",
    options: [
    { label: "Fermentation produces a measurably greater reduction in predicted glycaemic index, especially at higher inclusion levels.", correct: true },
    { label: "Fermentation and unfermented addition produce equivalent reductions in predicted glycaemic index.", correct: false },
    { label: "Fermentation raises the predicted glycaemic index by breaking down dietary fibre into simple sugars.", correct: false },
    { label: "Fermentation has no significant effect on predicted glycaemic index but improves flavour.", correct: false }
    ],
    correctIndex: 0,
    citation: "Emma Neylon, Elke K. Arendt, Emanuele Zannini, Aylin W. Sahin. (2021). Fundamental study of the application of brewers spent grain and fermented brewers spent grain on the quality of pasta. Food Structure. https://doi.org/10.1016/j.foostr.2021.100225",
    articleId: "5c153c1c-8f12-41c1-aff2-975d60674325",
    articleTitle: "Fundamental study of the application of brewers spent grain and fermented brewers spent grain on the quality of pasta",
    articleUrl: "https://doi.org/10.1016/j.foostr.2021.100225",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "5c153c1c-8f12-41c1-aff2-975d60674325::phronesis::87",
    register: "phronesis",
    sender: "kock",
    question: "You are developing a high-fibre pasta line using brewers spent grain. At a 15% inclusion level, the texture is already compromised compared to semolina. A colleague suggests skipping the fermentation step to save time and cost, arguing the nutritional gain is marginal at this level. How do you weigh this call?",
    options: [
    { label: "Skip fermentation at 15% inclusion — the additional processing step is most meaningful at higher inclusion levels, so the cost-benefit here does not justify it." },
    { label: "Always ferment regardless of inclusion level — the structural improvement is consistent across all percentages and the step is non-negotiable for quality." },
    { label: "Ferment only when texture is the primary concern, not when nutritional intent drives the decision, since the two goals are independent of inclusion level." }
    ],
    citation: "Emma Neylon, Elke K. Arendt, Emanuele Zannini, Aylin W. Sahin. (2021). Fundamental study of the application of brewers spent grain and fermented brewers spent grain on the quality of pasta. Food Structure. https://doi.org/10.1016/j.foostr.2021.100225",
    articleId: "5c153c1c-8f12-41c1-aff2-975d60674325",
    articleTitle: "Fundamental study of the application of brewers spent grain and fermented brewers spent grain on the quality of pasta",
    articleUrl: "https://doi.org/10.1016/j.foostr.2021.100225",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "c735dc88-d002-436b-bccd-599ae8bb3044::episteme::88",
    register: "episteme",
    sender: "kock",
    question: "Red pitaya peel powder has been studied as a fat replacer in ice cream. What is the primary source of this powder?",
    options: [
    { label: "The seeds separated during pitaya juice extraction", correct: false },
    { label: "The peel left over from pitaya pulp processing", correct: true },
    { label: "The whole fruit dehydrated at high temperature", correct: false },
    { label: "The pulp residue after pigment extraction", correct: false }
    ],
    correctIndex: 1,
    citation: "Michele Utpott, Rubilene Ramos de Araújo, Carolina Galarza Vargas, Ana Raisa Paiva, Bruna Tischer, Alessandro de Oliveira Rios, Simone Hickmann Flôres. (2020). Characterization and application of red pitaya (Hylocereus polyrhizus)peel powder as a fat replacer in ice cream. Journal of Food Processing and Preservation. https://doi.org/10.1111/jfpp.14420",
    articleId: "c735dc88-d002-436b-bccd-599ae8bb3044",
    articleTitle: "Characterization and application of red pitaya (Hylocereus polyrhizus)peel powder as a fat replacer in ice cream",
    articleUrl: "https://doi.org/10.1111/jfpp.14420",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "c735dc88-d002-436b-bccd-599ae8bb3044::phronesis::89",
    register: "phronesis",
    sender: "kock",
    question: "You are reformulating a house-made ice cream to cut fat content, and a colleague suggests using red pitaya peel powder as a fat replacer. Research backs the general approach — overrun and texture respond well — but you do not yet have the precise substitution ratios for your base recipe. How do you move forward in the kitchen?",
    options: [
    { label: "Hold the project until published ratios are available, since working without exact figures risks wasting product and time." },
    { label: "Run structured trials using ratio and incorporation level as your primary variables, accepting that the class of application is sound even if the exact parameters need dialing in." },
    { label: "Apply the powder at the same percentage as standard fat mimetics already in use, on the basis that functional powders behave similarly across formulations." }
    ],
    citation: "Michele Utpott, Rubilene Ramos de Araújo, Carolina Galarza Vargas, Ana Raisa Paiva, Bruna Tischer, Alessandro de Oliveira Rios, Simone Hickmann Flôres. (2020). Characterization and application of red pitaya (Hylocereus polyrhizus)peel powder as a fat replacer in ice cream. Journal of Food Processing and Preservation. https://doi.org/10.1111/jfpp.14420",
    articleId: "c735dc88-d002-436b-bccd-599ae8bb3044",
    articleTitle: "Characterization and application of red pitaya (Hylocereus polyrhizus)peel powder as a fat replacer in ice cream",
    articleUrl: "https://doi.org/10.1111/jfpp.14420",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "00d8a16d-1058-4232-9d7b-015217c8876c::episteme::90",
    register: "episteme",
    sender: "kock",
    question: "When making walnut-based soy sauce using solid-state fermentation, which starter produces the highest protease activity and amino nitrogen?",
    options: [
    { label: "Aspergillus oryzae alone", correct: true },
    { label: "Aspergillus niger alone", correct: false },
    { label: "A mixed starter of Aspergillus oryzae and Aspergillus niger", correct: false },
    { label: "All three approaches yield equivalent protease activity", correct: false }
    ],
    correctIndex: 0,
    citation: "Xiaogang Guo, M F Lin, Thanh Ninh Le, Zhihong Zhou, Minjie Zhao, Haiying Cai. (2025). Impact of Aspergillus Species on Microbial Community Dynamics and Their Associations with Fermentation Properties in Fermented Walnut-Based Soy Sauce. Foods. https://doi.org/10.3390/foods14223921",
    articleId: "00d8a16d-1058-4232-9d7b-015217c8876c",
    articleTitle: "Impact of Aspergillus Species on Microbial Community Dynamics and Their Associations with Fermentation Properties in Fermented Walnut-Based Soy Sauce",
    articleUrl: "https://doi.org/10.3390/foods14223921",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "00d8a16d-1058-4232-9d7b-015217c8876c::techne::91",
    register: "techne",
    sender: "kock",
    question: "You are developing a walnut-based soy sauce and your primary goal is maximum amino nitrogen development. Which starter selection does the research support?",
    options: [
    { label: "A mixed starter combining Aspergillus oryzae with other Aspergillus species, as blending cultures consistently outperforms single inoculants.", correct: false },
    { label: "Aspergillus oryzae as the primary inoculant, since the mixed starter does not outperform the single Aspergillus oryzae treatment in amino nitrogen metrics.", correct: true },
    { label: "Aspergillus niger as the sole inoculant, known for its superior protease activity in nut-based substrates.", correct: false },
    { label: "No inoculant; relying on ambient wild Aspergillus populations produces the highest amino nitrogen yield.", correct: false }
    ],
    correctIndex: 1,
    citation: "Xiaogang Guo, M F Lin, Thanh Ninh Le, Zhihong Zhou, Minjie Zhao, Haiying Cai. (2025). Impact of Aspergillus Species on Microbial Community Dynamics and Their Associations with Fermentation Properties in Fermented Walnut-Based Soy Sauce. Foods. https://doi.org/10.3390/foods14223921",
    articleId: "00d8a16d-1058-4232-9d7b-015217c8876c",
    articleTitle: "Impact of Aspergillus Species on Microbial Community Dynamics and Their Associations with Fermentation Properties in Fermented Walnut-Based Soy Sauce",
    articleUrl: "https://doi.org/10.3390/foods14223921",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "00d8a16d-1058-4232-9d7b-015217c8876c::phronesis::92",
    register: "phronesis",
    sender: "kock",
    question: "You are developing a walnut-based soy sauce for your restaurant's house condiment program. A supplier pitches you a mixed Aspergillus starter culture, arguing that greater microbial diversity will produce a more complex, superior product compared to a single strain. Research on this specific fermentation suggests otherwise. How do you weigh this decision?",
    options: [
    { label: "Accept the mixed starter, since microbial diversity is a reliable proxy for fermentation complexity and final product quality." },
    { label: "Choose Aspergillus oryzae as a single strain, because the evidence shows it outperforms the mixed treatment on measured quality metrics — and resist assuming diversity automatically means better outcomes." },
    { label: "Defer the decision until you can run a blind tasting, since fermentation data alone cannot predict sensory superiority in a restaurant context." }
    ],
    citation: "Xiaogang Guo, M F Lin, Thanh Ninh Le, Zhihong Zhou, Minjie Zhao, Haiying Cai. (2025). Impact of Aspergillus Species on Microbial Community Dynamics and Their Associations with Fermentation Properties in Fermented Walnut-Based Soy Sauce. Foods. https://doi.org/10.3390/foods14223921",
    articleId: "00d8a16d-1058-4232-9d7b-015217c8876c",
    articleTitle: "Impact of Aspergillus Species on Microbial Community Dynamics and Their Associations with Fermentation Properties in Fermented Walnut-Based Soy Sauce",
    articleUrl: "https://doi.org/10.3390/foods14223921",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "00e4fb37-af8a-494f-aa98-14659b5a4216::episteme::93",
    register: "episteme",
    sender: "kock",
    question: "In young Pinot Noir, what effect does microoxygenation have on colour intensity?",
    options: [
    { label: "It degrades anthocyanins and lowers colour intensity over time.", correct: false },
    { label: "It converts free anthocyanins into polymeric pigments, resulting in higher colour intensity.", correct: true },
    { label: "It has no measurable effect on anthocyanins or colour intensity.", correct: false },
    { label: "It stabilises free anthocyanins without converting them to polymeric pigments.", correct: false }
    ],
    correctIndex: 1,
    citation: "Yi Yang, Rebecca C. Deed, Leandro Dias Araújo, Andrew L. Waterhouse, Paul A. Kilmartin. (2022). Effect of microoxygenation on acetaldehyde, yeast and colour before and after malolactic fermentation on Pinot Noir wine. Australian Journal of Grape and Wine Research. https://doi.org/10.1111/ajgw.12512",
    articleId: "00e4fb37-af8a-494f-aa98-14659b5a4216",
    articleTitle: "Effect of microoxygenation on acetaldehyde, yeast and colour before and after malolactic fermentation on Pinot Noir wine",
    articleUrl: "https://doi.org/10.1111/ajgw.12512",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "00e4fb37-af8a-494f-aa98-14659b5a4216::phronesis::94",
    register: "phronesis",
    sender: "kock",
    question: "We're halfway through fermentation on a Pinot Noir and the head winemaker is asking whether to start microoxygenation now or wait until after malolactic fermentation. As the chef overseeing the culinary program that sources this wine, you're sitting in on the conversation. What would you flag as the more important thing to keep an eye on during this period, regardless of which timing they choose?",
    options: [
    { label: "Push for a decision on MOX timing, since the window before MLF produces noticeably different colour outcomes that will affect how the wine reads on the plate." },
    { label: "Redirect attention toward monitoring acetaldehyde levels, since the study links accumulation of that compound to both yeast behaviour and oxidative reactions happening at the same time." },
    { label: "Advise them to skip MOX entirely during fermentation and apply it only after MLF, as earlier application consistently produces off-notes that affect food pairing options." }
    ],
    citation: "Yi Yang, Rebecca C. Deed, Leandro Dias Araújo, Andrew L. Waterhouse, Paul A. Kilmartin. (2022). Effect of microoxygenation on acetaldehyde, yeast and colour before and after malolactic fermentation on Pinot Noir wine. Australian Journal of Grape and Wine Research. https://doi.org/10.1111/ajgw.12512",
    articleId: "00e4fb37-af8a-494f-aa98-14659b5a4216",
    articleTitle: "Effect of microoxygenation on acetaldehyde, yeast and colour before and after malolactic fermentation on Pinot Noir wine",
    articleUrl: "https://doi.org/10.1111/ajgw.12512",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "00e9ab20-a4ec-4f9e-bcce-352a4835e888::episteme::95",
    register: "episteme",
    sender: "kock",
    question: "According to research on food consumer behavior, what does information asymmetry between producer and consumer depend on?",
    options: [
    { label: "The price point of the food product", correct: false },
    { label: "The specific features of the food product", correct: true },
    { label: "The geographic origin of the ingredients", correct: false },
    { label: "The marketing channel used to sell the product", correct: false }
    ],
    correctIndex: 1,
    citation: "Marian Socoliuc, Veronica Grosu, Marius-Sorin Ciubotariu, Simona-Maria Brînzaru, Cristina Gabriela Cosmulese. (2022). Is Information Asymmetry a Disruptive Factor in Food Consumer Behavior During the COVID Pandemic?. Frontiers in Nutrition. https://doi.org/10.3389/fnut.2022.912759",
    articleId: "00e9ab20-a4ec-4f9e-bcce-352a4835e888",
    articleTitle: "Is Information Asymmetry a Disruptive Factor in Food Consumer Behavior During the COVID Pandemic?",
    articleUrl: "https://doi.org/10.3389/fnut.2022.912759",
    topic: "nutritional_science",
    needsRetag: false
  },
  {
    id: "00e9ab20-a4ec-4f9e-bcce-352a4835e888::phronesis::96",
    register: "phronesis",
    sender: "kock",
    question: "A guest points at your menu and asks why a fermented vegetable dish is described in general terms rather than with specifics about the process and ingredients. You know the fermentation details are unconventional and may confuse some guests while reassuring others. How much do you disclose, and how do you frame it?",
    options: [
    { label: "Keep the description vague to avoid overwhelming guests who are unlikely to engage with the process detail, and offer verbal explanation only if pressed." },
    { label: "Include specific process detail on the menu itself, accepting that some guests will disengage, because closing the knowledge gap builds confidence for those who do engage." },
    { label: "Calibrate disclosure to the product — lead with the outcome the guest can evaluate, then offer the process detail as a follow-up for those who want it." }
    ],
    citation: "Marian Socoliuc, Veronica Grosu, Marius-Sorin Ciubotariu, Simona-Maria Brînzaru, Cristina Gabriela Cosmulese. (2022). Is Information Asymmetry a Disruptive Factor in Food Consumer Behavior During the COVID Pandemic?. Frontiers in Nutrition. https://doi.org/10.3389/fnut.2022.912759",
    articleId: "00e9ab20-a4ec-4f9e-bcce-352a4835e888",
    articleTitle: "Is Information Asymmetry a Disruptive Factor in Food Consumer Behavior During the COVID Pandemic?",
    articleUrl: "https://doi.org/10.3389/fnut.2022.912759",
    topic: "nutritional_science",
    needsRetag: false
  },
  {
    id: "00ea7c69-44e2-4c2a-8f39-00f653ccd9f2::phronesis::97",
    register: "phronesis",
    sender: "värd",
    question: "You are plating the service for a lightly fermented house beverage — something you want guests to read as fresh before they taste it. You can serve it in a frosted ceramic cup with no visible carbonation, in a clear glass with an audible pour showing active bubbles, or in an opaque insulated vessel that keeps it coldest but reveals nothing visually or acoustically. Which approach best uses what we know about how freshness perception is formed?",
    options: [
    { label: "Use the frosted ceramic cup — the visual cue of condensation on the exterior is enough to signal cold and freshness without needing to show carbonation." },
    { label: "Use the clear glass with an audible pour — guests need to see and hear signs of carbonation and cold before tasting, and those audiovisual cues actively shape the freshness experience." },
    { label: "Use the opaque insulated vessel — actual temperature retention matters more than perceived signals, because freshness is ultimately a taste judgment made after the first sip." }
    ],
    citation: "Jérémy Roque, Jérémie Lafraire, Charles Spence, Malika Auvray. (2018). The influence of audiovisual stimuli cuing temperature, carbonation, and color on the categorization of freshness in beverages. Journal of Sensory Studies. https://doi.org/10.1111/joss.12469",
    articleId: "00ea7c69-44e2-4c2a-8f39-00f653ccd9f2",
    articleTitle: "The influence of audiovisual stimuli cuing temperature, carbonation, and color on the categorization of freshness in beverages",
    articleUrl: "https://doi.org/10.1111/joss.12469",
    topic: "multisensory",
    needsRetag: false
  },
  {
    id: "00f80f2c-3b08-427b-b9c0-2ce4edd14eae::phronesis::98",
    register: "phronesis",
    sender: "värd",
    question: "You are head chef for a large coastal community gathering in West Kalimantan. A local supplier offers you a faster, cheaper sourcing route for the main protein, but you cannot fully verify the slaughter process meets Islamic requirements. The event organiser says the crowd is mixed and 'most people won't notice.' How do you weigh this decision?",
    options: [
    { label: "Accept the supplier's product to keep costs down and service on schedule, reasoning that the social cohesion of the gathering outweighs unverified compliance details." },
    { label: "Decline the supplier until sourcing, preparation intent, and distribution practice can be confirmed to align with the community's Islamic legal framework, even if it delays or raises the cost of the event." },
    { label: "Use the product only for non-Muslim guests and source a separately verified protein for Muslim guests, treating the two groups as operationally separate." }
    ],
    citation: "Hariansyah Hariansyah, Ana Rosilawati. (2021). Religion and Psychological Values in Culinary Tradition Within Local Communities of West Kalimantan. Al-Albab. https://doi.org/10.24260/alalbab.v10i2.2099",
    articleId: "00f80f2c-3b08-427b-b9c0-2ce4edd14eae",
    articleTitle: "Religion and Psychological Values in Culinary Tradition Within Local Communities of West Kalimantan",
    articleUrl: "https://doi.org/10.24260/alalbab.v10i2.2099",
    topic: "food_anthropology",
    needsRetag: false
  },
  {
    id: "010f1b25-f70e-4a89-9ed3-b6ddfbe9d9aa::episteme::99",
    register: "episteme",
    sender: "kock",
    question: "When chestnut puree is fermented with Lactococcus lactis or Lactobacillus casei, what happens to the starch in the puree?",
    options: [
    { label: "The starch is fully broken down into sugars by the bacteria.", correct: false },
    { label: "The starch remains structurally intact because neither strain can metabolize it.", correct: true },
    { label: "The starch converts partially to alcohol during fermentation.", correct: false },
    { label: "The starch is gelatinized by the heat generated during fermentation.", correct: false }
    ],
    correctIndex: 1,
    citation: "Maria João Afonso, Elsa Ramalhosa, Pablo G. del Río, Fátima Martins, Paula Baptista, Ermelinda Pereira, Nelson Pérez Guerra. (2025). Production of nondairy fermented products with chestnut puree as substrate and milk kefir grains or two lactic acid bacteria. Journal of Food Science. https://doi.org/10.1111/1750-3841.17474",
    articleId: "010f1b25-f70e-4a89-9ed3-b6ddfbe9d9aa",
    articleTitle: "Production of nondairy fermented products with chestnut puree as substrate and milk kefir grains or two lactic acid bacteria",
    articleUrl: "https://doi.org/10.1111/1750-3841.17474",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "010f1b25-f70e-4a89-9ed3-b6ddfbe9d9aa::phronesis::100",
    register: "phronesis",
    sender: "kock",
    question: "You are developing a fermented chestnut puree dish and notice the texture stays thick and starchy throughout fermentation — unlike what you see with grain-based ferments. You need to decide whether to serve it as-is or treat the puree before fermentation starts. What is the real tradeoff you are weighing here?",
    options: [
    { label: "The retained starchy body could be a textural asset for the dish, so pre-treatment may be unnecessary — but if a thinner, more liquid result is needed, you will have to intervene before fermentation, not after." },
    { label: "The starch will break down eventually if fermentation runs long enough, so the main decision is whether to extend fermentation time or add commercial amylase during the process." },
    { label: "Chestnut puree ferments identically to grain-based substrates, so any textural difference you observe is a sign of contamination rather than a property of the substrate itself." }
    ],
    citation: "Maria João Afonso, Elsa Ramalhosa, Pablo G. del Río, Fátima Martins, Paula Baptista, Ermelinda Pereira, Nelson Pérez Guerra. (2025). Production of nondairy fermented products with chestnut puree as substrate and milk kefir grains or two lactic acid bacteria. Journal of Food Science. https://doi.org/10.1111/1750-3841.17474",
    articleId: "010f1b25-f70e-4a89-9ed3-b6ddfbe9d9aa",
    articleTitle: "Production of nondairy fermented products with chestnut puree as substrate and milk kefir grains or two lactic acid bacteria",
    articleUrl: "https://doi.org/10.1111/1750-3841.17474",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "011bec47-d95c-40aa-a476-f2338f0917d8::episteme::101",
    register: "episteme",
    sender: "kock",
    question: "Where do the microorganisms responsible for cocoa fermentation come from?",
    options: [
    { label: "They are cultivated from selected starter cultures added by the producer.", correct: false },
    { label: "They originate spontaneously from the environment, the fruit itself, fermentation boxes, and utensils.", correct: true },
    { label: "They are introduced through controlled inoculation during post-harvest processing.", correct: false },
    { label: "They derive exclusively from the soil in which the cacao trees are grown.", correct: false }
    ],
    correctIndex: 1,
    citation: "G.G. Lopes, Marcelo Antônio Morgano, Marta Hiromi Taniwaki. (2024). Advances in bean-to-bar chocolate production: Microbiology, biochemistry, processing, and sensorial aspects. Brazilian journal of food technology/Brazilian Journal of Food Technology. https://doi.org/10.1590/1981-6723.13323",
    articleId: "011bec47-d95c-40aa-a476-f2338f0917d8",
    articleTitle: "Advances in bean-to-bar chocolate production: Microbiology, biochemistry, processing, and sensorial aspects",
    articleUrl: "https://doi.org/10.1590/1981-6723.13323",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "011bec47-d95c-40aa-a476-f2338f0917d8::phronesis::102",
    register: "phronesis",
    sender: "kock",
    question: "You are developing a single-origin chocolate bar and are comparing two cocoa suppliers. Supplier A ships beans from a well-known origin with strong marketing around terroir and variety. Supplier B is a smaller operation from a less prestigious region, but their documentation shows a detailed, controlled spontaneous fermentation protocol with clear timelines and turning records. Supplier A's documentation is vague on fermentation — they emphasize genetics and geography instead. Both are priced similarly. Which direction do you lean, and what is the tradeoff you are accepting?",
    options: [
    { label: "Lean toward Supplier A — origin and variety are the primary drivers of flavor complexity, and a prestigious terroir gives you a stronger story for the menu, even if fermentation details are sparse." },
    { label: "Lean toward Supplier B — controlled, documented spontaneous fermentation is more likely to have generated the precursor compounds that define flavor, even if the origin carries less prestige; the tradeoff is a harder sell to guests unfamiliar with the region." },
    { label: "Request blended lots from both suppliers and adjust during conching to compensate for any fermentation gaps in Supplier A's beans, since post-processing can be used to recover missing flavor compounds." }
    ],
    citation: "G.G. Lopes, Marcelo Antônio Morgano, Marta Hiromi Taniwaki. (2024). Advances in bean-to-bar chocolate production: Microbiology, biochemistry, processing, and sensorial aspects. Brazilian journal of food technology/Brazilian Journal of Food Technology. https://doi.org/10.1590/1981-6723.13323",
    articleId: "011bec47-d95c-40aa-a476-f2338f0917d8",
    articleTitle: "Advances in bean-to-bar chocolate production: Microbiology, biochemistry, processing, and sensorial aspects",
    articleUrl: "https://doi.org/10.1590/1981-6723.13323",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "011c2573-7835-4fc3-b966-eb1eb85cc185::episteme::103",
    register: "episteme",
    sender: "kock",
    question: "When blending oregano essential oil with lemon oil in a carbonated soft drink, what role does the oregano oil play at a low blending ratio?",
    options: [
    { label: "It acts as an antioxidant enhancer without overwhelming the lemon aromatic profile.", correct: true },
    { label: "It replaces lemon oil as the dominant flavour carrier.", correct: false },
    { label: "It functions primarily as a carbonation stabiliser.", correct: false },
    { label: "It neutralises the acidity of the lemon base.", correct: false }
    ],
    correctIndex: 0,
    citation: "Mohamed Yehia Sayed Ahmed, Rasha Saad, Fatma Shafik Abd El-Aleem, Shereen N. Lotfy, Hoda H. M. Fadel. (2023). Improving the Antioxidant Activity of a Carbonated Lemon Soft Drink. Asian Food Science Journal. https://doi.org/10.9734/afsj/2023/v22i10670",
    articleId: "011c2573-7835-4fc3-b966-eb1eb85cc185",
    articleTitle: "Improving the Antioxidant Activity of a Carbonated Lemon Soft Drink",
    articleUrl: "https://doi.org/10.9734/afsj/2023/v22i10670",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "011c2573-7835-4fc3-b966-eb1eb85cc185::phronesis::104",
    register: "phronesis",
    sender: "kock",
    question: "You are developing a carbonated lemon drink for a client who wants reduced oxidative degradation but refuses synthetic antioxidants. Research points to oregano essential oil at a specific ratio as a candidate ingredient. Before you commit to scaling production, what is your most defensible next step?",
    options: [
    { label: "Run trials with oregano essential oil at the reported ratio in your own beverage matrix and evaluate the results before scaling." },
    { label: "Increase the lemon oil concentration instead, since it is already part of the flavor profile and avoids introducing a new botanical." },
    { label: "Add ascorbic acid at a low enough dose that it qualifies as a processing aid rather than a declared additive, satisfying the client's concern." }
    ],
    citation: "Mohamed Yehia Sayed Ahmed, Rasha Saad, Fatma Shafik Abd El-Aleem, Shereen N. Lotfy, Hoda H. M. Fadel. (2023). Improving the Antioxidant Activity of a Carbonated Lemon Soft Drink. Asian Food Science Journal. https://doi.org/10.9734/afsj/2023/v22i10670",
    articleId: "011c2573-7835-4fc3-b966-eb1eb85cc185",
    articleTitle: "Improving the Antioxidant Activity of a Carbonated Lemon Soft Drink",
    articleUrl: "https://doi.org/10.9734/afsj/2023/v22i10670",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "012305e0-767b-4a33-9662-65a3a155a247::phronesis::105",
    register: "phronesis",
    sender: "kock",
    question: "You are bringing on a new fermentation assistant who passed every food safety test during onboarding. On their second shift, you notice they have strong theoretical recall but have not once flagged or corrected a hygiene lapse when a colleague cuts corners nearby. How do you read this situation, and what do you do next?",
    options: [
    { label: "Their test scores confirm they know the protocols — assume the behavior will follow once they settle in, and monitor remotely over the next few weeks." },
    { label: "Treat the absence of unprompted correction as a meaningful signal: probe whether they understand why safety matters beyond compliance, and create a moment where they must articulate or act on that reasoning." },
    { label: "Assign them a formal re-test of the coursework material, since a gap in practice most likely means a gap in knowledge that the initial test missed." }
    ],
    citation: "Sadi Taha, Malak Angor, Khaled M. Al‐Marazeeq, Tareq M. Osaili, Ahmad Albloush, Walid M. Al‐Rousan, Radwan Ajo, Richard A. Holley, Arif Fadhel, Omar Alboqai. (2024). Improving food safety compliance of potential employees through a novel model of knowledge, attitude, commitment, and practice. Journal of Food Science. https://doi.org/10.1111/1750-3841.17536",
    articleId: "012305e0-767b-4a33-9662-65a3a155a247",
    articleTitle: "Improving food safety compliance of potential employees through a novel model of knowledge, attitude, commitment, and practice",
    articleUrl: "https://doi.org/10.1111/1750-3841.17536",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "012d6b00-35d3-4b45-844f-284bfb28cebe::phronesis::106",
    register: "phronesis",
    sender: "värd",
    question: "You are finalising a new fermented dish for the tasting menu. The combination of ingredients feels coherent to you and the team, and the dish reads as complete and unified. A colleague suggests leaving the preparation more open-ended so guests or cooks can adjust it over time. How do you weigh that against your instinct to present a finished, intentional composition?",
    options: [
    { label: "Hold the dish as composed — a unified presentation signals craft and intent, and ambiguity risks confusing the guest about what the dish is meant to be." },
    { label: "Build in a deliberate point of openness — acknowledge that the logic of what belongs together reflects your own perspective, not a universal one, and that closure may cut off the dish's potential to evolve." },
    { label: "Test both versions with guests and let service data decide — the question of openness versus closure is ultimately a commercial one, not a culinary or cultural one." }
    ],
    citation: "Schmidt M.. (2020). Being one while being many–social and culinary parts and wholes in Western Kenya. Food Culture and Society. https://doi.org/10.1080/15528014.2020.1775410",
    articleId: "012d6b00-35d3-4b45-844f-284bfb28cebe",
    articleTitle: "Being one while being many–social and culinary parts and wholes in Western Kenya",
    articleUrl: "https://doi.org/10.1080/15528014.2020.1775410",
    topic: "food_anthropology",
    needsRetag: false
  },
  {
    id: "0137969d-8b8d-408b-ab32-a931aff0c9f8::episteme::107",
    register: "episteme",
    sender: "kock",
    question: "According to current research on pulse consumption, what claims are associated with meals developed through culinary innovation approaches that use pulses?",
    options: [
    { label: "Healthy and environmental claims", correct: true },
    { label: "Functional and medicinal claims", correct: false },
    { label: "Artisanal and heritage claims", correct: false },
    { label: "Economic and convenience claims", correct: false }
    ],
    correctIndex: 0,
    citation: "Alexandra Seabra Pinto, Manuela Guerra, Bruna Carbas, Shivani Pathania, Ana Castanho, Carla Brites. (2016). Challenges and opportunities for food processing to promote consumption of pulses. Revista de Ciências Agrárias. https://doi.org/10.19084/rca16117",
    articleId: "0137969d-8b8d-408b-ab32-a931aff0c9f8",
    articleTitle: "Challenges and opportunities for food processing to promote consumption of pulses",
    articleUrl: "https://doi.org/10.19084/rca16117",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "0137969d-8b8d-408b-ab32-a931aff0c9f8::phronesis::108",
    register: "phronesis",
    sender: "kock",
    question: "You are building a pulse-forward tasting menu for a mid-range urban restaurant. Your guests skew time-poor and health-conscious, and you want the pulse dishes to land without friction. You have three options for how to position the lentil dish on the menu: (A) describe it primarily through its environmental credentials, leaning on sustainability messaging; (B) present it in a familiar format — say, a lentil ragù served over pasta — and let the texture and integration do the work without front-loading any messaging; (C) lead with nutritional claims on the menu card and offer a brief table explanation of the protein content. Which approach carries the strongest tradeoffs, and what does each risk?",
    options: [
    { label: "Option A risks alienating guests who are indifferent to environmental claims, but it is a legitimate communication choice if your audience is already sustainability-oriented — the tradeoff is that convenience and appeal are not addressed." },
    { label: "Option B reduces friction through format and texture familiarity, which directly addresses convenience as a decision factor, but it foregoes the evidence-supported health and environmental messaging that could reinforce the guest's choice." },
    { label: "Option C front-loads nutritional information, which may appeal to health-conscious guests, but risks making the dish feel clinical and ignores the convenience and format dimensions that also drive acceptance." }
    ],
    citation: "Alexandra Seabra Pinto, Manuela Guerra, Bruna Carbas, Shivani Pathania, Ana Castanho, Carla Brites. (2016). Challenges and opportunities for food processing to promote consumption of pulses. Revista de Ciências Agrárias. https://doi.org/10.19084/rca16117",
    articleId: "0137969d-8b8d-408b-ab32-a931aff0c9f8",
    articleTitle: "Challenges and opportunities for food processing to promote consumption of pulses",
    articleUrl: "https://doi.org/10.19084/rca16117",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "c8aeb9cf-5aaf-4a6a-8616-331ec7a1f75b::episteme::109",
    register: "episteme",
    sender: "kock",
    question: "When Allium mongolicum Regel is separated into its water-soluble and liposoluble fractions and used in fermented mutton sausage, which fraction lowers pH more than the control?",
    options: [
    { label: "The liposoluble extract", correct: true },
    { label: "The water-soluble extract", correct: false },
    { label: "The whole plant preparation", correct: false },
    { label: "Both fractions lower pH equally compared to the control", correct: false }
    ],
    correctIndex: 0,
    citation: "Lihua Zhao, Xueying Sun, Jing Wu, Lin Su, Fan Yang, Ye Jin, Meizhi Zhang, Changjin Ao. (2021). Effects of Allium mongolicum Regel and its extracts on the quality of fermented mutton sausages. Food Science & Nutrition. https://doi.org/10.1002/fsn3.2657",
    articleId: "c8aeb9cf-5aaf-4a6a-8616-331ec7a1f75b",
    articleTitle: "Effects of Allium mongolicum Regel and its extracts on the quality of fermented mutton sausages",
    articleUrl: "https://doi.org/10.1002/fsn3.2657",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "c8aeb9cf-5aaf-4a6a-8616-331ec7a1f75b::phronesis::110",
    register: "phronesis",
    sender: "kock",
    question: "You are developing a fermented mutton sausage program and have access to whole Allium mongolicum Regel, its liposoluble extract, and its water-soluble extract. Your current batch needs pronounced volatile aromatic intensity — the nose on the plate matters most to the menu concept. Your sous chef argues for the liposoluble extract because it drives essential amino acid content. How do you weigh the two priorities and decide which fraction to use for this specific batch?",
    options: [
    { label: "Use the liposoluble extract, since amino acid depth will translate into perceived aroma once the sausage is sliced and served warm." },
    { label: "Use the water-soluble extract, treating volatile aromatic intensity as the primary target for this batch and reserving the liposoluble fraction for a batch where acid depth and amino acid profile are the goal." },
    { label: "Use whole AMR, since neither extract alone captures the full compositional effect and a blended approach avoids committing to either priority." }
    ],
    citation: "Lihua Zhao, Xueying Sun, Jing Wu, Lin Su, Fan Yang, Ye Jin, Meizhi Zhang, Changjin Ao. (2021). Effects of Allium mongolicum Regel and its extracts on the quality of fermented mutton sausages. Food Science & Nutrition. https://doi.org/10.1002/fsn3.2657",
    articleId: "c8aeb9cf-5aaf-4a6a-8616-331ec7a1f75b",
    articleTitle: "Effects of Allium mongolicum Regel and its extracts on the quality of fermented mutton sausages",
    articleUrl: "https://doi.org/10.1002/fsn3.2657",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "01433b85-46b2-4ea9-ab1c-623b1ef574bb::episteme::111",
    register: "episteme",
    sender: "kock",
    question: "According to research on traditional olive oil consumer behavior in Çanakkale, which factor most significantly predicts consumer preference?",
    options: [
    { label: "Free fatty acid content", correct: false },
    { label: "Optical lightness (L value)", correct: true },
    { label: "Acidity level", correct: false },
    { label: "Malaxation temperature", correct: false }
    ],
    correctIndex: 1,
    citation: "Mustafa Öğütçü, Emin Yılmaz. (2009). Path Analysis for the Behavior of Traditional Olive Oil Consumer in Canakkale. Food Science and Technology Research. https://doi.org/10.3136/fstr.15.19",
    articleId: "01433b85-46b2-4ea9-ab1c-623b1ef574bb",
    articleTitle: "Path Analysis for the Behavior of Traditional Olive Oil Consumer in Canakkale",
    articleUrl: "https://doi.org/10.3136/fstr.15.19",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "01433b85-46b2-4ea9-ab1c-623b1ef574bb::techne::112",
    register: "techne",
    sender: "kock",
    question: "You are processing a new batch of olive oil and want to limit oxidative darkening during malaxation. What is the temperature ceiling you must stay strictly below?",
    options: [
    { label: "27°C", correct: true },
    { label: "30°C", correct: false },
    { label: "24°C", correct: false },
    { label: "35°C", correct: false }
    ],
    correctIndex: 0,
    citation: "Mustafa Öğütçü, Emin Yılmaz. (2009). Path Analysis for the Behavior of Traditional Olive Oil Consumer in Canakkale. Food Science and Technology Research. https://doi.org/10.3136/fstr.15.19",
    articleId: "01433b85-46b2-4ea9-ab1c-623b1ef574bb",
    articleTitle: "Path Analysis for the Behavior of Traditional Olive Oil Consumer in Canakkale",
    articleUrl: "https://doi.org/10.3136/fstr.15.19",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "01433b85-46b2-4ea9-ab1c-623b1ef574bb::phronesis::113",
    register: "phronesis",
    sender: "kock",
    question: "You're at the malaxation tank early morning. The paste from this batch tested slightly higher free acidity than yesterday's — the olives sat a few hours longer before pressing. Your senior left you to manage the run. Do you adjust temperature down and shorten contact time to protect quality, hold the standard parameters and accept the risk, or push temperature up to accelerate processing and move the batch through faster?",
    options: [
    { label: "Adjust temperature down and shorten contact time, accepting a smaller yield window to protect the color and quality profile the market expects." },
    { label: "Hold standard malaxation parameters — the acidity difference is minor and deviating from protocol introduces more variables than it solves." },
    { label: "Raise temperature to accelerate the run, reasoning that faster processing limits further oxidation in a batch already compromised." }
    ],
    citation: "Mustafa Öğütçü, Emin Yılmaz. (2009). Path Analysis for the Behavior of Traditional Olive Oil Consumer in Canakkale. Food Science and Technology Research. https://doi.org/10.3136/fstr.15.19",
    articleId: "01433b85-46b2-4ea9-ab1c-623b1ef574bb",
    articleTitle: "Path Analysis for the Behavior of Traditional Olive Oil Consumer in Canakkale",
    articleUrl: "https://doi.org/10.3136/fstr.15.19",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "01442440-737c-49fd-96d5-a926d852a1d4::episteme::114",
    register: "episteme",
    sender: "kock",
    question: "You're sourcing green coffee for a fermentation experiment. Which yeast genus, beyond Saccharomyces cerevisiae, was used in the controlled inoculation study that showed strain-specific, roast-survivable flavor changes in green coffee?",
    options: [
    { label: "Torulaspora delbrueckii", correct: true },
    { label: "Brettanomyces bruxellensis", correct: false },
    { label: "Lactobacillus plantarum", correct: false },
    { label: "Kluyveromyces marxianus", correct: false }
    ],
    correctIndex: 0,
    citation: "Natalia Calderon, Glycine Jiang, Patrick A. Gibney, Robin Dando. (2023). A Consumer Assessment of Fermented Green Coffee Beans with Common Beer/Wine Yeast Strains for Novel Flavor Properties. Fermentation. https://doi.org/10.3390/fermentation9100865",
    articleId: "01442440-737c-49fd-96d5-a926d852a1d4",
    articleTitle: "A Consumer Assessment of Fermented Green Coffee Beans with Common Beer/Wine Yeast Strains for Novel Flavor Properties",
    articleUrl: "https://doi.org/10.3390/fermentation9100865",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "01442440-737c-49fd-96d5-a926d852a1d4::techne::115",
    register: "techne",
    sender: "kock",
    question: "You're planning a yeast-fermented green coffee project and want to carry specific flavor tendencies — fruity esters, lactic notes — reliably into the coffee. What does the research support as your practical leverage point?",
    options: [
    { label: "Selecting yeast strains already engineered for those flavor outputs in beer or wine fermentation", correct: true },
    { label: "Extending fermentation beyond 72 hours to amplify ester development", correct: false },
    { label: "Controlling substrate preparation and inoculation rates as the primary flavor variables", correct: false },
    { label: "Using a dry fermentation environment to concentrate lactic acid production", correct: false }
    ],
    correctIndex: 0,
    citation: "Natalia Calderon, Glycine Jiang, Patrick A. Gibney, Robin Dando. (2023). A Consumer Assessment of Fermented Green Coffee Beans with Common Beer/Wine Yeast Strains for Novel Flavor Properties. Fermentation. https://doi.org/10.3390/fermentation9100865",
    articleId: "01442440-737c-49fd-96d5-a926d852a1d4",
    articleTitle: "A Consumer Assessment of Fermented Green Coffee Beans with Common Beer/Wine Yeast Strains for Novel Flavor Properties",
    articleUrl: "https://doi.org/10.3390/fermentation9100865",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "01442440-737c-49fd-96d5-a926d852a1d4::phronesis::116",
    register: "phronesis",
    sender: "kock",
    question: "You are developing a fermented coffee component for a new beverage pairing on your tasting menu. You have access to wine and beer yeast strains that research shows can produce fruity and floral notes in green coffee. However, consumer testing suggests that unfermented coffee still scores higher in overall liking. How do you proceed?",
    options: [
    { label: "Commit fully to an inoculated fermentation approach for the pairing, trusting that the novel fruity and floral flavors will distinguish the dish and win over guests." },
    { label: "Use the fermented coffee only in a controlled, small-scale format — such as a single course or amuse-bouche — while monitoring guest feedback before broader integration, acknowledging the tool still needs calibration." },
    { label: "Abandon the fermented coffee concept entirely, since consumer data shows the unfermented baseline is currently preferred, and default to a conventional coffee component." }
    ],
    citation: "Natalia Calderon, Glycine Jiang, Patrick A. Gibney, Robin Dando. (2023). A Consumer Assessment of Fermented Green Coffee Beans with Common Beer/Wine Yeast Strains for Novel Flavor Properties. Fermentation. https://doi.org/10.3390/fermentation9100865",
    articleId: "01442440-737c-49fd-96d5-a926d852a1d4",
    articleTitle: "A Consumer Assessment of Fermented Green Coffee Beans with Common Beer/Wine Yeast Strains for Novel Flavor Properties",
    articleUrl: "https://doi.org/10.3390/fermentation9100865",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "014d25c5-3539-4196-a620-6c89957b3c58::episteme::117",
    register: "episteme",
    sender: "kock",
    question: "Which two types of intervention are identified as particularly promising for inhibiting spoilage bacteria in fish and crustaceans?",
    options: [
    { label: "Modified atmosphere packaging and cold-chain logistics", correct: false },
    { label: "Plant-derived preservatives and hurdle technologies", correct: true },
    { label: "Acidification treatments and vacuum sealing", correct: false },
    { label: "Aquaculture feed additives and UV irradiation", correct: false }
    ],
    correctIndex: 1,
    citation: "Shuai Zhuang, Hui Hong, Longteng Zhang, Yongkang Luo. (2021). Spoilage-related microbiota in fish and crustaceans during storage: Research progress and future trends. Comprehensive Reviews in Food Science and Food Safety. https://doi.org/10.1111/1541-4337.12659",
    articleId: "014d25c5-3539-4196-a620-6c89957b3c58",
    articleTitle: "Spoilage-related microbiota in fish and crustaceans during storage: Research progress and future trends",
    articleUrl: "https://doi.org/10.1111/1541-4337.12659",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "014d25c5-3539-4196-a620-6c89957b3c58::phronesis::118",
    register: "phronesis",
    sender: "kock",
    question: "You are developing a fermented fish preparation for the menu and need to choose preservatives. You know the fish came from an aquaculture supplier with inconsistent handling records, and you are weighing plant-derived antimicrobials against conventional chemical preservatives, combined with strict cold-chain control. What is the core tradeoff you are navigating?",
    options: [
    { label: "Plant-derived preservatives may be less predictable in effect because the microbial load you are managing was already shaped by handling and environment before the fish reached you — but layering them with temperature control follows a hurdle logic that addresses that variability." },
    { label: "Conventional chemical preservatives offer a more standardized kill-step and should replace temperature control entirely, since the fermentation process itself neutralizes most spoilage organisms regardless of prior handling." },
    { label: "The aquaculture history is irrelevant once fermentation begins, so the choice of preservative should be based solely on flavor compatibility rather than any antimicrobial logic." }
    ],
    citation: "Shuai Zhuang, Hui Hong, Longteng Zhang, Yongkang Luo. (2021). Spoilage-related microbiota in fish and crustaceans during storage: Research progress and future trends. Comprehensive Reviews in Food Science and Food Safety. https://doi.org/10.1111/1541-4337.12659",
    articleId: "014d25c5-3539-4196-a620-6c89957b3c58",
    articleTitle: "Spoilage-related microbiota in fish and crustaceans during storage: Research progress and future trends",
    articleUrl: "https://doi.org/10.1111/1541-4337.12659",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "0155fa72-94b7-43e5-8dcc-466baa340ad1::episteme::119",
    register: "episteme",
    sender: "kock",
    question: "Which combination of technologies is identified as a particularly effective direction for reducing allergens in food, when used together with fermentation?",
    options: [
    { label: "High-pressure processing, enzymatic hydrolysis, and freeze-drying", correct: false },
    { label: "Heat treatment, pulsed light, and ultrasonication", correct: true },
    { label: "Smoking, brining, and cold plasma treatment", correct: false },
    { label: "UV irradiation, vacuum packaging, and sous vide cooking", correct: false }
    ],
    correctIndex: 1,
    citation: "Xiaowen Pi, Yili Yang, Yuxue Sun, Qiang Cui, Yin Wan, Guiming Fu, Hongbing Chen, Jianjun Cheng. (2022). Recent advances in alleviating food allergenicity through fermentation. Critical Reviews in Food Science and Nutrition. https://doi.org/10.1080/10408398.2021.1913093",
    articleId: "0155fa72-94b7-43e5-8dcc-466baa340ad1",
    articleTitle: "Recent advances in alleviating food allergenicity through fermentation",
    articleUrl: "https://doi.org/10.1080/10408398.2021.1913093",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "0155fa72-94b7-43e5-8dcc-466baa340ad1::phronesis::120",
    register: "phronesis",
    sender: "kock",
    question: "You are developing a fermented soy-based dish for guests who report food allergies. Research supports combining fermentation with additional processing steps to reach maximum allergen reduction. You have a small kitchen team, limited equipment, and guests are waiting on a clear answer about safety. How do you proceed?",
    options: [
    { label: "Apply fermentation combined with one additional processing step you can reliably execute — such as heat treatment or enzymatic processing — and communicate to guests that allergen levels are reduced but full elimination cannot be guaranteed." },
    { label: "Rely on fermentation alone, since it is efficient, and present the dish as safe for allergic guests because the process is well-established in published research." },
    { label: "Postpone serving the dish entirely until you can implement every combination processing method the research describes, treating any partial approach as operationally unacceptable." }
    ],
    citation: "Xiaowen Pi, Yili Yang, Yuxue Sun, Qiang Cui, Yin Wan, Guiming Fu, Hongbing Chen, Jianjun Cheng. (2022). Recent advances in alleviating food allergenicity through fermentation. Critical Reviews in Food Science and Nutrition. https://doi.org/10.1080/10408398.2021.1913093",
    articleId: "0155fa72-94b7-43e5-8dcc-466baa340ad1",
    articleTitle: "Recent advances in alleviating food allergenicity through fermentation",
    articleUrl: "https://doi.org/10.1080/10408398.2021.1913093",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "0170dc29-e1a4-46d6-93fd-2d3e644f3a2b::episteme::121",
    register: "episteme",
    sender: "kock",
    question: "When comparing terpene glycosides across ecolly, cabernet gernischet, and muscat hamburg grapes, what is true about the differences between varieties?",
    options: [
    { label: "The varieties differ only in how much terpene glycoside they contain, not in which compounds dominate.", correct: false },
    { label: "Each variety has a qualitatively distinct terpene precursor profile, with the most abundant compound differing per variety.", correct: true },
    { label: "Terpene glycosides are present only in muscat hamburg, making it the sole aromatic variety of the three.", correct: false },
    { label: "All three varieties share the same dominant terpene glycoside but in different concentrations.", correct: false }
    ],
    correctIndex: 1,
    citation: "Hong-cong Song, Xingjie Wang, Aihua Li, Ji‐Bin Liu, Yongsheng Tao. (2020). Profiling terpene glycosides from ecolly, cabernet gernischet, and muscat hamburg grapes by ultra performance liquid chromatography-quadrupole time-of-flight mass spectrometry. Journal of Food Science. https://doi.org/10.1111/1750-3841.15167",
    articleId: "0170dc29-e1a4-46d6-93fd-2d3e644f3a2b",
    articleTitle: "Profiling terpene glycosides from ecolly, cabernet gernischet, and muscat hamburg grapes by ultra performance liquid chromatography-quadrupole time-of-flight mass spectrometry",
    articleUrl: "https://doi.org/10.1111/1750-3841.15167",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "0170dc29-e1a4-46d6-93fd-2d3e644f3a2b::phronesis::122",
    register: "phronesis",
    sender: "kock",
    question: "You are advising a small winery that wants to launch an aromatic, terpene-forward white wine. The winemaker currently grows Ecolly and is asking whether switching to a more aromatic fermentation technique — extended cold maceration or added exogenous enzymes — could close the gap with Muscat Hamburg in terpene character. How do you frame the decision?",
    options: [
    { label: "Recommend cold maceration first: extracting more from Ecolly's skins will increase the free terpene pool enough to match a variety like Muscat Hamburg without replanting." },
    { label: "Recommend switching the variety: if the production goal is terpene-driven fragrance, no processing technique can recover precursors the grape skin did not contain, so variety selection is the foundational decision." },
    { label: "Recommend enzyme addition at crush: glycosidic enzymes will hydrolyze bound precursors in Ecolly and release free terpenes at levels comparable to naturally richer varieties." }
    ],
    citation: "Hong-cong Song, Xingjie Wang, Aihua Li, Ji‐Bin Liu, Yongsheng Tao. (2020). Profiling terpene glycosides from ecolly, cabernet gernischet, and muscat hamburg grapes by ultra performance liquid chromatography-quadrupole time-of-flight mass spectrometry. Journal of Food Science. https://doi.org/10.1111/1750-3841.15167",
    articleId: "0170dc29-e1a4-46d6-93fd-2d3e644f3a2b",
    articleTitle: "Profiling terpene glycosides from ecolly, cabernet gernischet, and muscat hamburg grapes by ultra performance liquid chromatography-quadrupole time-of-flight mass spectrometry",
    articleUrl: "https://doi.org/10.1111/1750-3841.15167",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "01782e0e-c5e3-4499-9864-49df029d4695::episteme::123",
    register: "episteme",
    sender: "kock",
    question: "At what incorporation level of barley β-glucan does the research report as sufficient to meet EFSA health claims for cholesterol lowering and fecal bulk increase in biscuits?",
    options: [
    { label: "3% w/w", correct: false },
    { label: "6% w/w", correct: true },
    { label: "9% w/w", correct: false },
    { label: "12% w/w", correct: false }
    ],
    correctIndex: 1,
    citation: "Athina Lazaridou, Kali Kotsiou, Costas G. Βiliaderis. (2022). Nutritional and technological aspects of barley β-glucan enriched biscuits containing isomaltulose as sucrose replacer. Food Hydrocolloids for Health. https://doi.org/10.1016/j.fhfh.2022.100060",
    articleId: "01782e0e-c5e3-4499-9864-49df029d4695",
    articleTitle: "Nutritional and technological aspects of barley β-glucan enriched biscuits containing isomaltulose as sucrose replacer",
    articleUrl: "https://doi.org/10.1016/j.fhfh.2022.100060",
    topic: "nutritional_science",
    needsRetag: false
  },
  {
    id: "01782e0e-c5e3-4499-9864-49df029d4695::phronesis::124",
    register: "phronesis",
    sender: "kock",
    question: "You are developing a health-positioned biscuit for a restaurant retail line. You have research pointing to 6% w/w β-glucan and full isomaltulose substitution for sucrose as your key ingredient anchors. During early trials, the biscuits come out soft and well-received on day one, but the texture shifts noticeably over the following days. Your production manager wants to lock in the process parameters now to move to scale. What is the most defensible position to take?",
    options: [
    { label: "Agree to lock parameters immediately, since the ingredient rationale from the research is solid enough to treat texture drift as a packaging problem rather than a formulation problem." },
    { label: "Push back on locking parameters prematurely, and instead use the ingredient anchors as starting points while treating texture change across storage as a live variable that needs direct craft attention before scale-up." },
    { label: "Abandon the β-glucan level and isomaltulose substitution as anchor points and reformulate from scratch, since the research does not provide a plug-and-play recipe." }
    ],
    citation: "Athina Lazaridou, Kali Kotsiou, Costas G. Βiliaderis. (2022). Nutritional and technological aspects of barley β-glucan enriched biscuits containing isomaltulose as sucrose replacer. Food Hydrocolloids for Health. https://doi.org/10.1016/j.fhfh.2022.100060",
    articleId: "01782e0e-c5e3-4499-9864-49df029d4695",
    articleTitle: "Nutritional and technological aspects of barley β-glucan enriched biscuits containing isomaltulose as sucrose replacer",
    articleUrl: "https://doi.org/10.1016/j.fhfh.2022.100060",
    topic: "nutritional_science",
    needsRetag: false
  },
  {
    id: "017cb735-e45c-46e5-b748-074d0b15ab82::episteme::125",
    register: "episteme",
    sender: "kock",
    question: "You are maintaining a Parāroa Rēwena potato starter. Which two microorganisms make up its microbial architecture?",
    options: [
    { label: "Lacticaseibacillus paracasei and Saccharomyces cerevisiae", correct: true },
    { label: "Lactobacillus plantarum and Saccharomyces cerevisiae", correct: false },
    { label: "Lacticaseibacillus paracasei and Kazachstania humilis", correct: false },
    { label: "Leuconostoc mesenteroides and Saccharomyces cerevisiae", correct: false }
    ],
    correctIndex: 0,
    citation: "Jia Sun, Olin Silander, Kay Rutherfurd‐Markwick, Daying Wen, Tanya Poi-poi Davy, Anthony N. Mutukumira. (2022). Phenotypic and genotypic characterisation of Lactobacillus and yeast isolates from a traditional New Zealand Māori potato starter culture. Current Research in Food Science. https://doi.org/10.1016/j.crfs.2022.08.004",
    articleId: "017cb735-e45c-46e5-b748-074d0b15ab82",
    articleTitle: "Phenotypic and genotypic characterisation of Lactobacillus and yeast isolates from a traditional New Zealand Māori potato starter culture",
    articleUrl: "https://doi.org/10.1016/j.crfs.2022.08.004",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "017cb735-e45c-46e5-b748-074d0b15ab82::phronesis::126",
    register: "phronesis",
    sender: "kock",
    question: "Your Māori potato starter has been sitting in a cool corner of the prep kitchen for a week. Today it smells sharper than usual, the rise is sluggish, and the texture looks looser than normal. You know from recent microbiological work that its core organisms are L. paracasei and S. cerevisiae. A senior cook suggests discarding it and starting fresh; a junior cook wants to feed it double flour and water right away; you are inclined to pause and diagnose before acting. Who has the stronger argument, and what does knowing the microbial identity actually give you in this moment?",
    options: [
    { label: "Discard and restart — without a corrective protocol tied to the named organisms, the microbial baseline is not actionable and the risk of serving a compromised product outweighs continuity." },
    { label: "Feed aggressively now — doubling the substrate will quickly rebalance the ratio between L. paracasei and S. cerevisiae and restore normal behaviour within one fermentation cycle." },
    { label: "Pause and observe before intervening — knowing that the starter's health means the health of L. paracasei and S. cerevisiae together gives you a conceptual anchor to assess whether both organisms are being supported, even if no corrective protocol exists yet." }
    ],
    citation: "Jia Sun, Olin Silander, Kay Rutherfurd‐Markwick, Daying Wen, Tanya Poi-poi Davy, Anthony N. Mutukumira. (2022). Phenotypic and genotypic characterisation of Lactobacillus and yeast isolates from a traditional New Zealand Māori potato starter culture. Current Research in Food Science. https://doi.org/10.1016/j.crfs.2022.08.004",
    articleId: "017cb735-e45c-46e5-b748-074d0b15ab82",
    articleTitle: "Phenotypic and genotypic characterisation of Lactobacillus and yeast isolates from a traditional New Zealand Māori potato starter culture",
    articleUrl: "https://doi.org/10.1016/j.crfs.2022.08.004",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "018ceeb5-cf56-4ecd-9875-d269239910ba::episteme::127",
    register: "episteme",
    sender: "kock",
    question: "Which production pathway is explicitly named in the scientific literature as reshaping how protein ingredients are made available, making it directly relevant to fermentation-oriented culinary professionals?",
    options: [
    { label: "Cold-press extraction", correct: false },
    { label: "Precision fermentation", correct: true },
    { label: "Hydrolytic enzymatic processing", correct: false },
    { label: "High-pressure homogenisation", correct: false }
    ],
    correctIndex: 1,
    citation: "Yaozheng Liu, William R Aimutis, MaryAnne Drake. (2024). Dairy, Plant, and Novel Proteins: Scientific and Technological Aspects.. Foods (Basel, Switzerland). https://doi.org/10.3390/foods13071010",
    articleId: "018ceeb5-cf56-4ecd-9875-d269239910ba",
    articleTitle: "Dairy, Plant, and Novel Proteins: Scientific and Technological Aspects.",
    articleUrl: "https://doi.org/10.3390/foods13071010",
    topic: "nutritional_science",
    needsRetag: false
  },
  {
    id: "018ceeb5-cf56-4ecd-9875-d269239910ba::phronesis::128",
    register: "phronesis",
    sender: "kock",
    question: "You are trialling a precision fermentation-derived whey protein in a sauce that requires precise emulsification timing. The supplier has no established culinary performance data, and your first two tests gave inconsistent results. A product launch is in four weeks. How do you proceed?",
    options: [
    { label: "Treat the inconsistent results as a sign the ingredient is unsuitable and revert to conventional dairy protein, protecting the launch timeline." },
    { label: "Continue systematic kitchen tests, document every variable and outcome, and flag to the team that the ingredient's performance baseline is still being established — adjusting launch expectations if needed." },
    { label: "Assume the inconsistency is user error, scale up immediately, and rely on the supplier to provide retrospective technical data before launch." }
    ],
    citation: "Yaozheng Liu, William R Aimutis, MaryAnne Drake. (2024). Dairy, Plant, and Novel Proteins: Scientific and Technological Aspects.. Foods (Basel, Switzerland). https://doi.org/10.3390/foods13071010",
    articleId: "018ceeb5-cf56-4ecd-9875-d269239910ba",
    articleTitle: "Dairy, Plant, and Novel Proteins: Scientific and Technological Aspects.",
    articleUrl: "https://doi.org/10.3390/foods13071010",
    topic: "nutritional_science",
    needsRetag: false
  },
  {
    id: "018d4265-f071-4e2a-8fa9-51928a198805::episteme::129",
    register: "episteme",
    sender: "kock",
    question: "According to research on traditional Ecuadorian cuisine restaurants in Guayaquil, what is one confirmed driver behind guests choosing to visit these establishments?",
    options: [
    { label: "The desire to sample typical ethnic dishes", correct: true },
    { label: "The preference for modern fusion interpretations of local recipes", correct: false },
    { label: "The convenience of location within the city centre", correct: false },
    { label: "The reputation of individual named chefs", correct: false }
    ],
    correctIndex: 0,
    citation: "Mauricio Carvache‐Franco, Orly Carvache‐Franco, Wilmer Carvache‐Franco, Miguel Orden-Mejía, Fátima G. Zamora-Flores, Cristina Macas-López. (2020). Segmentation by Motivation in Typical Cuisine Restaurants: Empirical Evidence from Guayaquil, Ecuador. Journal of Culinary Science and Technology. https://doi.org/10.1080/15428052.2019.1582446",
    articleId: "018d4265-f071-4e2a-8fa9-51928a198805",
    articleTitle: "Segmentation by Motivation in Typical Cuisine Restaurants: Empirical Evidence from Guayaquil, Ecuador",
    articleUrl: "https://doi.org/10.1080/15428052.2019.1582446",
    topic: "culinary_science",
    needsRetag: false
  },
  {
    id: "018d4265-f071-4e2a-8fa9-51928a198805::phronesis::130",
    register: "phronesis",
    sender: "kock",
    question: "A regular customer has brought a group of colleagues for a business lunch. Halfway through service, one of the colleagues asks you to adjust a traditional dish — swap a heritage ingredient for something more neutral because the group is not adventurous. The regular expects the full experience. How do you handle the request without losing either guest?",
    options: [
    { label: "Accommodate the substitution quietly for that table; consistency of experience for the group outweighs the integrity of a single dish." },
    { label: "Decline the substitution and explain briefly what the original ingredient represents; offer a different dish from the menu that naturally suits their preference." },
    { label: "Prepare two versions — the adapted one for the colleagues and the traditional one for the regular — without drawing attention to the difference." }
    ],
    citation: "Mauricio Carvache‐Franco, Orly Carvache‐Franco, Wilmer Carvache‐Franco, Miguel Orden-Mejía, Fátima G. Zamora-Flores, Cristina Macas-López. (2020). Segmentation by Motivation in Typical Cuisine Restaurants: Empirical Evidence from Guayaquil, Ecuador. Journal of Culinary Science and Technology. https://doi.org/10.1080/15428052.2019.1582446",
    articleId: "018d4265-f071-4e2a-8fa9-51928a198805",
    articleTitle: "Segmentation by Motivation in Typical Cuisine Restaurants: Empirical Evidence from Guayaquil, Ecuador",
    articleUrl: "https://doi.org/10.1080/15428052.2019.1582446",
    topic: "culinary_science",
    needsRetag: false
  },
  {
    id: "0190cba6-eb04-4ed7-98a0-cc6035198f04::episteme::131",
    register: "episteme",
    sender: "kock",
    question: "Which countries are identified in the article as having a documented culinary tradition built on barley, sorghum, rice, and maize?",
    options: [
    { label: "Algeria, Morocco, Tunisia, Egypt, and Libya", correct: true },
    { label: "Algeria, Morocco, Tunisia, Egypt, and Sudan", correct: false },
    { label: "Morocco, Tunisia, Egypt, Libya, and Mauritania", correct: false },
    { label: "Algeria, Tunisia, Egypt, Libya, and Chad", correct: false }
    ],
    correctIndex: 0,
    citation: "Fatma Boukid, Hamza Mameri. (2025). The Role of Barley, Sorghum, Rice, and Maize in North African Cuisine. The North African Journal of Food and Nutrition Research. https://doi.org/10.51745/najfnr.9.20.31-48",
    articleId: "0190cba6-eb04-4ed7-98a0-cc6035198f04",
    articleTitle: "The Role of Barley, Sorghum, Rice, and Maize in North African Cuisine",
    articleUrl: "https://doi.org/10.51745/najfnr.9.20.31-48",
    topic: "nutritional_science",
    needsRetag: false
  },
  {
    id: "0190cba6-eb04-4ed7-98a0-cc6035198f04::phronesis::132",
    register: "phronesis",
    sender: "kock",
    question: "You are updating a traditional sorghum porridge for a tasting menu. The dish will be plated in a modern style — reduced portion, geometric presentation, garnished with microgreens. A senior colleague argues the grain itself carries enough cultural weight that the presentation change is harmless. Another says any reframing without examining the cultural layer produces a dish that looks right but means nothing. How do you proceed?",
    options: [
    { label: "Prioritize the visual reframe and trust that using the authentic grain preserves the dish's identity — nutritional and cultural integrity follow automatically from sourcing the right ingredient." },
    { label: "Interrogate the cultural layer first: understand what role the grain plays in its original context before deciding which elements of the presentation can shift without hollowing out the dish's meaning." },
    { label: "Treat the modernization as purely a technical problem — adjust texture, plating, and portion size based on contemporary technique, and leave cultural questions to the menu copy." }
    ],
    citation: "Fatma Boukid, Hamza Mameri. (2025). The Role of Barley, Sorghum, Rice, and Maize in North African Cuisine. The North African Journal of Food and Nutrition Research. https://doi.org/10.51745/najfnr.9.20.31-48",
    articleId: "0190cba6-eb04-4ed7-98a0-cc6035198f04",
    articleTitle: "The Role of Barley, Sorghum, Rice, and Maize in North African Cuisine",
    articleUrl: "https://doi.org/10.51745/najfnr.9.20.31-48",
    topic: "nutritional_science",
    needsRetag: false
  },
  {
    id: "01930ddd-738d-4c66-a110-85aac5ee9717::episteme::133",
    register: "episteme",
    sender: "kock",
    question: "When using Sarcocornia perennis powder as a salt substitute in baked crackers, which physical property is preserved while other qualities shift?",
    options: [
    { label: "Firmness", correct: true },
    { label: "Crispness", correct: false },
    { label: "Color depth", correct: false },
    { label: "Nutritional quality", correct: false }
    ],
    correctIndex: 0,
    citation: "Elsa Clavel-Coibrié, Joana Sales, Aida Moreira da Silva, Maria João Barroca, Isabel Sousa, Anabela Raymundo. (2021). Sarcocornia perennis: A salt substitute in savory snacks. Foods. https://doi.org/10.3390/foods10123110",
    articleId: "01930ddd-738d-4c66-a110-85aac5ee9717",
    articleTitle: "Sarcocornia perennis: A salt substitute in savory snacks",
    articleUrl: "https://doi.org/10.3390/foods10123110",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "01930ddd-738d-4c66-a110-85aac5ee9717::techne::134",
    register: "techne",
    sender: "kock",
    question: "You are developing a reduced-sodium baked snack using dried Sarcocornia perennis powder. As you increase the amount of the powder in your formulation, what visual change during baking signals its growing influence?",
    options: [
    { label: "The snack becomes paler and softer, indicating moisture retention from the halophyte.", correct: false },
    { label: "The snack becomes crispier and darker, which you can monitor as a practical browning signal.", correct: true },
    { label: "The snack develops an uneven rise, reflecting disrupted gluten structure.", correct: false },
    { label: "The snack shows surface cracking, indicating excess salt crystallization.", correct: false }
    ],
    correctIndex: 1,
    citation: "Elsa Clavel-Coibrié, Joana Sales, Aida Moreira da Silva, Maria João Barroca, Isabel Sousa, Anabela Raymundo. (2021). Sarcocornia perennis: A salt substitute in savory snacks. Foods. https://doi.org/10.3390/foods10123110",
    articleId: "01930ddd-738d-4c66-a110-85aac5ee9717",
    articleTitle: "Sarcocornia perennis: A salt substitute in savory snacks",
    articleUrl: "https://doi.org/10.3390/foods10123110",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "01930ddd-738d-4c66-a110-85aac5ee9717::phronesis::135",
    register: "phronesis",
    sender: "kock",
    question: "You are reformulating a house cracker for a health-conscious menu and have Sarcocornia perennis available as a partial salt replacement. A 1% swap already achieves a meaningful sodium reduction, and sensory acceptability peaks at 5%. A colleague pushes you to go beyond 5% to maximize the health claim on the menu. How do you weigh that pressure against what the data tells you?",
    options: [
    { label: "Hold at 5% incorporation — sensory acceptability peaks there, and exceeding that threshold risks pushing the product outside what guests will find acceptable, undermining the menu item regardless of its health credentials." },
    { label: "Push to 7–8% and compensate with other flavor boosters such as herbs or acids, treating the panelist threshold as a conservative baseline that kitchen technique can overcome." },
    { label: "Start at 1% for the immediate menu rollout, since even that level delivers a major sodium reduction, and avoid the 5% level until you have run your own in-house tasting panel." }
    ],
    citation: "Elsa Clavel-Coibrié, Joana Sales, Aida Moreira da Silva, Maria João Barroca, Isabel Sousa, Anabela Raymundo. (2021). Sarcocornia perennis: A salt substitute in savory snacks. Foods. https://doi.org/10.3390/foods10123110",
    articleId: "01930ddd-738d-4c66-a110-85aac5ee9717",
    articleTitle: "Sarcocornia perennis: A salt substitute in savory snacks",
    articleUrl: "https://doi.org/10.3390/foods10123110",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "168a5cfb-f6df-4b95-be1f-71e68eae8961::phronesis::136",
    register: "phronesis",
    sender: "kock",
    question: "You are building a tasting menu around northeast Indian fermented ingredients — fermented pickles and a bamboo beverage sourced from a regional producer. The kitchen team wants to finish the pickle component with a brief sauté to deepen flavor. You know these ingredients occupy a scientifically scrutinized functional space for their probiotic properties. How do you weigh the decision?",
    options: [
    { label: "Proceed with the sauté and plate the cooked pickle as intended — flavor development serves the dish's identity, and any probiotic claim is incidental to the menu concept." },
    { label: "Keep the pickle raw or minimally heated and position it where heat exposure is avoidable, accepting a flavor compromise to preserve the microbial integrity the sourcing decision was meant to honor." },
    { label: "Separate the batch — cook half for flavor and serve the other half raw alongside, letting the pairing carry both the culinary and functional dimensions without fully sacrificing either." }
    ],
    citation: "Jain Priyanshi M, Kammara Rajagopal. (2023). Probiotic Potential of Indian Traditional Fermented Foods to Combat Listeriosis. Annals of Microbiology and Research. https://doi.org/10.36959/958/587",
    articleId: "168a5cfb-f6df-4b95-be1f-71e68eae8961",
    articleTitle: "Probiotic Potential of Indian Traditional Fermented Foods to Combat Listeriosis",
    articleUrl: "https://doi.org/10.36959/958/587",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "0194e267-3bab-4f73-8867-68f710ec4a9b::episteme::137",
    register: "episteme",
    sender: "värd",
    question: "A study comparing customer expectations with restaurateur priorities found a notable gap around sanitation and cleanliness. Which statement best reflects that finding?",
    options: [
    { label: "Customers rate sanitation and cleanliness as highly important, while restaurateurs assign it comparatively lower priority.", correct: true },
    { label: "Restaurateurs rank sanitation and cleanliness as their top priority, but customers treat it as a baseline expectation they rarely mention.", correct: false },
    { label: "Both customers and restaurateurs agree that sanitation and cleanliness is the single most important dining attribute.", correct: false },
    { label: "Customers rate sanitation and cleanliness as low priority because they assume regulatory compliance is already in place.", correct: false }
    ],
    correctIndex: 0,
    citation: "Kanghwa Choi, Dongsook Lee. (2024). Bridging the knowledge gap of restaurant DINESERV attraction attributes between customer expectations and restaurateur priority ranking. Journal of Foodservice Business Research. https://doi.org/10.1080/15378020.2024.2341198",
    articleId: "0194e267-3bab-4f73-8867-68f710ec4a9b",
    articleTitle: "Bridging the knowledge gap of restaurant DINESERV attraction attributes between customer expectations and restaurateur priority ranking",
    articleUrl: "https://doi.org/10.1080/15378020.2024.2341198",
    topic: "gastronomy",
    needsRetag: false
  },
  {
    id: "0194e267-3bab-4f73-8867-68f710ec4a9b::phronesis::138",
    register: "phronesis",
    sender: "värd",
    question: "Your head chef is running the pre-service briefing and focuses entirely on dish execution and table turn times. You have just read research showing that cleanliness is one of the biggest gaps between what guests expect and what restaurant leadership actually prioritizes. Do you raise this finding now and risk pulling focus from the service plan, wait and bring it up in an operational review where it can get proper attention, or treat sanitation as a back-of-house concern that the kitchen team handles without needing to frame it as a guest-experience issue?",
    options: [
    { label: "Raise the finding now during the briefing, even if it shifts focus, because the gap is active and the team is assembled." },
    { label: "Hold the point for an operational review where cleanliness can be positioned as a guest-experience variable with supporting evidence." },
    { label: "Keep sanitation in the back-of-house domain and trust existing protocols, since briefings are not the place for infrastructure topics." }
    ],
    citation: "Kanghwa Choi, Dongsook Lee. (2024). Bridging the knowledge gap of restaurant DINESERV attraction attributes between customer expectations and restaurateur priority ranking. Journal of Foodservice Business Research. https://doi.org/10.1080/15378020.2024.2341198",
    articleId: "0194e267-3bab-4f73-8867-68f710ec4a9b",
    articleTitle: "Bridging the knowledge gap of restaurant DINESERV attraction attributes between customer expectations and restaurateur priority ranking",
    articleUrl: "https://doi.org/10.1080/15378020.2024.2341198",
    topic: "gastronomy",
    needsRetag: false
  },
  {
    id: "019a2f84-2360-45b4-9000-4112f74c024d::episteme::139",
    register: "episteme",
    sender: "kock",
    question: "When fermentation temperature is controlled at a lower level, what is the primary observable difference compared to spontaneous fermentation?",
    options: [
    { label: "Mucilage degradation time is extended by more than 24 hours and the final pH is markedly lower.", correct: true },
    { label: "Mucilage degradation time is shortened and the final pH is higher.", correct: false },
    { label: "Fermentation speed is unchanged but flavor compounds are more concentrated.", correct: false },
    { label: "The coffee variety becomes the primary driver of fermentation differences.", correct: false }
    ],
    correctIndex: 0,
    citation: "Aída Esther Peñuela-Martínez, Jhoan Felipe García-Duque, Juan Rodrigo Sanz-Uribe. (2023). Characterization of Fermentations with Controlled Temperature with Three Varieties of Coffee (Coffea arabica L.). Fermentation. https://doi.org/10.3390/fermentation9110976",
    articleId: "019a2f84-2360-45b4-9000-4112f74c024d",
    articleTitle: "Characterization of Fermentations with Controlled Temperature with Three Varieties of Coffee (Coffea arabica L.)",
    articleUrl: "https://doi.org/10.3390/fermentation9110976",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "019a2f84-2360-45b4-9000-4112f74c024d::phronesis::140",
    register: "phronesis",
    sender: "kock",
    question: "You are evaluating whether to invest in temperature-controlled fermentation tanks for your coffee program. The research shows tighter temperature control produces measurable biochemical changes — longer fermentation times, lower pH, more predictable microbial activity — but cup scores do not clearly improve. You have a limited equipment budget. How do you weigh this decision?",
    options: [
    { label: "Prioritize process consistency and microbial predictability, accepting that sensory gains may not justify the cost on their own — the operational control is the return." },
    { label: "Hold off on the investment entirely; if cup scores do not improve, the biochemical changes are irrelevant to a chef's operation." },
    { label: "Invest only if you can first run a side-by-side sensory panel with your team to confirm whether the documented pH and fermentation duration shifts translate into a perceivable difference in your specific menu context." }
    ],
    citation: "Aída Esther Peñuela-Martínez, Jhoan Felipe García-Duque, Juan Rodrigo Sanz-Uribe. (2023). Characterization of Fermentations with Controlled Temperature with Three Varieties of Coffee (Coffea arabica L.). Fermentation. https://doi.org/10.3390/fermentation9110976",
    articleId: "019a2f84-2360-45b4-9000-4112f74c024d",
    articleTitle: "Characterization of Fermentations with Controlled Temperature with Three Varieties of Coffee (Coffea arabica L.)",
    articleUrl: "https://doi.org/10.3390/fermentation9110976",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "01a2e029-18a0-4747-8b71-5d0eff075579::episteme::141",
    register: "episteme",
    sender: "kock",
    question: "What mechanism explains why L. plantarum WLPL01 outperforms spontaneous microbial communities in antimicrobial activity?",
    options: [
    { label: "It produces higher levels of lactic acid than wild communities, lowering pH more aggressively.", correct: false },
    { label: "Genome sequencing identified a plantaricin-encoding region, implicating bacteriocin production.", correct: true },
    { label: "It was selected purely for superior gastrointestinal tolerance over competing strains.", correct: false },
    { label: "It outcompetes other microbes by consuming available oxygen in the fermentation vessel.", correct: false }
    ],
    correctIndex: 1,
    citation: "Hui Zhan, Yao He, Qian Wang, Qingzi Lu, Lihua He, Xueying Tao, Hua Wei. (2023). Evaluation of Probiotic Strains Isolated from Artemisia argyi Fermentation Liquor and the Antagonistic Effect of Lactiplantibacillus plantarum against Pathogens. Fermentation. https://doi.org/10.3390/fermentation9060536",
    articleId: "01a2e029-18a0-4747-8b71-5d0eff075579",
    articleTitle: "Evaluation of Probiotic Strains Isolated from Artemisia argyi Fermentation Liquor and the Antagonistic Effect of Lactiplantibacillus plantarum against Pathogens",
    articleUrl: "https://doi.org/10.3390/fermentation9060536",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "01a2e029-18a0-4747-8b71-5d0eff075579::phronesis::142",
    register: "phronesis",
    sender: "kock",
    question: "You are developing a new fermented Artemisia argyi product for the menu. You have enough of the botanical to do a test batch, but you need to decide now: do you let it ferment wild, or do you source a specific L. plantarum starter strain and wait until you have the full study's procedural parameters before scaling? What is the real tradeoff you are navigating?",
    options: [
    { label: "Wild fermentation is faster to start and costs nothing upfront, but the research suggests it produces a less antimicrobially potent product than starter-driven fermentation — meaning you may get a functional product sooner but a weaker one." },
    { label: "Inoculating with L. plantarum WLPL01 gives you a directionally stronger product, but without the full published protocol you risk scaling a process whose parameters you do not yet control, so the safer move is to hold the batch until you have that detail." },
    { label: "Both approaches carry equal antimicrobial risk at this stage because no published protocol exists for either method, so the decision should be based purely on cost and timeline rather than product quality." }
    ],
    citation: "Hui Zhan, Yao He, Qian Wang, Qingzi Lu, Lihua He, Xueying Tao, Hua Wei. (2023). Evaluation of Probiotic Strains Isolated from Artemisia argyi Fermentation Liquor and the Antagonistic Effect of Lactiplantibacillus plantarum against Pathogens. Fermentation. https://doi.org/10.3390/fermentation9060536",
    articleId: "01a2e029-18a0-4747-8b71-5d0eff075579",
    articleTitle: "Evaluation of Probiotic Strains Isolated from Artemisia argyi Fermentation Liquor and the Antagonistic Effect of Lactiplantibacillus plantarum against Pathogens",
    articleUrl: "https://doi.org/10.3390/fermentation9060536",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "01a446c0-e33f-4fd2-8457-35bc53abed04::episteme::143",
    register: "episteme",
    sender: "värd",
    question: "According to research on Chinese guests in hospitality settings, what primarily shapes whether and how they raise a complaint about a dish?",
    options: [
    { label: "The specific temperature or presentation standard of the dish served", correct: false },
    { label: "Chinese cultural values influencing their complaint decision-making and response choice", correct: true },
    { label: "The price tier of the restaurant and the formality of the service style", correct: false },
    { label: "Whether a manager is visibly present in the dining room", correct: false }
    ],
    correctIndex: 1,
    citation: "Meng Li. (2020). Exploration of Chinese consumer complaint behavior in the hospitality industry. Digital Scholarship - UNLV (University of Nevada Reno). https://doi.org/10.34917/1757026",
    articleId: "01a446c0-e33f-4fd2-8457-35bc53abed04",
    articleTitle: "Exploration of Chinese consumer complaint behavior in the hospitality industry",
    articleUrl: "https://doi.org/10.34917/1757026",
    topic: "hospitality",
    needsRetag: false
  },
  {
    id: "01a446c0-e33f-4fd2-8457-35bc53abed04::phronesis::144",
    register: "phronesis",
    sender: "värd",
    question: "You are running a Chinese banquet for forty covers. Service has been running for ninety minutes and nothing — no complaint, no returned dish, no flag from the floor — has come back to the pass. What do you do?",
    options: [
    { label: "Take the silence as confirmation that the food and service are meeting expectations, and continue without intervention." },
    { label: "Step out briefly and approach the host directly to check in, on the understanding that guests may not raise concerns through formal channels even when something is wrong." },
    { label: "Ask the floor team to circulate and prompt each guest individually for feedback, treating the table the same as any other large party." }
    ],
    citation: "Meng Li. (2020). Exploration of Chinese consumer complaint behavior in the hospitality industry. Digital Scholarship - UNLV (University of Nevada Reno). https://doi.org/10.34917/1757026",
    articleId: "01a446c0-e33f-4fd2-8457-35bc53abed04",
    articleTitle: "Exploration of Chinese consumer complaint behavior in the hospitality industry",
    articleUrl: "https://doi.org/10.34917/1757026",
    topic: "hospitality",
    needsRetag: false
  },
  {
    id: "01aad83e-85ce-4aef-a62f-3cd2e16f19a0::episteme::145",
    register: "episteme",
    sender: "kock",
    question: "Which two factors does the research identify as directly influencing methanol and higher alcohol concentrations in wine?",
    options: [
    { label: "Fermentation temperature and yeast strain", correct: false },
    { label: "Maceration duration and grape variety", correct: true },
    { label: "Barrel aging and sulfite levels", correct: false },
    { label: "Pressing pressure and pH adjustment", correct: false }
    ],
    correctIndex: 1,
    citation: "Saša Šorgić, Ivana Sredović Ignjatović, Mališa Antić, Sabina Šaćirović, Lato Pezo, Vladimir Čejić, Saša Đurović. (2022). Monitoring of the Wines’ Quality by Gas Chromatography: HSS-GC/FID Method Development, Validation, Verification, for Analysis of Volatile Compounds. Fermentation. https://doi.org/10.3390/fermentation8020038",
    articleId: "01aad83e-85ce-4aef-a62f-3cd2e16f19a0",
    articleTitle: "Monitoring of the Wines’ Quality by Gas Chromatography: HSS-GC/FID Method Development, Validation, Verification, for Analysis of Volatile Compounds",
    articleUrl: "https://doi.org/10.3390/fermentation8020038",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "01aad83e-85ce-4aef-a62f-3cd2e16f19a0::phronesis::146",
    register: "phronesis",
    sender: "kock",
    question: "You are preparing a Merlot reduction for a sauce and your supplier offers two versions of the wine: one with extended maceration and one with minimal maceration. You know maceration affects more than color. How do you approach choosing between the two, and what are you actually trading off?",
    options: [
    { label: "Choose the extended maceration wine because deeper color signals stronger tannin structure, which will hold up better to high heat during reduction." },
    { label: "Choose based on the volatile compound profile the maceration produces, recognizing that maceration is a chemical-shaping decision that will carry through into the dish's aroma." },
    { label: "Treat both wines as equivalent for cooking purposes since heat will neutralize any differences introduced by maceration." }
    ],
    citation: "Saša Šorgić, Ivana Sredović Ignjatović, Mališa Antić, Sabina Šaćirović, Lato Pezo, Vladimir Čejić, Saša Đurović. (2022). Monitoring of the Wines’ Quality by Gas Chromatography: HSS-GC/FID Method Development, Validation, Verification, for Analysis of Volatile Compounds. Fermentation. https://doi.org/10.3390/fermentation8020038",
    articleId: "01aad83e-85ce-4aef-a62f-3cd2e16f19a0",
    articleTitle: "Monitoring of the Wines’ Quality by Gas Chromatography: HSS-GC/FID Method Development, Validation, Verification, for Analysis of Volatile Compounds",
    articleUrl: "https://doi.org/10.3390/fermentation8020038",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "01c1d88c-9510-4708-a65f-f9454f696171::episteme::147",
    register: "episteme",
    sender: "kock",
    question: "When using sappan wood as a kombucha substrate, which sugar concentration does the study specify for the fermentation process?",
    options: [
    { label: "5% (w/v)", correct: false },
    { label: "10% (w/v)", correct: true },
    { label: "15% (w/v)", correct: false },
    { label: "20% (w/v)", correct: false }
    ],
    correctIndex: 1,
    citation: "Elok Zubaidah, Rahma Aulia Salafy, Dian Widya Ningtyas, Alivianisa Carissa Denty Wiryawan. (2024). Antioxidant and antibacterial activity of sappan wood (Caesalpinia sappan L.) kombucha. Advances in Food Science Sustainable Agriculture and Agroindustrial Engineering. https://doi.org/10.21776/ub.afssaae.2024.007.01.2",
    articleId: "01c1d88c-9510-4708-a65f-f9454f696171",
    articleTitle: "Antioxidant and antibacterial activity of sappan wood (Caesalpinia sappan L.) kombucha",
    articleUrl: "https://doi.org/10.21776/ub.afssaae.2024.007.01.2",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "01c1d88c-9510-4708-a65f-f9454f696171::phronesis::148",
    register: "phronesis",
    sender: "kock",
    question: "You are developing a menu item built around sappan wood kombucha. A study you consulted identified an optimal substrate concentration for antioxidant and antibacterial output. You have that number in front of you. How do you use it in your kitchen development process?",
    options: [
    { label: "Adopt the study's optimal concentration directly as your recipe specification, since it represents the highest functional performance documented in controlled conditions." },
    { label: "Use the study's optimal concentration as a starting coordinate, then adjust through tasting and palatability trials, since the research measured functional outputs and not culinary palatability metrics." },
    { label: "Disregard the study's concentration data entirely, because laboratory conditions cannot translate to kitchen fermentation environments." }
    ],
    citation: "Elok Zubaidah, Rahma Aulia Salafy, Dian Widya Ningtyas, Alivianisa Carissa Denty Wiryawan. (2024). Antioxidant and antibacterial activity of sappan wood (Caesalpinia sappan L.) kombucha. Advances in Food Science Sustainable Agriculture and Agroindustrial Engineering. https://doi.org/10.21776/ub.afssaae.2024.007.01.2",
    articleId: "01c1d88c-9510-4708-a65f-f9454f696171",
    articleTitle: "Antioxidant and antibacterial activity of sappan wood (Caesalpinia sappan L.) kombucha",
    articleUrl: "https://doi.org/10.21776/ub.afssaae.2024.007.01.2",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "01c743d8-278c-4309-9c33-455180b2e673::episteme::149",
    register: "episteme",
    sender: "kock",
    question: "According to research on Thai consumer attitudes toward plant-based food, what innovation pathway do the study's authors explicitly recommend for developing new plant-based products in Thailand?",
    options: [
    { label: "Adapting internationally launched plant-based meat analogues to suit Thai taste preferences.", correct: false },
    { label: "Developing new plant-based product concepts grounded in traditional local Thai dishes.", correct: true },
    { label: "Introducing Western vegan certification schemes to build consumer trust in Thailand.", correct: false },
    { label: "Focusing product development on younger Thai consumers who are more open to novel foods.", correct: false }
    ],
    correctIndex: 1,
    citation: "Ponjan Walter, Niramon Utama‐ang, Shitapan Bai‐Ngew, Piyawan Simapaisan. (2024). Maybe eating more local food is what we need: qualitative views on plant-based food among Thai consumers. International Journal of Food Science and Technology. https://doi.org/10.1111/ijfs.16965",
    articleId: "01c743d8-278c-4309-9c33-455180b2e673",
    articleTitle: "Maybe eating more local food is what we need: qualitative views on plant-based food among Thai consumers",
    articleUrl: "https://doi.org/10.1111/ijfs.16965",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "01c743d8-278c-4309-9c33-455180b2e673::phronesis::150",
    register: "phronesis",
    sender: "kock",
    question: "You are opening a plant-based section on the menu at a Chiang Mai restaurant. Your supplier can offer an imported soy-based meat analogue with a clean label, or you can build dishes around traditional local ingredients already familiar to the region. Your younger guests are vocal about naturalness; your older regulars simply want food that feels recognizable. Which approach best balances both audiences without compromising your creative position?",
    options: [
    { label: "Lead with the imported meat analogue — its clean label satisfies younger guests' naturalness concerns, and older guests will adapt once they see the dish prepared well." },
    { label: "Draw from the existing local culinary repertoire, framing dishes as traditional food rather than plant-based alternatives, and communicate minimal additive complexity to younger diners." },
    { label: "Split the menu equally: imported analogues for younger guests who want novelty, and traditional preparations for older guests, keeping both sections clearly separated." }
    ],
    citation: "Ponjan Walter, Niramon Utama‐ang, Shitapan Bai‐Ngew, Piyawan Simapaisan. (2024). Maybe eating more local food is what we need: qualitative views on plant-based food among Thai consumers. International Journal of Food Science and Technology. https://doi.org/10.1111/ijfs.16965",
    articleId: "01c743d8-278c-4309-9c33-455180b2e673",
    articleTitle: "Maybe eating more local food is what we need: qualitative views on plant-based food among Thai consumers",
    articleUrl: "https://doi.org/10.1111/ijfs.16965",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "01cb69fb-9ff5-4bf6-9570-848ff29f4f82::phronesis::151",
    register: "phronesis",
    sender: "kock",
    question: "A supplier is pitching you a fermented ingredient, claiming it delivers a specific health benefit through bio-fermentation. You cannot independently verify the claim from your kitchen, and you have a dish in development that could feature it. How do you decide whether to use it?",
    options: [
    { label: "Accept the supplier's claim at face value if the ingredient performs well in tastings — sensory results are your primary filter, and health claims are the supplier's responsibility to substantiate." },
    { label: "Press the supplier for transparency on how the health benefit is produced, while separately evaluating whether the ingredient's sensory and functional profile genuinely serves the dish and your diners' expectations — treating both as independent criteria." },
    { label: "Decline the ingredient entirely until a third party verifies the health claim, since using an unverified functional ingredient exposes you and your guests to reputational risk." }
    ],
    citation: "G. Enne, Serrantoni Monica, Gianfranco Greppi. (2010). Science for Food Safety, Security and Quality: a Review - Part 1. Quality of Life (Banja Luka) - APEIRON. https://doi.org/10.7251/qol1001026g",
    articleId: "01cb69fb-9ff5-4bf6-9570-848ff29f4f82",
    articleTitle: "Science for Food Safety, Security and Quality: a Review - Part 1",
    articleUrl: "https://doi.org/10.7251/qol1001026g",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "4b0f4090-e19a-4e05-a5e3-9930bfea1452::episteme::152",
    register: "episteme",
    sender: "kock",
    question: "When you taste a spirit during cooking without swallowing, how does that aromatic experience compare to what a diner gets when they swallow the finished dish or drink?",
    options: [
    { label: "The two experiences are essentially the same — swallowing has no meaningful effect on aroma perception.", correct: false },
    { label: "Swallowing shifts the experience so that one dominant aroma becomes even more pronounced and the overall profile simplifies.", correct: false },
    { label: "The aromatic character perceived during tasting without swallowing can differ structurally from what the diner experiences, with complexity increasing but no single aroma dominating as strongly once swallowing occurs.", correct: true },
    { label: "Swallowing reduces overall aroma intensity but does not change the structural character of the aromatic profile.", correct: false }
    ],
    correctIndex: 2,
    citation: "Isabelle Déléris, Anne Saint‐Eve, Y. Guo, Pascale Lieben, Marie-Louise Cypriani, Nicolas Jacquet, Pascal Brunerie, Isabelle Souchon. (2011). Impact of Swallowing on the Dynamics of Aroma Release and Perception during the Consumption of Alcoholic Beverages. Chemical Senses. https://doi.org/10.1093/chemse/bjr038",
    articleId: "4b0f4090-e19a-4e05-a5e3-9930bfea1452",
    articleTitle: "Impact of Swallowing on the Dynamics of Aroma Release and Perception during the Consumption of Alcoholic Beverages",
    articleUrl: "https://doi.org/10.1093/chemse/bjr038",
    topic: "sensory_evaluation",
    needsRetag: false
  },
  {
    id: "4b0f4090-e19a-4e05-a5e3-9930bfea1452::phronesis::153",
    register: "phronesis",
    sender: "kock",
    question: "You are finalizing a dish built around a barrel-aged spirit. Your prep schedule is tight, so you have been evaluating the spirit by sipping and spitting throughout the day. Service starts in two hours and you are confident in the aroma balance you have tasted. What is the risk in this approach, and how do you address it before the first cover?",
    options: [
    { label: "Spit-tasting is reliable enough for aroma assessment — the only meaningful gap is alcohol tolerance, which does not affect aroma perception. No adjustment needed before service." },
    { label: "The aroma profile you have been evaluating through spit-tasting is not the one your guest will experience, because swallowing alters the ethanol-related aromatic dynamics. Run at least a few full-consumption passes of the dish before service to calibrate against the actual guest experience." },
    { label: "Spit-tasting inflates sweetness perception, so adjust seasoning downward before service, but aroma architecture is unaffected and requires no further passes." }
    ],
    citation: "Isabelle Déléris, Anne Saint‐Eve, Y. Guo, Pascale Lieben, Marie-Louise Cypriani, Nicolas Jacquet, Pascal Brunerie, Isabelle Souchon. (2011). Impact of Swallowing on the Dynamics of Aroma Release and Perception during the Consumption of Alcoholic Beverages. Chemical Senses. https://doi.org/10.1093/chemse/bjr038",
    articleId: "4b0f4090-e19a-4e05-a5e3-9930bfea1452",
    articleTitle: "Impact of Swallowing on the Dynamics of Aroma Release and Perception during the Consumption of Alcoholic Beverages",
    articleUrl: "https://doi.org/10.1093/chemse/bjr038",
    topic: "sensory_evaluation",
    needsRetag: false
  },
  {
    id: "cf9848c5-ce39-4d4d-9c64-c8702f899195::episteme::154",
    register: "episteme",
    sender: "kock",
    question: "You are working with doenjang and want to bring out its kokumi character without adding more of the peptide-rich paste. According to recent research, what factor determines whether kokumi peptides in a fermented soybean product actually reach the perception threshold?",
    options: [
    { label: "The absolute concentration of kokumi peptides in the finished product", correct: false },
    { label: "The pH of the finished fermented product", correct: true },
    { label: "The fermentation temperature used during production", correct: false },
    { label: "The sodium content relative to the peptide concentration", correct: false }
    ],
    correctIndex: 1,
    citation: "Ju‐Yeon Lee, T. S. Park, Mina K. Kim. (2025). Effects of pH on the Flavor Detection Threshold and DoT of Nine Kokumi Peptides in Soybean Fermented Foods. Journal of Sensory Studies. https://doi.org/10.1111/joss.70042",
    articleId: "cf9848c5-ce39-4d4d-9c64-c8702f899195",
    articleTitle: "Effects of pH on the Flavor Detection Threshold and DoT of Nine Kokumi Peptides in Soybean Fermented Foods",
    articleUrl: "https://doi.org/10.1111/joss.70042",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "cf9848c5-ce39-4d4d-9c64-c8702f899195::phronesis::155",
    register: "phronesis",
    sender: "kock",
    question: "You are finishing a batch of doenjang and notice the kokumi character is noticeably flat compared to your last batch. The peptide profile looks similar on paper. Before you reach for additional ingredients or push fermentation further, what is the more immediate diagnostic step and why does it matter?",
    options: [
    { label: "Extend fermentation time to increase peptide concentration, since a flat kokumi character almost always means the peptides are not present in sufficient quantity." },
    { label: "Check and record the current pH of the batch, because the product's pH may be suppressing perception rather than the peptide content actually being insufficient — perceptual threshold and peptide concentration are not the same lever." },
    { label: "Add a kokumi-rich ingredient immediately to compensate, since pH adjustment is too slow to affect flavor perception at the point of finishing." }
    ],
    citation: "Ju‐Yeon Lee, T. S. Park, Mina K. Kim. (2025). Effects of pH on the Flavor Detection Threshold and DoT of Nine Kokumi Peptides in Soybean Fermented Foods. Journal of Sensory Studies. https://doi.org/10.1111/joss.70042",
    articleId: "cf9848c5-ce39-4d4d-9c64-c8702f899195",
    articleTitle: "Effects of pH on the Flavor Detection Threshold and DoT of Nine Kokumi Peptides in Soybean Fermented Foods",
    articleUrl: "https://doi.org/10.1111/joss.70042",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "01dcd866-3330-429f-84c2-59963218a036::episteme::156",
    register: "episteme",
    sender: "kock",
    question: "What do natural aging and gamma irradiation have in common in their effect on Nongxiangxing baijiu?",
    options: [
    { label: "Both methods promote the production of aldehydes and acids, compounds tied to the flavor of aged spirit.", correct: true },
    { label: "Both methods primarily reduce ester content, which smooths the spirit's finish.", correct: false },
    { label: "Both methods increase alcohol concentration by evaporating water during the process.", correct: false },
    { label: "Both methods suppress microbial activity, which prevents off-flavors from developing.", correct: false }
    ],
    correctIndex: 0,
    citation: "Jiang He, Qian Chen, Xin Jia, Yan Wang, Min Huang, Guangxi Wang, Hao Chen, Peng Gao. (2022). The effects of gamma irradiation and natural aging on the composition of Nongxiangxing baijiu. Journal of Food Processing and Preservation. https://doi.org/10.1111/jfpp.17146",
    articleId: "01dcd866-3330-429f-84c2-59963218a036",
    articleTitle: "The effects of gamma irradiation and natural aging on the composition of Nongxiangxing baijiu",
    articleUrl: "https://doi.org/10.1111/jfpp.17146",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "01dcd866-3330-429f-84c2-59963218a036::phronesis::157",
    register: "phronesis",
    sender: "kock",
    question: "You are sourcing baijiu for a dish where aged, mellow flavor is essential, but your usual aged stock is unavailable. A supplier offers irradiated baijiu, claiming it mimics aged characteristics. How do you approach the decision?",
    options: [
    { label: "Accept the irradiated stock, since low-dose irradiation broadly replicates the aldehyde and acid profile of natural aging, treating the chemistry as sufficient proof of equivalence." },
    { label: "Decline outright, since irradiation introduces off-flavors that natural aging does not, making it unsuitable regardless of dose." },
    { label: "Hold the decision pending clarity on regulatory status, consumer acceptance, and whether the sensory match extends beyond aldehydes and acids, while acknowledging the chemistry at low doses is broadly similar to natural aging." }
    ],
    citation: "Jiang He, Qian Chen, Xin Jia, Yan Wang, Min Huang, Guangxi Wang, Hao Chen, Peng Gao. (2022). The effects of gamma irradiation and natural aging on the composition of Nongxiangxing baijiu. Journal of Food Processing and Preservation. https://doi.org/10.1111/jfpp.17146",
    articleId: "01dcd866-3330-429f-84c2-59963218a036",
    articleTitle: "The effects of gamma irradiation and natural aging on the composition of Nongxiangxing baijiu",
    articleUrl: "https://doi.org/10.1111/jfpp.17146",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "01e716da-8c88-45ad-bacc-64d9b649f0f4::episteme::158",
    register: "episteme",
    sender: "kock",
    question: "When millet and sorghum flours are used to partially replace wheat in bread, what happens to fat content as the substitution level increases?",
    options: [
    { label: "Fat content decreases progressively with each substitution level.", correct: false },
    { label: "Fat content remains largely unchanged regardless of substitution level.", correct: false },
    { label: "Fat content rises substantially with substitution level, reaching its highest recorded value at the T3 level.", correct: true },
    { label: "Fat content rises initially but then drops back at the T3 level.", correct: false }
    ],
    correctIndex: 2,
    citation: "Aneeq Ahmad, Shahid Bashir, Kanza Saeed, Hafiza Haima, Rai Muhammad Amir, Waseem Khalid, Muhammad Ishfaq Ahmad, Amanullah Sabir, Muhammad Zubair Khalid, Naz̲īr Aḥmad, Isam A. Mohamed Ahmed, Mahmoud Younis. (2025). Nutritional, textural, and sensory properties of bread from wheat-, millet-, and sorghum-based composite flour. Italian Journal of Food Science. https://doi.org/10.15586/ijfs.v37i4.2974",
    articleId: "01e716da-8c88-45ad-bacc-64d9b649f0f4",
    articleTitle: "Nutritional, textural, and sensory properties of bread from wheat-, millet-, and sorghum-based composite flour",
    articleUrl: "https://doi.org/10.15586/ijfs.v37i4.2974",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "01e97a53-5bf2-48b2-b013-6ed3a79bf289::episteme::159",
    register: "episteme",
    sender: "kock",
    question: "When you enrich an extruded puffed snack with partially defatted soybean, what is the primary structural consequence inside the extruder barrel?",
    options: [
    { label: "Residual lipid-binding proteins and dietary fiber increase die pressure and restrict steam flash expansion, collapsing the cellular architecture that gives the snack its light, crisp texture.", correct: true },
    { label: "The added dietary fiber accelerates starch gelatinization, producing a denser but more uniform cell structure that improves crunch.", correct: false },
    { label: "Higher protein content raises barrel temperature, fully deactivating anti-nutritional factors and improving both texture and amino acid availability simultaneously.", correct: false },
    { label: "Soybean lipids lubricate the barrel walls, reducing die pressure and causing over-expansion of the extrudate.", correct: false }
    ],
    correctIndex: 0,
    citation: "A Obatolu Veronica, O. OMUETI OLUSOLA, EBENEZER A. ADEBOWALE. (2006). QUALITIES OF EXTRUDED PUFFED SNACKS FROM MAIZE/SOYBEAN MIXTURE. Journal of Food Process Engineering. https://doi.org/10.1111/j.1745-4530.2006.00054.x",
    articleId: "01e97a53-5bf2-48b2-b013-6ed3a79bf289",
    articleTitle: "QUALITIES OF EXTRUDED PUFFED SNACKS FROM MAIZE/SOYBEAN MIXTURE",
    articleUrl: "https://doi.org/10.1111/j.1745-4530.2006.00054.x",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "01e97a53-5bf2-48b2-b013-6ed3a79bf289::techne::160",
    register: "techne",
    sender: "kock",
    question: "You are developing a puffed snack with soy protein added to a maize base and the expansion is coming out poor. Which adjustment should you make first before locking in your production formula?",
    options: [
    { label: "Keep soybean inclusion below 15% and adjust screw speed and moisture content incrementally, checking expansion ratio at each step.", correct: true },
    { label: "Raise soybean inclusion above 20% to maximize protein content, then compensate with higher barrel temperature.", correct: false },
    { label: "Skip starch pre-gelatinization and rely solely on increased screw speed to recover expansion.", correct: false },
    { label: "Fix moisture content at the standard maize extrusion level and only vary screw speed.", correct: false }
    ],
    correctIndex: 0,
    citation: "A Obatolu Veronica, O. OMUETI OLUSOLA, EBENEZER A. ADEBOWALE. (2006). QUALITIES OF EXTRUDED PUFFED SNACKS FROM MAIZE/SOYBEAN MIXTURE. Journal of Food Process Engineering. https://doi.org/10.1111/j.1745-4530.2006.00054.x",
    articleId: "01e97a53-5bf2-48b2-b013-6ed3a79bf289",
    articleTitle: "QUALITIES OF EXTRUDED PUFFED SNACKS FROM MAIZE/SOYBEAN MIXTURE",
    articleUrl: "https://doi.org/10.1111/j.1745-4530.2006.00054.x",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "01e97a53-5bf2-48b2-b013-6ed3a79bf289::phronesis::161",
    register: "phronesis",
    sender: "kock",
    question: "You are working the extruder on a high-protein snack line. The 20% soy blend keeps coming out denser than the target, and the expansion is clearly off. You have a nutrition brief that calls for this soy level, but your instincts say the product won't sell at this texture. What do you do?",
    options: [
    { label: "Hold the formula exactly as specified, log the texture issue, and escalate to the product developer before making any changes — the nutrition brief overrides line judgment." },
    { label: "Nudge moisture upward incrementally, monitor each batch by hand, and keep the soy level intact for now — you are trying to close the gap between the brief and a product that will actually sell." },
    { label: "Drop the soy percentage immediately to restore expansion, document the change, and present the nutrition team with the result as a fait accompli." }
    ],
    citation: "A Obatolu Veronica, O. OMUETI OLUSOLA, EBENEZER A. ADEBOWALE. (2006). QUALITIES OF EXTRUDED PUFFED SNACKS FROM MAIZE/SOYBEAN MIXTURE. Journal of Food Process Engineering. https://doi.org/10.1111/j.1745-4530.2006.00054.x",
    articleId: "01e97a53-5bf2-48b2-b013-6ed3a79bf289",
    articleTitle: "QUALITIES OF EXTRUDED PUFFED SNACKS FROM MAIZE/SOYBEAN MIXTURE",
    articleUrl: "https://doi.org/10.1111/j.1745-4530.2006.00054.x",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "01edb51c-bfd9-488b-a6c7-47a41b7fdbd7::episteme::162",
    register: "episteme",
    sender: "kock",
    question: "In Fen-flavor Baijiu fermentation, which three bacterial strains were found to differ meaningfully in lactic acid production, overall acid production, and dual acid-alcohol resistance?",
    options: [
    { label: "Lactobacillus plantarum LP, Lacticaseibacillus rhamnosus LR, and Lentilactobacillus hilgardii LH", correct: true },
    { label: "Lactobacillus plantarum LP, Lactobacillus acidophilus LA, and Lentilactobacillus hilgardii LH", correct: false },
    { label: "Lacticaseibacillus rhamnosus LR, Leuconostoc mesenteroides LM, and Lactobacillus plantarum LP", correct: false },
    { label: "Lentilactobacillus hilgardii LH, Pediococcus pentosaceus PP, and Lacticaseibacillus rhamnosus LR", correct: false }
    ],
    correctIndex: 0,
    citation: "Xinyi Zhao, Jianghua Li, Guocheng Du, Jian Chen, Tingyue Ren, Junyan Wang, Ying Han, Zhen Pan, Xinrui Zhao. (2022). The Influence of Seasons on the Composition of Microbial Communities and the Content of Lactic Acid during the Fermentation of Fen-Flavor Baijiu. Fermentation. https://doi.org/10.3390/fermentation8120740",
    articleId: "01edb51c-bfd9-488b-a6c7-47a41b7fdbd7",
    articleTitle: "The Influence of Seasons on the Composition of Microbial Communities and the Content of Lactic Acid during the Fermentation of Fen-Flavor Baijiu",
    articleUrl: "https://doi.org/10.3390/fermentation8120740",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "01edb51c-bfd9-488b-a6c7-47a41b7fdbd7::phronesis::163",
    register: "phronesis",
    sender: "kock",
    question: "You are overseeing a grain ferment in the middle of summer and the batch is turning noticeably sourer than usual. Your apprentice suggests you simply lower the fermentation temperature to bring it back in line. What is the stronger move here, and why does it matter which path you take?",
    options: [
    { label: "Adjust the temperature immediately, since heat is the direct driver of sourness and reducing it will correct the lactic acid build-up." },
    { label: "First investigate the microbial community composition to understand which strains are dominant before making any intervention, since the problem is likely strain-specific and community-level rather than a simple temperature effect." },
    { label: "Increase salt or other antimicrobial inputs across the board to suppress bacterial activity and buy time to assess the situation." }
    ],
    citation: "Xinyi Zhao, Jianghua Li, Guocheng Du, Jian Chen, Tingyue Ren, Junyan Wang, Ying Han, Zhen Pan, Xinrui Zhao. (2022). The Influence of Seasons on the Composition of Microbial Communities and the Content of Lactic Acid during the Fermentation of Fen-Flavor Baijiu. Fermentation. https://doi.org/10.3390/fermentation8120740",
    articleId: "01edb51c-bfd9-488b-a6c7-47a41b7fdbd7",
    articleTitle: "The Influence of Seasons on the Composition of Microbial Communities and the Content of Lactic Acid during the Fermentation of Fen-Flavor Baijiu",
    articleUrl: "https://doi.org/10.3390/fermentation8120740",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "650b25f7-550a-4d4c-bce0-b17527be8358::episteme::164",
    register: "episteme",
    sender: "kock",
    question: "Beyond temperature and substrate, what factor does research identify as capable of redirecting the metabolic pathways of the bacteria responsible for yogurt fermentation?",
    options: [
    { label: "The oxidoreduction potential of the fermentation environment", correct: true },
    { label: "The fat content of the milk used as a base", correct: false },
    { label: "The ratio of Lactobacillus bulgaricus to Streptococcus thermophilus", correct: false },
    { label: "The inoculation temperature at the start of fermentation", correct: false }
    ],
    correctIndex: 0,
    citation: "Florence Martin, Rémy Cachon, Karine Gourrat Pernin, Joëlle De Coninck, Patrick Gervais, Elisabeth Guichard, Nathalie Cayot. (2011). Effect of oxidoreduction potential on aroma biosynthesis by lactic acid bacteria in nonfat yogurt. Journal of Dairy Science. https://doi.org/10.3168/jds.2010-3372",
    articleId: "650b25f7-550a-4d4c-bce0-b17527be8358",
    articleTitle: "Effect of oxidoreduction potential on aroma biosynthesis by lactic acid bacteria in nonfat yogurt",
    articleUrl: "https://doi.org/10.3168/jds.2010-3372",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "650b25f7-550a-4d4c-bce0-b17527be8358::phronesis::165",
    register: "phronesis",
    sender: "kock",
    question: "You are developing a fermented dairy component for a dish and want a pronounced buttery-acidic character rather than a sharp aldehydic note. You know the culture selection is already set. Before scaling, you consider whether the fermentation atmosphere could shift the aroma balance in the direction you want — but the research suggests trade-offs at intermediate conditions may exist without giving clear thresholds. Do you redesign the fermentation environment now, run controlled trials at different atmospheric conditions before committing, or accept the current profile and adjust through other recipe elements?",
    options: [
    { label: "Redesign the fermentation atmosphere immediately toward oxidative conditions, since the research links oxidative environments to higher diacetyl production." },
    { label: "Run small-scale fermentation trials across different atmospheric conditions before scaling, since directional trade-offs at intermediate levels are signaled but not fully resolved." },
    { label: "Leave the fermentation environment unchanged and compensate for the aldehydic character by adjusting other components of the dish." }
    ],
    citation: "Florence Martin, Rémy Cachon, Karine Gourrat Pernin, Joëlle De Coninck, Patrick Gervais, Elisabeth Guichard, Nathalie Cayot. (2011). Effect of oxidoreduction potential on aroma biosynthesis by lactic acid bacteria in nonfat yogurt. Journal of Dairy Science. https://doi.org/10.3168/jds.2010-3372",
    articleId: "650b25f7-550a-4d4c-bce0-b17527be8358",
    articleTitle: "Effect of oxidoreduction potential on aroma biosynthesis by lactic acid bacteria in nonfat yogurt",
    articleUrl: "https://doi.org/10.3168/jds.2010-3372",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "4d6fe359-aafa-4d4c-821b-071d3a767be3::episteme::166",
    register: "episteme",
    sender: "kock",
    question: "A winemaker tests smoke-affected grapes at crush and finds guaiacol levels that seem manageable. Should that reading be taken as a reliable picture of what the finished wine will contain?",
    options: [
    { label: "No — fermentation and ageing convert bound, flavour-inactive precursors into free guaiacol and 4-methylguaiacol, so the early reading underestimates the final taint load.", correct: true },
    { label: "Yes — the guaiacol present at crush is already in its free, flavour-active form, so no further increase occurs during fermentation.", correct: false },
    { label: "Yes — ageing is a passive process that does not alter the balance between bound and free guaiacol.", correct: false },
    { label: "No — but only because oak contact during ageing introduces additional guaiacol unrelated to smoke taint.", correct: false }
    ],
    correctIndex: 0,
    citation: "Davinder Pal Singh, Hui H. Chong, K.M. PITT, Michael Cleary, Nick Dokoozlian, Mark O. Downey. (2011). Guaiacol and 4-methylguaiacol accumulate in wines made from smoke-affected fruit because of hydrolysis of their conjugates. Australian Journal of Grape and Wine Research. https://doi.org/10.1111/j.1755-0238.2011.00128.x",
    articleId: "4d6fe359-aafa-4d4c-821b-071d3a767be3",
    articleTitle: "Guaiacol and 4-methylguaiacol accumulate in wines made from smoke-affected fruit because of hydrolysis of their conjugates",
    articleUrl: "https://doi.org/10.1111/j.1755-0238.2011.00128.x",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "4d6fe359-aafa-4d4c-821b-071d3a767be3::phronesis::167",
    register: "phronesis",
    sender: "kock",
    question: "You are developing a fermented grape-based dish and you have sourced fruit from a region that had bushfires six months ago. The grapes pass your smell check at intake — no obvious smoke character. Your supplier assures you the free taint levels tested low at harvest. Do you proceed with a large batch fermentation, ask for additional testing before committing, or treat the fruit the same as any other regional ingredient given it passed sensory?",
    options: [
    { label: "Proceed with the large batch. The fruit passed sensory intake and the supplier confirmed low free taint at harvest, which is sufficient assurance." },
    { label: "Request bound-form analysis before committing to the large batch, because free taint at harvest does not account for precursors that release during processing and storage." },
    { label: "Treat it as a standard regional ingredient. If smoke taint were present, sensory evaluation at intake would have detected it reliably." }
    ],
    citation: "Davinder Pal Singh, Hui H. Chong, K.M. PITT, Michael Cleary, Nick Dokoozlian, Mark O. Downey. (2011). Guaiacol and 4-methylguaiacol accumulate in wines made from smoke-affected fruit because of hydrolysis of their conjugates. Australian Journal of Grape and Wine Research. https://doi.org/10.1111/j.1755-0238.2011.00128.x",
    articleId: "4d6fe359-aafa-4d4c-821b-071d3a767be3",
    articleTitle: "Guaiacol and 4-methylguaiacol accumulate in wines made from smoke-affected fruit because of hydrolysis of their conjugates",
    articleUrl: "https://doi.org/10.1111/j.1755-0238.2011.00128.x",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "02017c05-2270-40c9-9031-f7b43cbcadf9::episteme::168",
    register: "episteme",
    sender: "värd",
    question: "Research on home weaning practices shows that mothers use food variety as a strategy against fussy eating. What does the same research reveal about mothers' understanding of what 'variety' actually means?",
    options: [
    { label: "Mothers hold a consistent and accurate definition of food variety.", correct: false },
    { label: "Mothers acknowledge variety's importance but do not hold a consistent or accurate definition of it.", correct: true },
    { label: "Mothers reject variety as a strategy and rely solely on repeated offering of familiar foods.", correct: false },
    { label: "Mothers define variety strictly in terms of colour diversity on the plate.", correct: false }
    ],
    correctIndex: 1,
    citation: "Eleni Spyreli, Michelle C. McKinley, Virginia Allen‐Walker, Louise Tully, Jayne V. Woodside, Colette Kelly, Moira Dean. (2019). “The One Time You Have Control over What They Eat”: A Qualitative Exploration of Mothers’ Practices to Establish Healthy Eating Behaviours during Weaning. Nutrients. https://doi.org/10.3390/nu11030562",
    articleId: "02017c05-2270-40c9-9031-f7b43cbcadf9",
    articleTitle: "“The One Time You Have Control over What They Eat”: A Qualitative Exploration of Mothers’ Practices to Establish Healthy Eating Behaviours during Weaning",
    articleUrl: "https://doi.org/10.3390/nu11030562",
    topic: "food_psychology",
    needsRetag: false
  },
  {
    id: "02017c05-2270-40c9-9031-f7b43cbcadf9::phronesis::169",
    register: "phronesis",
    sender: "värd",
    question: "You are contributing to a weaning product range. A brand manager shows you a lineup of five new purées: carrot, butternut squash, sweet potato, parsnip, and pumpkin. She calls it a 'high-variety range.' You know from the research that mothers are motivated to offer variety but struggle to define what genuine variety means. How do you advise reshaping the range?",
    options: [
    { label: "Accept the lineup as is — root vegetables are nutritionally distinct enough to count as genuine variety for weaning purposes." },
    { label: "Push to replace at least two or three items with options from genuinely different flavour and texture categories — such as a bitter green, a legume, or a tart fruit — so the range crosses real sensory boundaries rather than staying within one familiar cluster." },
    { label: "Add seasoning and different preparation methods to the existing five purées; processing variation is sufficient to create the breadth mothers are looking for." }
    ],
    citation: "Eleni Spyreli, Michelle C. McKinley, Virginia Allen‐Walker, Louise Tully, Jayne V. Woodside, Colette Kelly, Moira Dean. (2019). “The One Time You Have Control over What They Eat”: A Qualitative Exploration of Mothers’ Practices to Establish Healthy Eating Behaviours during Weaning. Nutrients. https://doi.org/10.3390/nu11030562",
    articleId: "02017c05-2270-40c9-9031-f7b43cbcadf9",
    articleTitle: "“The One Time You Have Control over What They Eat”: A Qualitative Exploration of Mothers’ Practices to Establish Healthy Eating Behaviours during Weaning",
    articleUrl: "https://doi.org/10.3390/nu11030562",
    topic: "food_psychology",
    needsRetag: false
  },
  {
    id: "52c54aab-5597-4bdd-b459-2bb49943d858::phronesis::170",
    register: "phronesis",
    sender: "kock",
    question: "A colleague references 'The Spoon, Not the Scepter' in a team briefing to support a shift in kitchen philosophy around authority and craft. You have not read the article — only its title. How do you handle this moment?",
    options: [
    { label: "Accept the reference at face value; the title is evocative enough to signal the argument, and it moves the conversation forward." },
    { label: "Pause the discussion and flag that none of you have read the full article, so the title alone is not a reliable basis for adjusting kitchen philosophy or using the source accurately in professional conversation." },
    { label: "Reject the source outright because a journal article on food and culture has limited practical relevance to a working kitchen." }
    ],
    citation: "Darra Goldstein. (2001). The Spoon, Not the Scepter. Gastronomica The Journal of Food and Culture. https://doi.org/10.1525/gfc.2001.1.2.iii",
    articleId: "52c54aab-5597-4bdd-b459-2bb49943d858",
    articleTitle: "The Spoon, Not the Scepter",
    articleUrl: "https://doi.org/10.1525/gfc.2001.1.2.iii",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "e45b0e11-1629-4c5e-abac-6997891f08bf::episteme::171",
    register: "episteme",
    sender: "kock",
    question: "Why does standard ingredient-verification chemistry struggle to detect honey adulteration with sugar concentrate?",
    options: [
    { label: "Because cane-sugar syrups share the same fundamental carbohydrate building blocks — simple one- and two-sugar molecules — as genuine honey, making the chemistry unreliable.", correct: true },
    { label: "Because cane-sugar syrups contain complex polysaccharides that mask the natural sugars in honey.", correct: false },
    { label: "Because standard tests only measure volatile aroma compounds, which are identical in all sugar-based products.", correct: false },
    { label: "Because genuine honey contains no simple sugars, so any detected simple sugars confirm adulteration.", correct: false }
    ],
    correctIndex: 0,
    citation: "Ammar Zakaria, Ali Yeon Md Shakaff, Maz Jamilah Masnan, Mohd Noor Ahmad, Abdul Hamid Adom, Mahmad Nor Jaafar, Supri A. Ghani, Abu Hassan Abdullah, Abdul Aziz, Latifah Munirah Kamarudin, Norazian Subari, N. A. Fikri. (2011). A Biomimetic Sensor for the Classification of Honeys of Different Floral Origin and the Detection of Adulteration. Sensors. https://doi.org/10.3390/s110807799",
    articleId: "e45b0e11-1629-4c5e-abac-6997891f08bf",
    articleTitle: "A Biomimetic Sensor for the Classification of Honeys of Different Floral Origin and the Detection of Adulteration",
    articleUrl: "https://doi.org/10.3390/s110807799",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "80a06cdf-e7ca-4031-ac4c-7814da236120::episteme::172",
    register: "episteme",
    sender: "kock",
    question: "Which of the following compounds was identified as differentiating both cultivar identity and growing-year character in Palatinate white wines?",
    options: [
    { label: "2,3-butanediol", correct: true },
    { label: "ethanol", correct: false },
    { label: "tartaric acid", correct: false },
    { label: "glucose", correct: false }
    ],
    correctIndex: 0,
    citation: "Kashif Ali, Federica Maltese, Reinhard Toepfer, Young Hae Choi, Robert Verpoorte. (2011). Metabolic characterization of Palatinate German white wines according to sensory attributes, varieties, and vintages using NMR spectroscopy and multivariate data analyses. Journal of Biomolecular NMR. https://doi.org/10.1007/s10858-011-9487-3",
    articleId: "80a06cdf-e7ca-4031-ac4c-7814da236120",
    articleTitle: "Metabolic characterization of Palatinate German white wines according to sensory attributes, varieties, and vintages using NMR spectroscopy and multivariate data analyses",
    articleUrl: "https://doi.org/10.1007/s10858-011-9487-3",
    topic: "sensory_evaluation",
    needsRetag: false
  },
  {
    id: "80a06cdf-e7ca-4031-ac4c-7814da236120::phronesis::173",
    register: "phronesis",
    sender: "kock",
    question: "You are reducing a white wine sauce and have two options on hand: a Palatinate Riesling and a Mueller-Thurgau from the same region. You know from recent research that their organic acid profiles differ — Riesling runs higher in malate and citrate, Mueller-Thurgau higher in succinate and lactate. The sauce needs a clean, bright acidity that holds up through prolonged heat. Which wine do you reach for, and what are you actually trading off?",
    options: [
    { label: "Reach for the Riesling: its higher malate and citrate content suggests a sharper, more volatile acidity under heat, which may brighten the final sauce — but you accept that culinary behavior of these acids under reduction has not been confirmed by the research, so you are making an informed bet, not following a tested recipe." },
    { label: "Reach for the Mueller-Thurgau: its higher succinate and lactate content suggests a rounder, more stable acid character under prolonged heat, which may integrate better into a slow reduction — while acknowledging the same uncertainty about how these profiles actually behave in a pan." },
    { label: "Treat the choice as irrelevant at this stage: since the study is correlational and tests no culinary application, default to whichever wine you would serve to the guest, and adjust seasoning at the end regardless of variety." }
    ],
    citation: "Kashif Ali, Federica Maltese, Reinhard Toepfer, Young Hae Choi, Robert Verpoorte. (2011). Metabolic characterization of Palatinate German white wines according to sensory attributes, varieties, and vintages using NMR spectroscopy and multivariate data analyses. Journal of Biomolecular NMR. https://doi.org/10.1007/s10858-011-9487-3",
    articleId: "80a06cdf-e7ca-4031-ac4c-7814da236120",
    articleTitle: "Metabolic characterization of Palatinate German white wines according to sensory attributes, varieties, and vintages using NMR spectroscopy and multivariate data analyses",
    articleUrl: "https://doi.org/10.1007/s10858-011-9487-3",
    topic: "sensory_evaluation",
    needsRetag: false
  },
  {
    id: "02107df8-3396-401b-93e6-407336960fd2::techne::174",
    register: "techne",
    sender: "värd",
    question: "You are building a tasting menu and want to suppress overall appetite motivation as early as possible in the meal. Based on what is known about palatability and post-consumption appetite suppression, where should you place the course guests rate most highly?",
    options: [
    { label: "Early in the sequence, so the most liked item suppresses appetite before subsequent courses are served.", correct: true },
    { label: "At the end of the sequence, as a reward, so guests remain motivated through every preceding course.", correct: false },
    { label: "In the middle of the sequence, to maintain even appetite levels throughout the meal.", correct: false },
    { label: "Position does not matter; palatability affects appetite suppression equally regardless of placement.", correct: false }
    ],
    correctIndex: 0,
    citation: "Sofie G T Lemmens, Paul F M Schoffelen, Loek Wouters, Jurriaan M Born, Mieke J I Martens, Femke Rutters, Margriet S Westerterp-Plantenga. (2009). Eating what you like induces a stronger decrease of 'wanting' to eat.. Physiology & behavior. https://doi.org/10.1016/j.physbeh.2009.06.008",
    articleId: "02107df8-3396-401b-93e6-407336960fd2",
    articleTitle: "Eating what you like induces a stronger decrease of 'wanting' to eat.",
    articleUrl: "https://doi.org/10.1016/j.physbeh.2009.06.008",
    topic: "food_psychology",
    needsRetag: false
  },
  {
    id: "02107df8-3396-401b-93e6-407336960fd2::phronesis::175",
    register: "phronesis",
    sender: "värd",
    question: "You are plating the opening amuse-bouche for a twelve-course tasting menu. Your current concept leads with an intensely rich, high-palatability bite designed to make a strong first impression. A colleague flags that placing your most indulgent flavors at the start could suppress guests' broader desire to eat before the meal's centerpiece courses arrive. How do you weigh that risk against the impression value of your opening?",
    options: [
    { label: "Keep the rich amuse-bouche in the opening position — the impression-setting impact outweighs the risk of early appetite suppression, and guests can pace themselves." },
    { label: "Shift the highest-palatability intensity toward the dessert course or near the meal's end, preserving broader appetite for the main courses while still deploying that flavor impact at a point where suppression is strategically acceptable." },
    { label: "Split the rich element across two lighter courses early in the sequence — reducing the per-serving intensity so the impression holds without triggering the same suppression effect." }
    ],
    citation: "Sofie G T Lemmens, Paul F M Schoffelen, Loek Wouters, Jurriaan M Born, Mieke J I Martens, Femke Rutters, Margriet S Westerterp-Plantenga. (2009). Eating what you like induces a stronger decrease of 'wanting' to eat.. Physiology & behavior. https://doi.org/10.1016/j.physbeh.2009.06.008",
    articleId: "02107df8-3396-401b-93e6-407336960fd2",
    articleTitle: "Eating what you like induces a stronger decrease of 'wanting' to eat.",
    articleUrl: "https://doi.org/10.1016/j.physbeh.2009.06.008",
    topic: "food_psychology",
    needsRetag: false
  },
  {
    id: "023b010f-4820-41cc-8e9e-ea7b274b99d0::episteme::176",
    register: "episteme",
    sender: "värd",
    question: "According to a validated classification framework for U.S. restaurants, how many distinct tiers does the system recognize along the hedonic-utilitarian axis?",
    options: [
    { label: "Three tiers", correct: false },
    { label: "Four tiers", correct: true },
    { label: "Five tiers", correct: false },
    { label: "Six tiers", correct: false }
    ],
    correctIndex: 1,
    citation: "H. G. Parsa, Barry Shuster, Milos Bujisic. (2020). New Classification System for the U.S. Restaurant Industry: Application of Utilitarian and Hedonic Continuum Model. Cornell Hospitality Quarterly. https://doi.org/10.1177/1938965519899929",
    articleId: "023b010f-4820-41cc-8e9e-ea7b274b99d0",
    articleTitle: "New Classification System for the U.S. Restaurant Industry: Application of Utilitarian and Hedonic Continuum Model",
    articleUrl: "https://doi.org/10.1177/1938965519899929",
    topic: "hospitality",
    needsRetag: false
  },
  {
    id: "023b010f-4820-41cc-8e9e-ea7b274b99d0::phronesis::177",
    register: "phronesis",
    sender: "värd",
    question: "You are developing a fermented hot sauce to anchor a new menu section. One collaborator wants a highly conceptual, multi-stage lacto-ferment with a narrative tasting note; another wants a straightforward, shelf-stable product that moves fast and keeps food cost tight. Your restaurant sits in the Casual tier. How do you frame your decision?",
    options: [
    { label: "Push for the conceptual ferment regardless of tier — fermentation is inherently experimental and guests in any segment will reward the ambition." },
    { label: "Let the Casual-tier classification discipline the decision — a highly elaborate, concept-heavy ferment is likely misaligned with this segment, so favour the reliable, accessible product while still ensuring quality." },
    { label: "Defer the decision entirely to front-of-house, since the classification system is guest-facing and chefs should not apply it to production choices." }
    ],
    citation: "H. G. Parsa, Barry Shuster, Milos Bujisic. (2020). New Classification System for the U.S. Restaurant Industry: Application of Utilitarian and Hedonic Continuum Model. Cornell Hospitality Quarterly. https://doi.org/10.1177/1938965519899929",
    articleId: "023b010f-4820-41cc-8e9e-ea7b274b99d0",
    articleTitle: "New Classification System for the U.S. Restaurant Industry: Application of Utilitarian and Hedonic Continuum Model",
    articleUrl: "https://doi.org/10.1177/1938965519899929",
    topic: "hospitality",
    needsRetag: false
  },
  {
    id: "6c30c4ee-d553-4597-8a5a-b7ce7224d447::episteme::178",
    register: "episteme",
    sender: "kock",
    question: "In spontaneous Chinese liquor fermentation, how does Lactobacillus buchneri contribute to the production of volatile sulfur compounds like 3-(methylthio)-1-propanol?",
    options: [
    { label: "It synthesizes 3-(methylthio)-1-propanol and dimethyl disulfide directly from sulfur substrates.", correct: false },
    { label: "It operates a methyl cycle that regenerates methionine, keeping the precursor available for Saccharomyces cerevisiae to convert into volatile sulfur compounds.", correct: true },
    { label: "It breaks down methionine into dimethyl disulfide without involvement from Saccharomyces cerevisiae.", correct: false },
    { label: "It competes with Saccharomyces cerevisiae for methionine, reducing overall sulfur compound output.", correct: false }
    ],
    correctIndex: 1,
    citation: "Jun Liu, Qun Wu, Peng Wang, Jianchun Lin, Ling Huang, Yan Xu. (2017). Synergistic Effect in Core Microbiota Associated with Sulfur Metabolism in Spontaneous Chinese Liquor Fermentation. Applied and Environmental Microbiology. https://doi.org/10.1128/aem.01475-17",
    articleId: "6c30c4ee-d553-4597-8a5a-b7ce7224d447",
    articleTitle: "Synergistic Effect in Core Microbiota Associated with Sulfur Metabolism in Spontaneous Chinese Liquor Fermentation",
    articleUrl: "https://doi.org/10.1128/aem.01475-17",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "6c30c4ee-d553-4597-8a5a-b7ce7224d447::phronesis::179",
    register: "phronesis",
    sender: "kock",
    question: "You're producing a fermented condiment and noticing that sulfurous aromatics vary noticeably between batches, even though your yeast starter looks consistent each time. A colleague suggests you focus your troubleshooting on yeast health and pitching rates. A food scientist mentions a study on Chinese liquor fermentation suggesting bacterial methionine-recycling may drive sulfur compound production. A third voice says the single-study finding is too context-specific to act on. Where do you direct your next diagnostic step, and how do you weigh these competing angles?",
    options: [
    { label: "Concentrate troubleshooting on yeast performance metrics, since sulfur compounds in fermentation are primarily a yeast-driven output and the bacterial angle is speculative." },
    { label: "Add Lactobacillus activity to your diagnostic checklist alongside yeast, while acknowledging the study was conducted in Chinese liquor fermentation and may not transfer directly to your substrate or vessel." },
    { label: "Treat the bacterial finding as immediately actionable and restructure the fermentation protocol around Lactobacillus management, since the methionine-recycling mechanism is well-established across fermentation contexts." }
    ],
    citation: "Jun Liu, Qun Wu, Peng Wang, Jianchun Lin, Ling Huang, Yan Xu. (2017). Synergistic Effect in Core Microbiota Associated with Sulfur Metabolism in Spontaneous Chinese Liquor Fermentation. Applied and Environmental Microbiology. https://doi.org/10.1128/aem.01475-17",
    articleId: "6c30c4ee-d553-4597-8a5a-b7ce7224d447",
    articleTitle: "Synergistic Effect in Core Microbiota Associated with Sulfur Metabolism in Spontaneous Chinese Liquor Fermentation",
    articleUrl: "https://doi.org/10.1128/aem.01475-17",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "988107ef-ae49-47d0-be7f-300ca9451259::episteme::180",
    register: "episteme",
    sender: "kock",
    question: "When the inoculation level of Lactobacillus acidophilus is raised in Minas fresh cheese, what happens to the cheese's pH and sensory profile?",
    options: [
    { label: "pH drops and organic acid production rises, creating perceptible sensory differences.", correct: true },
    { label: "pH rises and the cheese becomes milder, improving palatability.", correct: false },
    { label: "pH remains stable while texture changes independently of bacterial activity.", correct: false },
    { label: "pH drops but sensory properties stay aligned with standard commercial cheese.", correct: false }
    ],
    correctIndex: 0,
    citation: "A.A. Gomes, S.P. Braga, Adriano G. Cruz, Rafael Silva Cadena, Pablo Christiano Barboza Lollo, Camila Lopes de Carvalho, Jaime Amaya‐Farfán, J.A.F. Faria, Helena María André Bolini. (2011). Effect of the inoculation level of Lactobacillus acidophilus in probiotic cheese on the physicochemical features and sensory performance compared with commercial cheeses. Journal of Dairy Science. https://doi.org/10.3168/jds.2011-4175",
    articleId: "988107ef-ae49-47d0-be7f-300ca9451259",
    articleTitle: "Effect of the inoculation level of Lactobacillus acidophilus in probiotic cheese on the physicochemical features and sensory performance compared with commercial cheeses",
    articleUrl: "https://doi.org/10.3168/jds.2011-4175",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "988107ef-ae49-47d0-be7f-300ca9451259::phronesis::181",
    register: "phronesis",
    sender: "kock",
    question: "You are building a health-focused dish around a probiotic fresh cheese. During tastings, you notice the cheese reads noticeably sourer than the standard version, and its appearance is slightly less appealing. You need to serve it at volume next week. How do you handle this?",
    options: [
    { label: "Reduce the probiotic inoculation level until the sourness disappears, accepting that the functional health claim may no longer hold at the original level." },
    { label: "Build the dish around flavor pairings — sweet or fatty elements — that counterbalance the acidity, and present the cheese in a way that frames its appearance as intentional rather than incidental." },
    { label: "Pull the dish from the menu until the cheese supplier resolves the acidity issue, since palatability and functionality cannot both be compromised." }
    ],
    citation: "A.A. Gomes, S.P. Braga, Adriano G. Cruz, Rafael Silva Cadena, Pablo Christiano Barboza Lollo, Camila Lopes de Carvalho, Jaime Amaya‐Farfán, J.A.F. Faria, Helena María André Bolini. (2011). Effect of the inoculation level of Lactobacillus acidophilus in probiotic cheese on the physicochemical features and sensory performance compared with commercial cheeses. Journal of Dairy Science. https://doi.org/10.3168/jds.2011-4175",
    articleId: "988107ef-ae49-47d0-be7f-300ca9451259",
    articleTitle: "Effect of the inoculation level of Lactobacillus acidophilus in probiotic cheese on the physicochemical features and sensory performance compared with commercial cheeses",
    articleUrl: "https://doi.org/10.3168/jds.2011-4175",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "024b6b4f-fce0-4d5a-9437-e12def32713a::episteme::182",
    register: "episteme",
    sender: "kock",
    question: "When testing four LAB–yeast combinations for injera production, which pairing and fermentation duration produced the most sensorially accepted result?",
    options: [
    { label: "L. plantarum with S. cerevisiae at 30 hours", correct: true },
    { label: "L. plantarum with S. cerevisiae at 48 hours", correct: false },
    { label: "L. fermentum with S. cerevisiae at 30 hours", correct: false },
    { label: "Traditional ersho culture at 30 hours", correct: false }
    ],
    correctIndex: 0,
    citation: "B.A. van de Walle, Takele Ayanaw, Estifanos Kassahun, Solomon Tibebu, Agimassie Agazie, Mesfin Wogayehu, Tadele Andargie, Degnet Teferi Asres, Abebaw Teshome, Sadik Jemal, Behailu Bisenebit Mossie, Daniel Berhane Maru, Bekalu Abiye Tade. (2025). Influence of mixed microbial starter cultures and fermentation duration on the quality and shelf life of Ethiopian Injera. Applied Food Research. https://doi.org/10.1016/j.afres.2025.101438",
    articleId: "024b6b4f-fce0-4d5a-9437-e12def32713a",
    articleTitle: "Influence of mixed microbial starter cultures and fermentation duration on the quality and shelf life of Ethiopian Injera",
    articleUrl: "https://doi.org/10.1016/j.afres.2025.101438",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "024b6b4f-fce0-4d5a-9437-e12def32713a::techne::183",
    register: "techne",
    sender: "kock",
    question: "You are setting up an injera fermentation using mixed microbial starter cultures. What inoculation rate and LAB-to-yeast ratio does the research support?",
    options: [
    { label: "5% (v/w, flour basis) at a 1:1 LAB-to-yeast volume ratio", correct: true },
    { label: "10% (v/w, flour basis) at a 2:1 LAB-to-yeast volume ratio", correct: false },
    { label: "5% (v/w, flour basis) at a 2:1 LAB-to-yeast volume ratio", correct: false },
    { label: "2% (v/w, flour basis) at a 1:1 LAB-to-yeast volume ratio", correct: false }
    ],
    correctIndex: 0,
    citation: "B.A. van de Walle, Takele Ayanaw, Estifanos Kassahun, Solomon Tibebu, Agimassie Agazie, Mesfin Wogayehu, Tadele Andargie, Degnet Teferi Asres, Abebaw Teshome, Sadik Jemal, Behailu Bisenebit Mossie, Daniel Berhane Maru, Bekalu Abiye Tade. (2025). Influence of mixed microbial starter cultures and fermentation duration on the quality and shelf life of Ethiopian Injera. Applied Food Research. https://doi.org/10.1016/j.afres.2025.101438",
    articleId: "024b6b4f-fce0-4d5a-9437-e12def32713a",
    articleTitle: "Influence of mixed microbial starter cultures and fermentation duration on the quality and shelf life of Ethiopian Injera",
    articleUrl: "https://doi.org/10.1016/j.afres.2025.101438",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "024b6b4f-fce0-4d5a-9437-e12def32713a::phronesis::184",
    register: "phronesis",
    sender: "kock",
    question: "You are moving injera production to a larger facility. The research points to a 30-hour fermentation window with specific starter culture pairings as the optimal approach. Your flour supplier has just changed, your tap water comes from a different source than the lab used, and your kitchen runs warmer than standard. How do you apply the study's findings without locking yourself into a schedule that may not fit your conditions?",
    options: [
    { label: "Adopt the 30-hour window and the culture pairings exactly as reported, since the study used controlled conditions that represent best practice regardless of facility differences." },
    { label: "Use the culture pairings as a starting hypothesis, build in your own sensory and pH checkpoints at intervals around the reported fermentation durations, and adjust the schedule once you have data from your specific flour, water, and temperature conditions." },
    { label: "Discard the study's fermentation durations entirely and rely on your existing house culture, since laboratory conditions are too removed from commercial production to be actionable." }
    ],
    citation: "B.A. van de Walle, Takele Ayanaw, Estifanos Kassahun, Solomon Tibebu, Agimassie Agazie, Mesfin Wogayehu, Tadele Andargie, Degnet Teferi Asres, Abebaw Teshome, Sadik Jemal, Behailu Bisenebit Mossie, Daniel Berhane Maru, Bekalu Abiye Tade. (2025). Influence of mixed microbial starter cultures and fermentation duration on the quality and shelf life of Ethiopian Injera. Applied Food Research. https://doi.org/10.1016/j.afres.2025.101438",
    articleId: "024b6b4f-fce0-4d5a-9437-e12def32713a",
    articleTitle: "Influence of mixed microbial starter cultures and fermentation duration on the quality and shelf life of Ethiopian Injera",
    articleUrl: "https://doi.org/10.1016/j.afres.2025.101438",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "6137895e-6c2b-470a-beab-de530087fe61::phronesis::185",
    register: "phronesis",
    sender: "kock",
    question: "You are preparing a demo on traditional Bengali cutting techniques for a culinary workshop. A colleague suggests referencing Chitrita Banerji's article on the bonti as a primary source for the technical protocol you will teach. How do you proceed?",
    options: [
    { label: "Use the article's title and source as sufficient grounding — the topic is clearly the bonti, so the key technical points can be inferred and presented with confidence." },
    { label: "Retrieve and read the full article before drawing any claims about the bonti into your instruction, since the metadata alone tells you the topic but not the argument." },
    { label: "Treat the qualitative study type as confirmation that the article contains practitioner-relevant technique descriptions, and build your demo around that assumption." }
    ],
    citation: "Chitrita Banerji. (2001). The Bengali Bonti. Gastronomica The Journal of Food and Culture. https://doi.org/10.1525/gfc.2001.1.2.23",
    articleId: "6137895e-6c2b-470a-beab-de530087fe61",
    articleTitle: "The Bengali Bonti",
    articleUrl: "https://doi.org/10.1525/gfc.2001.1.2.23",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "8b853109-4d06-4e64-a999-8fe1fdab47c9::phronesis::186",
    register: "phronesis",
    sender: "kock",
    question: "You are troubleshooting an unexpected flavor outcome in a dish that uses sake as a key ingredient. A colleague cites a study titled 'Why...the taste of sake?' as the basis for adjusting your technique, but neither of you has access to the actual findings — only the title. How do you proceed?",
    options: [
    { label: "Accept the adjustment, since the title alone signals the study addresses flavor causation directly and that is sufficient grounds for a kitchen decision." },
    { label: "Pause the adjustment and acknowledge that acting on a title without findings risks misattributing the cause of the flavor problem, then seek the actual content before changing technique." },
    { label: "Discard the reference entirely, since any study you cannot read in full has no value in a practical kitchen context." }
    ],
    citation: "John Kochevar. (2001). Why...the taste of sake?. Gastronomica The Journal of Food and Culture. https://doi.org/10.1525/gfc.2001.1.3.96",
    articleId: "8b853109-4d06-4e64-a999-8fe1fdab47c9",
    articleTitle: "Why...the taste of sake?",
    articleUrl: "https://doi.org/10.1525/gfc.2001.1.3.96",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "7a5b1c36-2b6f-457b-b7f4-8c56a202d5f0::episteme::187",
    register: "episteme",
    sender: "kock",
    question: "A colleague argues that any monofloral honey can substitute for another in a dish because the aromatic differences are mostly symbolic. What does the chemistry of honey volatiles actually tell us?",
    options: [
    { label: "Different monofloral honeys share essentially the same VOC fingerprint, so the distinction is mainly marketing.", correct: false },
    { label: "The volatile compounds in honey span distinct chemical classes — terpenes, aldehydes, ketones, furans, and norisoprenoids — each with different origins and contributions, making monofloral honeys functionally distinct, not interchangeable.", correct: true },
    { label: "Honey aroma is determined solely by floral plant material, so honeys from the same plant genus are always equivalent.", correct: false },
    { label: "Thermal processing during production eliminates most aromatic differences between monofloral honeys, levelling out their VOC profiles.", correct: false }
    ],
    correctIndex: 1,
    citation: "Christy E. Manyi-Loh, Roland N. Ndip, Anna Clarke. (2011). Volatile Compounds in Honey: A Review on Their Involvement in Aroma, Botanical Origin Determination and Potential Biomedical Activities. International Journal of Molecular Sciences. https://doi.org/10.3390/ijms12129514",
    articleId: "7a5b1c36-2b6f-457b-b7f4-8c56a202d5f0",
    articleTitle: "Volatile Compounds in Honey: A Review on Their Involvement in Aroma, Botanical Origin Determination and Potential Biomedical Activities",
    articleUrl: "https://doi.org/10.3390/ijms12129514",
    topic: "sensory_evaluation",
    needsRetag: false
  },
  {
    id: "7a5b1c36-2b6f-457b-b7f4-8c56a202d5f0::phronesis::188",
    register: "phronesis",
    sender: "kock",
    question: "You need a honey with a distinct citrus aroma for a dessert course. Two suppliers send samples with identical botanical labels — both listed as orange blossom. You know from the literature that different researchers have identified different floral markers for the same botanical origin, so the label alone won't tell you which honey actually carries the citrus register your dish needs. How do you make the final call?",
    options: [
    { label: "Trust the label and select the honey from the supplier with longer market presence, on the assumption that their sourcing is more consistent." },
    { label: "Smell both samples and choose the one whose aromatic profile — citrus, floral, almond, or another identifiable descriptor — matches the register your dish requires, treating that sensory judgment as the decisive evidence." },
    { label: "Request laboratory volatile compound analysis from both suppliers before committing, since botanical labels and sensory impressions are both unreliable without chemical confirmation." }
    ],
    citation: "Christy E. Manyi-Loh, Roland N. Ndip, Anna Clarke. (2011). Volatile Compounds in Honey: A Review on Their Involvement in Aroma, Botanical Origin Determination and Potential Biomedical Activities. International Journal of Molecular Sciences. https://doi.org/10.3390/ijms12129514",
    articleId: "7a5b1c36-2b6f-457b-b7f4-8c56a202d5f0",
    articleTitle: "Volatile Compounds in Honey: A Review on Their Involvement in Aroma, Botanical Origin Determination and Potential Biomedical Activities",
    articleUrl: "https://doi.org/10.3390/ijms12129514",
    topic: "sensory_evaluation",
    needsRetag: false
  },
  {
    id: "6c010c0b-b031-4e76-83e9-011c2bbc85bd::phronesis::189",
    register: "phronesis",
    sender: "kock",
    question: "You are tasting a tannic red wine before service and notice the astringency feels coarse and drying in a way that seems structural — not just intense. You have time before the first cover to either fine the wine or continue macerating the grape-based reduction you are pairing it with. Which factor should drive your decision?",
    options: [
    { label: "Prioritise reducing the overall tannin level in whichever preparation has more, since lower tannin always means lower astringency at the table." },
    { label: "Identify which specific character of the astringency is problematic, then choose the intervention — fining the wine or adjusting maceration — that addresses that structural quality rather than simply cutting tannin broadly." },
    { label: "Extend maceration on the grape preparation first, because increasing tannin extraction will balance the wine's astringency through contrast at the table." }
    ],
    citation: "Jacqui M. McRae, James A. Kennedy. (2011). Wine and Grape Tannin Interactions with Salivary Proteins and Their Impact on Astringency: A Review of Current Research. Molecules. https://doi.org/10.3390/molecules16032348",
    articleId: "6c010c0b-b031-4e76-83e9-011c2bbc85bd",
    articleTitle: "Wine and Grape Tannin Interactions with Salivary Proteins and Their Impact on Astringency: A Review of Current Research",
    articleUrl: "https://doi.org/10.3390/molecules16032348",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "51d7101f-95f0-4c5b-8c09-55a0282daf5f::episteme::190",
    register: "episteme",
    sender: "kock",
    question: "When a soy-sauce-glazed salmon dish is reformatted into progressively softer textures — from chopped pieces to a steamed paste — what happens to its flavor profile?",
    options: [
    { label: "The dish retains its soy sauce aroma because the flavoring compounds are bound to the protein structure.", correct: false },
    { label: "The modification process systematically strips the dish of its characteristic soy sauce aroma, altering the volatile aromatic profile.", correct: true },
    { label: "Only the texture changes; the aromatic compounds responsible for consumer preference remain intact.", correct: false },
    { label: "The steaming step in the reformatting process adds new volatile compounds that compensate for any aroma loss.", correct: false }
    ],
    correctIndex: 1,
    citation: "真里子 真部, 育子 河本, 直子 柴田, 麻衣子 浦井, 林, 千沙都, 廣江, 慧子, 絢子 三好, Mariko Manabe, Ikuko Kawamoto, Naoko SHIBATA, Maiko URAI, Chisato Hayashi, Satoko Hiroe, Ayako Miyoshi. (2012). 咀嚼障害に適する食形態への展開が風味に及ぼす影響. Institutional Repositories DataBase (IRDB). https://doi.org/10.15020/00000564",
    articleId: "51d7101f-95f0-4c5b-8c09-55a0282daf5f",
    articleTitle: "咀嚼障害に適する食形態への展開が風味に及ぼす影響",
    articleUrl: "https://doi.org/10.15020/00000564",
    topic: "sensory_evaluation",
    needsRetag: false
  },
  {
    id: "51d7101f-95f0-4c5b-8c09-55a0282daf5f::phronesis::191",
    register: "phronesis",
    sender: "kock",
    question: "You have just plated the steamed salmon paste for an eldercare service. It passes the swallowing safety check, but it tastes noticeably flat compared to the chopped format. Your sous chef suggests adding more soy sauce and a dash of MSG to compensate. What is the most defensible next move?",
    options: [
    { label: "Increase soy sauce and add MSG immediately — the flatness is a seasoning deficit and the fastest fix addresses guest experience now." },
    { label: "Hold on the salt and umami additions; the flatness is more likely a loss of volatile soy sauce aroma in the paste process, so treat aroma recovery as the primary technical problem to solve first." },
    { label: "Switch the dish format back to chopped for all residents, since the paste format is inherently unsuitable for delivering full flavour regardless of further adjustment." }
    ],
    citation: "真里子 真部, 育子 河本, 直子 柴田, 麻衣子 浦井, 林, 千沙都, 廣江, 慧子, 絢子 三好, Mariko Manabe, Ikuko Kawamoto, Naoko SHIBATA, Maiko URAI, Chisato Hayashi, Satoko Hiroe, Ayako Miyoshi. (2012). 咀嚼障害に適する食形態への展開が風味に及ぼす影響. Institutional Repositories DataBase (IRDB). https://doi.org/10.15020/00000564",
    articleId: "51d7101f-95f0-4c5b-8c09-55a0282daf5f",
    articleTitle: "咀嚼障害に適する食形態への展開が風味に及ぼす影響",
    articleUrl: "https://doi.org/10.15020/00000564",
    topic: "sensory_evaluation",
    needsRetag: false
  },
  {
    id: "02873e59-46fe-4cdf-a67c-d7025180c3d0::episteme::192",
    register: "episteme",
    sender: "kock",
    question: "When Hanseniaspora uvarum ferments cider on its own, what is the characteristic profile of the result?",
    options: [
    { label: "High alcohol content with low ester levels", correct: false },
    { label: "Low alcohol content with high ester content", correct: true },
    { label: "Moderate alcohol content with the highest total volatile concentrations", correct: false },
    { label: "Low alcohol content with minimal volatile compounds", correct: false }
    ],
    correctIndex: 1,
    citation: "Isabela Maria Macedo Simon Sola, Larissa Deckij Evers, José Pedro Wojeicchowski, Tatiane Martins de Assis, Marina Tolentino Marinho, Ivo Mottin Demiate, Aline Alberti, Alessandro Nogueira. (2024). Impact of Pure, Co-, and Sequential Fermentations with Hanseniaspora sp. and Saccharomyces cerevisiae on the Volatile Compounds of Ciders. Fermentation. https://doi.org/10.3390/fermentation10040177",
    articleId: "02873e59-46fe-4cdf-a67c-d7025180c3d0",
    articleTitle: "Impact of Pure, Co-, and Sequential Fermentations with Hanseniaspora sp. and Saccharomyces cerevisiae on the Volatile Compounds of Ciders",
    articleUrl: "https://doi.org/10.3390/fermentation10040177",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "02873e59-46fe-4cdf-a67c-d7025180c3d0::phronesis::193",
    register: "phronesis",
    sender: "kock",
    question: "You are building a low-alcohol tasting menu and want a cider course with a fruity, aromatic character. Research suggests pure H. uvarum fermentation tends to produce high esters and low alcohol, but no step-by-step protocol is available to you yet. A supplier offers you a co-fermentation blend with S. cerevisiae, arguing it is more reliable and gives a balanced profile. Your cellar partner suggests running your own pilot trials with pure H. uvarum first. A third voice says to skip cider entirely and use a low-intervention pét-nat instead. What is the most defensible next move?",
    options: [
    { label: "Accept the co-fermentation blend from the supplier because reliability matters more than profile precision at this stage." },
    { label: "Use pure H. uvarum as a directional hypothesis and run your own pilot trials before committing to the pairing." },
    { label: "Replace the cider course with a pét-nat to avoid the uncertainty of non-conventional fermentation entirely." }
    ],
    citation: "Isabela Maria Macedo Simon Sola, Larissa Deckij Evers, José Pedro Wojeicchowski, Tatiane Martins de Assis, Marina Tolentino Marinho, Ivo Mottin Demiate, Aline Alberti, Alessandro Nogueira. (2024). Impact of Pure, Co-, and Sequential Fermentations with Hanseniaspora sp. and Saccharomyces cerevisiae on the Volatile Compounds of Ciders. Fermentation. https://doi.org/10.3390/fermentation10040177",
    articleId: "02873e59-46fe-4cdf-a67c-d7025180c3d0",
    articleTitle: "Impact of Pure, Co-, and Sequential Fermentations with Hanseniaspora sp. and Saccharomyces cerevisiae on the Volatile Compounds of Ciders",
    articleUrl: "https://doi.org/10.3390/fermentation10040177",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "028aa5c9-cf1b-4bd1-a858-f88dd25bf86d::episteme::194",
    register: "episteme",
    sender: "värd",
    question: "A guest already enjoys the dish you have plated. According to research on wine–food pairing perception, how does that prior liking affect their judgment of how well the wine pairs with it?",
    options: [
    { label: "It has no measurable effect — pairing perception is driven solely by the wine's characteristics.", correct: false },
    { label: "It directly and positively relates to how well they perceive the pairing to work.", correct: true },
    { label: "It negatively influences pairing perception because high food enjoyment raises contrast expectations.", correct: false },
    { label: "It only matters when the guest has prior wine knowledge.", correct: false }
    ],
    correctIndex: 1,
    citation: "Harrington, R. J., & Seo, H.-S. (2015). The Impact of Liking of Wine and Food Items on Perceptions of Wine–Food Pairing. Journal of Foodservice Business Research. https://doi.org/10.1080/15378020.2015.1093455",
    articleId: "028aa5c9-cf1b-4bd1-a858-f88dd25bf86d",
    articleTitle: "The Impact of Liking of Wine and Food Items on Perceptions of Wine–Food Pairing",
    articleUrl: "https://doi.org/10.1080/15378020.2015.1093455",
    topic: "food_psychology",
    needsRetag: false
  },
  {
    id: "028aa5c9-cf1b-4bd1-a858-f88dd25bf86d::phronesis::195",
    register: "phronesis",
    sender: "värd",
    question: "You are finalizing a tasting menu and the sommelier has selected a wine pairing for one of your courses. During a staff tasting, the dish itself receives mixed feedback — guests find it underwhelming on its own — but the wine and food together seem to work reasonably well. Service starts in two hours. What do you do?",
    options: [
    { label: "Keep the dish as is and trust the wine pairing to carry the course — the combination is what matters on a tasting menu, not the dish in isolation." },
    { label: "Rework the dish so it holds up on its own merits, even if that risks disrupting the wine pairing you have already built around it." },
    { label: "Pull the course entirely and replace it with a safe dish that has an established pairing, rather than risk either element underperforming." }
    ],
    citation: "Harrington, R. J., & Seo, H.-S. (2015). The Impact of Liking of Wine and Food Items on Perceptions of Wine–Food Pairing. Journal of Foodservice Business Research. https://doi.org/10.1080/15378020.2015.1093455",
    articleId: "028aa5c9-cf1b-4bd1-a858-f88dd25bf86d",
    articleTitle: "The Impact of Liking of Wine and Food Items on Perceptions of Wine–Food Pairing",
    articleUrl: "https://doi.org/10.1080/15378020.2015.1093455",
    topic: "food_psychology",
    needsRetag: false
  },
  {
    id: "f5b97396-02be-4f71-a8cd-d8755ab374da::phronesis::196",
    register: "phronesis",
    sender: "kock",
    question: "A colleague hands you a citation — Greg Patent's piece on Boston Cream Pie from Gastronomica — and suggests using it to settle a debate about the correct preparation method for the dish. You have only the title and journal name in front of you. What is the most defensible next step before committing to any kitchen or menu decision based on this source?",
    options: [
    { label: "Treat the source as authoritative because Gastronomica is a peer-reviewed journal and the title directly names the dish." },
    { label: "Set the source aside entirely, since a cultural journal cannot contribute anything useful to a kitchen context." },
    { label: "Locate and read the full article before citing it as authority, given that the journal signals a cultural or gastronomic angle rather than a technical recipe paper." }
    ],
    citation: "Greg Patent. (2001). Boston Cream Pie. Gastronomica The Journal of Food and Culture. https://doi.org/10.1525/gfc.2001.1.4.82",
    articleId: "f5b97396-02be-4f71-a8cd-d8755ab374da",
    articleTitle: "Boston Cream Pie",
    articleUrl: "https://doi.org/10.1525/gfc.2001.1.4.82",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "e1c9efe9-f9ea-42bb-bf6b-0ea7d7127a36::episteme::197",
    register: "episteme",
    sender: "kock",
    question: "In dry red wine, which compound is identified as a source of off-note perception due to acetic acid bacteria activity or excessive volatile acidity during fermentation?",
    options: [
    { label: "Acetates", correct: false },
    { label: "Esters", correct: false },
    { label: "Acetic acid", correct: true },
    { label: "Octanoic acid", correct: false }
    ],
    correctIndex: 2,
    citation: "Luísa Costa de Oliveira, Maria Eugênia de Oliveira Mamede. (2012). Sensory profile and contribution of major components of aroma in dry red wine quality. Vértices. https://doi.org/10.5935/1809-2667.20120040",
    articleId: "e1c9efe9-f9ea-42bb-bf6b-0ea7d7127a36",
    articleTitle: "Sensory profile and contribution of major components of aroma in dry red wine quality",
    articleUrl: "https://doi.org/10.5935/1809-2667.20120040",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "e1c9efe9-f9ea-42bb-bf6b-0ea7d7127a36::techne::198",
    register: "techne",
    sender: "kock",
    question: "You are reducing a red wine for a braise and notice a sharp vinegary smell coming off the pan. According to current understanding of red wine aroma compounds, what does that perception signal about how this wine will behave in the reduction?",
    options: [
    { label: "It signals elevated acetic acid load, which can alter how the wine behaves in reductions or braises.", correct: true },
    { label: "It signals high tannin concentration, which will soften and integrate during the reduction.", correct: false },
    { label: "It signals residual sugar, which will caramelise and balance the acidity over heat.", correct: false },
    { label: "It signals low alcohol content, meaning the wine will reduce more slowly than expected.", correct: false }
    ],
    correctIndex: 0,
    citation: "Luísa Costa de Oliveira, Maria Eugênia de Oliveira Mamede. (2012). Sensory profile and contribution of major components of aroma in dry red wine quality. Vértices. https://doi.org/10.5935/1809-2667.20120040",
    articleId: "e1c9efe9-f9ea-42bb-bf6b-0ea7d7127a36",
    articleTitle: "Sensory profile and contribution of major components of aroma in dry red wine quality",
    articleUrl: "https://doi.org/10.5935/1809-2667.20120040",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "e1c9efe9-f9ea-42bb-bf6b-0ea7d7127a36::phronesis::199",
    register: "phronesis",
    sender: "kock",
    question: "You are about to reduce a dry red wine for a pan sauce. On opening the bottle, you catch a faint vinegary note. You have one bottle left and service starts in twenty minutes. What drives your decision about whether to use it?",
    options: [
    { label: "Proceed — the vinegar note will cook off during reduction and will not affect the final sauce." },
    { label: "Set it aside — acetic and octanoic acid compounds linked to that vinegary perception will concentrate under heat, not dissipate." },
    { label: "Taste the sauce at each stage and adjust with acid or sugar to mask whatever remains." }
    ],
    citation: "Luísa Costa de Oliveira, Maria Eugênia de Oliveira Mamede. (2012). Sensory profile and contribution of major components of aroma in dry red wine quality. Vértices. https://doi.org/10.5935/1809-2667.20120040",
    articleId: "e1c9efe9-f9ea-42bb-bf6b-0ea7d7127a36",
    articleTitle: "Sensory profile and contribution of major components of aroma in dry red wine quality",
    articleUrl: "https://doi.org/10.5935/1809-2667.20120040",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "00413f23-990c-4486-a831-3e02754de3d1::episteme::200",
    register: "episteme",
    sender: "kock",
    question: "A colleague argues that traditional cooking in water at 95 °C produces results equal to sous vide for beef tenderness, as long as the same internal endpoint temperature is reached. What does the research say?",
    options: [
    { label: "Sous vide at 65 °C for 2 hours produces significantly better tenderness and palatability than traditional cooking in water at 95 °C to the same internal endpoint temperature.", correct: true },
    { label: "Traditional cooking at 95 °C produces significantly better tenderness than sous vide when both methods reach the same internal endpoint temperature.", correct: false },
    { label: "Both methods produce equivalent tenderness, and the difference in sensory quality is determined solely by muscle type.", correct: false },
    { label: "Sous vide produces better tenderness only when applied to longissimus thoracis, not semitendinosus.", correct: false }
    ],
    correctIndex: 0,
    citation: "Marian Gil, M. Rudy, Renata Stanisławczyk, Paulina Duma‐Kocan. (2022). Effect of Traditional Cooking and Sous Vide Heat Treatment, Cold Storage Time and Muscle on Physicochemical and Sensory Properties of Beef Meat. Molecules. https://doi.org/10.3390/molecules27217307",
    articleId: "00413f23-990c-4486-a831-3e02754de3d1",
    articleTitle: "Effect of Traditional Cooking and Sous Vide Heat Treatment, Cold Storage Time and Muscle on Physicochemical and Sensory Properties of Beef Meat",
    articleUrl: "https://doi.org/10.3390/molecules27217307",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "00413f23-990c-4486-a831-3e02754de3d1::techne::201",
    register: "techne",
    sender: "kock",
    question: "You're planning a sous vide service for beef. The article supports one specific short-duration protocol with positive sensory results. What are the correct parameters?",
    options: [
    { label: "60 °C for 4 hours", correct: false },
    { label: "65 °C for 2 hours", correct: true },
    { label: "70 °C for 1 hour", correct: false },
    { label: "65 °C for 4 hours", correct: false }
    ],
    correctIndex: 1,
    citation: "Marian Gil, M. Rudy, Renata Stanisławczyk, Paulina Duma‐Kocan. (2022). Effect of Traditional Cooking and Sous Vide Heat Treatment, Cold Storage Time and Muscle on Physicochemical and Sensory Properties of Beef Meat. Molecules. https://doi.org/10.3390/molecules27217307",
    articleId: "00413f23-990c-4486-a831-3e02754de3d1",
    articleTitle: "Effect of Traditional Cooking and Sous Vide Heat Treatment, Cold Storage Time and Muscle on Physicochemical and Sensory Properties of Beef Meat",
    articleUrl: "https://doi.org/10.3390/molecules27217307",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "00413f23-990c-4486-a831-3e02754de3d1::phronesis::202",
    register: "phronesis",
    sender: "kock",
    question: "You are presenting a beef menu proposal to your restaurant owner, who is skeptical about the cost of sous vide equipment and the extra labor involved. The study you read shows sensory improvements even with a 2-hour sous vide cook, but also flags that results differ by muscle cut and that storage timing affects outcomes. How do you frame the investment case honestly without overpromising?",
    options: [
    { label: "Cite the sensory gains from the 2-hour cook as a clear justification for the equipment, while being upfront that you will need to validate each specific cut and manage storage windows carefully before committing the full menu." },
    { label: "Argue that the sous vide results are universally superior across all cuts and storage times, so the equipment cost is straightforwardly justified for every beef dish on the menu." },
    { label: "Recommend abandoning the sous vide proposal entirely because the findings are too muscle-specific and storage-dependent to produce reliable results in a busy service environment." }
    ],
    citation: "Marian Gil, M. Rudy, Renata Stanisławczyk, Paulina Duma‐Kocan. (2022). Effect of Traditional Cooking and Sous Vide Heat Treatment, Cold Storage Time and Muscle on Physicochemical and Sensory Properties of Beef Meat. Molecules. https://doi.org/10.3390/molecules27217307",
    articleId: "00413f23-990c-4486-a831-3e02754de3d1",
    articleTitle: "Effect of Traditional Cooking and Sous Vide Heat Treatment, Cold Storage Time and Muscle on Physicochemical and Sensory Properties of Beef Meat",
    articleUrl: "https://doi.org/10.3390/molecules27217307",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "ed42b5d1-fe34-4b67-ae1b-e216f2fd5e8c::episteme::203",
    register: "episteme",
    sender: "kock",
    question: "When certified experts conduct descriptive sensory analysis using a codified system like DLG, what does the article identify as equally important as the sharpness of their palate?",
    options: [
    { label: "The number of assessors participating in the panel", correct: false },
    { label: "The precision of the assessor's mental model of quality", correct: true },
    { label: "The speed at which samples are evaluated", correct: false },
    { label: "The physical environment where tasting takes place", correct: false }
    ],
    correctIndex: 1,
    citation: "G. Hildebrandt, Jörg Jacob, Britta Loewe-Stanienda, Jörg Oehlenschläger, Bianca Schneider-Häder. (2012). Descriptive sensory analysis with integrated quality rating as a tool for quality testing of commercial food products. Archiv für Lebensmittelhygiene. https://doi.org/10.31083/0003-925x-63-155",
    articleId: "ed42b5d1-fe34-4b67-ae1b-e216f2fd5e8c",
    articleTitle: "Descriptive sensory analysis with integrated quality rating as a tool for quality testing of commercial food products",
    articleUrl: "https://doi.org/10.31083/0003-925x-63-155",
    topic: "sensory_evaluation",
    needsRetag: false
  },
  {
    id: "ed42b5d1-fe34-4b67-ae1b-e216f2fd5e8c::phronesis::204",
    register: "phronesis",
    sender: "kock",
    question: "You and your sous chef are tasting a batch of house-made pâté before service. You pass it; they flag it as below standard. You've both evaluated the same product under the same conditions. How do you move forward?",
    options: [
    { label: "Ask your sous chef to articulate exactly what benchmark they're comparing the pâté against, then do the same yourself, before returning to the product." },
    { label: "Cast the deciding vote as the senior chef and release the batch, noting the disagreement in the log." },
    { label: "Pull a second sample from the batch and taste it independently a second time to see if either of you changes position." }
    ],
    citation: "G. Hildebrandt, Jörg Jacob, Britta Loewe-Stanienda, Jörg Oehlenschläger, Bianca Schneider-Häder. (2012). Descriptive sensory analysis with integrated quality rating as a tool for quality testing of commercial food products. Archiv für Lebensmittelhygiene. https://doi.org/10.31083/0003-925x-63-155",
    articleId: "ed42b5d1-fe34-4b67-ae1b-e216f2fd5e8c",
    articleTitle: "Descriptive sensory analysis with integrated quality rating as a tool for quality testing of commercial food products",
    articleUrl: "https://doi.org/10.31083/0003-925x-63-155",
    topic: "sensory_evaluation",
    needsRetag: false
  },
  {
    id: "34bb1b5b-2da0-471a-aad9-057a74fde254::episteme::205",
    register: "episteme",
    sender: "värd",
    question: "In the hipster café segment, how is a kitchen's output evaluated by young food tourists?",
    options: [
    { label: "On its own merits, independent of the café's broader cultural positioning", correct: false },
    { label: "As an expression of a counter-mainstream cultural identity that visitors actively seek out", correct: true },
    { label: "Primarily against mainstream fine-dining benchmarks and classical technique", correct: false },
    { label: "According to price-to-portion ratios typical of the local market", correct: false }
    ],
    correctIndex: 1,
    citation: "Mohd Faizal Md Saleh, Norhazliza Halim, An-Nisa’ Mohd Farid. (2021). FOOD TOURISM MOTIVATION AND CUSTOMER SATISFACTION ON HIPSTER CAFÉ IN JOHOR BAHRU, MALAYSIA. Journal of Tourism Hospitality and Environment Management. https://doi.org/10.35631/jthem.626013",
    articleId: "34bb1b5b-2da0-471a-aad9-057a74fde254",
    articleTitle: "FOOD TOURISM MOTIVATION AND CUSTOMER SATISFACTION ON HIPSTER CAFÉ IN JOHOR BAHRU, MALAYSIA",
    articleUrl: "https://doi.org/10.35631/jthem.626013",
    topic: "hospitality",
    needsRetag: false
  },
  {
    id: "34bb1b5b-2da0-471a-aad9-057a74fde254::phronesis::206",
    register: "phronesis",
    sender: "värd",
    question: "A guest at your hipster café orders a dish you know well. You can execute it perfectly with your standard technique — clean, consistent, reliable. But it will read as a dish from any competent kitchen. Service is busy and taking a creative risk means slower output. What do you do?",
    options: [
    { label: "Execute the standard version. Technical competence is the baseline expectation everywhere, and consistency under pressure protects the guest experience." },
    { label: "Adapt the dish to reflect something distinctly tied to this place, even if it slows the pass slightly — the guest's motivation for being here is ideological, and a generic result undermines that more sharply than it would in another context." },
    { label: "Flag the dish to front-of-house and let the waiter manage expectations with the guest, keeping the kitchen on schedule while acknowledging the tradeoff openly." }
    ],
    citation: "Mohd Faizal Md Saleh, Norhazliza Halim, An-Nisa’ Mohd Farid. (2021). FOOD TOURISM MOTIVATION AND CUSTOMER SATISFACTION ON HIPSTER CAFÉ IN JOHOR BAHRU, MALAYSIA. Journal of Tourism Hospitality and Environment Management. https://doi.org/10.35631/jthem.626013",
    articleId: "34bb1b5b-2da0-471a-aad9-057a74fde254",
    articleTitle: "FOOD TOURISM MOTIVATION AND CUSTOMER SATISFACTION ON HIPSTER CAFÉ IN JOHOR BAHRU, MALAYSIA",
    articleUrl: "https://doi.org/10.35631/jthem.626013",
    topic: "hospitality",
    needsRetag: false
  },
  {
    id: "02a1af57-6b23-4d53-aa55-5f60058dfbf1::episteme::207",
    register: "episteme",
    sender: "kock",
    question: "When animal fat in salchichón is replaced with textured seed oils, which structural attribute is most notably compromised?",
    options: [
    { label: "Color", correct: false },
    { label: "Cohesiveness", correct: true },
    { label: "Hardness", correct: false },
    { label: "Protein content", correct: false }
    ],
    correctIndex: 1,
    citation: "Laura Tarjuelo, Adrián Rabadán, Manuel Álvarez‐Ortí, Arturo Pardo‐Giménez, José Emilio Pardo González. (2023). Analysis of Nutritional Characteristics and Willingness to Pay of Consumers for Dry-Cured Sausages (Salchichón) Made with Textured Seed Oils. Foods. https://doi.org/10.3390/foods12163118",
    articleId: "02a1af57-6b23-4d53-aa55-5f60058dfbf1",
    articleTitle: "Analysis of Nutritional Characteristics and Willingness to Pay of Consumers for Dry-Cured Sausages (Salchichón) Made with Textured Seed Oils",
    articleUrl: "https://doi.org/10.3390/foods12163118",
    topic: "nutritional_science",
    needsRetag: false
  },
  {
    id: "02a1af57-6b23-4d53-aa55-5f60058dfbf1::techne::208",
    register: "techne",
    sender: "kock",
    question: "You are developing a salchichón recipe that substitutes animal fat with textured seed oil. During quality checks, which textural property demands the closest monitoring against your reference standard?",
    options: [
    { label: "Hardness", correct: false },
    { label: "Cohesiveness", correct: true },
    { label: "Springiness", correct: false },
    { label: "Adhesiveness", correct: false }
    ],
    correctIndex: 1,
    citation: "Laura Tarjuelo, Adrián Rabadán, Manuel Álvarez‐Ortí, Arturo Pardo‐Giménez, José Emilio Pardo González. (2023). Analysis of Nutritional Characteristics and Willingness to Pay of Consumers for Dry-Cured Sausages (Salchichón) Made with Textured Seed Oils. Foods. https://doi.org/10.3390/foods12163118",
    articleId: "02a1af57-6b23-4d53-aa55-5f60058dfbf1",
    articleTitle: "Analysis of Nutritional Characteristics and Willingness to Pay of Consumers for Dry-Cured Sausages (Salchichón) Made with Textured Seed Oils",
    articleUrl: "https://doi.org/10.3390/foods12163118",
    topic: "nutritional_science",
    needsRetag: false
  },
  {
    id: "02a1af57-6b23-4d53-aa55-5f60058dfbf1::phronesis::209",
    register: "phronesis",
    sender: "kock",
    question: "You are scaling a new batch of salchichón reformulated with textured seed oils for your charcuterie board. Sensory data shows that pushing inclusion levels higher improves the nutritional profile but pulls down scores for color, cohesiveness, and flavor — even as overall acceptability remains stable. Your guests skew toward health-conscious diners who also have strong opinions about texture and appearance. How do you decide where to set the inclusion level for this production run?",
    options: [
    { label: "Maximize the seed oil inclusion to achieve the strongest nutritional claim, accepting that sensory scores will drop, since overall acceptability data shows guests will tolerate it." },
    { label: "Find the inclusion level where the nutritional gain is meaningful but the sensory compromise — particularly in color, cohesiveness, and flavor — stays within what your specific customer base will absorb, rather than defaulting to the highest or lowest tested level." },
    { label: "Keep inclusion at the minimum tested level to protect sensory scores entirely, treating any nutritional improvement as secondary to consistency with your existing product." }
    ],
    citation: "Laura Tarjuelo, Adrián Rabadán, Manuel Álvarez‐Ortí, Arturo Pardo‐Giménez, José Emilio Pardo González. (2023). Analysis of Nutritional Characteristics and Willingness to Pay of Consumers for Dry-Cured Sausages (Salchichón) Made with Textured Seed Oils. Foods. https://doi.org/10.3390/foods12163118",
    articleId: "02a1af57-6b23-4d53-aa55-5f60058dfbf1",
    articleTitle: "Analysis of Nutritional Characteristics and Willingness to Pay of Consumers for Dry-Cured Sausages (Salchichón) Made with Textured Seed Oils",
    articleUrl: "https://doi.org/10.3390/foods12163118",
    topic: "nutritional_science",
    needsRetag: false
  },
  {
    id: "02b4f25f-c2cb-49b9-b2ab-967173226033::episteme::210",
    register: "episteme",
    sender: "kock",
    question: "When fermenting Italian table olives, which factor causes greater inhibition of Lactobacillus plantarum over extended time — salt or p-coumaric acid?",
    options: [
    { label: "Salt, because it is the primary antimicrobial agent in olive fermentation", correct: false },
    { label: "p-Coumaric acid, a secondary phenol naturally present in olives", correct: true },
    { label: "Both exert equal inhibition over extended time", correct: false },
    { label: "Neither; Lactobacillus plantarum is fully resistant to both", correct: false }
    ],
    correctIndex: 1,
    citation: "Barbara Speranza, Angela Racioppo, Milena Sinigaglia, Maria Rosaria Corbo, Antonio Bevilacqua. (2015). Use of central composite design in food microbiology: a case study on the effects of secondary phenols on lactic acid bacteria from olives.. International journal of food sciences and nutrition. https://doi.org/10.3109/09637486.2015.1064866",
    articleId: "02b4f25f-c2cb-49b9-b2ab-967173226033",
    articleTitle: "Use of central composite design in food microbiology: a case study on the effects of secondary phenols on lactic acid bacteria from olives.",
    articleUrl: "https://doi.org/10.3109/09637486.2015.1064866",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "02b4f25f-c2cb-49b9-b2ab-967173226033::phronesis::211",
    register: "phronesis",
    sender: "kock",
    question: "You are three weeks into fermenting a batch of table olives. The brine salinity is correct, the temperature is stable, but the pH is barely moving — acidification has stalled. A colleague suggests the problem is the starter culture; another points to the salt concentration. You have been reading research suggesting that the olive variety itself, specifically its p-coumaric acid content, may be inhibiting your lactic acid bacteria. How do you weigh these competing explanations before deciding what to adjust?",
    options: [
    { label: "Assume the starter culture is the primary variable, replace it with a more robust strain, and monitor for the next week before reconsidering the olive variety's chemistry." },
    { label: "Treat the fruit's own phenolic profile — particularly p-coumaric acid — as a probable inhibitory factor and investigate whether switching to a lower-phenol olive variety or pre-treating the olives to reduce phenolic load is feasible, alongside checking the starter culture." },
    { label: "Raise the brine salinity slightly to suppress competing spoilage organisms and give the lactic acid bacteria a more selective environment, treating the phenolic question as secondary until fermentation shows no response." }
    ],
    citation: "Barbara Speranza, Angela Racioppo, Milena Sinigaglia, Maria Rosaria Corbo, Antonio Bevilacqua. (2015). Use of central composite design in food microbiology: a case study on the effects of secondary phenols on lactic acid bacteria from olives.. International journal of food sciences and nutrition. https://doi.org/10.3109/09637486.2015.1064866",
    articleId: "02b4f25f-c2cb-49b9-b2ab-967173226033",
    articleTitle: "Use of central composite design in food microbiology: a case study on the effects of secondary phenols on lactic acid bacteria from olives.",
    articleUrl: "https://doi.org/10.3109/09637486.2015.1064866",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "634ac110-c6e8-409f-b7e0-2f67d532b7de::phronesis::212",
    register: "phronesis",
    sender: "kock",
    question: "A supplier brings in an unfamiliar ingredient. Your team refuses it on the spot — the smell alone is enough for them. You suspect their reaction may be inherited habit rather than grounded judgment. How do you proceed?",
    options: [
    { label: "Side with the team immediately: if the smell triggers a strong collective rejection, that consensus is itself a reliable signal and the ingredient should be declined without further testing." },
    { label: "Ask your team to separate what they are actually smelling from what they have been told or conditioned to smell, then run a small controlled trial before making a final decision." },
    { label: "Override the team's reaction and introduce the ingredient into service anyway, reasoning that cultural prejudice is always the explanation for smell-based rejections." }
    ],
    citation: "Helen Leach. (2001). Rehabilitating the \"Stinking Herbe\": A Case Study of Culinary Prejudice. Gastronomica The Journal of Food and Culture. https://doi.org/10.1525/gfc.2001.1.2.10",
    articleId: "634ac110-c6e8-409f-b7e0-2f67d532b7de",
    articleTitle: "Rehabilitating the \"Stinking Herbe\": A Case Study of Culinary Prejudice",
    articleUrl: "https://doi.org/10.1525/gfc.2001.1.2.10",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "02b8e5e6-6a25-41e7-a2a2-dca1f1c136ba::phronesis::213",
    register: "phronesis",
    sender: "kock",
    question: "A culinary historian visits your kitchen and mentions The Routledge History of Food as a key reference for understanding long-term food trends. You want to follow up and read it yourself, but you find the full text is paywalled and you can only access the review. How do you handle this gap when you need to inform a menu decision rooted in food history?",
    options: [
    { label: "Treat the review as a pointer toward a broader historical resource and seek access to the full text through a library or institutional channel before making claims about historical patterns in your menu narrative." },
    { label: "Use the review's framing and title alone to build your menu story, treating the editorial summary as sufficient evidence for the historical claims you want to make." },
    { label: "Set aside the historical angle entirely and rely only on technique sources you can access fully, since a paywalled history text offers nothing actionable for the kitchen." }
    ],
    citation: "Jacqueline Grady Smith. (2018). Review: The Routledge History of Food, Edited by Carol Helstosky. Gastronomica The Journal of Food and Culture. https://doi.org/10.1525/gfc.2018.18.1.98",
    articleId: "02b8e5e6-6a25-41e7-a2a2-dca1f1c136ba",
    articleTitle: "Review: The Routledge History of Food, Edited by Carol Helstosky",
    articleUrl: "https://doi.org/10.1525/gfc.2018.18.1.98",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "db1b722b-f187-4948-8176-0229caf9ae0d::episteme::214",
    register: "episteme",
    sender: "kock",
    question: "When Zataria multiflora essential oil and nisin are delivered together via a chitosan nanogel in a fermented dairy product, what advantage does encapsulation offer over applying the compounds freely?",
    options: [
    { label: "It improves efficacy because controlled release is a meaningful variable in fermentation-adjacent preservation.", correct: true },
    { label: "It eliminates the need for nisin entirely, since the essential oil alone provides sufficient antimicrobial action.", correct: false },
    { label: "It neutralises the natural bitterness of Zataria multiflora so the cheese flavour is unaffected.", correct: false },
    { label: "It increases the concentration of nisin beyond levels achievable with direct addition.", correct: false }
    ],
    correctIndex: 0,
    citation: "Seyed Mohammad Hosseini, Hamid Tavakolipour, Mohsen Mokhtarian, Mohammad Armin. (2024). Co‐encapsulation of Shirazi thyme (Zataria multiflora) essential oil and nisin using caffeic acid grafted chitosan nanogel and the effect of this nanogel as a bio‐preservative in Iranian white cheese. Food Science & Nutrition. https://doi.org/10.1002/fsn3.4105",
    articleId: "db1b722b-f187-4948-8176-0229caf9ae0d",
    articleTitle: "Co‐encapsulation of Shirazi thyme (Zataria multiflora) essential oil and nisin using caffeic acid grafted chitosan nanogel and the effect of this nanogel as a bio‐preservative in Iranian white cheese",
    articleUrl: "https://doi.org/10.1002/fsn3.4105",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "db1b722b-f187-4948-8176-0229caf9ae0d::phronesis::215",
    register: "phronesis",
    sender: "kock",
    question: "You are developing a naturally preserved white cheese for a retail client who insists on a clean label with no synthetic additives. A food science paper shows that co-encapsulated Shirazi thyme essential oil and nisin performed comparably to sodium nitrate in controlling coliforms and oxidation by day 60. The client wants to launch in four months. How do you move forward?",
    options: [
    { label: "Present the research findings to the client as proof of concept, then immediately begin production trials using your best estimate of concentrations, accepting that the first batches serve as live tests." },
    { label: "Use the study as evidence that a natural preservation route is scientifically viable, clearly communicate to the client that a production-ready protocol does not yet exist from this source, and bring in the researchers or a food technologist before scaling." },
    { label: "Treat the study as sufficient validation, replace sodium nitrate with the encapsulated combination at an equivalent dosage, and monitor shelf-life outcomes post-launch to gather your own data." }
    ],
    citation: "Seyed Mohammad Hosseini, Hamid Tavakolipour, Mohsen Mokhtarian, Mohammad Armin. (2024). Co‐encapsulation of Shirazi thyme (Zataria multiflora) essential oil and nisin using caffeic acid grafted chitosan nanogel and the effect of this nanogel as a bio‐preservative in Iranian white cheese. Food Science & Nutrition. https://doi.org/10.1002/fsn3.4105",
    articleId: "db1b722b-f187-4948-8176-0229caf9ae0d",
    articleTitle: "Co‐encapsulation of Shirazi thyme (Zataria multiflora) essential oil and nisin using caffeic acid grafted chitosan nanogel and the effect of this nanogel as a bio‐preservative in Iranian white cheese",
    articleUrl: "https://doi.org/10.1002/fsn3.4105",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "06291ff8-996b-493d-8787-cdea91010f7c::episteme::216",
    register: "episteme",
    sender: "kock",
    question: "According to current research, what happens metabolically when a guest smells food before taking a single bite?",
    options: [
    { label: "Nothing significant — metabolism only responds once food reaches the stomach.", correct: false },
    { label: "Olfactory circuits trigger anticipatory responses including insulin release, lipid metabolism adjustments, and thermogenesis — before ingestion begins.", correct: true },
    { label: "Saliva production increases, but insulin and lipid metabolism are unaffected until digestion starts.", correct: false },
    { label: "The hypothalamus suppresses appetite signals to prevent premature eating.", correct: false }
    ],
    correctIndex: 1,
    citation: "Diogo Manoel, Eman Abou Moussa, Asma Al-Naama, Luis R Saraiva. (2025). The Nose Knows: Olfaction as a Metabolic Gatekeeper in Health and Disease.. Physiology (Bethesda, Md.). https://doi.org/10.1152/physiol.00007.2025",
    articleId: "06291ff8-996b-493d-8787-cdea91010f7c",
    articleTitle: "The Nose Knows: Olfaction as a Metabolic Gatekeeper in Health and Disease.",
    articleUrl: "https://doi.org/10.1152/physiol.00007.2025",
    topic: "flavor_science",
    needsRetag: false
  },
  {
    id: "63e8c39e-fd2e-4092-8d73-6693ec681a38::episteme::217",
    register: "episteme",
    sender: "kock",
    question: "What molecular group is responsible for the aromatic character of food?",
    options: [
    { label: "Volatile compounds", correct: true },
    { label: "Phenolic compounds", correct: false },
    { label: "Lipid-soluble pigments", correct: false },
    { label: "Non-volatile flavor precursors", correct: false }
    ],
    correctIndex: 0,
    citation: "Eugenio Aprea. (2020). Special Issue “Volatile Compounds and Smell Chemicals (Odor and Aroma) of Food”. Molecules. https://doi.org/10.3390/molecules25173811",
    articleId: "63e8c39e-fd2e-4092-8d73-6693ec681a38",
    articleTitle: "Special Issue “Volatile Compounds and Smell Chemicals (Odor and Aroma) of Food”",
    articleUrl: "https://doi.org/10.3390/molecules25173811",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "16037e86-45bf-42f3-9e71-6b9bbee87e54::episteme::218",
    register: "episteme",
    sender: "servitör",
    question: "At what stage is the nanofiltration-resin treatment applied to Concord juice before it becomes wine?",
    options: [
    { label: "Before fermentation begins", correct: true },
    { label: "During active fermentation", correct: false },
    { label: "After fermentation is complete", correct: false },
    { label: "During bottling and finishing", correct: false }
    ],
    correctIndex: 0,
    citation: "Demetra M. Perry, Ana G. Ortiz Quezada, Wenyue Guan, Robin Dando, Gavin L. Sacks. (2025). Using Sensory Evaluation and Volatile Analysis to Determine the Enological Potential of Concord Juice Processed by Nanofiltration-Resin. American Journal of Enology and Viticulture. https://doi.org/10.5344/ajev.2024.24046",
    articleId: "16037e86-45bf-42f3-9e71-6b9bbee87e54",
    articleTitle: "Using Sensory Evaluation and Volatile Analysis to Determine the Enological Potential of Concord Juice Processed by Nanofiltration-Resin",
    articleUrl: "https://doi.org/10.5344/ajev.2024.24046",
    topic: "sommellerie",
    needsRetag: false
  },
  {
    id: "07ff105e-b701-418d-a1b6-fd0f99a2b972::episteme::219",
    register: "episteme",
    sender: "kock",
    question: "According to recent research on culinary innovation, what is identified as the structural engine of the new avant-garde in gastronomy?",
    options: [
    { label: "The Haute Cuisine restaurant acting as the sole creative site for culinary development", correct: false },
    { label: "The pairing of cooks and scientists within multidisciplinary teams", correct: true },
    { label: "Independent chefs working outside formal research institutions", correct: false },
    { label: "Culinary schools replacing laboratories as the primary innovation centres", correct: false }
    ],
    correctIndex: 1,
    citation: "Auxkin Galarraga Ezponda, Iñaki Martínez de Albeniz Ezpeleta. (2024). Innovation and creativity in gastronomy beyond Haute Cuisine restaurants: Towards an innovation ecosystem in Gastronomytech in the Basque Country. Creativity and Innovation Management. https://doi.org/10.1111/caim.12624",
    articleId: "07ff105e-b701-418d-a1b6-fd0f99a2b972",
    articleTitle: "Innovation and creativity in gastronomy beyond Haute Cuisine restaurants: Towards an innovation ecosystem in Gastronomytech in the Basque Country",
    articleUrl: "https://doi.org/10.1111/caim.12624",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "36e365e9-44fa-456b-9a43-448ee0881fbb::episteme::220",
    register: "episteme",
    sender: "kock",
    question: "According to recent research, how should a chef understand the role of plating within the broader restaurant environment?",
    options: [
    { label: "As a scenographic practice that positions the diner as an active participant rather than a passive recipient", correct: true },
    { label: "As a decorative convention that has remained largely unchanged over the past thirty years", correct: false },
    { label: "As a purely technical skill separate from the designed environment of the restaurant", correct: false },
    { label: "As a front-of-house responsibility rather than a culinary one", correct: false }
    ],
    correctIndex: 0,
    citation: "Joshua Abrams. (2013). Mise en Plate: The scenographic imagination and the contemporary restaurant. Performance Research. https://doi.org/10.1080/13528165.2013.816464",
    articleId: "36e365e9-44fa-456b-9a43-448ee0881fbb",
    articleTitle: "Mise en Plate: The scenographic imagination and the contemporary restaurant",
    articleUrl: "https://doi.org/10.1080/13528165.2013.816464",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "0d93598e-6263-4bf8-aedb-269713ce2c4d::episteme::221",
    register: "episteme",
    sender: "kock",
    question: "Beyond which flavor compounds are present and in what quantity, what else determines the flavor a person actually perceives when eating?",
    options: [
    { label: "The color and visual presentation of the dish", correct: false },
    { label: "When and how flavor components become available to sensory receptors during oral processing", correct: true },
    { label: "The temperature at which the dish is served", correct: false },
    { label: "The order in which individual ingredients were cooked", correct: false }
    ],
    correctIndex: 1,
    citation: "P. Overbosch, W. G. M. Afterof. (1991). Flavor release in the mouth. Food Reviews International. https://doi.org/10.1080/87559129109540906",
    articleId: "0d93598e-6263-4bf8-aedb-269713ce2c4d",
    articleTitle: "Flavor release in the mouth",
    articleUrl: "https://doi.org/10.1080/87559129109540906",
    topic: "flavor_science",
    needsRetag: false
  },
  {
    id: "1624387a-73b0-498f-b29c-7152d18e8526::episteme::222",
    register: "episteme",
    sender: "kock",
    question: "A study delivered a cream aroma retronasally during consumption of zero-fat milk. What did the researchers find?",
    options: [
    { label: "Consumer liking increased, but perceived texture and flavour intensity were not measurably changed.", correct: true },
    { label: "Consumer liking increased and the zero-fat milk was rated equivalent to full-fat milk on all attributes.", correct: false },
    { label: "Perceived texture improved significantly, though liking scores remained unchanged.", correct: false },
    { label: "Both liking and intake increased compared to zero-fat milk consumed without the aroma.", correct: false }
    ],
    correctIndex: 0,
    citation: "Pirc Matja&#x17e;, Joosten Lieke, Pietersma Karleen, Hageman Cors, Bolhuis Dieuwerke, Boesveldt Sanne. (2025). Addition of retronasal milk fat odour during milk consumption increased liking without affecting intake.. Appetite. https://doi.org/10.1016/j.appet.2024.107832",
    articleId: "1624387a-73b0-498f-b29c-7152d18e8526",
    articleTitle: "Addition of retronasal milk fat odour during milk consumption increased liking without affecting intake.",
    articleUrl: "https://doi.org/10.1016/j.appet.2024.107832",
    topic: "flavor_science",
    needsRetag: false
  },
  {
    id: "4a580989-bb76-42b1-b949-2410db90e3a0::episteme::223",
    register: "episteme",
    sender: "kock",
    question: "When making Deyang Baiwo soy sauce, which koji substrate combination leads to higher amino nitrogen levels, more reducing sugars, and greater phenolic aroma compound accumulation compared to whole soybean koji?",
    options: [
    { label: "Defatted soybean meal combined with wheat bran", correct: true },
    { label: "Whole soybean combined with wheat bran", correct: false },
    { label: "Defatted soybean meal combined with rice flour", correct: false },
    { label: "Whole soybean combined with barley", correct: false }
    ],
    correctIndex: 0,
    citation: "Kai-Yao Chen, Na Zhang, Wen-Hu Liu, Cheng Wang, Yongxian Hu, Caihong Shen, Li Zeng, Ran Xu. (2025). Defatted Soybean Meal-Based Koji Promotes Flavor Development in Deyang Baiwo Soy Sauce: A Comparative Multi-Omics Study. Fermentation. https://doi.org/10.3390/fermentation11120685",
    articleId: "4a580989-bb76-42b1-b949-2410db90e3a0",
    articleTitle: "Defatted Soybean Meal-Based Koji Promotes Flavor Development in Deyang Baiwo Soy Sauce: A Comparative Multi-Omics Study",
    articleUrl: "https://doi.org/10.3390/fermentation11120685",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "8ee05ae1-d9dc-4f88-b2ae-f095643c484f::episteme::224",
    register: "episteme",
    sender: "värd",
    question: "Pink pepper and Japanese pepper are both called 'pepper,' but how are they related botanically to black pepper?",
    options: [
    { label: "They belong to the same genus as black pepper but are distinct species.", correct: false },
    { label: "They are botanically unrelated to black pepper despite sharing the name.", correct: true },
    { label: "They are subspecies of black pepper that developed in different climates.", correct: false },
    { label: "They share the same chemical profile as black pepper but differ in aroma.", correct: false }
    ],
    correctIndex: 1,
    citation: "Pierina D&#xed;az-Guerrero, Sofia Panzani, Chiara Sanmartin, Chiara Muntoni, Isabella Taglieri, Francesca Venturi. (2025). \"Pepper\": Different Spices, One Name-Analysis of Sensory and Biological Aspects.. Molecules (Basel, Switzerland). https://www.mdpi.com/1420-3049/30/9/1891/pdf?version=1745480746",
    articleId: "8ee05ae1-d9dc-4f88-b2ae-f095643c484f",
    articleTitle: "\"Pepper\": Different Spices, One Name-Analysis of Sensory and Biological Aspects.",
    articleUrl: "https://www.mdpi.com/1420-3049/30/9/1891/pdf?version=1745480746",
    topic: "gastronomy",
    needsRetag: false
  },
  {
    id: "8ee05ae1-d9dc-4f88-b2ae-f095643c484f::techne::225",
    register: "techne",
    sender: "värd",
    question: "You need to substitute one pepper species for another in a dish. What is the correct approach when making that decision?",
    options: [
    { label: "Evaluate each sensory dimension — aroma, odor, color, and chemesthesis — separately for each species before deciding.", correct: true },
    { label: "Treat all pepper species as interchangeable since they share the same common name.", correct: false },
    { label: "Base the substitution solely on heat level, as that is the primary differentiator between species.", correct: false },
    { label: "Prioritize color match first, then assume the remaining sensory properties will align.", correct: false }
    ],
    correctIndex: 0,
    citation: "Pierina D&#xed;az-Guerrero, Sofia Panzani, Chiara Sanmartin, Chiara Muntoni, Isabella Taglieri, Francesca Venturi. (2025). \"Pepper\": Different Spices, One Name-Analysis of Sensory and Biological Aspects.. Molecules (Basel, Switzerland). https://www.mdpi.com/1420-3049/30/9/1891/pdf?version=1745480746",
    articleId: "8ee05ae1-d9dc-4f88-b2ae-f095643c484f",
    articleTitle: "\"Pepper\": Different Spices, One Name-Analysis of Sensory and Biological Aspects.",
    articleUrl: "https://www.mdpi.com/1420-3049/30/9/1891/pdf?version=1745480746",
    topic: "gastronomy",
    needsRetag: false
  },
  {
    id: "45a9470d-acc4-4112-99b1-061b97186ae9::episteme::226",
    register: "episteme",
    sender: "servitör",
    question: "What does circular swirling motion in a wine glass primarily create, according to physical observation?",
    options: [
    { label: "A pressure differential that forces dissolved CO₂ out of solution", correct: false },
    { label: "Wave dynamics that enhance oxygenation and mixing", correct: true },
    { label: "A centrifugal separation of tannins toward the glass wall", correct: false },
    { label: "A laminar flow layer that reduces surface evaporation", correct: false }
    ],
    correctIndex: 1,
    citation: "Martino Reclari, Matthieu Dreyer. (2011). \"Oenodynamic\": Hydrodynamic of wine swirling. arXiv. http://arxiv.org/abs/1110.3369v1",
    articleId: "45a9470d-acc4-4112-99b1-061b97186ae9",
    articleTitle: "\"Oenodynamic\": Hydrodynamic of wine swirling",
    articleUrl: "http://arxiv.org/abs/1110.3369v1",
    topic: "sommellerie",
    needsRetag: false
  },
  {
    id: "466a0d4b-dd72-40d3-85e6-35412cea2b4f::episteme::227",
    register: "episteme",
    sender: "kock",
    question: "A food-science paper reports that a common lab assay for measuring sweetener-receptor interactions produces non-correlated observables. What does this mean for the potency data you find in that literature?",
    options: [
    { label: "The potency claims from that assay may lack valid experimental grounding.", correct: true },
    { label: "The potency claims are reliable as long as you cross-reference two different sweetener brands.", correct: false },
    { label: "Non-correlated observables only affect receptor studies done outside controlled laboratory conditions.", correct: false },
    { label: "The assay is valid for natural sweeteners but not for artificial ones.", correct: false }
    ],
    correctIndex: 0,
    citation: "Rani P Venkitakrishnan, Manojendu Choudhury. (2015). Importance of method validation: Implications of non-correlated observables in sweet taste receptor studies. arXiv. http://arxiv.org/abs/1511.07977v1",
    articleId: "466a0d4b-dd72-40d3-85e6-35412cea2b4f",
    articleTitle: "Importance of method validation: Implications of non-correlated observables in sweet taste receptor studies",
    articleUrl: "http://arxiv.org/abs/1511.07977v1",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "88257ad6-f52a-46e0-8b0d-77af55e67695::episteme::228",
    register: "episteme",
    sender: "kock",
    question: "A researcher tells you that the smell around a labeled product affects how consumers judge that product. According to recent neuroscience findings, what is the most accurate way to describe this effect?",
    options: [
    { label: "Odors influence the perception of nutrition-related label statements at both behavioral and neural levels, with pleasant, congruent odors improving overall product evaluation.", correct: true },
    { label: "Odors influence label perception only at the behavioral level, with no measurable neural component.", correct: false },
    { label: "Odors improve product evaluation regardless of whether they are congruent or incongruent with the labeled product.", correct: false },
    { label: "The aromatic environment affects how labels are read visually but does not participate in flavor identity construction.", correct: false }
    ],
    correctIndex: 0,
    citation: "Doris Schicker, Putu A Khorisantono, Q&#xeb;ndresa Rramani Dervishi, Shirley X L Lim, Elodie Saruco, Burkhard Pleger, Johannes Schultz, Kathrin Ohla, Jessica Freiherr. (2025). Smell the Label: Odors Influence Label Perception and Their Neural Processing.. The Journal of neuroscience : the official journal of the Society for Neuroscience. https://doi.org/10.1523/JNEUROSCI.1159-24.2024",
    articleId: "88257ad6-f52a-46e0-8b0d-77af55e67695",
    articleTitle: "Smell the Label: Odors Influence Label Perception and Their Neural Processing.",
    articleUrl: "https://doi.org/10.1523/JNEUROSCI.1159-24.2024",
    topic: "flavor_science",
    needsRetag: false
  },
  {
    id: "87717b7e-8820-42dd-bb4a-bc06b5fcf080::episteme::229",
    register: "episteme",
    sender: "kock",
    question: "What does the current market situation for aged cheese in Morocco look like, according to recent research?",
    options: [
    { label: "Consumer interest is strong and local production meets demand comfortably.", correct: false },
    { label: "Consumer interest is strong but local production is limited, creating a supply gap.", correct: true },
    { label: "Local production is well established but consumer interest remains low.", correct: false },
    { label: "Both consumer interest and local production are limited, reflecting a niche market.", correct: false }
    ],
    correctIndex: 1,
    citation: "Nouhayla Mouatadid, Mourad Oukheda, Mustapha Khiati, Rachid Saile, Anass Kettani. (2025). Determinants of aged cheese consumer preferences in Morocco-a cross-sectional study of economic, cultural, and social factors influencing purchasing behaviors.. Frontiers in nutrition. https://www.frontiersin.org/journals/nutrition/articles/10.3389/fnut.2025.1600873/pdf",
    articleId: "87717b7e-8820-42dd-bb4a-bc06b5fcf080",
    articleTitle: "Determinants of aged cheese consumer preferences in Morocco-a cross-sectional study of economic, cultural, and social factors influencing purchasing behaviors.",
    articleUrl: "https://www.frontiersin.org/journals/nutrition/articles/10.3389/fnut.2025.1600873/pdf",
    topic: "nutritional_science",
    needsRetag: false
  },
  {
    id: "906b1e82-9774-4215-b97d-f8c91004aed4::episteme::230",
    register: "episteme",
    sender: "kock",
    question: "When yellow soymilk fermented with Seomoktae is treated with digestive enzymes, which free amino acids become more available — particularly in the higher-inclusion formulation?",
    options: [
    { label: "Glutamine, leucine, and lysine", correct: false },
    { label: "Arginine, alanine, and asparagine", correct: true },
    { label: "Proline, glycine, and valine", correct: false },
    { label: "Tryptophan, methionine, and threonine", correct: false }
    ],
    correctIndex: 1,
    citation: "Eun Ah Sim, Hyeonbin Kim, Seon‐Young Kim, Eun‐Gyung Mun. (2025). Fermentation and Bioactivity Properties in Small Black Soybean (Seomoktae)-Enriched Fermented Soymilk. Fermentation. https://doi.org/10.3390/fermentation11120655",
    articleId: "906b1e82-9774-4215-b97d-f8c91004aed4",
    articleTitle: "Fermentation and Bioactivity Properties in Small Black Soybean (Seomoktae)-Enriched Fermented Soymilk",
    articleUrl: "https://doi.org/10.3390/fermentation11120655",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "906b1e82-9774-4215-b97d-f8c91004aed4::techne::231",
    register: "techne",
    sender: "kock",
    question: "You are developing a fermented soymilk product and want to maximise its bioactive intensity using Seomoktae (small black soybean). Which inclusion ratio does the research identify as producing the strongest functional outcomes?",
    options: [
    { label: "25% Seomoktae supplementation", correct: false },
    { label: "50% Seomoktae supplementation", correct: true },
    { label: "75% Seomoktae supplementation", correct: false },
    { label: "100% Seomoktae supplementation", correct: false }
    ],
    correctIndex: 1,
    citation: "Eun Ah Sim, Hyeonbin Kim, Seon‐Young Kim, Eun‐Gyung Mun. (2025). Fermentation and Bioactivity Properties in Small Black Soybean (Seomoktae)-Enriched Fermented Soymilk. Fermentation. https://doi.org/10.3390/fermentation11120655",
    articleId: "906b1e82-9774-4215-b97d-f8c91004aed4",
    articleTitle: "Fermentation and Bioactivity Properties in Small Black Soybean (Seomoktae)-Enriched Fermented Soymilk",
    articleUrl: "https://doi.org/10.3390/fermentation11120655",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "a2bfc7a2-b3f5-48a2-9806-1ef7a29c3b00::episteme::232",
    register: "episteme",
    sender: "servitör",
    question: "In the WineGraph system, what serves as the operative bridge between a culinary preparation and wine selection — chemical composition or something else?",
    options: [
    { label: "Chemical composition of both food and wine, analyzed through spectroscopic data", correct: false },
    { label: "Flavor language used by reviewers, extracted computationally from a large review corpus", correct: true },
    { label: "Nutritional profiles matched against regional wine classifications", correct: false },
    { label: "Chef-authored tasting notes cross-referenced with sommelier recommendations", correct: false }
    ],
    correctIndex: 1,
    citation: "Zuzanna Gawrysiak, Agata Żywot. (2024). WineGraph: A Graph Representation For Food-Wine Pairing. arXiv. http://arxiv.org/abs/2407.00107v2",
    articleId: "a2bfc7a2-b3f5-48a2-9806-1ef7a29c3b00",
    articleTitle: "WineGraph: A Graph Representation For Food-Wine Pairing",
    articleUrl: "http://arxiv.org/abs/2407.00107v2",
    topic: "sommellerie",
    needsRetag: false
  },
  {
    id: "a66adb5a-6fb5-4551-9338-4a9e66ad6c65::episteme::233",
    register: "episteme",
    sender: "kock",
    question: "A study exposed fetuses to kale and carrot odors before birth and then measured how newborns responded to those same odors. What did the research find?",
    options: [
    { label: "Newborns showed altered hedonic facial responses to the odors they had been exposed to in the womb.", correct: true },
    { label: "Newborns showed altered hedonic facial responses only to bitter odors, not to non-bitter ones.", correct: false },
    { label: "Prenatal exposure to food odors had no measurable effect on neonatal responses when the odors were encapsulated.", correct: false },
    { label: "The conditioning effect was driven by the taste category of the food rather than its olfactory properties.", correct: false }
    ],
    correctIndex: 0,
    citation: "Beyza Ustun-Elayan, Jacqueline Blissett, Judith Covey, Benoist Schaal, Nadja Reissland. (2025). Flavor learning and memory in utero as assessed through the changing pattern of olfactory responses from fetal to neonatal life.. Appetite. https://doi.org/10.1016/j.appet.2025.107891",
    articleId: "a66adb5a-6fb5-4551-9338-4a9e66ad6c65",
    articleTitle: "Flavor learning and memory in utero as assessed through the changing pattern of olfactory responses from fetal to neonatal life.",
    articleUrl: "https://doi.org/10.1016/j.appet.2025.107891",
    topic: "flavor_science",
    needsRetag: false
  },
  {
    id: "c8c0b32f-0f5a-4b9b-9142-48d0d2ed2093::episteme::234",
    register: "episteme",
    sender: "värd",
    question: "You're designing a tasting menu that uses intentional aroma work — fermented elements, volatile compounds — to drive the guest experience. According to current systematic evidence, what can food-related odors reliably do, and where does the evidence fall short?",
    options: [
    { label: "They reliably increase sensory-specific appetite and craving, but do not predictably translate that into food choice or measurable intake changes.", correct: true },
    { label: "They reliably increase both appetite and actual food intake across experimental settings.", correct: false },
    { label: "They influence food choice more consistently than they influence appetite or craving.", correct: false },
    { label: "Their effect on appetite is too inconsistent to be useful as a deliberate culinary tool.", correct: false }
    ],
    correctIndex: 0,
    citation: "Jiachun Li, Xinmeng Yang, René de Wijk, Arianne van Eck, Sanne Boesveldt. (2026). Effects of food-related odors on eating behavior: A systematic review. Appetite. https://doi.org/10.1016/j.appet.2026.108570",
    articleId: "c8c0b32f-0f5a-4b9b-9142-48d0d2ed2093",
    articleTitle: "Effects of food-related odors on eating behavior: A systematic review",
    articleUrl: "https://doi.org/10.1016/j.appet.2026.108570",
    topic: "food_psychology",
    needsRetag: false
  },
  {
    id: "b0453ecc-4063-4e20-95e1-2087ed9b46e9::episteme::235",
    register: "episteme",
    sender: "värd",
    question: "When gastronomy and culinary arts students think about functional foods, which category do they most commonly associate them with?",
    options: [
    { label: "Fortified or enriched products", correct: false },
    { label: "Traditional foods", correct: true },
    { label: "Pharmaceutical supplements", correct: false },
    { label: "Novel engineered ingredients", correct: false }
    ],
    correctIndex: 1,
    citation: "&#x15e;enay Bur&#xe7;in Alkan, Hilal &#xd6;z, Berna Madal&#x131; Kafes, Hasan H&#xfc;seyin Kara. (2025). Comparison of Students' Attitudes and Knowledge Regarding Functional Foods in Gastronomy, Food Science, and Nutrition Programs.. Food science & nutrition. https://onlinelibrary.wiley.com/doi/pdfdirect/10.1002/fsn3.70321",
    articleId: "b0453ecc-4063-4e20-95e1-2087ed9b46e9",
    articleTitle: "Comparison of Students' Attitudes and Knowledge Regarding Functional Foods in Gastronomy, Food Science, and Nutrition Programs.",
    articleUrl: "https://onlinelibrary.wiley.com/doi/pdfdirect/10.1002/fsn3.70321",
    topic: "gastronomy",
    needsRetag: false
  },
  {
    id: "b3cedfe5-6380-487e-9c9e-aa7c6c4552fc::episteme::236",
    register: "episteme",
    sender: "servitör",
    question: "When a guest's perception of wine quality is shaped by an expert score on the bottle, what does that tell you about how quality is being read?",
    options: [
    { label: "The guest is accurately detecting the wine's intrinsic properties through the expert score.", correct: false },
    { label: "Perceived quality is a socially mediated construction, not a direct readout of intrinsic properties.", correct: true },
    { label: "Expert scores cancel out the influence of price and origin on consumer perception.", correct: false },
    { label: "Consumer assessments of hedonic quality are independent of extrinsic cues like ratings.", correct: false }
    ],
    correctIndex: 1,
    citation: "David Priilaid, Jesse Feinberg. (2009). Follow the leader: How expert ratings mediate consumer assessments of hedonic quality. South African Journal of Business Management. https://doi.org/10.4102/sajbm.v40i4.550",
    articleId: "b3cedfe5-6380-487e-9c9e-aa7c6c4552fc",
    articleTitle: "Follow the leader: How expert ratings mediate consumer assessments of hedonic quality",
    articleUrl: "https://doi.org/10.4102/sajbm.v40i4.550",
    topic: "sommellerie",
    needsRetag: false
  },
  {
    id: "9bfdca57-003e-4abf-91b6-d878ad22f866::episteme::237",
    register: "episteme",
    sender: "kock",
    question: "A study on chicken breast cooking found that optimal cooking time is shaped by which independent variables?",
    options: [
    { label: "Core temperature alone, regardless of method", correct: false },
    { label: "Cooking method and temperature together, across diverse conditions", correct: true },
    { label: "Cooking method alone, with temperature as a dependent variable", correct: false },
    { label: "Protein weight and starting temperature combined", correct: false }
    ],
    correctIndex: 1,
    citation: "Giulia Romano, Maria Cristina Nicoli. (2024). Predictive modeling for optimal chicken breast cooking across diverse methods and temperatures. LWT. https://doi.org/10.1016/j.lwt.2024.117051",
    articleId: "9bfdca57-003e-4abf-91b6-d878ad22f866",
    articleTitle: "Predictive modeling for optimal chicken breast cooking across diverse methods and temperatures",
    articleUrl: "https://doi.org/10.1016/j.lwt.2024.117051",
    topic: "culinary_science",
    needsRetag: false
  },
  {
    id: "78385b31-ae2f-42ef-905d-46b5d6c71296::episteme::238",
    register: "episteme",
    sender: "servitör",
    question: "What does current research say determines a wine's distinctive sensory and chemical character?",
    options: [
    { label: "Terroir, viticultural inputs, and winemaking decisions interacting with cultivar identity", correct: true },
    { label: "Winemaking decisions alone, applied consistently across different origins", correct: false },
    { label: "Cultivar identity independent of where and how the grapes are grown", correct: false },
    { label: "Arbitrary variation in fermentation conditions from vintage to vintage", correct: false }
    ],
    correctIndex: 0,
    citation: "Lira Souza Gonzaga, Dimitra L. Capone. (2020). Defining wine typicity: sensory characterisation and consumer perspectives. Australian Journal of Grape and Wine Research. https://doi.org/10.1111/ajgw.12474",
    articleId: "78385b31-ae2f-42ef-905d-46b5d6c71296",
    articleTitle: "Defining wine typicity: sensory characterisation and consumer perspectives",
    articleUrl: "https://doi.org/10.1111/ajgw.12474",
    topic: "sommellerie",
    needsRetag: false
  },
  {
    id: "c2bab81e-4279-4ce5-bbf0-bf2a8a60f16b::episteme::239",
    register: "episteme",
    sender: "värd",
    question: "When it comes to how vessel and plate color affect guest perception, which finding does current research support?",
    options: [
    { label: "Plate color has no measurable effect on taste associations unless the food itself shares the same color.", correct: false },
    { label: "Plate color, independent of the food, generates taste associations and emotional responses that directly shape consumer acceptance.", correct: true },
    { label: "Blue plates consistently boost appetite by creating contrast with warm-toned food.", correct: false },
    { label: "Red plates suppress appetite more strongly than any other color tested.", correct: false }
    ],
    correctIndex: 1,
    citation: "Jarbas Silva, Francisca Elis&#xe2;ngela Lima, Clarisse Souza, Bruno Moreira-Leite, Paulo Sousa. (2025). The Influence of Food Colors on Emotional Perception and Consumer Acceptance: A Sensory and Emotional Profiling Approach in Gastronomy.. Foods (Basel, Switzerland). https://doi.org/10.3390/foods14223818",
    articleId: "c2bab81e-4279-4ce5-bbf0-bf2a8a60f16b",
    articleTitle: "The Influence of Food Colors on Emotional Perception and Consumer Acceptance: A Sensory and Emotional Profiling Approach in Gastronomy.",
    articleUrl: "https://doi.org/10.3390/foods14223818",
    topic: "art_science",
    needsRetag: false
  },
  {
    id: "c2bab81e-4279-4ce5-bbf0-bf2a8a60f16b::techne::240",
    register: "techne",
    sender: "värd",
    question: "You are plating a new dish and want to maximise appetite appeal and positive emotional response from guests. Which approach to tableware selection does the current evidence support?",
    options: [
    { label: "Treat tableware color as a deliberate compositional decision and avoid blue-dominant presentations.", correct: true },
    { label: "Prioritise blue tableware to create a calm, neutral backdrop that does not compete with food colors.", correct: false },
    { label: "Select tableware color based solely on brand identity, since emotional perception is driven by food color alone.", correct: false },
    { label: "Use blue-dominant tableware only when the dish itself contains warm tones, to create contrast.", correct: false }
    ],
    correctIndex: 0,
    citation: "Jarbas Silva, Francisca Elis&#xe2;ngela Lima, Clarisse Souza, Bruno Moreira-Leite, Paulo Sousa. (2025). The Influence of Food Colors on Emotional Perception and Consumer Acceptance: A Sensory and Emotional Profiling Approach in Gastronomy.. Foods (Basel, Switzerland). https://doi.org/10.3390/foods14223818",
    articleId: "c2bab81e-4279-4ce5-bbf0-bf2a8a60f16b",
    articleTitle: "The Influence of Food Colors on Emotional Perception and Consumer Acceptance: A Sensory and Emotional Profiling Approach in Gastronomy.",
    articleUrl: "https://doi.org/10.3390/foods14223818",
    topic: "art_science",
    needsRetag: false
  },
  {
    id: "fb46d38b-1af5-4b0e-ab2e-f600a1d4a642::episteme::241",
    register: "episteme",
    sender: "servitör",
    question: "Which fungal functional guilds were found present across all vineyard sites surveyed in the Barbera d'Asti zone?",
    options: [
    { label: "Pathogen, saprotrophic, endophytic, and mycorrhizal fungi", correct: true },
    { label: "Saprotrophic, mycorrhizal, fermentative, and nitrogen-fixing fungi", correct: false },
    { label: "Endophytic, mycorrhizal, lactic, and pathogen fungi", correct: false },
    { label: "Pathogen, saprotrophic, fermentative, and symbiotic fungi", correct: false }
    ],
    correctIndex: 0,
    citation: "Antonella Lamontanara, Loredana Canfora, Andrea Manfredini, Michele Lamprillo, Luigi Orrù, Artur Miszczak, Eligio Malusà. (2025). A Local Microbiome Survey of Vineyards Representative of the Barbera d’Asti Wine Territory. Australian Journal of Grape and Wine Research. https://doi.org/10.1155/ajgw/2530557",
    articleId: "fb46d38b-1af5-4b0e-ab2e-f600a1d4a642",
    articleTitle: "A Local Microbiome Survey of Vineyards Representative of the Barbera d’Asti Wine Territory",
    articleUrl: "https://doi.org/10.1155/ajgw/2530557",
    topic: "sommellerie",
    needsRetag: false
  },
  {
    id: "06291ff8-996b-493d-8787-cdea91010f7c::phronesis::242",
    register: "phronesis",
    sender: "kock",
    question: "Design your aromatic presentations to precede plating by thirty seconds, allowing volatile compounds to reach guests before visual contact. Layer dishes with distinct aromatic phases: initial greeting volatiles, mid-palate integration, and finish notes. Control kitchen ventilation to prevent olfactory fatigue in guests. Use aromatic garnishes that release compounds gradually through meal progression. Time hot element additions to maximize volatile release at table. Build menus considering cumulative olfactory load across courses.",
    options: [

    ],
    citation: "Diogo Manoel, Eman Abou Moussa, Asma Al-Naama, Luis R Saraiva. (2025). The Nose Knows: Olfaction as a Metabolic Gatekeeper in Health and Disease.. Physiology (Bethesda, Md.). https://doi.org/10.1152/physiol.00007.2025",
    articleId: "06291ff8-996b-493d-8787-cdea91010f7c",
    articleTitle: "The Nose Knows: Olfaction as a Metabolic Gatekeeper in Health and Disease.",
    articleUrl: "https://doi.org/10.1152/physiol.00007.2025",
    topic: "flavor_science",
    needsRetag: false
  },
  {
    id: "63e8c39e-fd2e-4092-8d73-6693ec681a38::phronesis::243",
    register: "phronesis",
    sender: "kock",
    question: "Control volatile release through temperature management: heat amplifies aroma projection, cold suppresses it. Time your aromatics—add delicate herbs last to preserve volatile compounds; bloom robust spices in fat early to extract them. Build layered aroma by combining raw, cooked, and finishing elements. Toast, char, and caramelize to generate new volatiles. Preserve volatile integrity by minimizing exposure time to heat and air.",
    options: [

    ],
    citation: "Eugenio Aprea. (2020). Special Issue “Volatile Compounds and Smell Chemicals (Odor and Aroma) of Food”. Molecules. https://doi.org/10.3390/molecules25173811",
    articleId: "63e8c39e-fd2e-4092-8d73-6693ec681a38",
    articleTitle: "Special Issue “Volatile Compounds and Smell Chemicals (Odor and Aroma) of Food”",
    articleUrl: "https://doi.org/10.3390/molecules25173811",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "16037e86-45bf-42f3-9e71-6b9bbee87e54::phronesis::244",
    register: "phronesis",
    sender: "servitör",
    question: "When reducing Concord-based liquids for sauces, taste at intervals to monitor concentration of both sweetness and foxy notes. Blend processed and unprocessed versions to control intensity. Use lower temperatures for extended periods rather than rapid reduction to preserve delicate aromatics. Pair with fatty proteins where wine-like acidity can cut richness.",
    options: [

    ],
    citation: "Demetra M. Perry, Ana G. Ortiz Quezada, Wenyue Guan, Robin Dando, Gavin L. Sacks. (2025). Using Sensory Evaluation and Volatile Analysis to Determine the Enological Potential of Concord Juice Processed by Nanofiltration-Resin. American Journal of Enology and Viticulture. https://doi.org/10.5344/ajev.2024.24046",
    articleId: "16037e86-45bf-42f3-9e71-6b9bbee87e54",
    articleTitle: "Using Sensory Evaluation and Volatile Analysis to Determine the Enological Potential of Concord Juice Processed by Nanofiltration-Resin",
    articleUrl: "https://doi.org/10.5344/ajev.2024.24046",
    topic: "sommellerie",
    needsRetag: false
  },
  {
    id: "07ff105e-b701-418d-a1b6-fd0f99a2b972::phronesis::245",
    register: "phronesis",
    sender: "kock",
    question: "You are reviewing last night's feedback with your team. Instead of focusing solely on your kitchen's creativity, you frame the discussion around your role in a larger innovation ecosystem. You point out how the local supplier's new preservation technique enabled your vegetable dish, how the food tech company's temperature monitoring improved consistency, and how your line cook's idea came from a workshop at the culinary school. You recognize that your restaurant isn't an isolated innovation laboratory—it's a node in a network. Moving forward, you commit to strengthening connections with startups, suppliers, and educators, understanding that creativity flows through these relationships, not just from culinary genius alone.",
    options: [

    ],
    citation: "Auxkin Galarraga Ezponda, Iñaki Martínez de Albeniz Ezpeleta. (2024). Innovation and creativity in gastronomy beyond Haute Cuisine restaurants: Towards an innovation ecosystem in Gastronomytech in the Basque Country. Creativity and Innovation Management. https://doi.org/10.1111/caim.12624",
    articleId: "07ff105e-b701-418d-a1b6-fd0f99a2b972",
    articleTitle: "Innovation and creativity in gastronomy beyond Haute Cuisine restaurants: Towards an innovation ecosystem in Gastronomytech in the Basque Country",
    articleUrl: "https://doi.org/10.1111/caim.12624",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "36e365e9-44fa-456b-9a43-448ee0881fbb::phronesis::246",
    register: "phronesis",
    sender: "kock",
    question: "Prep begins at 7am and the kitchen is still cold. As you organize stations, you're not just thinking about cooking sequences—you're considering how each dish functions as a scenographic moment in the dining room. You discuss with your sous chef how the liquid nitrogen element needs precise timing because it's theatrical punctuation, not gimmick. You plan plate temperatures knowing they affect not just taste but the guest's tactile engagement with the experience. The pass becomes your backstage, where culinary elements await their entrance into the designed environment beyond the kitchen doors. You recognize your cooking is scenographic authorship—creating material moments within a larger spatial and temporal narrative that includes lighting, sound, and service choreography.",
    options: [

    ],
    citation: "Joshua Abrams. (2013). Mise en Plate: The scenographic imagination and the contemporary restaurant. Performance Research. https://doi.org/10.1080/13528165.2013.816464",
    articleId: "36e365e9-44fa-456b-9a43-448ee0881fbb",
    articleTitle: "Mise en Plate: The scenographic imagination and the contemporary restaurant",
    articleUrl: "https://doi.org/10.1080/13528165.2013.816464",
    topic: "uncategorized",
    needsRetag: true
  },
  {
    id: "0d93598e-6263-4bf8-aedb-269713ce2c4d::phronesis::247",
    register: "phronesis",
    sender: "kock",
    question: "Control flavor intensity progression by manipulating release timing, not just concentration. Design dishes where fat-soluble aromatics release early from emulsions during initial chewing, while water-soluble compounds emerge later as temperature and saliva increase. Layer textures deliberately: crisp elements break quickly, releasing surface flavors first; creamy components melt slowly, extending middle notes; particles that lodge between teeth continue releasing flavor post-swallow. Adjust cooking methods to place volatile compounds at different depths within protein or starch matrices.",
    options: [

    ],
    citation: "P. Overbosch, W. G. M. Afterof. (1991). Flavor release in the mouth. Food Reviews International. https://doi.org/10.1080/87559129109540906",
    articleId: "0d93598e-6263-4bf8-aedb-269713ce2c4d",
    articleTitle: "Flavor release in the mouth",
    articleUrl: "https://doi.org/10.1080/87559129109540906",
    topic: "flavor_science",
    needsRetag: false
  },
  {
    id: "2be7b52d-aa16-4726-b6af-eaaef2522349::phronesis::248",
    register: "phronesis",
    sender: "kock",
    question: "Store cashew nut oil in dark, cool locations below 20°C to extend usable life. Smell the oil before each service—fresh cashew oil carries sweet, buttery nuttiness; discard when paint-like or cardboard notes appear. Use this oil for finishing rather than high-heat cooking, as its oxidation-prone profile deteriorates rapidly under thermal stress. Date bottles upon opening and rotate stock religiously, placing newer purchases behind older inventory to ensure freshness.",
    options: [

    ],
    citation: "Amanda Rodrigues Leal, Gilleno Ferreira de Oliveira, Emilly Kaiane Maia da Silva, Ana Jady Cavalcanti Ara&#xfa;jo, Idila Maria da Silva Ara&#xfa;jo, Hilton C&#xe9;sar Rodrigues Magalh&#xe3;es, Paulo Riceli Vasconcelos Ribeiro, Arthur Claudio Rodrigues de Souza, Ana Paula Dion&#xed;sio, Paulo Henrique Machado de Sousa. (2025). Oxidative stability and affective/descriptive sensory properties of cashew nut (Anacardium occidentale L.) oil during accelerated storage conditions.. Journal of food science. https://doi.org/10.1111/1750-3841.70176",
    articleId: "2be7b52d-aa16-4726-b6af-eaaef2522349",
    articleTitle: "Oxidative stability and affective/descriptive sensory properties of cashew nut (Anacardium occidentale L.) oil during accelerated storage conditions.",
    articleUrl: "https://doi.org/10.1111/1750-3841.70176",
    topic: "flavor_science",
    needsRetag: false
  },
  {
    id: "1624387a-73b0-498f-b29c-7152d18e8526::phronesis::249",
    register: "phronesis",
    sender: "kock",
    question: "Introduce cream or butter aromas at the moment of swallowing to enhance perceived richness in reduced-fat preparations. Use atomizers or aroma-infused serving vessels positioned near the guest's face as they consume lighter dairy-based dishes. Time aromatic releases to coincide with each spoonful or sip—this synchronization mimics natural retronasal perception. Test pairings: warm low-fat milk foams with browned butter vapour, reduced-fat custards served under cream-scented cloches, or light dairy sauces with controlled aromatic enrichment at plating.",
    options: [

    ],
    citation: "Pirc Matja&#x17e;, Joosten Lieke, Pietersma Karleen, Hageman Cors, Bolhuis Dieuwerke, Boesveldt Sanne. (2025). Addition of retronasal milk fat odour during milk consumption increased liking without affecting intake.. Appetite. https://doi.org/10.1016/j.appet.2024.107832",
    articleId: "1624387a-73b0-498f-b29c-7152d18e8526",
    articleTitle: "Addition of retronasal milk fat odour during milk consumption increased liking without affecting intake.",
    articleUrl: "https://doi.org/10.1016/j.appet.2024.107832",
    topic: "flavor_science",
    needsRetag: false
  },
  {
    id: "4a580989-bb76-42b1-b949-2410db90e3a0::phronesis::250",
    register: "phronesis",
    sender: "kock",
    question: "When sourcing artisanal soy sauce, examine production methods specifying koji substrate type. Request samples comparing wheat-based versus soy-based koji fermentations, tasting side-by-side for umami depth and finish length. For custom fermentation projects, specify defatted soybean meal koji to suppliers aiming for intensified savory notes. Adjust seasoning ratios downward—the enhanced amino acid content means you'll need less volume for equivalent flavor impact in your dishes.",
    options: [

    ],
    citation: "Kai-Yao Chen, Na Zhang, Wen-Hu Liu, Cheng Wang, Yongxian Hu, Caihong Shen, Li Zeng, Ran Xu. (2025). Defatted Soybean Meal-Based Koji Promotes Flavor Development in Deyang Baiwo Soy Sauce: A Comparative Multi-Omics Study. Fermentation. https://doi.org/10.3390/fermentation11120685",
    articleId: "4a580989-bb76-42b1-b949-2410db90e3a0",
    articleTitle: "Defatted Soybean Meal-Based Koji Promotes Flavor Development in Deyang Baiwo Soy Sauce: A Comparative Multi-Omics Study",
    articleUrl: "https://doi.org/10.3390/fermentation11120685",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "8ee05ae1-d9dc-4f88-b2ae-f095643c484f::phronesis::251",
    register: "phronesis",
    sender: "värd",
    question: "You organize your spice station with botanical precision, separating true peppers from imposters. Black, white, and green peppercorns occupy dedicated grinders calibrated for different coarseness. Pink pepper stays whole for garnish, never ground for seasoning due to resinous brittleness. You taste each type daily, refreshing sensory memory of their distinct heat curves and aromatic profiles. When recipes specify 'pepper,' you determine intended function—background heat or foreground aroma—then select appropriately. You teach commis to bloom whole spices in fat, demonstrating how different peppers release compounds at varying rates.",
    options: [

    ],
    citation: "Pierina D&#xed;az-Guerrero, Sofia Panzani, Chiara Sanmartin, Chiara Muntoni, Isabella Taglieri, Francesca Venturi. (2025). \"Pepper\": Different Spices, One Name-Analysis of Sensory and Biological Aspects.. Molecules (Basel, Switzerland). https://www.mdpi.com/1420-3049/30/9/1891/pdf?version=1745480746",
    articleId: "8ee05ae1-d9dc-4f88-b2ae-f095643c484f",
    articleTitle: "\"Pepper\": Different Spices, One Name-Analysis of Sensory and Biological Aspects.",
    articleUrl: "https://www.mdpi.com/1420-3049/30/9/1891/pdf?version=1745480746",
    topic: "gastronomy",
    needsRetag: false
  },
  {
    id: "45a9470d-acc4-4112-99b1-061b97186ae9::phronesis::252",
    register: "phronesis",
    sender: "servitör",
    question: "The tasting menu needs a new course for next season. You're developing a wine-reduced sauce and notice inconsistent results from different cooks' reduction techniques. Understanding that swirling speed affects surface area exposure and evaporation rates, you establish a standardized pan-swirling protocol based on hydrodynamic principles. You specify the pan size, liquid volume, and rotational frequency that optimizes alcohol evaporation while concentrating flavors efficiently. During testing, you discover that controlled circular motion produces more uniform reductions in less time than random stirring. This scientific approach to a basic cooking technique gives your team reproducible results and helps you calculate precise cooking times for consistent sauce viscosity across service.",
    options: [

    ],
    citation: "Martino Reclari, Matthieu Dreyer. (2011). \"Oenodynamic\": Hydrodynamic of wine swirling. arXiv. http://arxiv.org/abs/1110.3369v1",
    articleId: "45a9470d-acc4-4112-99b1-061b97186ae9",
    articleTitle: "\"Oenodynamic\": Hydrodynamic of wine swirling",
    articleUrl: "http://arxiv.org/abs/1110.3369v1",
    topic: "sommellerie",
    needsRetag: false
  },
  {
    id: "466a0d4b-dd72-40d3-85e6-35412cea2b4f::phronesis::253",
    register: "phronesis",
    sender: "kock",
    question: "When developing sweet dishes, rely on your palate and trained tasters rather than solely on sweetener concentration data. Test sweetness perception across your full dish composition, not isolated ingredients. Document how different sweeteners perform in actual recipes under real cooking conditions—heat, pH, fat content—since laboratory receptor studies may not predict kitchen behavior accurately.",
    options: [

    ],
    citation: "Rani P Venkitakrishnan, Manojendu Choudhury. (2015). Importance of method validation: Implications of non-correlated observables in sweet taste receptor studies. arXiv. http://arxiv.org/abs/1511.07977v1",
    articleId: "466a0d4b-dd72-40d3-85e6-35412cea2b4f",
    articleTitle: "Importance of method validation: Implications of non-correlated observables in sweet taste receptor studies",
    articleUrl: "http://arxiv.org/abs/1511.07977v1",
    topic: "food_science",
    needsRetag: false
  },
  {
    id: "88257ad6-f52a-46e0-8b0d-77af55e67695::phronesis::254",
    register: "phronesis",
    sender: "kock",
    question: "Align your aromatic signature with menu language consistently. When you describe a dish as 'herb-crusted' or 'smoke-infused,' ensure the dominant aroma reaching the table matches that descriptor within seconds of plate arrival. Test this by having servers present dishes at arm's length—the scent should telegraph the written promise. For specials boards near the kitchen, time high-aroma cooking (garlic, roasting, baking bread) to coincide with peak reading moments. Revise descriptions that create expectation-aroma mismatches.",
    options: [

    ],
    citation: "Doris Schicker, Putu A Khorisantono, Q&#xeb;ndresa Rramani Dervishi, Shirley X L Lim, Elodie Saruco, Burkhard Pleger, Johannes Schultz, Kathrin Ohla, Jessica Freiherr. (2025). Smell the Label: Odors Influence Label Perception and Their Neural Processing.. The Journal of neuroscience : the official journal of the Society for Neuroscience. https://doi.org/10.1523/JNEUROSCI.1159-24.2024",
    articleId: "88257ad6-f52a-46e0-8b0d-77af55e67695",
    articleTitle: "Smell the Label: Odors Influence Label Perception and Their Neural Processing.",
    articleUrl: "https://doi.org/10.1523/JNEUROSCI.1159-24.2024",
    topic: "flavor_science",
    needsRetag: false
  },
  {
    id: "87717b7e-8820-42dd-bb4a-bc06b5fcf080::phronesis::255",
    register: "phronesis",
    sender: "kock",
    question: "Source aged cheeses that bridge familiar and novel flavor profiles—start with mild aged varieties like young Gouda or aged Manchego rather than intense blues or washed rinds. Present aged cheese within Moroccan flavor frameworks: pair with local honey, preserved lemons, or harissa to create familiarity anchors. Develop tasting progressions that educate palates gradually, moving from fresh to aged expressions of the same cheese family. Price menu items strategically, positioning aged cheese dishes as accessible luxury rather than extreme premium. Create descriptive menu language that emphasizes craftsmanship and maturation rather than foreign origin alone.",
    options: [

    ],
    citation: "Nouhayla Mouatadid, Mourad Oukheda, Mustapha Khiati, Rachid Saile, Anass Kettani. (2025). Determinants of aged cheese consumer preferences in Morocco-a cross-sectional study of economic, cultural, and social factors influencing purchasing behaviors.. Frontiers in nutrition. https://www.frontiersin.org/journals/nutrition/articles/10.3389/fnut.2025.1600873/pdf",
    articleId: "87717b7e-8820-42dd-bb4a-bc06b5fcf080",
    articleTitle: "Determinants of aged cheese consumer preferences in Morocco-a cross-sectional study of economic, cultural, and social factors influencing purchasing behaviors.",
    articleUrl: "https://www.frontiersin.org/journals/nutrition/articles/10.3389/fnut.2025.1600873/pdf",
    topic: "nutritional_science",
    needsRetag: false
  },
  {
    id: "906b1e82-9774-4215-b97d-f8c91004aed4::phronesis::256",
    register: "phronesis",
    sender: "kock",
    question: "Source Seomoktae beans and soak for 8-12 hours before grinding into fine slurry. Maintain fermentation temperature at 37-42°C for optimal bacterial activity. Monitor pH hourly during initial fermentation—stop when you reach 4.3-4.5 for balanced tang. Strain through cheesecloth to achieve desired smoothness. Use fermented base in sauces, dressings, or desserts within 5 days. Adjust sweetness to balance pronounced acidity and earthy bean notes.",
    options: [

    ],
    citation: "Eun Ah Sim, Hyeonbin Kim, Seon‐Young Kim, Eun‐Gyung Mun. (2025). Fermentation and Bioactivity Properties in Small Black Soybean (Seomoktae)-Enriched Fermented Soymilk. Fermentation. https://doi.org/10.3390/fermentation11120655",
    articleId: "906b1e82-9774-4215-b97d-f8c91004aed4",
    articleTitle: "Fermentation and Bioactivity Properties in Small Black Soybean (Seomoktae)-Enriched Fermented Soymilk",
    articleUrl: "https://doi.org/10.3390/fermentation11120655",
    topic: "fermentation_science",
    needsRetag: false
  },
  {
    id: "80517fe0-e121-42a0-a475-02806f94bf04::phronesis::257",
    register: "phronesis",
    sender: "värd",
    question: "Your sous chef brings you an unexpected ingredient. This research on gastronomy tourism reminds you that local, distinctive ingredients create the special interest experiences that attract culinary travelers. You decide to feature this ingredient prominently, researching its regional significance and traditional preparations. Rather than masking it in familiar techniques, you showcase its uniqueness as Budapest chefs do with paprika and mangalica pork. You explain to your sous chef that understanding your restaurant as a potential tourism draw—not just a dining venue—means celebrating ingredients that tell your location's story. This research demonstrates that tourists increasingly seek authentic, place-based culinary experiences. You transform this unexpected ingredient into a signature dish that positions your kitchen within the special interest gastronomy market.",
    options: [

    ],
    citation: "Ivett Sziva, Melanie Smith. (2025). Gastronomy as a special interest tourism product in Budapest. Worldwide Hospitality and Tourism Themes. https://doi.org/10.1108/whatt-01-2025-0031",
    articleId: "80517fe0-e121-42a0-a475-02806f94bf04",
    articleTitle: "Gastronomy as a special interest tourism product in Budapest",
    articleUrl: "https://doi.org/10.1108/whatt-01-2025-0031",
    topic: "gastronomy",
    needsRetag: false
  },
  {
    id: "a2bfc7a2-b3f5-48a2-9806-1ef7a29c3b00::phronesis::258",
    register: "phronesis",
    sender: "servitör",
    question: "Prep begins at 7am and the kitchen is still cold. Your sous mentions a new wine pairing app based on graph technology while you're planning tonight's special. You consider how breaking dishes into component nodes—protein, fat, acid, cooking method—might change your collaboration with the sommelier. The graph concept makes you think differently about ingredient relationships, seeing your ragout not as a unified dish but as intersecting flavor nodes. Maybe the wine should pair with the pork's sweetness rather than the sauce's acidity. But you're skeptical: the system wasn't validated against actual dining experiences. Graphs can't taste the Maillard reaction on your seared meat or know how your plating temperature affects wine perception. Still, it offers a structured conversation starter for your next tasting meeting.",
    options: [

    ],
    citation: "Zuzanna Gawrysiak, Agata Żywot. (2024). WineGraph: A Graph Representation For Food-Wine Pairing. arXiv. http://arxiv.org/abs/2407.00107v2",
    articleId: "a2bfc7a2-b3f5-48a2-9806-1ef7a29c3b00",
    articleTitle: "WineGraph: A Graph Representation For Food-Wine Pairing",
    articleUrl: "http://arxiv.org/abs/2407.00107v2",
    topic: "sommellerie",
    needsRetag: false
  },
  {
    id: "a66adb5a-6fb5-4551-9338-4a9e66ad6c65::phronesis::259",
    register: "phronesis",
    sender: "kock",
    question: "When introducing new vegetables or bitter ingredients, acknowledge that your diners' comfort with these flavors began before birth. Build bridges by pairing unfamiliar bitter notes with familiar sweet or umami elements that may trigger prenatal memories. Gradually increase intensity of challenging flavors across courses, respecting that aversion to bitterness has deep biological roots. Use sweetness strategically—not as mask but as companion—to create approachability that honors both learned preferences and innate responses.",
    options: [

    ],
    citation: "Beyza Ustun-Elayan, Jacqueline Blissett, Judith Covey, Benoist Schaal, Nadja Reissland. (2025). Flavor learning and memory in utero as assessed through the changing pattern of olfactory responses from fetal to neonatal life.. Appetite. https://doi.org/10.1016/j.appet.2025.107891",
    articleId: "a66adb5a-6fb5-4551-9338-4a9e66ad6c65",
    articleTitle: "Flavor learning and memory in utero as assessed through the changing pattern of olfactory responses from fetal to neonatal life.",
    articleUrl: "https://doi.org/10.1016/j.appet.2025.107891",
    topic: "flavor_science",
    needsRetag: false
  },
  {
    id: "a8a67346-a564-4900-b1f5-e55d14d01f38::phronesis::260",
    register: "phronesis",
    sender: "kock",
    question: "Build perceived saltiness through flavor layering: incorporate umami bases (mushrooms, tomatoes, aged cheese, soy products) early in cooking to establish savory depth. Add aromatics (garlic, herbs, spices) during development phases. Introduce acid (citrus, vinegar) near completion to brighten and stimulate saliva. Apply finishing salt to food surfaces rather than distributing throughout, maximizing tongue contact. Combine pungent elements (black pepper, mustard, chili) for trigeminal boost. Taste repeatedly during cooking, allowing palate recovery between assessments to evaluate true saltiness perception.",
    options: [

    ],
    citation: "Xiaohan Li, Bolin Shi, Rui Chen, Hehe Li, Lulu Zhang, Lei Zhao. (2025). Sodium Reduction Through Sensory Interactions With NaCl: Strategies and Underlying Mechanisms.. Food science & nutrition. https://doi.org/10.1002/fsn3.70548",
    articleId: "a8a67346-a564-4900-b1f5-e55d14d01f38",
    articleTitle: "Sodium Reduction Through Sensory Interactions With NaCl: Strategies and Underlying Mechanisms.",
    articleUrl: "https://doi.org/10.1002/fsn3.70548",
    topic: "flavor_science",
    needsRetag: false
  },
  {
    id: "05f55d82-530a-4f3a-a407-7e8a279eb3c3::phronesis::261",
    register: "phronesis",
    sender: "servitör",
    question: "The tasting menu needs a new course for next season. You consider incorporating champagne foam stabilized by its natural glycoproteins as a structural element in a dish, perhaps capturing the collar in a preparation that maintains its texture. Understanding that mannoproteins from yeast create stability suggests you could experiment with combining champagne reduction with other yeast-derived ingredients to amplify foam persistence. You envision a delicate sabayon or emulsion that leverages these same amphiphilic properties. However, you recognize the research focuses on champagne in glasses, not culinary applications, so extensive testing will be necessary to translate molecular principles into reliable cooking techniques.",
    options: [

    ],
    citation: "Véronique Aguié-Beghin, Zouleika Abdallah. (2019). Champagne Bubbles : Isolation and Characterization of amphiphilic macromolecules responsible for the stability of the collar at the Champagne / air interface. arXiv. http://arxiv.org/abs/1904.09194v1",
    articleId: "05f55d82-530a-4f3a-a407-7e8a279eb3c3",
    articleTitle: "Champagne Bubbles : Isolation and Characterization of amphiphilic macromolecules responsible for the stability of the collar at the Champagne / air interface",
    articleUrl: "http://arxiv.org/abs/1904.09194v1",
    topic: "sommellerie",
    needsRetag: false
  },
  {
    id: "c8c0b32f-0f5a-4b9b-9142-48d0d2ed2093::phronesis::262",
    register: "phronesis",
    sender: "värd",
    question: "You design your kitchen workflow to deliberately manage olfactory sequences reaching the dining room. Map your cooking processes to identify which stages produce the most appetizing aromas—caramelizing onions, reducing stocks, baking bread—and time these to coincide with guest arrival or pre-meal periods to prime appetite. Practice controlling odor intensity through ventilation adjustments: enhance aromatic release when you want to build anticipation, suppress it when preparing components that might create incongruent sensory cues. Develop techniques for finishing dishes tableside or near guests to deliver fresh aromatic impact at the moment of presentation. Train your brigade to recognize how cooking odors influence guest expectations and portion selection; coordinate high-aroma preparations with service flow. Refine your understanding of congruence by deliberately pairing ambient kitchen scents with menu composition—if your dining room smells of roasting meat, ensure your menu offerings align with those olfactory expectations.",
    options: [

    ],
    citation: "Jiachun Li, Xinmeng Yang, René de Wijk, Arianne van Eck, Sanne Boesveldt. (2026). Effects of food-related odors on eating behavior: A systematic review. Appetite. https://doi.org/10.1016/j.appet.2026.108570",
    articleId: "c8c0b32f-0f5a-4b9b-9142-48d0d2ed2093",
    articleTitle: "Effects of food-related odors on eating behavior: A systematic review",
    articleUrl: "https://doi.org/10.1016/j.appet.2026.108570",
    topic: "food_psychology",
    needsRetag: false
  },
  {
    id: "b0453ecc-4063-4e20-95e1-2087ed9b46e9::phronesis::263",
    register: "phronesis",
    sender: "värd",
    question: "You master techniques that preserve bioactive compounds during cooking: quick blanching retains vitamins, low-temperature methods protect omega-3s, and fermentation develops probiotics. Practice building dishes where functional ingredients enhance rather than compromise flavor—turmeric in golden sauces, chia in textured elements, prebiotic vegetables prepared to optimize both taste and fiber content. Develop workflows that maintain nutrient integrity from storage through service. Train your hands to recognize ingredient quality that maximizes both functional and culinary value. Build recipe templates that systematically incorporate functional elements into established preparations.",
    options: [

    ],
    citation: "&#x15e;enay Bur&#xe7;in Alkan, Hilal &#xd6;z, Berna Madal&#x131; Kafes, Hasan H&#xfc;seyin Kara. (2025). Comparison of Students' Attitudes and Knowledge Regarding Functional Foods in Gastronomy, Food Science, and Nutrition Programs.. Food science & nutrition. https://onlinelibrary.wiley.com/doi/pdfdirect/10.1002/fsn3.70321",
    articleId: "b0453ecc-4063-4e20-95e1-2087ed9b46e9",
    articleTitle: "Comparison of Students' Attitudes and Knowledge Regarding Functional Foods in Gastronomy, Food Science, and Nutrition Programs.",
    articleUrl: "https://onlinelibrary.wiley.com/doi/pdfdirect/10.1002/fsn3.70321",
    topic: "gastronomy",
    needsRetag: false
  },
  {
    id: "b3cedfe5-6380-487e-9c9e-aa7c6c4552fc::phronesis::264",
    register: "phronesis",
    sender: "servitör",
    question: "The kitchen is mid-service and a technique is not working. While this research focuses on wine ratings rather than culinary technique, it reminds you that diner satisfaction is partly constructed through expectation management. The front-of-house team's descriptions of your dishes—their confidence, the stories they tell—shape how guests perceive flavors before the first bite. You cannot fix the current technical issue with psychology alone, but you make a note to brief servers differently tomorrow. Their conviction when presenting a dish primes the palate. This doesn't excuse poor execution, but it acknowledges that taste is never purely objective, and your team's belief in your food matters more than you realized.",
    options: [

    ],
    citation: "David Priilaid, Jesse Feinberg. (2009). Follow the leader: How expert ratings mediate consumer assessments of hedonic quality. South African Journal of Business Management. https://doi.org/10.4102/sajbm.v40i4.550",
    articleId: "b3cedfe5-6380-487e-9c9e-aa7c6c4552fc",
    articleTitle: "Follow the leader: How expert ratings mediate consumer assessments of hedonic quality",
    articleUrl: "https://doi.org/10.4102/sajbm.v40i4.550",
    topic: "sommellerie",
    needsRetag: false
  },
  {
    id: "9bfdca57-003e-4abf-91b6-d878ad22f866::phronesis::265",
    register: "phronesis",
    sender: "kock",
    question: "Position your probe at the thickest part of the breast, avoiding contact with bone or pan surfaces. For convection cooking, reduce your standard timing by 20-25% while maintaining target temperatures. Cross-reference probe readings with visual and tactile cues—firm yet springy texture indicates doneness. Keep detailed logs of cooking times for different breast weights to build your predictive instincts.",
    options: [

    ],
    citation: "Giulia Romano, Maria Cristina Nicoli. (2024). Predictive modeling for optimal chicken breast cooking across diverse methods and temperatures. LWT. https://doi.org/10.1016/j.lwt.2024.117051",
    articleId: "9bfdca57-003e-4abf-91b6-d878ad22f866",
    articleTitle: "Predictive modeling for optimal chicken breast cooking across diverse methods and temperatures",
    articleUrl: "https://doi.org/10.1016/j.lwt.2024.117051",
    topic: "culinary_science",
    needsRetag: false
  },
  {
    id: "78385b31-ae2f-42ef-905d-46b5d6c71296::phronesis::266",
    register: "phronesis",
    sender: "servitör",
    question: "The kitchen is mid-service and a technique is not working. While this research focuses specifically on wine sensory assessment rather than culinary technique, the core finding about typicity applies when you're developing dishes meant to represent a cuisine or region. You recognize that your trained understanding of 'authentic' flavors may differ dramatically from guest expectations shaped by their personal experiences. A technically correct cassoulet might disappoint someone whose typicity benchmark is their grandmother's version. This insight doesn't solve your immediate technical problem, but reminds you that perceived authenticity involves both objective markers and subjective familiarity—knowledge useful for menu descriptions and managing expectations.",
    options: [

    ],
    citation: "Lira Souza Gonzaga, Dimitra L. Capone. (2020). Defining wine typicity: sensory characterisation and consumer perspectives. Australian Journal of Grape and Wine Research. https://doi.org/10.1111/ajgw.12474",
    articleId: "78385b31-ae2f-42ef-905d-46b5d6c71296",
    articleTitle: "Defining wine typicity: sensory characterisation and consumer perspectives",
    articleUrl: "https://doi.org/10.1111/ajgw.12474",
    topic: "sommellerie",
    needsRetag: false
  },
  {
    id: "c2bab81e-4279-4ce5-bbf0-bf2a8a60f16b::phronesis::267",
    register: "phronesis",
    sender: "värd",
    question: "Select plate colors that amplify your dish's intended emotional register. Pair red plates with high-protein mains and robust flavors to leverage arousal and appetite stimulation. Use yellow surfaces for comfort-oriented dishes—risottos, roasted vegetables, warm desserts—to enhance feelings of positivity and satisfaction. Avoid blue plating for most applications due to appetite suppression, reserving it for intentionally minimal, intellectual, or challenging preparations. Test color-food combinations systematically: present identical dishes on different colored plates to your team and document emotional reactions. Build a plating palette aligned with your menu's emotional arc, ensuring chromatic choices reinforce rather than contradict flavor intentions.",
    options: [

    ],
    citation: "Jarbas Silva, Francisca Elis&#xe2;ngela Lima, Clarisse Souza, Bruno Moreira-Leite, Paulo Sousa. (2025). The Influence of Food Colors on Emotional Perception and Consumer Acceptance: A Sensory and Emotional Profiling Approach in Gastronomy.. Foods (Basel, Switzerland). https://doi.org/10.3390/foods14223818",
    articleId: "c2bab81e-4279-4ce5-bbf0-bf2a8a60f16b",
    articleTitle: "The Influence of Food Colors on Emotional Perception and Consumer Acceptance: A Sensory and Emotional Profiling Approach in Gastronomy.",
    articleUrl: "https://doi.org/10.3390/foods14223818",
    topic: "art_science",
    needsRetag: false
  },
  {
    id: "fb46d38b-1af5-4b0e-ab2e-f600a1d4a642::phronesis::268",
    register: "phronesis",
    sender: "servitör",
    question: "Source ingredients from specific geographic origins and maintain traceability to capture terroir-associated microbial signatures in your cooking. When working with fermented or aged components, recognize that indigenous microorganisms contribute flavor dimensions beyond recipe formulation. Develop relationships with producers who understand site-specific biological characteristics—vineyard location, orchard microclimate, pasture ecology—as these influence ingredient behavior in your kitchen. Document how ingredients from different sources perform differently in identical preparations, building empirical knowledge of provenance effects that reflect underlying microbial variation.",
    options: [

    ],
    citation: "Antonella Lamontanara, Loredana Canfora, Andrea Manfredini, Michele Lamprillo, Luigi Orrù, Artur Miszczak, Eligio Malusà. (2025). A Local Microbiome Survey of Vineyards Representative of the Barbera d’Asti Wine Territory. Australian Journal of Grape and Wine Research. https://doi.org/10.1155/ajgw/2530557",
    articleId: "fb46d38b-1af5-4b0e-ab2e-f600a1d4a642",
    articleTitle: "A Local Microbiome Survey of Vineyards Representative of the Barbera d’Asti Wine Territory",
    articleUrl: "https://doi.org/10.1155/ajgw/2530557",
    topic: "sommellerie",
    needsRetag: false
  },
  {
    id: "fe0f64f9-2ab7-46b1-9f8f-778758b9ec8c::phronesis::269",
    register: "phronesis",
    sender: "värd",
    question: "A new dish is taking shape on your cutting board. You've nailed the flavors, but now you're thinking about how it reads through a camera lens. The research on social media food aesthetics showed that close-up angles, natural lighting, and negative space drive engagement—patterns your dishes need to accommodate. You adjust the plating: a tighter composition, height for dimension, a single bright element for focal contrast. That microgreen garnish isn't just finishing the dish; it's creating visual texture that translates digitally. You plate a test version and photograph it under the kitchen's natural light. The colors pop, the textures are distinct. Every diner will photograph this before tasting, and those images become your marketing. Understanding these aesthetic algorithms doesn't compromise your culinary vision—it ensures your food communicates effectively in the space where most people first encounter it.",
    options: [

    ],
    citation: "Alessandro Gambetti, Qiwei Han. (2022). Camera eats first: exploring food aesthetics portrayed on social media using deep learning. International Journal of Contemporary Hospitality Management. https://doi.org/10.1108/ijchm-09-2021-1206",
    articleId: "fe0f64f9-2ab7-46b1-9f8f-778758b9ec8c",
    articleTitle: "Camera eats first: exploring food aesthetics portrayed on social media using deep learning",
    articleUrl: "https://doi.org/10.1108/ijchm-09-2021-1206",
    topic: "art_science",
    needsRetag: false
  },
  {
    id: "e379e343-05b5-4159-b277-961c33b60e9c::phronesis::270",
    register: "phronesis",
    sender: "värd",
    question: "The kitchen is mid-service and a technique is not working. Your attempt at deconstructed Hakka baked chicken isn't delivering the depth guests expect. This research reminds you that salt isn't merely seasoning—it's the soul of the dish, integral to both flavor development and cultural meaning. You pivot immediately, returning to the traditional salt-crust method as the non-negotiable core while modernizing only the accompaniments and plating. You realize your error was treating every element as equally adaptable. The paper's framework helps you distinguish between sacred techniques that define authenticity and peripheral elements open to innovation. Moving forward, you apply this lens to other heritage dishes on your menu, identifying which traditional methods must remain inviolate and which components can be reimagined without cultural loss.",
    options: [

    ],
    citation: "Sijia Liu, XiaoKe Zeng. (2025). \"Salt is the Soul of Hakka Baked Chicken\": Reimagining Traditional Chinese Culinary ICH for Modern Contexts Without Losing Tradition. arXiv. http://arxiv.org/abs/2505.02542v1",
    articleId: "e379e343-05b5-4159-b277-961c33b60e9c",
    articleTitle: "\"Salt is the Soul of Hakka Baked Chicken\": Reimagining Traditional Chinese Culinary ICH for Modern Contexts Without Losing Tradition",
    articleUrl: "http://arxiv.org/abs/2505.02542v1",
    topic: "food_anthropology",
    needsRetag: false
  },
  {
    id: "ab6efa97-5151-4b25-8957-88477e38531b::phronesis::271",
    register: "phronesis",
    sender: "värd",
    question: "You begin tasting your dishes in the dining room environment, not just in the kitchen. You walk plates through the service space, noting how ambient temperature affects the perception of seasoning and richness. You adjust your final seasoning protocol to account for the dining room's acoustic level—knowing louder environments require bolder flavors to register clearly. You develop workflows where expedited dishes are calibrated to the service environment: lighter, fresher preparations for bright, energetic spaces; richer, more aromatic dishes for intimate, subdued atmospheres. You train your cooks to consider destination environment when finishing plates, building a kitchen practice where environmental awareness shapes final adjustments to temperature, seasoning, and aromatic intensity.",
    options: [

    ],
    citation: "Charles Spence, Betina Piqueras‐Fiszman. (2014). How Important is Atmosphere to the Perfect Meal?. https://doi.org/10.1002/9781118491003.ch9",
    articleId: "ab6efa97-5151-4b25-8957-88477e38531b",
    articleTitle: "How Important is Atmosphere to the Perfect Meal?",
    articleUrl: "https://doi.org/10.1002/9781118491003.ch9",
    topic: "multisensory",
    needsRetag: false
  },
];

// Split by register for O(1) filtering in the reducer.
export const KNOWLEDGE_BANK_BY_REGISTER: Record<BankRegister, readonly BankQuestion[]> = {
  episteme:  KNOWLEDGE_BANK.filter((q) => q.register === 'episteme'),
  techne:    KNOWLEDGE_BANK.filter((q) => q.register === 'techne'),
  phronesis: KNOWLEDGE_BANK.filter((q) => q.register === 'phronesis')
};

// Deterministic pick: pass an integer index; caller derives it from
// (seed, tick, register, sender) so the same fire replays the same
// question. Filters by sender when provided; falls back to any
// sender in the register when the filtered pool is empty.
export function pickBankQuestion(
  register: BankRegister,
  sender: BankSender | null,
  index: number
): BankQuestion | null {
  const pool = KNOWLEDGE_BANK_BY_REGISTER[register];
  if (pool.length === 0) return null;
  const filtered = sender ? pool.filter((q) => q.sender === sender) : pool;
  const chosen = filtered.length > 0 ? filtered : pool;
  const i = ((index % chosen.length) + chosen.length) % chosen.length;
  return chosen[i];
}

// Frame the bank question for a given context. Contract per
// ORDER 049 §3.3.a: frame is a leading sentence, not a rewrite.
// The question body is verbatim; only the wrapping varies.
//
//   bank_meeting: banker prefix + question
//   service:      role prefix + question (via SENDER_PREFIX in caller)
//   morning:      standalone question
//
// The service frame is left to the caller because it needs
// SENDER_PREFIX from scenarios.ts (which knows the game-facing
// English labels). This helper covers the two contexts that have
// a fixed leader.
export function frameBankQuestion(q: BankQuestion, context: BankContext): string {
  if (context === 'bank_meeting') return `Before we go to numbers — ${q.question}`;
  if (context === 'morning') return q.question;
  // 'service' — caller applies SENDER_PREFIX.
  return q.question;
}
