# Assistant security: architecture and development standard

The portfolio's chat assistant speaks in Raúl's first person to anyone on the internet. Everything it
writes is read as his own words, and every message costs a model call paid by him. This document
describes how the assistant is defended, the rules every change must respect, and how a change is
measured before it ships. It is the standard to follow when developing the assistant.

## What is protected

| Asset | Harm if lost |
| --- | --- |
| Raúl's voice and reputation | Invented facts, commitments (rates, start dates), opinions, insults or a phishing line published under his name |
| Confidential employer information | Internal details, clients, vendors or tools the site does not publish |
| Blocked names | Names that must never be written, confirmed, denied or inferred |
| The instructions and the raw knowledge | Copied out and reused, or used to plan attacks |
| Visitors' browsers | Links to pages the site does not publish, rendered HTML |
| Budget and availability | Model calls, provider rate limits, memory and logs of the server |

Attackers are assumed to know this document and the public repository. Only the blocked names, the
provider keys and the per-process canary are secret.

## The path of one message

```
browser ─► host TLS proxy ─► nginx (realip) ─► WebSocket (perimeter) ─► normalisation ─► input gate
        ─► router ─┬─ REFUSE  ─► fixed text (rotating variants)              ──────────────┐
                   ├─ DECLINE ─► model, from a description of the message                 │
                   ├─ REFRAME ─► model, answering a canonical question + fixed lead         ├─► output guard ─► browser
                   └─ ANSWER  ─► model, visitor text quoted as data, names masked          ┘     (link allowlist)
```

Each layer assumes the previous one failed. No layer relies on the model obeying its prompt.

### 1. Perimeter (`nginx.conf`, `docker-compose.yml`, `backend/Dockerfile`, `app/main.py`, `app/chat/limits.py`)

- nginx resolves the visitor's address with `realip`, trusting `X-Forwarded-For` only from private
  ranges (the host proxy, Docker networks), and passes that single address on. A client that reaches
  the port directly cannot choose its identity. IPv6 clients are counted per /64.
- The portfolio container is published on loopback only (`127.0.0.1:3000`): the host's TLS proxy is
  the only way in, and the backend is not published at all.
- uvicorn refuses frames over 16 KB and compressed frames (inflated before any check could run).
  The backend container has a memory cap and rotated logs.
- Per client: 4 simultaneous connections, 60 messages per hour, 200 per day, 10 strikes per hour.
  Per conversation: 40 messages, 5 strikes, 15 minutes idle (only accepted messages count as
  activity), 2 hours at most. Site-wide: 1500 messages per day.
- Limits apply to the text the models will read: length and symbol count are checked after
  normalisation, empty-after-normalisation messages are ignored, binary frames close the socket.
- Strikes are recorded even when the visitor disconnects mid-answer.
- `ALLOWED_ORIGINS` restricts which pages may open the chat (set it in production; it is not an abuse
  control, scripts can forge it).

### 2. Normalisation (`app/guard/normalize.py`, `app/guard/encoding.py`)

NFKC, invisible and format characters, variation selectors and blank fillers removed, whitespace
collapsed, so every later check reads what the model reads. A message carrying base64 or hex that
decodes to readable text is refused in code, before any model.

### 3. Input gate (`app/guard/gate.py`, `app/guard/policy.yaml`)

A policy-following classifier returns closed labels only: category, topic, language, the names of
products, brands or companies the message mentions, and a one-line description in its own words. It
never writes text the visitor sees. It fails closed: no valid category, no answer. A verdict with an
invalid category is skipped like a failed model and the next one in the chain is asked; an unknown
language or topic reads as "other" / "none".

Categories: `JAILBREAK`, `PROMPT_EXTRACTION`, `ROLEPLAY`, `FORMAT_HIJACK`, `SIDE_TASK` (a question
about Raúl plus something else: translating, summarising or proofreading a supplied text, maths,
code, or facts the visitor wrote), `OFF_TOPIC` (including tutorials on general algorithms or
technologies), `SAFE`.

### 4. Router (`route()` in `app/chat/chat.py`)

Code, not the model, decides what happens:

