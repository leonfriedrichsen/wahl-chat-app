import { describe, expect, it } from 'bun:test';
import {
  isBriefingSubscribed,
  parseBriefingParliaments,
  parseBriefingTopics,
} from './subscription';

describe('briefing selections', () => {
  it('accepts covered parliaments and drops duplicates', () => {
    expect(parseBriefingParliaments(['bundestag', 'bundestag'])).toEqual([
      'bundestag',
    ]);
  });

  it('refuses parliaments the feed does not cover yet', () => {
    expect(parseBriefingParliaments(['bundestag', 'landtag_st'])).toBeNull();
  });

  it('refuses an empty or malformed selection', () => {
    expect(parseBriefingParliaments([])).toBeNull();
    expect(parseBriefingParliaments('bundestag')).toBeNull();
    expect(parseBriefingTopics([42])).toBeNull();
  });

  it('accepts known topics but not the catch-all', () => {
    expect(parseBriefingTopics(['health_care', 'housing_rent'])).toEqual([
      'health_care',
      'housing_rent',
    ]);
    expect(parseBriefingTopics(['other'])).toBeNull();
  });

  it('treats only a live or pending subscription as subscribed', () => {
    expect(isBriefingSubscribed({ status: 'pending' })).toBe(true);
    expect(isBriefingSubscribed({ status: 'paused' })).toBe(true);
    expect(isBriefingSubscribed({ status: 'unsubscribed' })).toBe(false);
    expect(isBriefingSubscribed(null)).toBe(false);
  });
});
