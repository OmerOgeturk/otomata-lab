import re
from collections import deque

from automata.base.exceptions import AutomatonException
from automata.fa.dfa import DFA
from automata.fa.nfa import NFA

from app.core import fa as fa_core
from app.core.common import AutomatonError, require
from app.schemas import FATransition, FiniteAutomaton

MAX_STATES = 300
NAME = re.compile(r"[A-TV-Z](?:[0-9₀-₉]+)?")
UNION = {"∪", "U", "|", "+"}
INTERSECT = {"∩", "&"}
DIFF = {"−", "-", "\\"}
COMPLEMENT_POST = {"ᶜ", "'", "′"}
COMPLEMENT_PRE = {"¬", "~"}
CONCAT = {"·", "."}
KIND_LABELS = {
    "contains": "{v} alt dizesini içeren dizeler",
    "not_contains": "{v} alt dizesini içermeyen dizeler",
    "starts": "{v} ile başlayan dizeler",
    "not_starts": "{v} ile başlamayan dizeler",
    "ends": "{v} ile biten dizeler",
    "not_ends": "{v} ile bitmeyen dizeler",
    "regex": "{v} düzenli ifadesinin dili",
    "automaton": "verilen otomatın dili",
}


def _minimal(dfa: DFA) -> DFA:
    result = dfa.minify(retain_names=False)
    require(len(result.states) <= MAX_STATES, f"Ara sonuç {MAX_STATES} durumu aşıyor; ifadeyi sadeleştirin.")
    return result


def _from_nfa(nfa: NFA) -> DFA:
    return _minimal(DFA.from_nfa(nfa))


def _regex_dfa(regex: str, alphabet: set[str]) -> DFA:
    text = regex.replace(" ", "").replace("∪", "|").replace("+", "|").replace("ε", "()")
    require(text, "Düzenli ifade boş olamaz.")
    for ch in text:
        require(ch in alphabet or ch in "|*()?", f"Düzenli ifadede '{ch}' sembolü alfabede yok.")
    try:
        return _from_nfa(NFA.from_regex(text, input_symbols=alphabet))
    except (AutomatonException, IndexError, KeyError) as exc:
        raise AutomatonError(f"Düzenli ifade çözümlenemedi: {regex}") from exc


def _pattern_dfa(kind: str, value: str, alphabet: set[str]) -> DFA:
    require(value, "Alt dize boş olamaz.")
    for ch in value:
        require(ch in alphabet, f"'{ch}' sembolü alfabede yok.")
    positive = not kind.startswith("not_")
    base = kind.removeprefix("not_")
    builder = {"contains": DFA.from_substring, "starts": DFA.from_prefix, "ends": DFA.from_suffix}[base]
    return _minimal(builder(alphabet, value, contains=positive))


def language_dfa(definition: dict, alphabet: set[str]) -> DFA:
    kind = definition.get("kind", "")
    value = (definition.get("value") or "").strip()
    require(kind in KIND_LABELS, f"Bilinmeyen dil türü: {kind}.")
    if kind == "regex":
        return _regex_dfa(value, alphabet)
    if kind == "automaton":
        automaton = FiniteAutomaton.model_validate(definition.get("automaton") or {})
        require(set(automaton.alphabet) <= alphabet, "Otomatın alfabesi, işlemlerin alfabesinin alt kümesi olmalı.")
        automaton = automaton.model_copy(update={"alphabet": sorted(alphabet)})
        nfa = fa_core.to_library_nfa(automaton)
        return _from_nfa(nfa)
    return _pattern_dfa(kind, value, alphabet)


def _tokenize(expression: str) -> list[str]:
    tokens = []
    i = 0
    while i < len(expression):
        ch = expression[i]
        if ch.isspace():
            i += 1
            continue
        match = NAME.match(expression, i)
        if match:
            tokens.append(match.group())
            i = match.end()
            continue
        if expression.startswith("Σ*", i):
            tokens.append("Σ*")
            i += 2
            continue
        require(
            ch in UNION | INTERSECT | DIFF | COMPLEMENT_POST | COMPLEMENT_PRE | CONCAT | {"(", ")", "*", "⁺", "∅", "ε"},
            f"İfadede tanınmayan karakter: '{ch}'.",
        )
        tokens.append(ch)
        i += 1
    require(tokens, "İşlem ifadesi boş olamaz. Örn. (A∪B)*C")
    return tokens


