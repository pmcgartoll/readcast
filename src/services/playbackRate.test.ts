import {
  formatPlaybackRate,
  parsePlaybackRateInput,
  snapPlaybackRate,
} from './playbackRate';

describe('snapPlaybackRate', () => {
  it('snaps to 0.05 increments within range', () => {
    expect(snapPlaybackRate(1.23)).toBe(1.25);
    expect(snapPlaybackRate(1.22)).toBe(1.2);
    expect(snapPlaybackRate(0.48)).toBe(0.5);
    expect(snapPlaybackRate(3.5)).toBe(3);
  });
});

describe('formatPlaybackRate', () => {
  it('formats without redundant decimals', () => {
    expect(formatPlaybackRate(1)).toBe('1×');
    expect(formatPlaybackRate(1.25)).toBe('1.25×');
    expect(formatPlaybackRate(1.5)).toBe('1.5×');
  });
});

describe('parsePlaybackRateInput', () => {
  it('parses plain numbers and trailing multiply sign', () => {
    expect(parsePlaybackRateInput('1.27')).toBe(1.25);
    expect(parsePlaybackRateInput('1.25×')).toBe(1.25);
    expect(parsePlaybackRateInput('nope')).toBeNull();
  });
});
