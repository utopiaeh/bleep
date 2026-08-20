import { describe, expect, it } from 'vitest';
import {
  dedupeSitesByHostname,
  filterProtectedTargets,
  isProtectedSite,
  isValidHost,
  linkedOriginsFor,
  parseOriginMappings,
  siteScopedIds,
  tabCookieStoreId,
  tabDomain,
  tabOrigin,
} from './clearing';

describe('siteScopedIds', () => {
  it('keeps only origin-scoped types, drops history/downloads/formData', () => {
    const result = siteScopedIds(['cache', 'history', 'downloads', 'formData', 'cookies']);
    expect(result).toEqual(['cache', 'cookies']);
  });

  it('returns empty when nothing is site-scoped', () => {
    expect(siteScopedIds(['history', 'downloads'])).toEqual([]);
  });
});

describe('isValidHost', () => {
  it('accepts a plain domain', () => {
    expect(isValidHost('domain.com')).toBe(true);
  });

  it('accepts a domain with scheme and path', () => {
    expect(isValidHost('https://sso.domain.com/callback?x=1')).toBe(true);
  });

  it('accepts localhost', () => {
    expect(isValidHost('localhost')).toBe(true);
  });

  it('rejects a bare word with no TLD', () => {
    expect(isValidHost('asdasd')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidHost('')).toBe(false);
  });

  it('rejects whitespace-only input', () => {
    expect(isValidHost('   ')).toBe(false);
  });
});

describe('parseOriginMappings', () => {
  it('parses a single mapping with one target', () => {
    expect(parseOriginMappings('domain.com => auth.domain.com')).toEqual([
      { source: 'domain.com', targets: ['https://auth.domain.com'] },
    ]);
  });

  it('splits comma-separated targets and normalizes each to a full origin', () => {
    expect(parseOriginMappings('domain.com => https://a.com/path, b.com')).toEqual([
      { source: 'domain.com', targets: ['https://a.com', 'https://b.com'] },
    ]);
  });

  it('keeps the source exactly as typed (scheme and all)', () => {
    expect(parseOriginMappings('https://domain.com/foo => target.com')).toEqual([
      { source: 'https://domain.com/foo', targets: ['https://target.com'] },
    ]);
  });

  it('ignores lines with no =>', () => {
    expect(parseOriginMappings('not a mapping line')).toEqual([]);
  });

  it('ignores lines missing a source or all targets', () => {
    expect(parseOriginMappings(' => target.com\nsource.com => \nsource.com =>,,')).toEqual([]);
  });

  it('parses multiple lines independently', () => {
    expect(parseOriginMappings('a.com => x.com\nb.com => y.com')).toEqual([
      { source: 'a.com', targets: ['https://x.com'] },
      { source: 'b.com', targets: ['https://y.com'] },
    ]);
  });
});

describe('linkedOriginsFor', () => {
  const raw = 'domain.com => auth.domain.com';

  it('matches the exact source host', () => {
    expect(linkedOriginsFor(raw, 'https://domain.com')).toEqual(['https://auth.domain.com']);
  });

  it('matches a subdomain of the source', () => {
    expect(linkedOriginsFor(raw, 'https://app.domain.com')).toEqual(['https://auth.domain.com']);
  });

  it('ignores scheme and path on the active origin', () => {
    expect(linkedOriginsFor(raw, 'domain.com/some/path')).toEqual(['https://auth.domain.com']);
  });

  it('returns nothing for an unrelated site', () => {
    expect(linkedOriginsFor(raw, 'https://unrelated.com')).toEqual([]);
  });

  it('does not match a superstring host (evildomain.com vs domain.com)', () => {
    expect(linkedOriginsFor(raw, 'https://evildomain.com')).toEqual([]);
  });

  it('skips a mapping with an invalid-looking source', () => {
    expect(linkedOriginsFor('asdasd => auth.domain.com', 'https://asdasd')).toEqual([]);
  });

  it('skips a mapping with an invalid-looking target', () => {
    expect(linkedOriginsFor('domain.com => asdasd', 'https://domain.com')).toEqual([]);
  });

  it('flattens targets across multiple matching mappings', () => {
    const multi = 'domain.com => a.com\ndomain.com => b.com';
    expect(linkedOriginsFor(multi, 'https://domain.com')).toEqual(['https://a.com', 'https://b.com']);
  });
});

