from collections import defaultdict

from automata.fa.dfa import DFA
from automata.fa.gnfa import GNFA
from automata.fa.nfa import NFA

from app.core.common import AutomatonError, check_states, norm, require, show
from app.schemas import FASimulateResponse, FAStep, FATransition, FiniteAutomaton

EMPTY_SET_NAME = "∅"


def expand_transitions(fa: FiniteAutomaton) -> list[tuple[str, str, str]]:
    alphabet = set(fa.alphabet)
    result = []
    for t in fa.transitions:
        raw = t.symbol
        parts = [raw] if raw in alphabet or "," not in raw else raw.split(",")
        for part in parts:
            result.append((t.from_, norm(part), t.to))
    return list(dict.fromkeys(result))


def validate(fa: FiniteAutomaton) -> list[tuple[str, str, str]]:
    check_states(fa.states, fa.start_state, fa.accept_states, fa.transitions)
    alphabet = set(fa.alphabet)
    require(len(alphabet) > 0, "Alfabe boş olamaz.")
    for a in alphabet:
        require(len(a) == 1, f"Alfabe sembolleri tek karakter olmalı: '{a}'.")
        require(norm(a) != "", "Alfabe ε içeremez.")
    edges = expand_transitions(fa)
    seen = set()
    for src, sym, dst in edges:
        if sym == "":
            require(fa.type == "ENFA", "ε-geçişleri yalnızca ε-NFA'da kullanılabilir.")
            continue
        require(sym in alphabet, f"'{sym}' sembolü alfabede yok ({src} → {dst}).")
        if fa.type == "DFA":
            require((src, sym) not in seen, f"DFA'da '{src}' durumundan '{sym}' ile birden fazla geçiş var.")
            seen.add((src, sym))
    return edges


def to_library_nfa(fa: FiniteAutomaton) -> NFA:
    edges = validate(fa)
    table: dict = {s: defaultdict(set) for s in fa.states}
    for src, sym, dst in edges:
        table[src][sym].add(dst)
    return NFA(
        states=set(fa.states),
        input_symbols=set(fa.alphabet),
        transitions={s: dict(m) for s, m in table.items()},
        initial_state=fa.start_state,
        final_states=set(fa.accept_states),
    )


def to_library_dfa(fa: FiniteAutomaton) -> DFA:
    if fa.type != "DFA":
        return DFA.from_nfa(to_library_nfa(fa), retain_names=True, minify=False)
    edges = validate(fa)
    table: dict = {s: {} for s in fa.states}
    for src, sym, dst in edges:
        table[src][sym] = dst
    return DFA(
        states=set(fa.states),
        input_symbols=set(fa.alphabet),
        transitions=table,
        initial_state=fa.start_state,
        final_states=set(fa.accept_states),
        allow_partial=True,
    )


def state_name(state) -> str:
    if isinstance(state, (frozenset, set)):
        if not state:
            return EMPTY_SET_NAME
        return "{" + ",".join(sorted(state_name(s) for s in state)) + "}"
    return str(state)


def from_library_dfa(dfa: DFA) -> FiniteAutomaton:
    names = {s: state_name(s) for s in dfa.states}
    ordered = sorted(dfa.states, key=lambda s: (s != dfa.initial_state, names[s]))
    transitions = [
        FATransition(**{"from": names[src], "to": names[dst], "symbol": sym})
        for src in ordered
        for sym, dst in sorted(dfa.transitions.get(src, {}).items())
    ]
    return FiniteAutomaton(
        type="DFA",
        states=[names[s] for s in ordered],
        alphabet=sorted(dfa.input_symbols),
        start_state=names[dfa.initial_state],
        accept_states=sorted(names[s] for s in dfa.final_states),
        transitions=transitions,
    )


