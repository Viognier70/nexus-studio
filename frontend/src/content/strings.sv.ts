export const strings = {
  title: 'NEXUS',
  subtitle: 'Grythyttan — The Origin',
  busText:
    'Alla kommer hit med drömmar.\nIngen vet ännu vem de kommer att bli.',
  npc: {
    prompt: 'Är du också här för antagningen?',
    choices: {
      A: 'Ja. Jag vet bara inte riktigt vad jag kan bli.',
      B: 'Ja. Jag har drömt om att arbeta med gastronomi.',
      C: 'Jag är mest nyfiken på varför den här platsen betyder så mycket.'
    },
    responses: {
      A: 'Det är fler än du tror som säger så. Kanske är det just därför vi kommit hit.',
      B: 'Många vägar leder in i gastronomin. Se först vad platsen gör med dig.',
      C: 'Det märks. Var uppmärksam idag — Grythyttan brukar svara den som frågar.'
    }
  },
  objective: 'Hitta registreringen vid Sevillapaviljongen.',
  end: {
    heading: 'Din initiation börjar här.',
    continueButton: 'Utforska vidare',
    restartButton: 'Börja om'
  },
  pause: {
    title: 'Paus',
    resume: 'Fortsätt',
    restart: 'Börja om',
    muteOn: 'Ljud på',
    muteOff: 'Ljud av',
    controlsHeading: 'Kontroller',
    aboutHeading: 'Om denna prototyp',
    disclaimer:
      'Vertikal skiva 001. Alla platser, byggnader och personer i denna prototyp är stiliserade platshållare. Inget anspråk görs på arkitektonisk trohet eller rättigheter. Grythyttan och Sevillapaviljongen är verkliga platser som här används enbart som narrativ inspiration.'
  },
  controls: {
    desktop: [
      'W A S D eller pilar — gå',
      'Mus — se dig omkring',
      'Shift — gå fortare',
      'E — interagera',
      'Esc — paus'
    ],
    mobile: [
      'Vänster styrspak — gå',
      'Dra på skärmen — se dig omkring',
      'Knapp — interagera'
    ]
  },
  prompts: {
    talkTo: 'Prata',
    register: 'Registrera dig'
  },
  hud: {
    muteAria: 'Slå av ljudet',
    unmuteAria: 'Slå på ljudet',
    pauseLabel: 'Paus',
    soundLabel: 'Ljud',
    beginPlay: 'Fortsätt'
  },
  webglFallback: {
    title: 'Grafiken kan inte visas',
    body: 'Din webbläsare eller enhet stöder inte WebGL. Prototypen kräver hårdvaruaccelererad 3D-grafik.',
    quote:
      'Alla kommer hit med drömmar. Ingen vet ännu vem de kommer att bli.',
    restart: 'Försök igen'
  }
} as const;
