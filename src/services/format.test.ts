import {
  countWords,
  estimateReadingMinutes,
  formatDuration,
  formatRelativeTime,
  hostnameFromUrl,
} from './format';

describe('countWords', () => {
  it('counts words and ignores extra whitespace', () => {
    expect(countWords('hello   world')).toBe(2);
    expect(countWords('  one ')).toBe(1);
  });

  it('returns 0 for empty input', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
  });
});

describe('estimateReadingMinutes', () => {
  it('rounds up to at least 1 minute for non-empty text', () => {
    expect(estimateReadingMinutes('a few words', 230)).toBe(1);
  });

  it('scales with length', () => {
    const text = Array.from({ length: 460 }, () => 'word').join(' ');
    expect(estimateReadingMinutes(text, 230)).toBe(2);
  });

  it('returns 0 for empty text', () => {
    expect(estimateReadingMinutes('')).toBe(0);
  });
});

describe('formatDuration', () => {
  it('formats minutes and seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65_000)).toBe('1:05');
  });

  it('formats hours when needed', () => {
    expect(formatDuration(3_661_000)).toBe('1:01:01');
  });

  it('guards against invalid input', () => {
    expect(formatDuration(-5)).toBe('0:00');
    expect(formatDuration(NaN)).toBe('0:00');
  });
});

describe('formatRelativeTime', () => {
  const now = 1_000_000_000_000;
  it('handles recent times', () => {
    expect(formatRelativeTime(now, now)).toBe('just now');
    expect(formatRelativeTime(now - 5 * 60_000, now)).toBe('5m ago');
    expect(formatRelativeTime(now - 3 * 3_600_000, now)).toBe('3h ago');
    expect(formatRelativeTime(now - 2 * 86_400_000, now)).toBe('2d ago');
  });
});

describe('hostnameFromUrl', () => {
  it('strips www and returns hostname', () => {
    expect(hostnameFromUrl('https://www.nytimes.com/path')).toBe('nytimes.com');
  });

  it('returns the input when not a URL', () => {
    expect(hostnameFromUrl('not a url')).toBe('not a url');
  });
});