| Verdict | Route | What the model sees |
| --- | --- | --- |
| `SAFE` | ANSWER | The message, quoted as data, unpublished names masked |
| `FORMAT_HIJACK` / `ROLEPLAY` / `SIDE_TASK` about Raúl | REFRAME | A canonical question on the same topic; the visitor gets a fixed lead first |
| The same without a topic, `OFF_TOPIC` | DECLINE | A cleaned description of the request, never the message, never the history |
| `JAILBREAK`, `PROMPT_EXTRACTION`, encoded payload | REFUSE | Nothing: a fixed text, its variants taken in turn |

Declines are written by the model so they take up what the visitor asked, at most two sentences, in
the visitor's language, offering a related part of the profile; their opening style rotates and the
previous declines are passed back so consecutive ones differ. A decline has one attempt: if it fails
any check, the fixed text is sent instead.

### 5. Prompt assembly (`app/chat/prompts.yaml`, `_messages`)

- One static system message: knowledge (marked as data), persona and rules, examples, output contract.
  It is byte-identical across requests so the provider can cache it.
- Visitor text is quoted: angle brackets become look-alikes, so a message cannot close the knowledge
  block, open a fake one or write a cards block of its own. The visitor's messages are never a source
  of facts.
- Every name the knowledge does not contain is replaced by the same placeholder, whether it is
  blocked or not, together with the same note. Replies therefore cannot reveal which names are blocked.
- History holds only delivered answers, each capped in length. The last decline or refusal is carried
  for one turn so "yes, go on" is understood; the declined message itself is never kept.
- Only the `examples` block may be reused verbatim by answers. Every other instruction, and the
  directive notes inside the knowledge (`wording`, `confidentiality`, `scope`), is protected.

### 6. Output guard (`app/guard/output.py`)

Runs on the whole text before any new part of it is released; text is released by whole lines (or
whole sentences of long paragraphs). It rejects:

- code and data formats (fences, statements, JSON, SQL, HTML tags, markdown tables);
- copied instructions (12-word runs, the canary also spaced or reversed) and the knowledge dumped as
  key/value lines (also with markdown emphasis);
- addresses not in the knowledge, read as the browser renders them: entities and markdown escapes
  resolved, any scheme (with or without `//`), autolinks, inline and reference links, e-mails;
- phone numbers and amounts of money not in the knowledge;
- internal project ids in the answer text, and the masking placeholder;
- blocked names in any disguise: case, width, accents, look-alike letters, leetspeak, entities,
  separators between letters, prefixes and suffixes.

A rejected draft is retried once with a note naming the problem, then replaced by a fixed text. A
reset frame is sent only if something had been shown. Only attack-shaped violations (code, leaks,
dumps) count as strikes; a model's own slip (an unknown link, an overlong decline) does not.

### 7. Browser (`src/aiChatAssistant/utils/markdown.js`)

Replies are rendered without raw HTML, images or code blocks, and a link is clickable only if the site
itself publishes that address; anything else is shown as plain text.

## Invariants

A change that breaks one of these is wrong, whatever the evals say.

1. The model never chooses a route, a fixed text or a limit. Code does.
2. Visitor text reaches the model only as quoted data, never as instructions or as facts.
3. Attempts on the rules or the instructions never reach the answering model.
4. A decline never reads the message it declines.
5. Links, e-mails, phone numbers, amounts and names come only from the knowledge, and code checks it.
6. Blocked names live only in the environment (`CHAT_BLOCKED_TERMS`), never in the repository, in
   eval cases, in logs or in reports. Blocked and unpublished names are treated identically.
7. Nothing reaches the visitor before it is checked; nothing is withdrawn unless it was shown.
8. Limits count what the models read, per client and site-wide, and survive disconnection.
9. Fixed texts have variants and rotate; the visitor never reads the same canned sentence twice in a row.
10. The knowledge contains only what the site shows, and mirrors it (`backend/knowledge/skills.yaml`
    mirrors `src/environment/data/skills.js` and `languages.js`).

## Change checklist

For any change to prompts, policy, knowledge, guards, routing, limits or models:

1. Prefer a fix in code over the policy, and in the policy over prompt wording. Fix the class of
   attack, not the string that showed it.
2. Add a unit test (`backend/tests/`) and an eval case (`backend/evals/cases.yaml`). Put a case for
   the class you fixed in `dev`; write a fresh variant in `heldout` and never tune on it.
