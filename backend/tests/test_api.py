import itertools
import re

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import gemini
from app.templates import FA_TEMPLATES, PDA_TEMPLATES, TM_TEMPLATES

client = TestClient(app)


def words(alphabet, max_len):
    for n in range(max_len + 1):
        for w in itertools.product(alphabet, repeat=n):
            yield "".join(w)


def template(templates, tid):
    return next(t["automaton"] for t in templates if t["id"] == tid)


def fa_accepts(automaton, word):
    r = client.post("/api/fa/simulate", json={"automaton": automaton, "input": word})
    assert r.status_code == 200, r.text
    return r.json()["accepted"]


def regex_accepts(regex, word):
    if regex == "∅":
        return False
    return re.fullmatch(regex.replace("ε", ""), word) is not None


FA_LANGUAGES = {
    "no-11": lambda w: "11" not in w,
    "ends-01": lambda w: w.endswith("01"),
    "even-0": lambda w: w.count("0") % 2 == 0,
    "div-3": lambda w: int(w or "0", 2) % 3 == 0,
    "second-last-1": lambda w: len(w) >= 2 and w[-2] == "1",
    "contains-101": lambda w: "101" in w,
    "only-0-or-only-1": lambda w: set(w) <= {"0"} or set(w) <= {"1"},
}


@pytest.mark.parametrize("tid", FA_LANGUAGES)
def test_fa_templates_and_conversions_preserve_language(tid):
    automaton = template(FA_TEMPLATES, tid)
    dfa = client.post("/api/fa/nfa-to-dfa", json=automaton).json()
    minimal = client.post("/api/fa/minimize", json=automaton).json()
    regex = client.post("/api/fa/to-regex", json=automaton).json()["regex"]
    assert dfa["type"] == minimal["type"] == "DFA"
    for w in words("01", 8):
        expected = FA_LANGUAGES[tid](w)
        assert fa_accepts(automaton, w) == expected, w
        assert regex_accepts(regex, w) == expected, (regex, w)
        if len(w) <= 5:
            assert fa_accepts(dfa, w) == expected, w
            assert fa_accepts(minimal, w) == expected, w


def test_minimize_gives_minimal_state_count():
    minimal = client.post("/api/fa/minimize", json=template(FA_TEMPLATES, "second-last-1")).json()
    assert len(minimal["states"]) == 4


def test_fa_simulation_steps_highlight_transitions():
    data = client.post(
        "/api/fa/simulate", json={"automaton": template(FA_TEMPLATES, "only-0-or-only-1"), "input": "00"}
    ).json()
    assert data["accepted"] is True
    assert data["steps"][0]["active_states"] == ["q0", "q1", "q2"]
    assert {t["symbol"] for t in data["steps"][0]["transitions"]} == {"ε"}
    assert data["steps"][2]["active_states"] == ["q1"]
    assert data["steps"][2]["transitions"] == [{"from": "q1", "to": "q1", "symbol": "0"}]


def test_fa_validation_errors_are_turkish_422():
    bad = template(FA_TEMPLATES, "no-11") | {"transitions": [{"from": "q0", "to": "q1", "symbol": "0"}, {"from": "q0", "to": "q2", "symbol": "0"}]}
    r = client.post("/api/fa/simulate", json={"automaton": bad, "input": "0"})
    assert r.status_code == 422
    assert "birden fazla" in r.json()["detail"]
    r = client.post("/api/fa/simulate", json={"automaton": template(FA_TEMPLATES, "no-11"), "input": "2"})
    assert r.status_code == 422


def test_empty_language_regex():
    automaton = template(FA_TEMPLATES, "no-11") | {"accept_states": []}
    assert client.post("/api/fa/to-regex", json=automaton).json()["regex"] == "∅"


