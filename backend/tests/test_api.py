import itertools
import json
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


class _FakeModels:
    def __init__(self, script):
        self.script = script
        self.calls = []

    def generate_content(self, model, contents, config):
        from google.genai import errors

        self.calls.append(model)
        outcome = self.script.get(model, 503)
        if isinstance(outcome, int):
            raise errors.APIError(outcome, {"error": {"code": outcome, "message": "test", "status": "X"}})
        return type("R", (), {"text": outcome})()


def _fake_client(monkeypatch, script, models):
    fake = _FakeModels(script)
    client = type("C", (), {"models": fake})()
    monkeypatch.setattr(gemini, "_client", lambda: (client, models))
    monkeypatch.setattr(gemini.time, "sleep", lambda _: None)
    return fake


def test_ai_falls_back_when_model_overloaded(monkeypatch):
    dfa = template(FA_TEMPLATES, FA_TEMPLATES[0]["id"])
    fake = _fake_client(monkeypatch, {"yedek": json.dumps(dfa)}, ["ana", "yedek"])
    r = client.post("/api/ai/generate", json={"prompt": "herhangi bir dil"})
    assert r.status_code == 200
    assert fake.calls == ["ana", "yedek"]


def test_ai_overloaded_everywhere_gives_turkish_502(monkeypatch):
    _fake_client(monkeypatch, {}, ["ana", "yedek"])
    r = client.post("/api/ai/generate", json={"prompt": "herhangi bir dil"})
    assert r.status_code == 502
    assert "yoğun" in r.json()["detail"]


def test_ai_invalid_key_is_not_retried(monkeypatch):
    fake = _fake_client(monkeypatch, {"ana": 403}, ["ana", "yedek"])
    r = client.post("/api/ai/generate", json={"prompt": "herhangi bir dil"})
    assert r.status_code == 502
    assert "anahtarı geçersiz" in r.json()["detail"]
    assert fake.calls == ["ana"]



def cnf(grammar):
    r = client.post("/api/cfg/cnf", json={"grammar": grammar})
    assert r.status_code == 200, r.text
    return r.json()


def cyk_accepts(grammar, word):
    r = client.post("/api/cfg/cyk", json={"grammar": grammar, "input": word})
    assert r.status_code == 200, r.text
    return r.json()["accepted"]


def is_balanced(word):
    depth = 0
    for ch in word:
        depth += 1 if ch == "(" else -1
        if depth < 0:
            return False
    return depth == 0


@pytest.mark.parametrize(
    "grammar, alphabet, member",
    [
        ("S -> aSb | ε", "ab", lambda w: re.fullmatch(r"(a*)(b*)", w) and w.count("a") == w.count("b")),
        ("S → SS | (S) | ε", "()", is_balanced),
        ("S -> aSa | bSb | λ", "ab", lambda w: w == w[::-1] and len(w) % 2 == 0),
        ("S -> ASA | aB\nA -> B | S\nB -> b | ε", "ab", None),
        ("S -> aSbb | A\nA -> c | ε", "abc", lambda w: re.fullmatch(r"(a*)c?(b*)", w) and 2 * w.count("a") == w.count("b")),
    ],
)
def test_cnf_preserves_language(grammar, alphabet, member):
    result = cnf(grammar)
    assert result["is_cnf"]
    assert [s["key"] for s in result["steps"]] == ["original", "start", "epsilon", "unit", "useless", "terminals", "binary"]
    for line in result["cnf"].splitlines():
        for body in line.split(" → ")[1].split(" | "):
            tokens = re.findall(r"[A-Z][₀-₉]*|\S", body.replace(" ", ""))
            assert body == "ε" or len(tokens) == 1 and not tokens[0][0].isupper() or len(tokens) == 2 and all(t[0].isupper() for t in tokens)
    if member:
        for w in words(alphabet, 8):
            assert cyk_accepts(result["cnf"], w) == bool(member(w)), w


def test_cnf_sipser_example_accepts_known_strings():
    result = cnf("S -> ASA | aB\nA -> B | S\nB -> b | ε")
    assert result["start"] == "S₀"
    assert "ε" not in result["cnf"]
    for w in ["a", "ab", "aa", "aab", "bab"]:
        assert cyk_accepts(result["cnf"], w), w
    assert not cyk_accepts(result["cnf"], "")
    assert not cyk_accepts(result["cnf"], "b")


def test_cnf_detects_empty_language_and_useless_symbols():
    assert cnf("S -> AB\nA -> a\nB -> C\nC -> D")["empty_language"]
    result = cnf("S -> a | A\nA -> aA\nC -> c")
    assert result["cnf"] == "S → a"


def test_cnf_parse_errors_are_turkish():
    for text in ["", "S aSb", "s -> a", "ab -> S"]:
        r = client.post("/api/cfg/cnf", json={"grammar": text or " "})
        assert r.status_code == 422
    assert "sol taraf" in client.post("/api/cfg/cnf", json={"grammar": "ab -> a"}).json()["detail"]


