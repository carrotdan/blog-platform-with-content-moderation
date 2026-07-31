const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Allowed tags and attributes for blog content
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'blockquote', 'code', 'pre',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'div', 'span',
  'hr'
];

const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'target', 'rel'
];

// M23: DOMPurify's default ALLOWED_URI_REGEXP already permits http/https/mailto/tel
// and relative URLs while blocking javascript:/data:/vbscript: etc. We must NOT add
// href/src to URI_SAFE_ATTRIBUTES — doing so disables that URL validation entirely.
const ALLOWED_URI_REGEXP = /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

// M23: Force safe rel on any link that opens in a new tab (prevents tabnabbing).
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORCE_BODY: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false
  });
}

module.exports = {
  sanitizeHtml
};