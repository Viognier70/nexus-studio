// orderIcons.ts — handgreppens ikoner. viewBox 0 0 24 24, linje 1,6 (1,2 vid 88 px och uppåt), runda ändar och hörn.
// stroke 'ink' = #2a1c13, 'brass' = #b98a3c (lågan), 'wine' = #8a2a36 (strålen). fill 'none' om inget annat står.
// Fällorna ritas som de rätta korten och har ingen egen färg.
type P = { d: string; stroke?: 'ink' | 'brass' | 'wine'; fill?: 'brass' };
export const ORDER_ICONS: Record<string, P[]> = {
  'order.show':   [{ d: 'M3.6 10.1h8.8l2.4 1h3.8v2h-3.8l-2.4 1H3.6a1.5 1.5 0 0 1-1.5-1.5v-1a1.5 1.5 0 0 1 1.5-1.5z' }, { d: 'M5.8 10.1v4M9.8 10.1v4' }, { d: 'M2.5 18h8.2c1.7 0 2.8-.5 3.8-1.5l2.6-2.3' }],
  'order.candle': [{ d: 'M10 11.5h4V20h-4z' }, { d: 'M7 20.5h10' }, { d: 'M12 11.5V10' }, { d: 'M12 3.2c1.6 1.9 2.1 3 2.1 4a2.1 2.1 0 0 1-4.2 0c0-1 .5-2.1 2.1-4z', stroke: 'brass', fill: 'brass' }],
  'order.pour':   [{ d: 'M10.6 1.8h2.8v3.4h-2.8z' }, { d: 'M12 5.6v6.2', stroke: 'wine' }, { d: 'M15.6 3.5h3.4' }, { d: 'M7.4 21.5h9.2c.7-3-1-5-2.6-5.9V12h-4v3.6c-1.6.9-3.3 2.9-2.6 5.9z' }],
  'order.serve':  [{ d: 'M3.2 21h9.2c.7-3-1-5-2.6-5.9V11H6v4.1C4.2 16 2.5 18 3.2 21z' }, { d: 'M15.9 21h3.6v-7.7c0-1.3-.9-1.8-.9-2.8V5.2h-1.8v5.3c0 1-.9 1.5-.9 2.8z' }],
  'order.hour':   [{ d: 'M2.8 21.2h9.2c.7-3-1-5-2.6-5.9V11.2H5.6v4.1c-1.6.9-3.3 2.9-2.8 5.9z' }, { d: 'M17.4 3.2a4.3 4.3 0 1 1 0 8.6a4.3 4.3 0 1 1 0-8.6z' }, { d: 'M17.4 5.2v2.4l1.6 1.1' }],
  'order.bar':    [{ d: 'M2 12.8h20' }, { d: 'M3.6 12.8V21M20.4 12.8V21' }, { d: 'M7.8 12.8h2.6V7.9c0-.8-.6-1.2-.6-1.9V3.4H8.4V6c0 .7-.6 1.1-.6 1.9z' }, { d: 'M13.8 5.6h3.4l-.4 3a1.3 1.3 0 0 1-2.6 0z' }, { d: 'M15.5 9.9v2.9' }]
};