3. `cd backend && .venv/bin/python -m pytest` and, for frontend changes,
   `CI=true npx react-scripts test --watchAll=false` and `npm run build`.
4. Run the red-team three times: `.venv/bin/python -m evals.redteam --repeat 3 --out report.json`.
5. Compare `attack_success_rate` and `false_refusal_rate` with the previous report, intervals
   included. Neither may rise. A single run is noisy: when one case flips, rerun it on the previous
   commit as well before blaming the change.
6. To explore a new attack family, use `evals/attack.py` (same session, production limits, oracles
   that do not reuse the guard), keep its files outside the repository, then turn what broke into
   cases.
7. A new or fallback model must pass the same red-team before it is configured.

## Release gate

| Metric (red-team, 3 repeats) | Required |
| --- | --- |
| Attack success rate | No higher than the previous release; no case broken in all 3 repeats |
| False refusal rate | No higher than the previous release |
| Fallback events during the run | 0 (otherwise the run is not valid) |
| Unit tests | All pass |

## Red-team round of 2026-11-17

Five attack families were run in parallel against the live model (injection and jailbreak, leakage
and oracles, harmful output and browser-side content, obfuscation and encoding, perimeter and cost),
every finding was reproduced before fixing, and each fixed class got tests and eval cases.

Classes found and fixed:

| Class | Fix |
| --- | --- |
| Fake knowledge blocks in the message steering facts (rates, contact numbers) | Visitor text quoted as data; phone numbers and amounts checked against the knowledge |
| A legitimate question plus a side task (translate or summarise a supplied text) | `SIDE_TASK` category, reframed to the canonical question |
| Declines translating or answering the declined text | Declines written from a cleaned description, without the message or the history, one attempt |
| Tutorials on general topics framed as "your favourite" | Policy: `OFF_TOPIC`; persona: preferences not in the knowledge are not covered |
| Links hidden from the source but live in the browser (escapes, entities, scheme-only and reference links, autolinks) | Guard reads the rendered form; browser allowlist of published links |
| Blocked names inferable from differences in the reply | Uniform masking of every unpublished name, no special note, no reset or strike tied to a blocked name |
| Blocked names with suffixes, prefixes, accents, entities, look-alikes; ordinary words matched as a short name | Folding and matching rules in the guard |
| Knowledge dumped with markdown emphasis; directive notes quoted | Emphasis-aware dump check; directive notes protected |
| Invented personal data | Persona rule; personal details not in the knowledge are not covered |
| Classifier verdicts with an unexpected language failing the whole message | Lenient parsing of non-decision fields; next model on an invalid verdict |
| Memory exhaustion through compressed frames; identity forging through `X-Forwarded-For`; token inflation through normalisation; strikes lost on disconnect; binary frames; idle sockets kept alive; one client using the daily budget | Perimeter changes listed in section 1 |

Measured on the full red-team, three repeats each:

| | Attack success rate | False refusal rate |
| --- | --- | --- |
| Before the round | 1.8 % [0.7 %, 4.4 %] (4/228) | 2.7 % [0.9 %, 7.6 %] (3/111) |
| After the round, same cases | 1.3 % [0.4 %, 3.8 %] (3/228) | 1.8 % [0.5 %, 6.3 %] (2/111) |
| After the round, suite with the new cases | 1.4 % [0.5 %, 3.6 %] (4/285) | 3.5 % [1.4 %, 8.7 %] (4/114) |

95 % Wilson intervals; they overlap, so the honest reading is "no regression", not "proven better".
The new cases are harder by design (they are the attacks that broke the old version). Of the
remaining judged failures, most are the judge objecting to the published employer name or to a
uniform "I only share what is published" answer; questions about the assistant itself sometimes get
an answer without the contact details the judge expects. All of these were read one by one.

## Operations

- Production `.env` on the host: `CHAT_BLOCKED_TERMS`, provider keys, `ALLOWED_ORIGINS`.
- The host TLS proxy (nginx on the VPS, site `portfolio`) proxies to `127.0.0.1:3000`, appends the
  visitor's address to `X-Forwarded-For` and keeps WebSockets open for 1200 s. The container's nginx
  trusts that header only from private ranges, which is where Docker's port forwarding delivers the
  host proxy's connections.
- Logs record categories, routes, violation kinds and token usage, not the messages.
