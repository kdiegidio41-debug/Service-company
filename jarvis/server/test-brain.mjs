/* Verifies the request we send to the Anthropic API, without calling it.
   Points the SDK at a local mock via ANTHROPIC_BASE_URL and asserts the body. */
import { createServer } from 'node:http';

let captured = null;
const mock = createServer((req, res) => {
  let raw = '';
  req.on('data', c => raw += c);
  req.on('end', () => {
    captured = { path: req.url, headers: req.headers, body: JSON.parse(raw) };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5',
      content: [{ type: 'text', text: 'Revenue is flat at $140.\nDo the three things.' }],
      stop_reason: 'end_turn', stop_details: null,
      usage: { input_tokens: 120, output_tokens: 40 }
    }));
  });
});
await new Promise(r => mock.listen(9955, r));
process.env.ANTHROPIC_BASE_URL = 'http://localhost:9955';

const { think } = await import('./brain.js');

let pass = 0, fail = 0;
const ok = (n, c, x='') => { c ? pass++ : fail++; console.log((c?'ok  ':'FAIL'), n, x); };

// --- missing key must be a clear error, not a crash ---
try {
  await think({}, 'strategist', {});
  ok('missing key errors', false);
} catch (e) { ok('missing key errors', /ANTHROPIC_API_KEY/.test(e.message), e.message); }

// --- unknown task names the valid ones ---
try {
  await think({ ANTHROPIC_API_KEY: 'k' }, 'nope', {});
  ok('unknown task errors', false);
} catch (e) { ok('unknown task errors', /strategist/.test(e.message), e.message); }

// --- the real request shape ---
const res = await think({ ANTHROPIC_API_KEY: 'sk-test' }, 'strategist',
                        { revenue: { last7: 140 } }, 'growth');
const b = captured.body;
ok('model is opus 5',        b.model === 'claude-opus-5', b.model);
ok('adaptive thinking',      b.thinking && b.thinking.type === 'adaptive', JSON.stringify(b.thinking));
ok('no budget_tokens',       !('budget_tokens' in (b.thinking||{})), 'removed on opus 5');
ok('effort in output_config',b.output_config && b.output_config.effort === 'high', JSON.stringify(b.output_config));
ok('fallbacks default',      b.fallbacks === 'default', JSON.stringify(b.fallbacks));
ok('beta header form',       (captured.headers['anthropic-beta']||'').includes('server-side-fallback-2026-07-01'),
                             captured.headers['anthropic-beta']);
ok('beta endpoint',          captured.path.includes('/v1/messages'), captured.path);
ok('no assistant prefill',   b.messages.every(m => m.role === 'user'), JSON.stringify(b.messages.map(m=>m.role)));
ok('guardrail in system',    /Use ONLY the numbers/.test(b.system), '');
ok('topic passed through',   /Topic: growth/.test(b.messages[0].content), '');
ok('figures passed through', /"last7": 140/.test(b.messages[0].content), '');
ok('text extracted',         res.text.startsWith('Revenue is flat'), res.text.slice(0,30));
ok('usage reported',         res.usage.output === 40, JSON.stringify(res.usage));

// --- a refusal must surface, not be returned as content ---
mock.close();
const mock2 = createServer((req, res) => {
  let raw=''; req.on('data',c=>raw+=c); req.on('end', () => {
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify({ id:'m', type:'message', role:'assistant', model:'claude-opus-5',
      content: [], stop_reason: 'refusal', stop_details: { type:'refusal', category:'cyber' },
      usage: { input_tokens: 1, output_tokens: 0 } }));
  });
});
await new Promise(r => mock2.listen(9956, r));
process.env.ANTHROPIC_BASE_URL = 'http://localhost:9956';
try {
  await think({ ANTHROPIC_API_KEY: 'sk-test' }, 'briefing', {});
  ok('refusal surfaces', false);
} catch (e) { ok('refusal surfaces', /declined/.test(e.message) && /cyber/.test(e.message), e.message); }
mock2.close();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