class _Parser:
    def __init__(self, tokens, atoms, alphabet, steps):
        self.tokens = tokens
        self.pos = 0
        self.atoms = atoms
        self.alphabet = alphabet
        self.steps = steps

    def peek(self):
        return self.tokens[self.pos] if self.pos < len(self.tokens) else None

    def take(self):
        token = self.peek()
        self.pos += 1
        return token

    def record(self, text: str, dfa: DFA, operation: str):
        self.steps.append({"expression": text, "operation": operation, **describe(dfa, self.alphabet)})
        return text, dfa

    def parse(self):
        result = self.union()
        require(self.peek() is None, f"Beklenmeyen simge: '{self.peek()}'.")
        return result

    def union(self):
        text, dfa = self.intersection()
        while self.peek() in UNION | DIFF:
            op = self.take()
            rtext, rdfa = self.intersection()
            if op in UNION:
                text, dfa = self.record(f"{text} ∪ {rtext}", _minimal(dfa.union(rdfa)), "Birleşim")
            else:
                text, dfa = self.record(f"{text} − {rtext}", _minimal(dfa.difference(rdfa)), "Fark")
        return text, dfa

    def intersection(self):
        text, dfa = self.concat()
        while self.peek() in INTERSECT:
            self.take()
            rtext, rdfa = self.concat()
            text, dfa = self.record(f"{text} ∩ {rtext}", _minimal(dfa.intersection(rdfa)), "Kesişim")
        return text, dfa

    def starts_factor(self, token) -> bool:
        return token is not None and (bool(NAME.fullmatch(token)) or token in {"(", "Σ*", "∅", "ε"} | COMPLEMENT_PRE)

    def concat(self):
        text, dfa = self.postfix()
        while self.peek() in CONCAT or self.starts_factor(self.peek()):
            if self.peek() in CONCAT:
                self.take()
            rtext, rdfa = self.postfix()
            joined = NFA.from_dfa(dfa).concatenate(NFA.from_dfa(rdfa))
            text, dfa = self.record(f"{text}{rtext}", _from_nfa(joined), "Birleştirme (art arda ekleme)")
        return text, dfa

    def postfix(self):
        if self.peek() in COMPLEMENT_PRE:
            self.take()
            text, dfa = self.postfix()
            return self.record(f"¬{text}", _minimal(dfa.complement()), "Tümleme")
        text, dfa = self.atom()
        while self.peek() in {"*", "⁺"} | COMPLEMENT_POST:
            op = self.take()
            if op == "*":
                text, dfa = self.record(f"{text}*", _from_nfa(NFA.from_dfa(dfa).kleene_star()), "Kleene yıldızı")
            elif op == "⁺":
                nfa = NFA.from_dfa(dfa)
                text, dfa = self.record(f"{text}⁺", _from_nfa(nfa.concatenate(nfa.kleene_star())), "Pozitif kapanış")
            else:
                text, dfa = self.record(f"{text}ᶜ", _minimal(dfa.complement()), "Tümleme")
        return text, dfa

    def atom(self):
        token = self.take()
        require(token is not None, "İfade eksik bitti.")
        if token == "(":
            text, dfa = self.union()
            require(self.take() == ")", "Kapanmamış parantez var.")
            return f"({text})", dfa
        if token == "Σ*":
            return token, _minimal(DFA.universal_language(self.alphabet))
        if token == "∅":
            return token, _minimal(DFA.empty_language(self.alphabet))
        if token == "ε":
            return token, _minimal(DFA.from_finite_language(self.alphabet, {""}))
        require(bool(NAME.fullmatch(token)), f"Beklenmeyen simge: '{token}'.")
        require(token in self.atoms, f"'{token}' dili tanımlı değil. Tanımlı diller: {', '.join(sorted(self.atoms)) or 'yok'}.")
        return token, self.atoms[token]


def describe(dfa: DFA, alphabet: set[str]) -> dict:
    return {"states": len(dfa.states), "empty": dfa.isempty(), "universal": DFA.universal_language(alphabet).issubset(dfa)}


def to_automaton(dfa: DFA) -> FiniteAutomaton:
    symbols = sorted(dfa.input_symbols)
    order = [dfa.initial_state]
    queue = deque(order)
    while queue:
        state = queue.popleft()
        for sym in symbols:
            target = dfa.transitions[state][sym]
            if target not in order:
                order.append(target)
                queue.append(target)
    names = {s: f"q{i}" for i, s in enumerate(order)}
    return FiniteAutomaton(
        type="DFA",
        states=[names[s] for s in order],
        alphabet=symbols,
        start_state=names[dfa.initial_state],
        accept_states=[names[s] for s in order if s in dfa.final_states],
        transitions=[
            FATransition(**{"from": names[s], "to": names[dfa.transitions[s][sym]], "symbol": sym})
            for s in order
            for sym in symbols
        ],
    )


def evaluate(alphabet: list[str], languages: dict[str, dict], expression: str) -> dict:
    symbols = {a.strip() for a in alphabet if a.strip()}
    require(symbols, "Alfabe boş olamaz.")
    for a in symbols:
        require(len(a) == 1, f"Alfabe sembolleri tek karakter olmalı: '{a}'.")
    atoms = {}
    defined = []
    for name, definition in languages.items():
        require(bool(NAME.fullmatch(name)), f"Dil adı büyük harf olmalı (U birleşim işareti olduğu için kullanılamaz): '{name}'.")
        try:
            atoms[name] = language_dfa(definition, symbols)
        except AutomatonError as exc:
            raise AutomatonError(f"{name} dili: {exc}") from exc
        value = (definition.get("value") or "").strip()
        defined.append({"name": name, "description": KIND_LABELS[definition["kind"]].format(v=value), **describe(atoms[name], symbols)})
    steps: list[dict] = []
    _, result = _Parser(_tokenize(expression), atoms, symbols, steps).parse()
    automaton = to_automaton(result)
    return {
        "automaton": automaton,
        "regex": fa_core.to_regex(automaton),
        "languages": defined,
        "steps": steps,
        **describe(result, symbols),
    }
