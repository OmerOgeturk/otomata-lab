def _fa(kind, states, alphabet, start, accept, edges):
    return {
        "type": kind,
        "states": states,
        "alphabet": alphabet,
        "start_state": start,
        "accept_states": accept,
        "transitions": [{"from": a, "symbol": s, "to": b} for a, s, b in edges],
    }


FA_TEMPLATES = [
    {
        "id": "no-11",
        "name": "11 içermeyen dizeler",
        "description": "Σ={0,1} üzerinde ardışık iki 1 içermeyen tüm dizeler.",
        "automaton": _fa(
            "DFA", ["q0", "q1", "q2"], ["0", "1"], "q0", ["q0", "q1"],
            [("q0", "0", "q0"), ("q0", "1", "q1"), ("q1", "0", "q0"), ("q1", "1", "q2"), ("q2", "0", "q2"), ("q2", "1", "q2")],
        ),
    },
    {
        "id": "ends-01",
        "name": "01 ile bitenler",
        "description": "Σ={0,1} üzerinde 01 ile biten dizeler.",
        "automaton": _fa(
            "DFA", ["q0", "q1", "q2"], ["0", "1"], "q0", ["q2"],
            [("q0", "0", "q1"), ("q0", "1", "q0"), ("q1", "0", "q1"), ("q1", "1", "q2"), ("q2", "0", "q1"), ("q2", "1", "q0")],
        ),
    },
    {
        "id": "even-0",
        "name": "Çift sayıda 0 içerenler",
        "description": "Σ={0,1} üzerinde 0 sayısı çift olan dizeler.",
        "automaton": _fa(
            "DFA", ["çift", "tek"], ["0", "1"], "çift", ["çift"],
            [("çift", "0", "tek"), ("çift", "1", "çift"), ("tek", "0", "çift"), ("tek", "1", "tek")],
        ),
    },
    {
        "id": "div-3",
        "name": "3'e bölünebilen ikili sayılar",
        "description": "İkili gösterimi 3'e tam bölünen sayılar (boş dize 0 kabul edilir).",
        "automaton": _fa(
            "DFA", ["r0", "r1", "r2"], ["0", "1"], "r0", ["r0"],
            [("r0", "0", "r0"), ("r0", "1", "r1"), ("r1", "0", "r2"), ("r1", "1", "r0"), ("r2", "0", "r1"), ("r2", "1", "r2")],
        ),
    },
    {
        "id": "second-last-1",
        "name": "Sondan ikinci sembolü 1 olanlar (NFA)",
        "description": "Σ={0,1} üzerinde sondan ikinci sembolü 1 olan dizeler.",
        "automaton": _fa(
            "NFA", ["q0", "q1", "q2"], ["0", "1"], "q0", ["q2"],
            [("q0", "0", "q0"), ("q0", "1", "q0"), ("q0", "1", "q1"), ("q1", "0", "q2"), ("q1", "1", "q2")],
        ),
    },
    {
        "id": "contains-101",
        "name": "101 içerenler (NFA)",
        "description": "Σ={0,1} üzerinde 101 alt dizesini içeren dizeler.",
        "automaton": _fa(
            "NFA", ["q0", "q1", "q2", "q3"], ["0", "1"], "q0", ["q3"],
            [("q0", "0", "q0"), ("q0", "1", "q0"), ("q0", "1", "q1"), ("q1", "0", "q2"), ("q2", "1", "q3"), ("q3", "0", "q3"), ("q3", "1", "q3")],
        ),
    },
    {
        "id": "only-0-or-only-1",
        "name": "0* ∪ 1* (ε-NFA)",
        "description": "Yalnızca 0'lardan ya da yalnızca 1'lerden oluşan dizeler.",
        "automaton": _fa(
            "ENFA", ["q0", "q1", "q2"], ["0", "1"], "q0", ["q1", "q2"],
            [("q0", "ε", "q1"), ("q0", "ε", "q2"), ("q1", "0", "q1"), ("q2", "1", "q2")],
        ),
    },
]
