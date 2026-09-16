# Chunked Long-Transcript Analysis with an LLM Driven by a Finite-State Machine

### Theory of Computation (2025) · Final Project · NCKU CSIE

**A relationship-analysis agent whose control flow is an explicit four-state
machine. The state machine is not decoration: it exists because an LLM has a
bounded context window and a chat transcript does not, so the transcript has to
be consumed one block at a time. This README documents the design, and then
argues — against the project's own original claim — about what class of machine
the result actually is.**

<p>
  <img alt="course" src="https://img.shields.io/badge/course-Theory%20of%20Computation%202025%20%C2%B7%20NCKU%20CSIE-4a3aa7">
  <img alt="language" src="https://img.shields.io/badge/language-Python%203.10%2B-2a78d6">
  <img alt="stack" src="https://img.shields.io/badge/stack-FastAPI%20%C2%B7%20requests-1baf7a">
  <img alt="model" src="https://img.shields.io/badge/model-gpt--oss%3A120b%20via%20NCKU%20gateway-eda100">
  <img alt="team" src="https://img.shields.io/badge/team%20project-3%20members-eb6834">
</p>

> **Live demo:** <https://two025theory-of-computation-final-svz3.onrender.com/>
> Hosted on Render's free tier, so the first request after 15 minutes of
> inactivity spends 30–60 seconds waking the container.

---

## Contents