describe('dedupeSitesByHostname', () => {
  it('collapses multiple visits to the same host into one entry', () => {
    const urls = ['https://domain.com/a', 'https://domain.com/b', 'https://other.com'];
    expect(dedupeSitesByHostname(urls)).toEqual([
      { hostname: 'domain.com', origin: 'https://domain.com' },
      { hostname: 'other.com', origin: 'https://other.com' },
    ]);
  });

  it('keeps the origin of the first (most recent) occurrence', () => {
    const urls = ['http://domain.com/first', 'https://domain.com/second'];
    expect(dedupeSitesByHostname(urls)).toEqual([{ hostname: 'domain.com', origin: 'http://domain.com' }]);
  });

  it('skips missing and unparsable urls', () => {
    expect(dedupeSitesByHostname([undefined, 'not a url', 'https://domain.com'])).toEqual([
      { hostname: 'domain.com', origin: 'https://domain.com' },
    ]);
  });

  it('skips non-http(s) urls (chrome://, about:, file://)', () => {
    const urls = ['chrome://extensions/', 'about:blank', 'file:///Users/me/index.html', 'https://domain.com'];
    expect(dedupeSitesByHostname(urls)).toEqual([{ hostname: 'domain.com', origin: 'https://domain.com' }]);
  });

  it('returns an empty list for no input', () => {
    expect(dedupeSitesByHostname([])).toEqual([]);
  });
});

describe('tabOrigin / tabDomain / tabCookieStoreId', () => {
  it('extracts origin and hostname from a tab url', () => {
    const tab = { url: 'https://sub.domain.com:8443/path?x=1' };
    expect(tabOrigin(tab)).toBe('https://sub.domain.com:8443');
    expect(tabDomain(tab)).toBe('sub.domain.com');
  });

  it('returns null for a missing url', () => {
    expect(tabOrigin({})).toBeNull();
    expect(tabDomain({})).toBeNull();
  });

  it('returns null for an unparsable url', () => {
    expect(tabOrigin({ url: 'not a url' })).toBeNull();
    expect(tabDomain({ url: 'not a url' })).toBeNull();
  });

  it('reads the Firefox-only cookieStoreId field when present', () => {
    expect(tabCookieStoreId({ cookieStoreId: 'firefox-container-1' })).toBe('firefox-container-1');
    expect(tabCookieStoreId({})).toBeUndefined();
  });
});

describe('isProtectedSite', () => {
  const list = 'app.your-company.com\nother.com';

  it('matches an exact protected hostname', () => {
    expect(isProtectedSite(list, 'app.your-company.com')).toBe(true);
  });

  it('matches a subdomain of a protected hostname', () => {
    expect(isProtectedSite(list, 'sso.app.your-company.com')).toBe(true);
  });

  it('does not match an unrelated site', () => {
    expect(isProtectedSite(list, 'unrelated.com')).toBe(false);
  });

  it('does not match a superstring host', () => {
    expect(isProtectedSite(list, 'evilapp.your-company.com')).toBe(false);
  });

  it('treats an empty list as protecting nothing', () => {
    expect(isProtectedSite('', 'anything.com')).toBe(false);
  });
});

describe('filterProtectedTargets', () => {
  it('drops targets whose hostname is protected', () => {
    const targets = ['https://auth.domain.com', 'https://other.com'];
    expect(filterProtectedTargets(targets, 'auth.domain.com')).toEqual(['https://other.com']);
  });

  it('keeps everything when the protected list is empty', () => {
    const targets = ['https://auth.domain.com'];
    expect(filterProtectedTargets(targets, '')).toEqual(targets);
  });

  it('keeps everything when nothing matches', () => {
    const targets = ['https://a.com', 'https://b.com'];
    expect(filterProtectedTargets(targets, 'unrelated.com')).toEqual(targets);
  });
});