def test_cyk_requires_cnf_and_known_terminals():
    r = client.post("/api/cfg/cyk", json={"grammar": "S -> aSb | ε", "input": "ab"})
    assert r.status_code == 422 and "Chomsky" in r.json()["detail"]
    r = client.post("/api/cfg/cyk", json={"grammar": "S -> a", "input": "b"})
    assert r.status_code == 422
    table = client.post("/api/cfg/cyk", json={"grammar": "S -> AB\nA -> a\nB -> b", "input": "ab"}).json()["table"]
    assert table == [[["A"], ["B"]], [["S"]]]


IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="


def test_ai_image_grammar_is_normalized(monkeypatch):
    reply = json.dumps({"grammar": "S -> aSb | e\nS -> λ", "notes": ""})
    _fake_client(monkeypatch, {"ana": reply}, ["ana"])
    r = client.post("/api/ai/image", json={"task": "grammar", "image": IMAGE, "mime_type": "image/png"})
    assert r.status_code == 200, r.text
    assert r.json()["grammar"] == "S → aSb | e | ε"


def test_ai_image_automaton_returns_exact_regex(monkeypatch):
    dfa = template(FA_TEMPLATES, FA_TEMPLATES[0]["id"])
    _fake_client(monkeypatch, {"ana": json.dumps({**dfa, "notes": "net"})}, ["ana"])
    r = client.post("/api/ai/image", json={"task": "automaton", "image": IMAGE, "mime_type": "image/png"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["notes"] == "net"
    assert body["regex"] == client.post("/api/fa/to-regex", json=dfa).json()["regex"]


def test_ai_image_question_and_bad_payload(monkeypatch):
    _fake_client(monkeypatch, {"ana": "**Yanıt**"}, ["ana"])
    r = client.post("/api/ai/image", json={"task": "question", "image": IMAGE, "question": "Bu nedir?"})
    assert r.json()["answer"] == "**Yanıt**"
    r = client.post("/api/ai/image", json={"task": "question", "image": "bu-base64-degil!!!!"})
    assert r.status_code == 422
    _fake_client(monkeypatch, {"ana": json.dumps({"grammar": "", "notes": "Görselde kedi var."})}, ["ana"])
    r = client.post("/api/ai/image", json={"task": "grammar", "image": IMAGE})
    assert r.status_code == 502 and "kedi" in r.json()["detail"]


def test_ai_quota_exhausted_is_reported_and_not_retried(monkeypatch):
    fake = _fake_client(monkeypatch, {"ana": 429, "yedek": 503}, ["ana", "yedek"])
    r = client.post("/api/ai/generate", json={"prompt": "herhangi bir dil"})
    assert r.status_code == 502
    assert "kotası doldu" in r.json()["detail"]
    assert fake.calls.count("ana") == 1
    fake = _fake_client(monkeypatch, {"ana": 429, "yedek": 429}, ["ana", "yedek"])
    assert "tüm modellerde" in client.post("/api/ai/generate", json={"prompt": "herhangi bir dil"}).json()["detail"]


ALGEBRA_LANGS = {
    "A": {"kind": "contains", "value": "00"},
    "B": {"kind": "not_contains", "value": "11"},
    "C": {"kind": "not_contains", "value": "000"},
    "R": {"kind": "regex", "value": "(0∪1)*01"},
}
ALGEBRA_MEMBER = {
    "A": lambda w: "00" in w,
    "B": lambda w: "11" not in w,
    "C": lambda w: "000" not in w,
    "R": lambda w: w.endswith("01"),
}


def algebra(expression, languages=ALGEBRA_LANGS):
    r = client.post("/api/fa/algebra", json={"alphabet": ["0", "1"], "languages": languages, "expression": expression})
    assert r.status_code == 200, r.text
    return r.json()


def split_in(w, member):
    return w == "" or any(member(w[:i]) and split_in(w[i:], member) for i in range(1, len(w) + 1))


@pytest.mark.parametrize(
    "expression, member",
    [
        ("A∩B", lambda w: "00" in w and "11" not in w),
        ("A ∪ R", lambda w: "00" in w or w.endswith("01")),
        ("Aᶜ", lambda w: "00" not in w),
        ("¬A ∩ C", lambda w: "00" not in w),
        ("A − B", lambda w: "00" in w and "11" in w),
        ("AR", lambda w: any("00" in w[:i] and w[i:].endswith("01") for i in range(len(w) + 1))),
        ("(A∩B)*", lambda w: split_in(w, lambda x: "00" in x and "11" not in x)),
        ("(A∩B)⁺", lambda w: w != "" and split_in(w, lambda x: "00" in x and "11" not in x)),
        ("Σ* − A", lambda w: "00" not in w),
        ("ε ∪ R", lambda w: w == "" or w.endswith("01")),
    ],
)
def test_language_algebra_matches_definition(expression, member):
    result = algebra(expression)
    for w in words("01", 8):
        assert fa_accepts(result["automaton"], w) == bool(member(w)), (expression, w)
    assert client.post("/api/fa/minimize", json=result["automaton"]).json()["states"].__len__() == len(result["automaton"]["states"])


def test_language_algebra_user_example_is_universal():
    result = algebra("(AUB)*C")
    assert result["universal"] and result["automaton"]["states"] == ["q0"]
    assert [s["operation"] for s in result["steps"]] == ["Birleşim", "Kleene yıldızı", "Birleştirme (art arda ekleme)"]
    assert result["languages"][0]["description"] == "00 alt dizesini içeren dizeler"


def test_language_algebra_errors():
    r = client.post("/api/fa/algebra", json={"alphabet": ["0", "1"], "languages": ALGEBRA_LANGS, "expression": "A ∪ D"})
    assert r.status_code == 422 and "D' dili tanımlı değil" in r.json()["detail"]
    r = client.post("/api/fa/algebra", json={"alphabet": ["0", "1"], "languages": ALGEBRA_LANGS, "expression": "(A ∪ B"})
    assert r.status_code == 422
    bad = {"A": {"kind": "contains", "value": "2"}}
    r = client.post("/api/fa/algebra", json={"alphabet": ["0", "1"], "languages": bad, "expression": "A"})
    assert r.status_code == 422 and r.json()["detail"].startswith("A dili")


MULTI_LANGS = {
    "A": {"conditions": [{"kind": "contains", "value": "00"}, {"kind": "not_contains", "value": "11"}], "combine": "and"},
    "B": {"conditions": [{"kind": "length_mod", "value": "2"}, {"kind": "count_mod", "value": "1,3"}], "combine": "or"},
    "C": {"conditions": [{"kind": "length_mod", "value": "3,1"}, {"kind": "ends", "value": "1"}, {"kind": "not_starts", "value": "0"}]},
}


@pytest.mark.parametrize(
    "expression, member",
    [
        ("A", lambda w: "00" in w and "11" not in w),
        ("B", lambda w: len(w) % 2 == 0 or w.count("1") % 3 == 0),
        ("C", lambda w: len(w) % 3 == 1 and w.endswith("1") and not w.startswith("0")),
        ("A ∪ C", lambda w: ("00" in w and "11" not in w) or (len(w) % 3 == 1 and w.endswith("1") and not w.startswith("0"))),
    ],
)
def test_language_algebra_multi_condition(expression, member):
    result = algebra(expression, MULTI_LANGS)
    for w in words("01", 9):
        assert fa_accepts(result["automaton"], w) == bool(member(w)), (expression, w)


def test_language_algebra_multi_condition_descriptions_and_errors():
    langs = algebra("A", MULTI_LANGS)["languages"]
    assert langs[0]["description"] == "00 alt dizesini içeren ve 11 alt dizesini içermeyen dizeler"
    assert langs[1]["description"] == "uzunluğu ≡ 0 (mod 2) olan veya 1 sayısı ≡ 0 (mod 3) olan dizeler"
    for bad in ["3,3", "x", "0"]:
        r = client.post("/api/fa/algebra", json={"alphabet": ["0", "1"], "languages": {"A": {"kind": "length_mod", "value": bad}}, "expression": "A"})
        assert r.status_code == 422, bad
    r = client.post("/api/fa/algebra", json={"alphabet": ["0", "1"], "languages": {"A": {"kind": "count_mod", "value": "2,3"}}, "expression": "A"})
    assert r.status_code == 422 and "alfabede" in r.json()["detail"]


BOOK_LANGS = {
    "A": {"kind": "count_exact", "value": "a,2"},
    "B": {"kind": "count_min", "value": "a,2"},
    "C": {"kind": "count_max", "value": "a,2"},
    "D": {"conditions": [{"kind": "length_min", "value": "3"}, {"kind": "length_max", "value": "5"}]},
    "E": {"kind": "length_exact", "value": "0"},
    "R": {"kind": "regex", "value": "a⁺b+"},
}


@pytest.mark.parametrize(
    "expression, member",
    [
        ("A", lambda w: w.count("a") == 2),
        ("B", lambda w: w.count("a") >= 2),
        ("C", lambda w: w.count("a") <= 2),
        ("D", lambda w: 3 <= len(w) <= 5),
        ("E", lambda w: w == ""),
        ("R", lambda w: re.fullmatch(r"a+b+", w)),
        ("A+", lambda w: w != "" and split_in(w, lambda x: x.count("a") == 2)),
    ],
)
def test_language_algebra_book_style_conditions(expression, member):
    r = client.post("/api/fa/algebra", json={"alphabet": ["a", "b"], "languages": BOOK_LANGS, "expression": expression})
    assert r.status_code == 200, r.text
    for w in words("ab", 7):
        assert fa_accepts(r.json()["automaton"], w) == bool(member(w)), (expression, w)


def test_language_algebra_book_descriptions():
    r = client.post("/api/fa/algebra", json={"alphabet": ["a", "b"], "languages": BOOK_LANGS, "expression": "A"})
    names = [l["description"] for l in r.json()["languages"]]
    assert names[0] == "tam 2 tane a içeren dizeler"
    assert names[3] == "uzunluğu en az 3 olan ve uzunluğu en çok 5 olan dizeler"
