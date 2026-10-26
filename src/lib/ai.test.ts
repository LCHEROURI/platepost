import { describe, expect, it } from 'vitest';
import { generateCaptions, suggestHashtags } from './ai';

describe('generateCaptions', () => {
  it('returns three suggestions mentioning the keywords and restaurant', async () => {
    const results = await generateCaptions({
      restaurantName: 'Luna Kitchen',
      category: 'promotion',
      keywords: ['happy hour'],
      tone: 'exciting',
    });
    expect(results).toHaveLength(3);
    for (const r of results) {
      expect(r.text.toLowerCase()).toContain('happy hour');
      expect(r.text).toContain('Luna Kitchen');
      expect(r.hashtags.length).toBeGreaterThan(0);
    }
  });

  it('falls back to category phrases when no keywords are given', async () => {
    const results = await generateCaptions({
      restaurantName: 'Luna Kitchen',
      category: 'food_fact',
      keywords: [],
      tone: 'informative',
    });
    expect(results).toHaveLength(3);
    for (const r of results) {
      expect(r.text.length).toBeGreaterThan(30);
    }
  });
});

describe('suggestHashtags', () => {
  it('returns unique, keyword-aware hashtags', () => {
    const tags = suggestHashtags('daily_special', ['Vegan Dish', 'vegan dish']);
    expect(tags.length).toBeGreaterThan(0);
    expect(new Set(tags).size).toBe(tags.length);
    expect(tags).toContain('vegandish');
  });
});
