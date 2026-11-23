def _tm(states, input_alphabet, tape_alphabet, start, accept, edges, blank="_"):
    return {
        "type": "DTM",
        "states": states,
        "input_alphabet": input_alphabet,
        "tape_alphabet": tape_alphabet,
        "blank_symbol": blank,
        "start_state": start,
        "accept_states": accept,
        "transitions": [{"from": a, "read": r, "to": b, "write": w, "move": m} for a, r, b, w, m in edges],
    }


TM_TEMPLATES = [
    {
        "id": "anbncn",
        "name": "aⁿbⁿcⁿ (n ≥ 0)",
        "description": "Her turda bir a'yı X, bir b'yi Y, bir c'yi Z ile işaretleyerek eşit sayıları doğrular.",
        "automaton": _tm(
            ["q0", "q1", "q2", "q3", "q4", "qk"], ["a", "b", "c"], ["a", "b", "c", "X", "Y", "Z", "_"], "q0", ["qk"],
            [
                ("q0", "a", "q1", "X", "R"),
                ("q0", "Y", "q4", "Y", "R"),
                ("q0", "_", "qk", "_", "R"),
                ("q1", "a", "q1", "a", "R"),
                ("q1", "Y", "q1", "Y", "R"),
                ("q1", "b", "q2", "Y", "R"),
                ("q2", "b", "q2", "b", "R"),
                ("q2", "Z", "q2", "Z", "R"),
                ("q2", "c", "q3", "Z", "L"),
                ("q3", "a", "q3", "a", "L"),
                ("q3", "b", "q3", "b", "L"),
                ("q3", "Y", "q3", "Y", "L"),
                ("q3", "Z", "q3", "Z", "L"),
                ("q3", "X", "q0", "X", "R"),
                ("q4", "Y", "q4", "Y", "R"),
                ("q4", "Z", "q4", "Z", "R"),
                ("q4", "_", "qk", "_", "R"),
            ],
        ),
    },
    {
        "id": "0n1n",
        "name": "0ⁿ1ⁿ (n ≥ 0)",
        "description": "En soldaki 0'ı ve eşleşen 1'i işaretleyerek ilerleyen klasik TM.",
        "automaton": _tm(
            ["q0", "q1", "q2", "q3", "qk"], ["0", "1"], ["0", "1", "X", "Y", "_"], "q0", ["qk"],
            [
                ("q0", "0", "q1", "X", "R"),
                ("q0", "Y", "q3", "Y", "R"),
                ("q0", "_", "qk", "_", "R"),
                ("q1", "0", "q1", "0", "R"),
                ("q1", "Y", "q1", "Y", "R"),
                ("q1", "1", "q2", "Y", "L"),
                ("q2", "0", "q2", "0", "L"),
                ("q2", "Y", "q2", "Y", "L"),
                ("q2", "X", "q0", "X", "R"),
                ("q3", "Y", "q3", "Y", "R"),
                ("q3", "_", "qk", "_", "R"),
            ],
        ),
    },
    {
        "id": "binary-increment",
        "name": "İkili sayıyı 1 artırma",
        "description": "Şeritteki ikili sayıya 1 ekler; sonuç şeritte okunur.",
        "automaton": _tm(
            ["sağa", "taşı", "bitti"], ["0", "1"], ["0", "1", "_"], "sağa", ["bitti"],
            [
                ("sağa", "0", "sağa", "0", "R"),
                ("sağa", "1", "sağa", "1", "R"),
                ("sağa", "_", "taşı", "_", "L"),
                ("taşı", "1", "taşı", "0", "L"),
                ("taşı", "0", "bitti", "1", "L"),
                ("taşı", "_", "bitti", "1", "L"),
            ],
        ),
    },
]
