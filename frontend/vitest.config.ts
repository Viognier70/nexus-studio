// Vitest configuration.
//
// ORDER 071 — testTimeout bumped from the vitest default (5000 ms)
// to 15000 ms because a handful of simulation tests advance many
// sim-ticks in a single case and hit the default on GitHub Actions'
// slower runners (locally they finish in <2 s but ubuntu-latest
// took 5–8 s on collapse/day tests). Not a code fix — the tests
// are honest; the runner is just slower. 15 s is generous enough
// that any true regression toward "test hangs" still surfaces.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    testTimeout: 15000
  }
});
