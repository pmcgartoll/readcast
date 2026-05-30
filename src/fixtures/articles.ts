/**
 * Canned article content for DEV_STUB_MODE. These let the agent (and you)
 * exercise the full ingest -> read -> listen loop in the web preview without a
 * backend or any TTS keys.
 */
export type StubArticle = {
  title: string;
  siteName: string;
  author?: string;
  excerpt: string;
  heroImageUrl?: string;
  paragraphs: string[];
};

export const STUB_ARTICLES: StubArticle[] = [
  {
    title: 'The Quiet Power of Reading Offline',
    siteName: 'Field Journal',
    author: 'Maya Ellison',
    excerpt:
      'Why saving things to read later, away from the feed, changes how we think about what we consume.',
    heroImageUrl: 'https://picsum.photos/seed/readcast1/800/400',
    paragraphs: [
      'There is a particular kind of calm that comes from reading something you chose on purpose. Not the next autoplaying clip, not the algorithm’s guess at your attention, but a piece you deliberately set aside for a quieter moment.',
      'Saving an article for later is a small act of intention. It says: this matters enough to return to. And when you do return, often on a walk or a commute, the words land differently. There is no infinite scroll waiting underneath them.',
      'Offline reading also removes the quiet anxiety of the live web. No comment counts ticking upward, no related links pulling sideways. Just the text, the way the writer meant it to be read.',
      'The same is true for listening. A well-read article becomes a companion for the parts of the day when your eyes are busy but your mind is free. The kitchen, the trail, the long drive home.',
      'In the end, the tools we use to read shape the thoughts we are able to have. Choosing to slow down, to save and return, is choosing to think a little more deeply.',
    ],
  },
  {
    title: 'Designing for the Car: Less Is the Whole Point',
    siteName: 'Interface Notes',
    author: 'Devin Park',
    excerpt:
      'CarPlay forces a discipline that the rest of our apps could learn from: show only what a glance can hold.',
    heroImageUrl: 'https://picsum.photos/seed/readcast2/800/400',
    paragraphs: [
      'The car is the most constrained screen most of us use daily. A driver can spare a glance, not a gaze. That single constraint reshapes every design decision.',
      'On CarPlay, lists are short, labels are large, and the next action is always obvious. There is no room for clever. The interface that wins is the one that disappears.',
      'Audio is the natural fit. Your hands stay on the wheel and your eyes on the road while the content comes to you. A queue of articles becomes a personal radio station of things you actually care about.',
      'The lesson travels well beyond the dashboard. Most apps would be better if they asked, for each element on screen: would this survive a two-second glance at 70 miles per hour?',
    ],
  },
  {
    title: 'How Text Becomes Voice',
    siteName: 'Signal & Noise',
    author: 'Priya Nair',
    excerpt:
      'A short tour of modern text-to-speech: from chunking long articles to stitching natural-sounding audio.',
    heroImageUrl: 'https://picsum.photos/seed/readcast3/800/400',
    paragraphs: [
      'Turning an article into audio sounds simple until you try it on something long. Models have limits, and a ten-thousand-word essay does not arrive as a single breath.',
      'The trick is chunking: split the text on sentence boundaries into pieces small enough to synthesize, then play them back seamlessly so the seams never show.',
      'Good systems generate the first chunk eagerly, so playback can begin within a second or two, while the rest renders in the background. The listener never waits for the whole thing.',
      'Voice quality has crossed a threshold recently. The best synthetic readers handle emphasis, pacing, and pauses well enough that a long article feels less like a robot and more like a patient narrator.',
    ],
  },
];

export function stubArticleForUrl(url: string): StubArticle {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash * 31 + url.charCodeAt(i)) >>> 0;
  }
  return STUB_ARTICLES[hash % STUB_ARTICLES.length];
}

/** A short, freely-usable sample audio clip used for stubbed playback. */
export const SAMPLE_AUDIO_URL =
  'https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg';
