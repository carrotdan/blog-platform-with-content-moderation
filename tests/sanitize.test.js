const { sanitizeHtml, sanitizeText } = require('../utils/sanitize');

describe('HTML Sanitization', () => {
  describe('sanitizeHtml', () => {
    test('should allow safe HTML tags', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      const output = sanitizeHtml(input);
      expect(output).toBe('<p>Hello <strong>world</strong></p>');
    });

    test('should remove script tags', () => {
      const input = '<script>alert("xss")</script><p>Safe</p>';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('<script>');
      expect(output).toBe('<p>Safe</p>');
    });

    test('should remove on* event handlers', () => {
      const input = '<img src="x" onerror="alert(1)">Safe';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('onerror');
    });

    test('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('javascript:');
    });

    test('should handle empty/null input', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(null)).toBe('');
      expect(sanitizeHtml(undefined)).toBe('');
    });

    test('should allow allowed attributes', () => {
      const input = '<a href="https://example.com" target="_blank">Link</a>';
      const output = sanitizeHtml(input);
      expect(output).toContain('href="https://example.com"');
    });

    test('should remove disallowed attributes', () => {
      const input = '<div style="color:red" onclick="evil()">Content</div>';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('onclick');
    });

    test('M23: should remove style attributes (CSS injection)', () => {
      const input = '<div style="position:fixed; z-index:9999; background:url(https://evil.com/track.gif)">Overlay</div>';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('style');
      expect(output).toBe('<div>Overlay</div>');
    });

    test('M23: should force rel=noopener noreferrer on target=_blank links', () => {
      const input = '<a href="https://example.com" target="_blank">Link</a>';
      const output = sanitizeHtml(input);
      expect(output).toContain('rel="noopener noreferrer"');
      expect(output).toContain('target="_blank"');
    });

    test('M23: javascript: URLs are stripped even with href allow-listed', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const output = sanitizeHtml(input);
      expect(output).not.toContain('javascript:');
    });
  });

  describe('sanitizeText', () => {
    test('should strip all HTML tags', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      const output = sanitizeText(input);
      expect(output).toBe('Hello world');
    });

    test('should handle empty input', () => {
      expect(sanitizeText('')).toBe('');
      expect(sanitizeText(null)).toBe('');
    });
  });
});