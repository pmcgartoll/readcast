import { chunkText } from './textChunk';

describe('chunkText', () => {
  it('returns empty array for empty input', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   ')).toEqual([]);
  });

  it('keeps short text as a single chunk', () => {
    expect(chunkText('One sentence here.', 100)).toEqual(['One sentence here.']);
  });

  it('packs sentences up to the limit without splitting them', () => {
    const text = 'Aaaa bbbb. Cccc dddd. Eeee ffff.';
    const chunks = chunkText(text, 22);
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(22));
    expect(chunks.join(' ')).toContain('Aaaa bbbb.');
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('hard-splits a single oversized sentence on word bounds', () => {
    const long = Array.from({ length: 50 }, () => 'word').join(' ');
    const chunks = chunkText(long, 30);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(30));
  });

  it('never loses content', () => {
    const text = 'Alpha beta. Gamma delta. Epsilon zeta theta.';
    const chunks = chunkText(text, 18);
    const recombined = chunks.join(' ').replace(/\s+/g, ' ');
    expect(recombined).toContain('Alpha beta');
    expect(recombined).toContain('Epsilon zeta theta');
  });
});
