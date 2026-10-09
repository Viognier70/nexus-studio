// @vitest-environment jsdom
// ORDER 321 — provspelets startskärm: valen och att Börja lämnar dem vidare. Kassan förifylls för steget.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ProvStart } from '../ProvStart';
import { defaultCashSek, PROV_WEEKS } from '../provState';

afterEach(cleanup);

describe('ORDER 321 — startskärmen', () => {
  it('väljer plats, vecka, kassa, väder och situation, och Börja lämnar valen vidare', () => {
    const onStart = vi.fn();
    render(<ProvStart onStart={onStart} />);
    expect((screen.getByTestId('prov-cash') as HTMLInputElement).value).toBe(String(defaultCashSek('foodtruck')));
    fireEvent.click(screen.getByTestId('prov-place-vinbar'));
    expect((screen.getByTestId('prov-cash') as HTMLInputElement).value).toBe(String(defaultCashSek('vinbar')));
    expect(screen.getByTestId('prov-week').querySelectorAll('option').length).toBe(PROV_WEEKS.length);
    fireEvent.change(screen.getByTestId('prov-week'), { target: { value: '5' } });
    fireEvent.change(screen.getByTestId('prov-cash'), { target: { value: '42000' } });
    fireEvent.change(screen.getByTestId('prov-weather'), { target: { value: 'cool' } });
    fireEvent.change(screen.getByTestId('prov-incident'), { target: { value: 'vb40-karaffen' } });
    fireEvent.click(screen.getByTestId('prov-begin'));
    expect(onStart).toHaveBeenCalledWith({ place: 'vinbar', week: 5, cashSek: 42000, weather: 'cool', incidentId: 'vb40-karaffen' });
  });
});
