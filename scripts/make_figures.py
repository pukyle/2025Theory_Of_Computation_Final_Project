"""Regenerate docs/figures/ — run from the repository root.

    python3 scripts/make_figures.py

The state machine in figure 1 is transcribed directly from `State` and
`PsychAgent.analyze()` in src/agent.py. Each figure is rendered light and dark
so the README can serve the matching asset with
<picture media="(prefers-color-scheme: ...)">.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle
from theme import MODES, apply, save

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "docs", "figures")
os.makedirs(OUT, exist_ok=True)


def box(ax, x, y, w, h, fc, txt="", fg="#ffffff", fs=10, weight="600", r=0.10,
        mono=False):
    ax.add_patch(FancyBboxPatch((x, y), w, h,
                                boxstyle=f"round,pad=0,rounding_size={r}",
                                facecolor=fc, edgecolor="none"))
    if txt:
        ax.text(x + w / 2, y + h / 2, txt, ha="center", va="center", color=fg,
                fontsize=fs, weight=weight, linespacing=1.5,
                family="monospace" if mono else None)


# ------------------------------------------------------------------ figure 1
def fig_fsm(c, mode):
    """The four states of PsychAgent, transcribed from src/agent.py."""
    fig, ax = plt.subplots(figsize=(9.8, 4.3))
    ax.set_xlim(-1.55, 16.15); ax.set_ylim(-0.1, 6.7); ax.axis("off")

    states = [
        ("INIT", c["s1"], "split chat_logs\ninto 50-line chunks"),
        ("PROCESS_CHUNK", c["s2"], "one LLM call per chunk,\nappend to partial_results"),
        ("AGGREGATE", c["s3"], "one LLM call over the\nextracted features"),
        ("DONE", c["s7"], "return the report"),
    ]
    W = [2.9, 4.2, 3.4, 2.3]
    GAP = 1.0
    xs, x = [], 0.0
    for w in W:
        xs.append(x); x += w + GAP
    centres = [(x0, x0 + w, x0 + w / 2) for x0, w in zip(xs, W)]

    for (name, col, sub), x0, w in zip(states, xs, W):
        box(ax, x0, 2.5, w, 1.25, col, name, fs=11, mono=True)
        ax.text(x0 + w / 2, 2.15, sub, ha="center", va="top", color=c["muted"],
                fontsize=9.2, linespacing=1.55)

    ax.add_patch(FancyArrowPatch((-1.15, 3.12), (-0.12, 3.12), arrowstyle="-|>",
                                 mutation_scale=13, color=c["faint"], lw=1.5))
    ax.text(-0.63, 3.95, "analyze()", ha="center", color=c["faint"], fontsize=8.8,
            family="monospace")

    for i in range(3):
        ax.add_patch(FancyArrowPatch((centres[i][1] + 0.1, 3.12),
                                     (centres[i + 1][0] - 0.1, 3.12),
                                     arrowstyle="-|>", mutation_scale=13,
                                     color=c["faint"], lw=1.5))

    cx = centres[1][2]
    ax.add_patch(FancyArrowPatch((cx - 1.2, 3.8), (cx + 1.2, 3.8),
                                 arrowstyle="-|>", mutation_scale=13,
                                 color=c["s2"], lw=1.9,
                                 connectionstyle="arc3,rad=-0.8"))
    ax.text(cx, 5.35, "idx < len(chunks)   →   idx += 1", ha="center",
            color=c["s2"], fontsize=9.6, family="monospace", weight="600")
    ax.text(cx, 4.95, "the only cycle in the graph", ha="center",
            color=c["faint"], fontsize=9)

    x0, x1, _ = centres[3]
    ax.add_patch(FancyBboxPatch((x0 - 0.14, 2.36), (x1 - x0) + 0.28, 1.53,
                                boxstyle="round,pad=0,rounding_size=0.13",
                                facecolor="none", edgecolor=c["s7"], lw=1.4))

    ax.text(-1.55, 1.18,
            "Four states, three forward edges, one self-loop. The loop is the whole "
            "point of the design: an LLM has a bounded\ncontext window, so a long "
            "transcript cannot be a single prompt. INIT partitions it, PROCESS_CHUNK "
            "visits each\npart exactly once, and AGGREGATE sees only the extracted "
            "features rather than the raw text.",
            color=c["muted"], fontsize=9.5, va="top", linespacing=1.65)
    ax.text(-1.55, 6.45, "PsychAgent.analyze() — the state machine in src/agent.py",
            color=c["text"], fontsize=13, weight="600")
    save(fig, os.path.join(OUT, "fig1-fsm"), mode)


# ------------------------------------------------------------------ figure 2
def fig_machine_class(c, mode):
    """What class of machine this actually is."""
    fig, ax = plt.subplots(figsize=(9.8, 4.0))
    ax.set_xlim(-0.45, 15.45); ax.set_ylim(-1.55, 5.7); ax.axis("off")

    # --- finite control
    box(ax, 0.0, 2.55, 5.2, 2.0, c["s1"],
        "finite control\n\nState.INIT   ·   PROCESS_CHUNK\nAGGREGATE   ·   DONE",
        fs=9.5)
    ax.text(2.6, 2.20, "4 states — genuinely finite", ha="center", va="top",
            color=c["s1"], fontsize=9.6, weight="600")

    # --- unbounded store
    box(ax, 9.8, 2.55, 5.2, 2.0, c["s2"],
        "unbounded store\n\nchunks[]   ·   current_chunk_idx\npartial_results[]",
        fs=9.5)
    ax.text(12.4, 2.20, "grows with the input — not finite", ha="center",
            va="top", color=c["s2"], fontsize=9.6, weight="600")

    ax.add_patch(FancyArrowPatch((5.35, 3.95), (9.65, 3.95), arrowstyle="-|>",
                                 mutation_scale=13, color=c["faint"], lw=1.5))
    ax.add_patch(FancyArrowPatch((9.65, 3.15), (5.35, 3.15), arrowstyle="-|>",
                                 mutation_scale=13, color=c["faint"], lw=1.5))
    ax.text(7.5, 4.12, "reads / writes", ha="center", color=c["faint"],
            fontsize=8.8, family="monospace")
    ax.text(7.5, 2.78, "decides the next state", ha="center", color=c["faint"],
            fontsize=8.8, family="monospace")

    ax.text(-0.45, 1.42,
            "A DFA is a finite set of states and nothing else — its entire memory "
            "is its current state. This machine's configuration is\n"
            "the triple (state, current_chunk_idx, partial_results), and the last "
            "two grow without bound as the transcript gets longer,\n"
            "so the reachable configuration space is infinite. The control is a "
            "finite automaton; the system around it is not.",
            color=c["muted"], fontsize=9.5, va="top", linespacing=1.65)

    ax.text(-0.45, -0.35,
            "Where it actually sits: input is consumed left to right, one block at a "
            "time, never revisited, and each block appends to\n"
            "an output that is read only in the final state — the shape of a "
            "finite-state transducer with unbounded output, followed\n"
            "by one global pass. That is a precise claim, and a more interesting one "
            "than calling the whole system an FSM.",
            color=c["faint"], fontsize=9.5, va="top", linespacing=1.65)

    ax.text(-0.45, 5.55, "What class of machine is this, really?",
            color=c["text"], fontsize=13, weight="600")
    save(fig, os.path.join(OUT, "fig2-machine-class"), mode)


for mode, c in MODES:
    apply(c)
    fig_fsm(c, mode)
    fig_machine_class(c, mode)
print("figures written to", OUT)
