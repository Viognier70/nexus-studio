// ORDER 285 — rummet bakom panelerna graderas varmt (Designs leverans
// 2026-09-29, WARM.roomGrade): morgonen gyllene, servicen levande ljus och
// tiden efter stängning dämpad. Komponenten skriver bara dagens del på
// <body>; filtret sätts i strategic.css på scenens canvas.

import { useEffect } from 'react';
import { useSimState } from '../simulation/SimulationProvider';

export function RoomGrade() {
  const period = useSimState().day.period;
  const grade = period === 'dinner' || period === 'lunch' ? 'service' : period === 'evening' ? 'afterClose' : 'morning';
  useEffect(() => {
    document.body.dataset.roomGrade = grade;
    return () => { delete document.body.dataset.roomGrade; };
  }, [grade]);
  return null;
}
