import test from 'node:test';
import assert from 'node:assert/strict';
import { createIlbmMarkerRule, createIlbrService, inspectRegexRule, processText } from '../lib/ilbr-engine.js';

test('pure replacement returns original, output, match positions and captures', () => {
  const result = processText('a (((ILBM))) b', [createIlbmMarkerRule()]);
  assert.equal(result.ok, true);
  assert.equal(result.original, 'a (((ILBM))) b');
  assert.equal(result.text, 'a  b');
  assert.equal(result.matched, true);
  assert.equal(result.matches[0].captures[0].value, '(((ILBM)))');
});

test('literal helper safely escapes regex metacharacters', () => {
  const result = processText('[tag] (literal)+', [{ id: 'literal', pattern: '\\[tag\\] \\(literal\\)\\+', flags: '', replacement: 'ok' }]);
  assert.equal(result.text, 'ok');
});

test('caller rules run in declared order and return diagnostics', () => {
  const result = processText('abc', [
    { id: 'one', pattern: 'a', replacement: 'b' },
    { id: 'two', pattern: 'b', replacement: 'c' },
  ]);
  assert.equal(result.text, 'ccc');
  assert.deepEqual(result.matches.map((x) => x.ruleId), ['one', 'two']);
});

test('scope filters display and prompt rules independently', () => {
  const rules = [
    { id: 'd', scope: 'display', pattern: 'secret', replacement: '' },
    { id: 'p', scope: 'prompt', pattern: 'secret', replacement: '' },
  ];
  assert.equal(processText('secret', rules, { scope: 'display' }).text, '');
  assert.equal(processText('secret', rules, { scope: 'prompt' }).text, '');
  assert.equal(processText('secret', rules, { scope: 'all' }).text, '');
});

test('invalid regex is skipped and never throws or destroys input', () => {
  const result = processText('keep (((ILBM)))', [
    { id: 'broken', pattern: '(', replacement: '' },
    createIlbmMarkerRule(),
  ]);
  assert.equal(result.ok, true);
  assert.equal(result.text, 'keep ');
  assert.match(result.errors[0], /invalid pattern/i);
});

test('invalid input and safety limits fail closed', () => {
  assert.equal(processText(null, []).ok, false);
  assert.equal(processText('x', {}).ok, false);
  assert.equal(inspectRegexRule('x', { pattern: '(' }).ok, false);
  assert.equal(processText('x', [{ pattern: 'x', replacement: 'y'.repeat(10) }]).text, 'y'.repeat(10));
});

test('ILBR service exposes stable minimal API metadata', () => {
  const api = createIlbrService();
  assert.equal(api.id, 'ILBR');
  assert.equal(api.version, '1.0.0');
  assert.equal(api.processText('x', [{ pattern: 'x', replacement: 'y' }]).text, 'y');
});
