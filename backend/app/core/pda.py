from collections import defaultdict, deque

from automata.base.exceptions import RejectionException
from automata.pda.npda import NPDA

from app.core.common import check_states, norm, require
from app.schemas import PDA, PDASimulateResponse, PDAStep, PDATransition

MAX_STACK_DEPTH = 500


def _push_symbols(push: str) -> tuple[str, ...]:
    return tuple(norm(push))


def validate(pda: PDA) -> None:
    check_states(pda.states, pda.start_state, pda.accept_states, pda.transitions)
    alphabet, stack_alphabet = set(pda.alphabet), set(pda.stack_alphabet)
    require(pda.initial_stack_symbol in stack_alphabet, "Başlangıç yığıt sembolü yığıt alfabesinde olmalı.")
    for a in alphabet | stack_alphabet:
        require(len(a) == 1, f"Semboller tek karakter olmalı: '{a}'.")
    for t in pda.transitions:
        label = f"({t.from_} → {t.to})"
        inp, pop = norm(t.input), norm(t.pop)
        require(inp == "" or inp in alphabet, f"'{inp}' girdi alfabesinde yok {label}.")
        require(pop == "" or pop in stack_alphabet, f"'{pop}' yığıt alfabesinde yok {label}.")
        for sym in _push_symbols(t.push):
            require(sym in stack_alphabet, f"'{sym}' yığıt alfabesinde yok {label}.")


def to_library(pda: PDA) -> NPDA:
    validate(pda)
    table: dict = {s: defaultdict(lambda: defaultdict(set)) for s in pda.states}
    for t in pda.transitions:
        inp, pop, push = norm(t.input), norm(t.pop), _push_symbols(t.push)
        if pop:
            table[t.from_][inp][pop].add((t.to, push))
        else:
            for top in pda.stack_alphabet:
                table[t.from_][inp][top].add((t.to, push + (top,)))
    transitions = {s: {i: {p: set(v) for p, v in m.items()} for i, m in im.items()} for s, im in table.items()}
    return NPDA(
        states=set(pda.states),
        input_symbols=set(pda.alphabet),
        stack_symbols=set(pda.stack_alphabet),
        transitions=transitions,
        initial_state=pda.start_state,
        initial_stack_symbol=pda.initial_stack_symbol,
        final_states=set(pda.accept_states),
        acceptance_mode="final_state",
    )


def library_accepts(npda: NPDA, word: str, max_steps: int, max_configs: int) -> bool | None:
    try:
        for i, configs in enumerate(npda.read_input_stepwise(word)):
            if i > max_steps or len(configs) > max_configs:
                return None
            if any(c.state in npda.final_states and not c.remaining_input for c in configs):
                return True
        return True
    except RejectionException:
        return False


def _apply(stack: tuple[str, ...], t: PDATransition) -> tuple[str, ...] | None:
    pop = norm(t.pop)
    if pop:
        if not stack or stack[-1] != pop:
            return None
        stack = stack[:-1]
    return stack + tuple(reversed(_push_symbols(t.push)))


def simulate(pda: PDA, word: str, max_configurations: int) -> PDASimulateResponse:
    validate(pda)
    for ch in word:
        require(ch in pda.alphabet, f"Girdi dizesindeki '{ch}' sembolü alfabede yok.")
    by_state = defaultdict(list)
    for t in pda.transitions:
        by_state[t.from_].append(t)

    accept = set(pda.accept_states)
    start = (pda.start_state, 0, (pda.initial_stack_symbol,))
    parent: dict = {start: None}
    queue = deque([start])
    found, limit_reached = None, False
    while queue:
        config = queue.popleft()
        state, pos, stack = config
        if pos == len(word) and state in accept:
            found = config
            break
        for t in by_state[state]:
            inp = norm(t.input)
            if inp and (pos >= len(word) or word[pos] != inp):
                continue
            new_stack = _apply(stack, t)
            if new_stack is None or len(new_stack) > MAX_STACK_DEPTH:
                limit_reached = limit_reached or new_stack is not None
                continue
            nxt = (t.to, pos + len(inp), new_stack)
            if nxt in parent:
                continue
            if len(parent) >= max_configurations:
                limit_reached = True
                continue
            parent[nxt] = (config, t)
            queue.append(nxt)

    path = []
    node = found
    while node is not None:
        link = parent[node]
        path.append((node, link[1] if link else None))
        node = link[0] if link else None
    path.reverse()
    if not path:
        path = [(start, None)]

    steps = [
        PDAStep(index=i, state=s, consumed=word[:p], remaining=word[p:], stack=list(st), transition=t)
        for i, ((s, p, st), t) in enumerate(path)
    ]
    accepted = found is not None
    verified = library_accepts(to_library(pda), word, max_steps=4 * len(word) + 200, max_configs=max_configurations)
    return PDASimulateResponse(
        accepted=accepted,
        verified=None if verified is None else verified == accepted,
        limit_reached=limit_reached and not accepted,
        steps=steps,
    )
