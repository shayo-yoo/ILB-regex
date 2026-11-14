const MAX_RULES = 64;
const MAX_INPUT_LENGTH = 1_000_000;
const MAX_PATTERN_LENGTH = 2_000;

export function createLiteralRemovalRule({ id, marker, enabled = true, scope = 'all' } = {}) {
  const text = String(marker ?? '');
  if (!text) throw new TypeError('marker must be a non-empty string');
  return { id: String(id ?? 'literal-marker'), enabled, scope, pattern: escapeRegExp(text), flags: 'g', replacement: '' };
}

export function inspectRegexRule(text, rule) {
  const input = validateInput(text, [rule]);
  if (!input.ok) return input;
  if (!isRuleApplicable(rule, 'all')) return { ok: true, matched: false, count: 0 };
  const compiled = compileRule(rule);
  if (!compiled.ok) return compiled;
  try {
    const matches = [...input.text.matchAll(cloneRegex(compiled.regex))];
    return { ok: true, matched: matches.length > 0, count: matches.length };
  } catch (error) {
    return { ok: false, matched: false, count: 0, error: `match failed: ${String(error?.message ?? error)}` };
  }
}

export function processText(text, rules = [], { scope = 'all' } = {}) {
  const input = validateInput(text, rules);
  if (!input.ok) return { ok: false, original: typeof text === 'string' ? text : '', text: typeof text === 'string' ? text : '', matched: false, matches: [], errors: [input.error] };
  if (!['all', 'display', 'prompt'].includes(scope)) return { ok: false, original: input.text, text: input.text, matched: false, matches: [], errors: ['scope must be all, display, or prompt'] };
  let output = input.text; let matched = false; const matches = []; const errors = [];
  const ordered = input.rules.slice(0, MAX_RULES);
  if (input.rules.length > MAX_RULES) errors.push(`rule limit exceeded; only first ${MAX_RULES} rules processed`);
  for (let index = 0; index < ordered.length; index += 1) {
    const rule = ordered[index]; if (!isRuleApplicable(rule, scope)) continue;
    const compiled = compileRule(rule);
    if (!compiled.ok) { errors.push(`${ruleId(rule, index)}: ${compiled.error}`); continue; }
    try {
      const found = [...output.matchAll(cloneRegex(compiled.regex))]; if (found.length === 0) continue;
      matched = true; matches.push({ ruleId: ruleId(rule, index), count: found.length, captures: found.map(match => ({ value: match[0], index: match.index ?? -1, groups: Array.from(match).slice(1), namedGroups: match.groups ? { ...match.groups } : {} })) });
      output = output.replace(compiled.regex, String(rule.replacement ?? ''));
    } catch (error) { errors.push(`${ruleId(rule, index)}: processing failed: ${String(error?.message ?? error)}`); }
  }
  return { ok: true, original: input.text, text: output, matched, matches, errors };
}

export function createIlbrService({ version = '1.0.0' } = {}) {
  return Object.freeze({ id: 'ILBR', version, processText, inspectRegexRule, createLiteralRemovalRule });
}

function validateInput(text, rules) {
  if (typeof text !== 'string') return { ok: false, error: 'text must be a string' };
  if (text.length > MAX_INPUT_LENGTH) return { ok: false, error: `text exceeds ${MAX_INPUT_LENGTH} characters` };
  if (!Array.isArray(rules)) return { ok: false, error: 'rules must be an array' };
  return { ok: true, text, rules };
}
function ruleId(rule, index) { const id = String(rule?.id ?? '').trim(); return id || `rule-${index + 1}`; }
function isRuleApplicable(rule, scope) { if (!rule || typeof rule !== 'object' || rule.enabled === false) return false; const ruleScope = ['all', 'display', 'prompt'].includes(rule.scope) ? rule.scope : 'all'; return ruleScope === 'all' || scope === 'all' || ruleScope === scope; }
function compileRule(rule) { if (!rule || typeof rule !== 'object') return { ok: false, error: 'rule must be an object' }; if (typeof rule.pattern !== 'string' || !rule.pattern) return { ok: false, error: 'pattern must be a non-empty string' }; if (rule.pattern.length > MAX_PATTERN_LENGTH) return { ok: false, error: `pattern exceeds ${MAX_PATTERN_LENGTH} characters` }; const flags = String(rule.flags ?? ''); if (/[^dgimsuvy]/.test(flags) || new Set(flags).size !== flags.length) return { ok: false, error: 'invalid regex flags' }; try { return { ok: true, regex: new RegExp(rule.pattern, flags) }; } catch (error) { return { ok: false, error: `invalid pattern: ${String(error?.message ?? error)}` }; } }
function escapeRegExp(text) { return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function cloneRegex(regex) { return new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`); }