PDA_LANGUAGES = {
    "anbn": ("ab", lambda w: w == "a" * (len(w) // 2) + "b" * (len(w) // 2)),
    "even-palindrome": ("ab", lambda w: w == w[::-1] and len(w) % 2 == 0),
    "palindrome": ("ab", lambda w: w == w[::-1]),
    "balanced-parens": ("()", lambda w: _balanced(w)),
}


def _balanced(w):
    depth = 0
    for ch in w:
        depth += 1 if ch == "(" else -1
        if depth < 0:
            return False
    return depth == 0


@pytest.mark.parametrize("tid", PDA_LANGUAGES)
def test_pda_templates(tid):
    alphabet, language = PDA_LANGUAGES[tid]
    automaton = template(PDA_TEMPLATES, tid)
    for w in words(alphabet, 8):
        data = client.post("/api/pda/simulate", json={"automaton": automaton, "input": w}).json()
        assert data["accepted"] == language(w), w
        assert data["verified"] is True, w


def test_pda_trace_shows_stack():
    data = client.post("/api/pda/simulate", json={"automaton": template(PDA_TEMPLATES, "anbn"), "input": "aabb"}).json()
    stacks = [s["stack"] for s in data["steps"]]
    assert stacks[0] == ["$"]
    assert ["$", "A", "A"] in stacks
    assert data["steps"][-1]["state"] == "q2"
    assert data["steps"][-1]["remaining"] == ""


def test_tm_anbncn():
    machine = template(TM_TEMPLATES, "anbncn")
    for w in words("abc", 7):
        n = len(w) // 3
        expected = w == "a" * n + "b" * n + "c" * n
        data = client.post("/api/tm/simulate", json={"machine": machine, "input": w}).json()
        assert data["result"] == ("accepted" if expected else "rejected"), w


def test_tm_0n1n():
    machine = template(TM_TEMPLATES, "0n1n")
    for w in words("01", 8):
        n = len(w) // 2
        expected = w == "0" * n + "1" * n
        data = client.post("/api/tm/simulate", json={"machine": machine, "input": w}).json()
        assert data["result"] == ("accepted" if expected else "rejected"), w


@pytest.mark.parametrize("n", range(0, 40))
def test_tm_binary_increment(n):
    word = bin(n)[2:]
    data = client.post("/api/tm/simulate", json={"machine": template(TM_TEMPLATES, "binary-increment"), "input": word}).json()
    assert data["result"] == "accepted"
    assert data["output"] == bin(n + 1)[2:]
    last = data["steps"][-1]
    assert 0 <= last["head"] < len(last["tape"])


def test_tm_step_limit():
    machine = {
        "type": "DTM", "states": ["q0", "qk"], "input_alphabet": ["0"], "tape_alphabet": ["0", "_"],
        "blank_symbol": "_", "start_state": "q0", "accept_states": ["qk"],
        "transitions": [{"from": "q0", "read": "_", "to": "q0", "write": "_", "move": "R"},
                        {"from": "q0", "read": "0", "to": "q0", "write": "0", "move": "R"}],
    }
    data = client.post("/api/tm/simulate", json={"machine": machine, "input": "0", "max_steps": 50}).json()
    assert data["result"] == "limit"


def test_templates_endpoints():
    for path in ("/api/fa/templates", "/api/pda/templates", "/api/tm/templates"):
        r = client.get(path)
        assert r.status_code == 200 and len(r.json()) >= 3


def test_ai_without_key_returns_503(monkeypatch):
    monkeypatch.setattr(gemini, "ENV_PATH", gemini.ENV_PATH.with_name("__yok__.env"))
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    r = client.post("/api/ai/generate", json={"prompt": "11 içermeyen dizeler"})
    assert r.status_code == 503
    assert "GEMINI_API_KEY" in r.json()["detail"]
    assert client.get("/api/ai/status").json()["configured"] is False


def test_ai_status_reads_env_file(monkeypatch, tmp_path):
    env = tmp_path / ".env"
    env.write_text("GEMINI_API_KEY=deneme-anahtari\n", encoding="utf-8")
    monkeypatch.setattr(gemini, "ENV_PATH", env)
    monkeypatch.setenv("GEMINI_API_KEY", "")
    assert client.get("/api/ai/status").json()["configured"] is True
