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
UNION = {"∪", "U", "|"}
INTERSECT = {"∩", "&"}
DIFF = {"−", "-", "\\"}
COMPLEMENT_POST = {"ᶜ", "'", "′"}
COMPLEMENT_PRE = {"¬", "~"}
CONCAT = {"·", "."}
KIND_LABELS = {
    "contains": "{v} alt dizesini içeren",
    "not_contains": "{v} alt dizesini içermeyen",
    "starts": "{v} ile başlayan",
    "not_starts": "{v} ile başlamayan",
    "ends": "{v} ile biten",
    "not_ends": "{v} ile bitmeyen",
    "length_mod": "uzunluğu {v} olan",
    "length_exact": "uzunluğu tam {v} olan",
    "length_min": "uzunluğu en az {v} olan",
    "length_max": "uzunluğu en çok {v} olan",
    "count_exact": "{v} içeren",
    "count_min": "{v} içeren",
    "count_max": "{v} içeren",
    "count_mod": "{v} olan",
    "regex": "{v} düzenli ifadesine uyan",
    "automaton": "tuvaldeki otomatın kabul ettiği",
}


def _minimal(dfa: DFA) -> DFA:
    if any(len(dfa.transitions.get(q, {})) < len(dfa.input_symbols) for q in dfa.states):
        dfa = dfa.to_complete("__tuzak__")
    result = dfa.minify(retain_names=False)
    require(len(result.states) <= MAX_STATES, f"Ara sonuç {MAX_STATES} durumu aşıyor; ifadeyi sadeleştirin.")
    return result


def _from_nfa(nfa: NFA) -> DFA:
    return _minimal(DFA.from_nfa(nfa))


def _regex_dfa(regex: str, alphabet: set[str]) -> DFA:
    text = regex.replace(" ", "").replace("∪", "|").replace("⁺", "+").replace("ε", "()")
    require(text, "Düzenli ifade boş olamaz.")
    for ch in text:
        require(ch in alphabet or ch in "|*+()?", f"Düzenli ifadede '{ch}' sembolü alfabede yok.")
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


def _modulo(text: str) -> tuple[int, int]:
    parts = [p.strip() for p in text.replace(";", ",").split(",") if p.strip()]
    require(1 <= len(parts) <= 2 and all(p.isdigit() for p in parts), f"Mod değeri 'k' ya da 'k,r' biçiminde olmalı: '{text}'.")
    k = int(parts[0])
    r = int(parts[1]) if len(parts) == 2 else 0
    require(1 <= k <= 50, "k 1 ile 50 arasında olmalı.")
    require(r < k, f"Kalan r, k'dan küçük olmalı (r={r}, k={k}).")
    return k, r


def _counter_dfa(alphabet: set[str], k: int, r: int, counted: set[str]) -> DFA:
    states = {str(i) for i in range(k)}
    transitions = {str(i): {a: str((i + 1) % k) if a in counted else str(i) for a in alphabet} for i in range(k)}
    return _minimal(DFA(states=states, input_symbols=alphabet, transitions=transitions, initial_state="0", final_states={str(r)}))


def _cap_dfa(alphabet: set[str], counted: set[str], k: int, mode: str) -> DFA:
    states = {str(i) for i in range(k + 2)}
    transitions = {
        str(i): {a: str(min(i + 1, k + 1)) if a in counted else str(i) for a in alphabet} for i in range(k + 2)
    }
    finals = {"exact": {str(k)}, "min": {str(k), str(k + 1)}, "max": {str(i) for i in range(k + 1)}}[mode]
    return _minimal(DFA(states=states, input_symbols=alphabet, transitions=transitions, initial_state="0", final_states=finals))


def _bound(text: str) -> int:
    require(text.strip().isdigit(), f"Sayı bekleniyordu: '{text.strip()}'.")
    k = int(text)
    require(k <= 100, "Sayı 100'den büyük olamaz.")
    return k


def _count_parts(value: str, alphabet: set[str]) -> tuple[str, int]:
    symbol, _, rest = value.partition(",")
    symbol = symbol.strip()
    require(symbol in alphabet, f"Sayılacak sembol alfabede olmalı: '{symbol}'. Biçim: sembol,k (örn. a,2).")
    return symbol, _bound(rest)


def _modulo_text(kind: str, value: str) -> str:
    if kind == "length_mod":
        k, r = _modulo(value)
        return f"≡ {r} (mod {k})"
    symbol, _, rest = value.partition(",")
    k, r = _modulo(rest)
    return f"{symbol.strip()} sayısı ≡ {r} (mod {k})"


def _condition_text(condition: dict) -> str:
    kind = condition["kind"]
    value = (condition.get("value") or "").strip()
    if kind in ("length_mod", "count_mod"):
        value = _modulo_text(kind, value)
    if kind.startswith("count_") and kind != "count_mod":
        symbol, _, k = value.partition(",")
        word = {"count_exact": "tam", "count_min": "en az", "count_max": "en çok"}[kind]
        value = f"{word} {k.strip()} tane {symbol.strip()}"
    return KIND_LABELS[kind].format(v=value)


def describe_definition(definition: dict) -> str:
    conditions = definition.get("conditions") or [definition]
    joiner = " ve " if definition.get("combine", "and") == "and" else " veya "
    return joiner.join(_condition_text(c) for c in conditions) + " dizeler"


def language_dfa(definition: dict, alphabet: set[str]) -> DFA:
    conditions = definition.get("conditions") or []
    if conditions:
        dfas = [condition_dfa(c, alphabet) for c in conditions]
        result = dfas[0]
        for other in dfas[1:]:
            result = _minimal(result.intersection(other) if definition.get("combine", "and") == "and" else result.union(other))
        return result
    require(definition.get("kind"), "Dilin en az bir koşulu olmalı.")
    return condition_dfa(definition, alphabet)


def condition_dfa(definition: dict, alphabet: set[str]) -> DFA:
    kind = definition.get("kind", "")
    value = (definition.get("value") or "").strip()
    require(kind in KIND_LABELS, f"Bilinmeyen dil türü: {kind}.")
    if kind == "length_mod":
        return _counter_dfa(alphabet, *_modulo(value), counted=alphabet)
    if kind.startswith("length_") and kind != "length_mod":
        return _cap_dfa(alphabet, alphabet, _bound(value), kind.split("_")[1])
    if kind.startswith("count_") and kind != "count_mod":
        symbol, k = _count_parts(value, alphabet)
        return _cap_dfa(alphabet, {symbol}, k, kind.split("_")[1])
    if kind == "count_mod":
        symbol, _, rest = value.partition(",")
        symbol = symbol.strip()
        require(symbol in alphabet, f"Sayılacak sembol alfabede olmalı: '{symbol}'. Biçim: sembol,k (örn. 1,3).")
        return _counter_dfa(alphabet, *_modulo(rest), counted={symbol})
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
            ch in UNION | INTERSECT | DIFF | COMPLEMENT_POST | COMPLEMENT_PRE | CONCAT | {"(", ")", "*", "⁺", "+", "∅", "ε"},
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
        while self.peek() in {"*", "⁺", "+"} | COMPLEMENT_POST:
            op = self.take()
            if op == "*":
                text, dfa = self.record(f"{text}*", _from_nfa(NFA.from_dfa(dfa).kleene_star()), "Kleene yıldızı")
            elif op in ("⁺", "+"):
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
        defined.append({"name": name, "description": describe_definition(definition), **describe(atoms[name], symbols)})
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
