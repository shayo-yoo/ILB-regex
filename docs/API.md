# ILBM / ILBR 第一周期接口草案

接口版本：ILBR 1.0.0；ILBM 0.1.0。第一周期范围仅供 ILB 系列扩展调用。

## ILBR

```js
import { createIlbrService, createIlbmMarkerRule } from './lib/ilbr-engine.js';
const ilbr = createIlbrService();
const result = ilbr.processText(rawText, [createIlbmMarkerRule()], { scope: 'prompt' });
```

`processText(text, rules, {scope})` 同步返回：

```js
{ ok, original, text, matched, matches:[{ruleId,count,captures:[{value,index,groups,namedGroups}]}], errors:[] }
```

规则字段：`id`、`enabled?`、`scope? ('all'|'display'|'prompt')`、`pattern`、`flags?`、`replacement`。规则由调用方传入；引擎不保存、不监听、不注入。坏规则逐项报错并跳过，不阻塞聊天。

## ILBM

`window.ILBM` 提供 `processText`、`processMarker`、`status`；ILB 系列可监听 `ilb-series:ready`，或查 `window.ILB_SERIES.memory`。ILBM 不修改 `window.ILB`。

`processMarker(text)` 返回：

- `original`: 未改原文；
- `triggered`: 是否包含 `(((ILBM)))`；
- `extractionText`: 去标记正文，只供提取器读取；
- `displayText`: 展示副本；
- `promptText`: 提示词副本；
- `matches/errors`: 诊断信息。

`onMarked` 回调仅在 Chat Completion `prompt-ready` 事件的 assistant 消息、且非 dry-run 时触发；附带临时 `sourceKey`（聊天 ID/数组索引/内容哈希）供调用方本次处理幂等参考。该 key 不是永久记录 ID；稳定 message/swipe ID 未完成接口验证前，不可将其当存储主键。`GENERATE_AFTER_DATA` 当前只做字符串净化，不触发记忆持久化。

## ILBM Memory API

`window.ILBM_MEMORY`（以及 `window.ILBM_MEMORY` 的 `ILB_SERIES` 适配）提供当前聊天的记忆管理能力：

- `inspect()`：返回 entities、records、settings、failures、currentState、replay、lastChange 和 eventAdapter。
- `registerEntity({name,type,aliases?})`：注册实体，同名自动编号。
- `addRecord(record)`：添加手动事件记录；程序生成稳定记录 ID。
- `previewCandidates(payload, meta?)`：校验候选事件但不保存。
- `importCandidates(payload, meta?)`：校验并保存合法候选事件。
- `importCandidateResponse(raw, meta?)`：解析 AI 文本后再进入候选校验。
- `extractCandidates(text, {extract?,timeoutMs?})`：可注入 AI 适配器；默认不调用模型。
- `buildMemoryText({currentFloor?,tokenBudget?})`：生成当前状态/历史回放预览。
- `injection.enable()` / `injection.apply()` / `injection.disable()`：记忆 extension prompt 注入；默认关闭，只有用户明确操作才写入。
- `removeRecord(id)`、`removeEntity(id)`、`reset()`：显式管理数据。

失败时返回诊断或抛出可读错误；失败不会阻塞聊天。候选事件必须先预览/校验，AI 不直接拥有最终存储权。

## ST 适配时序

- 显示：`getContext().messageFormatter.addHook()`，`beforeRegex`、early 顺序。只返回展示转换字符串，不保存到 chat。
- Chat Completion：监听 `CHAT_COMPLETION_PROMPT_READY`，处理事件载荷 chat 的纯文本 content。ST `ChatCompletion.getChat()` 将内部集合展平成新数组/新消息对象，事件在 `prepareOpenAIMessages()` 返回发送调用方前触发，故修改只作用请求副本，不改 `context.chat`。
- 其它生成路径：监听 `GENERATE_AFTER_DATA`，只处理 `generate_data.prompt` 或 `input` 字符串；不处理其它字段，不会改原始聊天。此路径与不同 completion backend 的载荷覆盖仍需版本实测。
- Chat Completion `onMarked` 仅对非 dry-run assistant 消息调用；`sourceKey` 是聊天 ID/请求数组索引/内容哈希的短期提示，不是记录主键。历史消息随每轮重复出现在 prompt 中，因此持久层之后必须用稳定 message/swipe ID 去重。
- `GENERATE_AFTER_DATA` 目前仅净化字符串 prompt/input，不调用 `onMarked`；通用 backend 未取得稳定消息身份前不触发记忆写入。
- `dryRun === true` 可净化预览，但不得调用记忆写入回调。
- 多模态消息仅支持单 text block；带图片/音频/工具等复杂 content 保持原样，不能保证这些形态隐藏标记。