def _closure(states: set[str], eps: dict[str, set[str]]) -> tuple[set[str], list[tuple[str, str, str]]]:
    result, stack, used = set(states), list(states), []
    while stack:
        s = stack.pop()
        for t in sorted(eps.get(s, ())):
            used.append((s, "", t))
            if t not in result:
                result.add(t)
                stack.append(t)
    return result, used


def _edge(src: str, sym: str, dst: str) -> FATransition:
    return FATransition(**{"from": src, "to": dst, "symbol": show(sym)})


def simulate(fa: FiniteAutomaton, word: str) -> FASimulateResponse:
    edges = validate(fa)
    for ch in word:
        require(ch in fa.alphabet, f"Girdi dizesindeki '{ch}' sembolü alfabede yok.")
    moves: dict = defaultdict(lambda: defaultdict(set))
    eps: dict = defaultdict(set)
    for src, sym, dst in edges:
        (eps[src] if sym == "" else moves[src][sym]).add(dst)

    active, used = _closure({fa.start_state}, eps)
    steps = [FAStep(index=0, active_states=sorted(active), transitions=[_edge(*e) for e in used])]
    for i, ch in enumerate(word, start=1):
        step_edges = [(s, ch, d) for s in sorted(active) for d in sorted(moves[s].get(ch, ()))]
        nxt = {d for _, _, d in step_edges}
        active, used = _closure(nxt, eps)
        steps.append(
            FAStep(index=i, symbol=ch, active_states=sorted(active), transitions=[_edge(*e) for e in step_edges + used])
        )

    accepted = bool(active & set(fa.accept_states))
    library = to_library_dfa(fa) if fa.type == "DFA" else to_library_nfa(fa)
    if library.accepts_input(word) != accepted:
        raise AutomatonError("Simülasyon sonucu doğrulama motoruyla uyuşmadı.")
    return FASimulateResponse(accepted=accepted, steps=steps)


def nfa_to_dfa(fa: FiniteAutomaton) -> FiniteAutomaton:
    dfa = DFA.from_nfa(to_library_nfa(fa), retain_names=True, minify=False)
    return from_library_dfa(dfa)


def minimize(fa: FiniteAutomaton) -> FiniteAutomaton:
    source = fa if fa.type == "DFA" else nfa_to_dfa(fa)
    trap = EMPTY_SET_NAME if EMPTY_SET_NAME not in source.states else "∅'"
    minimal = to_library_dfa(source).to_complete(trap).minify(retain_names=True)
    return from_library_dfa(minimal.to_complete(frozenset()))


def to_regex(fa: FiniteAutomaton) -> str:
    if fa.type == "DFA":
        dfa = to_library_dfa(fa)
        if dfa.isempty():
            return EMPTY_SET_NAME
        gnfa = GNFA.from_dfa(dfa.to_complete(EMPTY_SET_NAME if EMPTY_SET_NAME not in fa.states else "∅'"))
    else:
        nfa = to_library_nfa(fa)
        equivalent = DFA.from_nfa(nfa)
        if equivalent.isempty():
            return EMPTY_SET_NAME
        gnfa = GNFA.from_nfa(nfa)
    regex = gnfa.to_regex()
    return regex if regex else "ε"


def transition_table(fa: FiniteAutomaton) -> str:
    edges = validate(fa)
    symbols = list(fa.alphabet) + (["ε"] if any(sym == "" for _, sym, _ in edges) else [])
    cells: dict = defaultdict(set)
    for src, sym, dst in edges:
        cells[(src, show(sym))].add(dst)
    header = "| Durum | " + " | ".join(symbols) + " |"
    lines = [header, "|" + "---|" * (len(symbols) + 1)]
    for s in fa.states:
        mark = ("→" if s == fa.start_state else "") + ("*" if s in fa.accept_states else "")
        row = [",".join(sorted(cells.get((s, sym), ()))) or "-" for sym in symbols]
        lines.append(f"| {mark}{s} | " + " | ".join(row) + " |")
    return "\n".join(lines)
