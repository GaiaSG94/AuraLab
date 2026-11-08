// AuraLab core — time services: clock, play/pause/reset/step wiring (no DOM inside).
export function createClock() {
  return {
    t: 0,
    running: true,
    advance(dt) {
      this.t += dt;
    },
    reset() {
      this.t = 0;
    },
  };
}
