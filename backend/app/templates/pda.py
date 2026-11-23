def _pda(states, alphabet, stack_alphabet, start, accept, edges):
    return {
        "type": "PDA",
        "states": states,
        "alphabet": alphabet,
        "stack_alphabet": stack_alphabet,
        "initial_stack_symbol": "$",
        "start_state": start,
        "accept_states": accept,
        "transitions": [{"from": a, "input": i, "pop": p, "push": u, "to": b} for a, i, p, u, b in edges],
    }


PDA_TEMPLATES = [
    {
        "id": "anbn",
        "name": "aⁿbⁿ (n ≥ 0)",
        "description": "Önce n tane a, ardından n tane b içeren dizeler.",
        "automaton": _pda(
            ["q0", "q1", "q2"], ["a", "b"], ["A", "$"], "q0", ["q2"],
            [
                ("q0", "a", "ε", "A", "q0"),
                ("q0", "ε", "ε", "ε", "q1"),
                ("q1", "b", "A", "ε", "q1"),
                ("q1", "ε", "$", "$", "q2"),
            ],
        ),
    },
    {
        "id": "even-palindrome",
        "name": "Çift uzunlukta palindromlar (wwᴿ)",
        "description": "Σ={a,b} üzerinde w ve tersinin birleşimi olan dizeler.",
        "automaton": _pda(
            ["q0", "q1", "q2"], ["a", "b"], ["a", "b", "$"], "q0", ["q2"],
            [
                ("q0", "a", "ε", "a", "q0"),
                ("q0", "b", "ε", "b", "q0"),
                ("q0", "ε", "ε", "ε", "q1"),
                ("q1", "a", "a", "ε", "q1"),
                ("q1", "b", "b", "ε", "q1"),
                ("q1", "ε", "$", "$", "q2"),
            ],
        ),
    },
    {
        "id": "palindrome",
        "name": "Tüm palindromlar",
        "description": "Σ={a,b} üzerinde tersten okunuşu aynı olan dizeler (tek ve çift uzunluk).",
        "automaton": _pda(
            ["q0", "q1", "q2"], ["a", "b"], ["a", "b", "$"], "q0", ["q2"],
            [
                ("q0", "a", "ε", "a", "q0"),
                ("q0", "b", "ε", "b", "q0"),
                ("q0", "ε", "ε", "ε", "q1"),
                ("q0", "a", "ε", "ε", "q1"),
                ("q0", "b", "ε", "ε", "q1"),
                ("q1", "a", "a", "ε", "q1"),
                ("q1", "b", "b", "ε", "q1"),
                ("q1", "ε", "$", "$", "q2"),
            ],
        ),
    },
    {
        "id": "balanced-parens",
        "name": "Dengeli parantezler",
        "description": "Açılan her parantezin doğru sırayla kapandığı dizeler.",
        "automaton": _pda(
            ["q0", "q1"], ["(", ")"], ["P", "$"], "q0", ["q1"],
            [
                ("q0", "(", "ε", "P", "q0"),
                ("q0", ")", "P", "ε", "q0"),
                ("q0", "ε", "$", "$", "q1"),
            ],
        ),
    },
]