- [1. The problem: a bounded window over an unbounded input](#1-the-problem-a-bounded-window-over-an-unbounded-input)
- [2. The state machine](#2-the-state-machine)
- [3. What class of machine is this, really?](#3-what-class-of-machine-is-this-really)
- [4. System architecture](#4-system-architecture)
- [5. The web layer is a second state machine](#5-the-web-layer-is-a-second-state-machine)
- [6. The domain model](#6-the-domain-model)
- [7. The interface](#7-the-interface)
- [8. Discussion and limitations](#8-discussion-and-limitations)
- [9. Building and running](#9-building-and-running)
- [10. References](#10-references)

---

## 1. The problem: a bounded window over an unbounded input

The task is: given a chat transcript between two people, produce a structured
report naming the attachment style of each party, the conflict cycle they are
caught in, and a set of concrete suggestions.

The naive implementation is one prompt: paste the whole transcript, ask for the
report. That works for a toy input and fails for a real one, because the model
accepts a fixed number of tokens and a transcript has no fixed length. The
input is, for our purposes, unbounded; the thing that reads it is not.

This is the same shape as the classical question of which languages a machine
with finite memory can recognise, and it admits the same classical answer:
if you cannot hold the input, consume it in pieces and carry a summary forward.
The project's contribution is to make that control flow *explicit* — an
enumerated state, a transition table, a single loop — rather than leaving it
implicit in a chain of function calls.

---

## 2. The state machine

`PsychAgent.analyze()` in [`src/agent.py`](src/agent.py) is a single `while`
loop over `self.state`. Four states, three forward edges, one self-loop:

<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)"  srcset="docs/figures/fig1-fsm-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/figures/fig1-fsm-light.png">
  <img alt="The four states of PsychAgent.analyze()"
       src="docs/figures/fig1-fsm-light.png" width="900">
</picture>
</div>

> **Figure 1.** Transcribed directly from `State` and `PsychAgent.analyze()`.
> `DONE` is drawn with a double ring in the usual convention for an accepting
> state.

```python
class State(Enum):
    INIT = 1
    PROCESS_CHUNK = 2
    AGGREGATE = 3
    DONE = 4
```

```python
while self.state != State.DONE:
    if self.state == State.INIT:
        self.chunks = self.chunk_chat_logs(max_lines=50)
        self.current_chunk_idx = 0
        self.partial_results = []
        self.state = State.PROCESS_CHUNK

    elif self.state == State.PROCESS_CHUNK:
        if self.current_chunk_idx < len(self.chunks):
            partial = self.process_single_chunk(self.chunks[self.current_chunk_idx])
            if partial:
                self.partial_results.append(f"片段 {self.current_chunk_idx + 1}: {partial}")
            self.current_chunk_idx += 1        # ← the self-loop
        else:
            self.state = State.AGGREGATE       # ← the only exit from the loop
    ...
```

The partition is by line count, not by token count: `chunk_chat_logs` splits on
`\n` and groups 50 lines at a time. That is a proxy for a token budget, and §8
says what is wrong with it.

Each visit to `PROCESS_CHUNK` makes exactly one API call and appends one short
feature summary — "does this fragment contain blame, avoidance, anxiety?" —
rather than keeping the fragment itself. `AGGREGATE` then makes one final call
over the concatenated summaries.

---

## 3. What class of machine is this, really?

The project was originally described as an FSM. That claim deserves the
scrutiny a Theory of Computation course exists to teach, and it does not fully
survive it.

<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)"  srcset="docs/figures/fig2-machine-class-dark.png">
  <source media="(prefers-color-scheme: light)" srcset="docs/figures/fig2-machine-class-light.png">
  <img alt="Finite control versus unbounded store"
       src="docs/figures/fig2-machine-class-light.png" width="900">
</picture>
</div>

> **Figure 2.** The control is finite. The store it reads and writes is not.

A DFA is a finite set of states and nothing else — its entire memory *is* the
state it is currently in, which is why the pumping lemma bites. The
configuration of this machine is the triple

```text
(state, current_chunk_idx, partial_results)
```

and `current_chunk_idx` ranges over the length of the input while
`partial_results` grows once per chunk. The reachable configuration space is
therefore infinite, so the system as a whole is not a finite automaton, however
much the `State` enum looks like one.

What it *is*, stated precisely:

| Property | This machine |
| --- | --- |
| Input access | left to right, one block at a time, never revisited |
| Control | finite — 4 states |
| Working store | one integer counter + one append-only list |
| Output | one string appended per input block |
| Final step | a single global pass over the accumulated output |

Read-once left-to-right input with per-block output and no re-reading is the
shape of a **finite-state transducer with unbounded output**, followed by one
global aggregation pass. It is strictly weaker than a Turing machine (the tape
is append-only and never re-read during the scan) and strictly stronger than a
DFA (the store is unbounded). Calling it "an FSM" is loose; calling it a
transducer with an aggregation phase is both accurate and a more interesting
thing to have built.

The honest qualifier: the transition function here is not what makes the system
interesting or unpredictable. The LLM behind `process_single_chunk` is the part
doing the work, and it is not modelled by any of this. What the FSM buys is a
*control* structure with an obvious termination argument — the loop advances
`current_chunk_idx` monotonically and `len(self.chunks)` is fixed at `INIT`,
so `PROCESS_CHUNK` is visited exactly `len(chunks) + 1` times and the machine
always reaches `DONE`.

---

## 4. System architecture

<div align="center">
<img alt="Module dependency graph"
     src="https://github.com/user-attachments/assets/366e0dfc-98af-49bc-ac4d-3d6fc5a334d1" width="880">
</div>

> **Figure 3.** Module dependency graph, from the project presentation. The
> dependencies run in one direction only — the browser talks to FastAPI,
> FastAPI to `WebAgent`, `WebAgent` to `PsychAgent`, and only `llm_client`
> talks to the outside world.

The separation that matters is the last one: `PsychAgent` never constructs an
HTTP request. Everything network-shaped is behind `get_completion(messages)` in
[`src/llm_client.py`](src/llm_client.py), 21 lines whose entire job is to POST a
message list and return `response.json()['message']['content']`. Swapping
providers is a one-file change.

| Module | Responsibility | Lines |
| --- | --- | ---: |
| [`src/agent.py`](src/agent.py) | `PsychAgent` (the FSM) and `ChatAgent` | 124 |
| [`src/prompts.py`](src/prompts.py) | the analysis template and its fixed 5-section output format | 89 |
| [`src/knowledge.py`](src/knowledge.py) | the psychological knowledge base, as literal text | 65 |
| [`src/llm_client.py`](src/llm_client.py) | the only code that makes a network call | 21 |
| [`src/config.py`](src/config.py) | key loading, gateway URL, model name | 28 |
| [`web/app.py`](web/app.py) | FastAPI routes | 160 |
| `web/static/` | the 3D-book front end | 894 |

`knowledge.py` deserves a note. It is not a retrieval system and does not
pretend to be: it is a set of functions returning hand-written Chinese prose
about attachment theory and the Gottman model, concatenated into the prompt.
For a knowledge base this small and this static, a vector store would be
strictly more machinery for strictly less predictability.

---

## 5. The web layer is a second state machine

Independently of the agent, the HTTP surface is itself a state machine over a
session, and the presentation drew it out:

<div align="center">
<img alt="Session state machine over the HTTP endpoints"
     src="https://github.com/user-attachments/assets/0a4808c7-b16f-498e-ae93-6a9507aa2386" width="880">
</div>

> **Figure 4.** Every endpoint in `web/app.py` as a transition out of `Idle`,
> with an explicit success and failure state for each.

This one *is* a finite automaton, and genuinely so: the set of session states is
fixed regardless of how long the user stays, and every failure edge returns to
`Idle`. Two state machines at two layers, with different answers to the question
in §3, is the most instructive thing in the project.

---

## 6. The domain model

The report is not free-form. `prompts.py` pins the model to two published
frameworks and a fixed five-section Markdown structure, so that the output is
comparable across runs rather than whatever the model felt like producing.

<table>
<tr>
<td width="50%">
<img alt="Attachment theory quadrant"
     src="https://github.com/user-attachments/assets/892512b4-72ae-49a1-a0e2-a6a387e649dc">
</td>
<td width="50%">
<img alt="Gottman's four horsemen and their antidotes"
     src="https://github.com/user-attachments/assets/f40bd4f6-f7b5-4992-a288-72312aa1abe2">
</td>
</tr>
<tr>
<td><b>Figure 5.</b> Attachment style as two axes — anxiety and avoidance —
giving four quadrants (secure, anxious, avoidant, disorganised). The agent is
asked to place each party in one.</td>
<td><b>Figure 6.</b> Gottman's four horsemen — criticism, contempt,
defensiveness, stonewalling — each paired with its antidote. The antidotes are
what the report's suggestions section is drawn from.</td>
</tr>
</table>

Fixing the output format is what makes the system an analysis tool rather than a
chatbot: `get_concept_guide()` is prepended to every report so the reader can
check the classification against the definition that produced it.

---

## 7. The interface

Two modes, switched from the top-right of the page.

**Consultation Mode** — the analysis path. The user supplies both names, the
background, and the transcript; the FSM of §2 runs; a full report comes back and
can be downloaded as Markdown.

<div align="center">
<img alt="Consultation Mode"
     src="https://github.com/user-attachments/assets/647b2ad4-15f9-4dcc-9049-afd9428a1ebf" width="880">
</div>

**Conversation Mode** — `ChatAgent`, a plain multi-turn chat that keeps a
`history` list and resends it each turn. No FSM, no chunking; it is the control
condition that shows what the analysis path is buying.

<div align="center">
<img alt="Conversation Mode"
     src="https://github.com/user-attachments/assets/3f7c5deb-fb92-4179-b9b4-8729f481be3d" width="880">
</div>

The full presentation deck is in [`docs/presentation.md`](docs/presentation.md).

---

## 8. Discussion and limitations

Reviewing our own code after the fact turned up more than we expected. These are
in rough order of how much they matter.

**The chunking does not actually reduce the final prompt.** This is the big one.
`INIT` and `PROCESS_CHUNK` exist to avoid sending the whole transcript at once —
and then `build_final_prompt` sends it anyway:

```python
return ANALYSIS_SYSTEM_PROMPT.format(
    user_name=self.user_name,
    partner_name=self.partner_name,
    context=enhanced_context,    # the per-chunk summaries
    chat_logs=self.chat_logs     # ← and the entire raw transcript, again
)
```

So the `AGGREGATE` call carries both the extracted features *and* the full text.
The token-limit problem the state machine was designed to solve is still present
in the very state that was supposed to have solved it, and the chunking pass has
made the final prompt *larger* than the naive one-shot version, not smaller.
The fix is one argument: pass `chat_logs=""`, or a short excerpt, and let the
summaries carry the content. We did not notice this during development because
every transcript we tested with fit in the window anyway — which is exactly the
input class where the design is not needed.

**A failed API call silently shrinks the evidence.** `get_completion` returns
`None` on any exception, and `PROCESS_CHUNK` handles that with `if partial:` —
the chunk is skipped and the loop moves on. One transient network error means
the final report is written from a strict subset of the conversation, with
nothing in the output indicating it. There is no retry and no timeout on
`requests.post`, so a hung gateway hangs the request. The state machine should
have an `ERROR` state, or `partial_results` should record the gap explicitly.

**`temperature=0.7` on a classification task.** The same transcript can be
classified as anxious on one run and avoidant on the next. For a system that
names a psychological pattern in a specific, named person, non-determinism is
not a stylistic choice. `temperature=0` for the `AGGREGATE` call, keeping 0.7
for Conversation Mode, would cost nothing.

**Chunking by line count is a poor proxy for tokens.** `max_lines=50` treats a
50-line exchange of "ok" and a 50-line exchange of paragraphs as the same size.
A token count, or even a character budget, would be both simpler to reason about
and closer to the actual constraint.

**`ChatAgent` has the problem `PsychAgent` was built to solve.** Its `history`
list grows without bound and is resent in full every turn. A long enough
conversation walks into the same context limit, in the same file, with the
solution sitting 60 lines above it.

**The original README claimed capabilities the code does not have.** It listed
"Function Calling", "Tool Usage: the LLM dynamically decides whether to perform
psychological analysis or conflict mining", and a "Dual-Tool Architecture".
There is no tool or function-calling anywhere in the repository — `grep -r` for
`tools=` or `function_call` returns nothing. There are two prompt templates
selected by ordinary Python control flow. The claim has been removed rather than
quietly dropped, because the difference between an agent that chooses a tool and
a program that calls a function is most of what "agent" is supposed to mean.

**A one-character typo published eleven private reports.** `.gitignore` read
`web_report/*`; the directory is `web_reports/`. The pattern therefore matched
nothing, and eleven generated reports — containing real names and real chat
excerpts from members of this project and their acquaintances — were committed
to a public repository. `.env` was committed for the same class of reason. Both
have now been removed from tracking and `.gitignore` rewritten, but *removal
from `HEAD` is not removal from history*: the objects remain reachable from
earlier commits, so the gateway key has been rotated and a history rewrite is
the only complete fix. The general lesson is that a `.gitignore` entry is
untested code — nothing tells you when a pattern silently matches nothing.

**`config.py` raises at import time.** `LLM_API_KEY = get_api_key()` runs at
module scope, so `import src.agent` fails with `ValueError` on any machine
without a key — including a machine that only wants to run tests. Key loading
belongs in a function called at first use.

**`requirements.txt` is incomplete.** `src/config.py` imports `python-dotenv`
directly, but the package is listed nowhere; it installs only as a transitive
dependency of `uvicorn[standard]`. A `pip install fastapi requests markdown`
environment would fail at import.

**No evaluation.** There is no ground truth, no inter-rater agreement, and no
way to say whether the classifications are right. The system produces a
confident report about a real relationship and has no measured accuracy
whatsoever. This is a course project and was never deployed to anyone outside
the team, but it should be said plainly rather than left for the reader to
notice.

---

## 9. Building and running

```bash
git clone https://github.com/pukyle/2025Theory_Of_Computation_Final_Project.git
cd 2025Theory_Of_Computation_Final_Project

python -m venv .venv && source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env        # then put your gateway key in it
python main.py              # → http://localhost:8000
```

`main.py` starts uvicorn on `0.0.0.0:8000`; `uvicorn web.app:app --reload` is
the equivalent for development. The key is read from `LLM_API_KEY`, falling back
to an `API.txt` file in the repository root. Both are git-ignored — keep it that
way.

Requires Python 3.10+ and network access to the NCKU CSIE model gateway
(`api-gateway.netdb.csie.ncku.edu.tw`), which is reachable from the campus
network.

### Layout

```text
├── src/
│   ├── agent.py          # PsychAgent (the FSM of §2) and ChatAgent
│   ├── prompts.py        # the analysis template and its fixed output format
│   ├── knowledge.py      # attachment theory + Gottman, as literal text
│   ├── llm_client.py     # the only network call in the project
│   ├── config.py         # key loading, gateway URL, model name
│   └── interface/        # WebAgent / CliAgent wrappers over PsychAgent
├── web/
│   ├── app.py            # FastAPI routes (the state machine of §5)
│   └── static/           # the 3D-book front end
├── docs/
│   ├── figures/          # figures 1–2, generated by scripts/make_figures.py
│   └── presentation.md   # the full slide deck
├── scripts/make_figures.py
└── main.py
```

Figures 1 and 2 are generated, not drawn: `python scripts/make_figures.py`
rebuilds them from the state table in `agent.py`, in light and dark variants.

---

## 10. References

1. J. E. Hopcroft, R. Motwani, J. D. Ullman. *Introduction to Automata Theory,
   Languages, and Computation*, 3rd ed. Chapters 2 (finite automata) and 11
   — the transducer model of §3.
2. M. Sipser. *Introduction to the Theory of Computation*, 3rd ed. §1.1,
   on what a finite automaton's memory is and is not.
3. J. Bowlby. *Attachment and Loss, Vol. 1: Attachment.* Basic Books, 1969.
4. C. Hazan, P. Shaver. "Romantic love conceptualized as an attachment
   process." *Journal of Personality and Social Psychology*, 52(3), 1987.
5. J. M. Gottman, N. Silver. *The Seven Principles for Making Marriage Work.*
   Harmony Books, 1999 — the four horsemen and their antidotes.
6. S. Johnson. *Hold Me Tight: Seven Conversations for a Lifetime of Love.*
   Little, Brown, 2008 — the pursue–withdraw cycle.

---

## Provenance and attribution

Team project for *Theory of Computation* (2025), NCKU CSIE.

| Member | Student ID | Principal contribution, by git history |
| --- | --- | --- |
| 王駿愷 (`JKaiWang`, `Jyun-Kai, Wang`) | F74122250 | FastAPI backend, the 3D-book front end, the `WebAgent` / `CliAgent` wrappers, and the largest share of `agent.py` |
| 部政佑 (`pukyle`) | AN4126018 | `llm_client.py`, `config.py`, `main.py`, `prompts.py`; co-author of `agent.py` and `knowledge.py` |
| 彭以呈 (`Peng Yi Cheng`) | F74122137 | `agent.py`, front-end integration |

The table is a summary of `git log --format='%an' -- <path>`, not a claim beyond
it; a few commits were made under machine-local usernames and are folded into
the nearest author above.

This README, the two generated figures in §2–§3, and the analysis in §3 and §8
were written after the fact by **部政佑**
([github.com/pukyle](https://github.com/pukyle)) and do not represent the
original submitted report. The course handout and the graded rubric are not
redistributed here.

> **A note on the reports.** This system generates psychological claims about
> named private individuals from their private messages. During the project it
> was run on real conversations belonging to members of the team and people they
> know. Those outputs were committed to this repository by accident (§8) and
> have been removed. Nothing in this repository should be read as a clinical
> instrument, and neither of the two frameworks it uses was designed to be
> applied by an unsupervised language model to a transcript without consent.
