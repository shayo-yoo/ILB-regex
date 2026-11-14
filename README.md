# ILBR

ILBR is the ILB-series on-demand regex/text processing service.

It does not clone the official SillyTavern Regex editor, does not install global regex rules, and does not listen to or mutate chat messages automatically.

## Use as a package/module

```js
import { createIlbrService, createLiteralRemovalRule } from './lib/ilbr-engine.js';
const ilbr = createIlbrService();
const result = ilbr.processText('text (((ILBM)))', [createLiteralRemovalRule({ marker: '(((ILBM)))' })]);
```

## ST extension entry

The `manifest.json` / `index.js` pair exposes `window.ILBR` and `window.ILB_SERIES.regex` when loaded as a third-party extension. ILBM can use its own bundled compatible engine or discover this service; neither side mutates the other extension's internals.

## Test

```sh
node --test tests/*.test.mjs
```
