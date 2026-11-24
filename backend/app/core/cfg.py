import re
from dataclasses import dataclass, field
from itertools import product

from app.core.common import EPSILON, AutomatonError, is_epsilon, require

ARROW = re.compile(r"->|→|::=|=>|⟶")
TOKEN = re.compile(r"<[^<>\s]+>|[A-Z](?:_[0-9]+|[₀-₉]+|')*|\S")
VARIABLE = re.compile(r"<[^<>\s]+>|[A-Z](?:_[0-9]+|[₀-₉]+|')*")
EPSILON_CHARS = {"ε", "λ", "∈"}
SUBSCRIPTS = str.maketrans("0123456789", "₀₁₂₃₄₅₆₇₈₉")
FRESH_LETTERS = "XYZUVWTRQPNMLKJIHGFEDCBAO"

Body = tuple[str, ...]


@dataclass
class Grammar:
    start: str
    rules: dict[str, list[Body]] = field(default_factory=dict)

    def copy(self) -> "Grammar":
        return Grammar(self.start, {head: list(bodies) for head, bodies in self.rules.items()})

    def variables(self) -> set[str]:
        found = set(self.rules)
        for bodies in self.rules.values():
            for body in bodies:
                found.update(s for s in body if is_variable(s))
        return found | {self.start}

    def terminals(self) -> set[str]:
        return {s for bodies in self.rules.values() for body in bodies for s in body if not is_variable(s)}

    def add(self, head: str, body: Body) -> None:
        bodies = self.rules.setdefault(head, [])
        if body not in bodies:
            bodies.append(body)

    def count(self) -> int:
        return sum(len(b) for b in self.rules.values())


def is_variable(symbol: str) -> bool:
    return bool(VARIABLE.fullmatch(symbol))


def _tokenize(text: str) -> Body:
    text = text.strip()
    if is_epsilon(text):
        return ()
    return tuple(t for t in TOKEN.findall(text) if t not in EPSILON_CHARS)


def parse(text: str) -> Grammar:
    grammar: Grammar | None = None
    lines = [part for line in text.replace("\r", "").split("\n") for part in line.split(";")]
    for number, raw in enumerate(lines, 1):
        line = raw.split("#", 1)[0].strip()
        if not line:
            continue
        parts = ARROW.split(line, maxsplit=1)
        require(len(parts) == 2, f"Satır {number}: kural 'A → α | β' biçiminde olmalı: '{line}'.")
        head = parts[0].strip()
        require(
            is_variable(head),
            f"Satır {number}: sol taraf tek bir değişken olmalı (büyük harf, örn. S, A₁, S_0, <İfade>): '{head}'.",
        )
        if grammar is None:
            grammar = Grammar(head)
        for alternative in parts[1].split("|"):
            grammar.add(head, _tokenize(alternative))
    require(grammar is not None, "Gramer boş. En az bir kural yazın, örn. S → aSb | ε")
    return grammar


def _join(body: Body) -> str:
    if not body:
        return EPSILON
    return ("" if all(len(s) == 1 for s in body) else " ").join(body)


def format_grammar(grammar: Grammar) -> str:
    heads = [grammar.start] + [h for h in grammar.rules if h != grammar.start]
    lines = []
    for head in heads:
        bodies = grammar.rules.get(head, [])
        if bodies:
            lines.append(f"{head} → {' | '.join(_join(b) for b in bodies)}")
    return "\n".join(lines)


class _Names:
    def __init__(self, grammar: Grammar):
        self.used = grammar.variables()

    def take(self, preferred: list[str] | None = None) -> str:
        for name in preferred or []:
            if is_variable(name) and name not in self.used:
                self.used.add(name)
                return name
        for name in FRESH_LETTERS:
            if name not in self.used:
                self.used.add(name)
                return name
        index = 1
        while True:
            for letter in "XYZ":
                name = letter + str(index).translate(SUBSCRIPTS)
                if name not in self.used:
                    self.used.add(name)
                    return name
            index += 1


def _show_set(items) -> str:
    return "{" + ", ".join(sorted(items)) + "}" if items else "∅"


def _step_start(g: Grammar, names: _Names) -> tuple[Grammar, str]:
    on_rhs = any(g.start in body for bodies in g.rules.values() for body in bodies)
    if not on_rhs:
        return g, f"Başlangıç değişkeni {g.start} hiçbir kuralın sağ tarafında geçmiyor; yeni başlangıç değişkenine gerek yok."
    base = g.start.rstrip("'").split("_")[0].rstrip("₀₁₂₃₄₅₆₇₈₉")
    new = names.take([base + "₀", base + "'"] + [base + str(i).translate(SUBSCRIPTS) for i in range(1, 10)])
    result = Grammar(new, {new: [(g.start,)]})
    for head, bodies in g.rules.items():
        result.rules[head] = list(bodies)
    return result, f"{g.start} sağ tarafta geçtiği için yeni başlangıç değişkeni {new} eklendi: {new} → {g.start}."


def _nullable(g: Grammar) -> set[str]:
    nullable: set[str] = set()
    changed = True
    while changed:
        changed = False
        for head, bodies in g.rules.items():
            if head not in nullable and any(all(s in nullable for s in body) for body in bodies):
                nullable.add(head)
                changed = True
    return nullable


def _step_epsilon(g: Grammar) -> tuple[Grammar, str]:
    nullable = _nullable(g)
    if not nullable:
        return g, "ε üreten (sıfırlanabilir) değişken yok; bu adımda değişiklik olmadı."
    result = Grammar(g.start)
    for head, bodies in g.rules.items():
        result.rules.setdefault(head, [])
        for body in bodies:
            options = [((s,), ()) if s in nullable else ((s,),) for s in body]
            for choice in product(*options):
                expanded = tuple(s for part in choice for s in part)
                if expanded or head == g.start:
                    result.add(head, expanded)
    description = f"Sıfırlanabilir değişkenler: {_show_set(nullable)}. Bu değişkenlerin her bir geçişi için onu içeren ve içermeyen tüm kombinasyonlar eklendi, ε-kuralları silindi."
    if g.start in nullable:
        description += f" Dil ε'u içerdiği için yalnızca {g.start} → ε korundu."
    return result, description


def _step_unit(g: Grammar) -> tuple[Grammar, str]:
    heads = list(g.rules)
    pairs = []
    result = Grammar(g.start)
    for head in heads:
        reach = [head]
        for current in reach:
            for body in g.rules.get(current, []):
                if len(body) == 1 and is_variable(body[0]) and body[0] not in reach:
                    reach.append(body[0])
        result.rules.setdefault(head, [])
        for target in reach:
            if target != head:
                pairs.append(f"{head} ⇒ {target}")
            for body in g.rules.get(target, []):
                if not (len(body) == 1 and is_variable(body[0])):
                    result.add(head, body)
    if not pairs:
        return result, "Birim kural (A → B) yok; bu adımda değişiklik olmadı."
    return result, f"Birim türetmeler: {', '.join(pairs)}. A ⇒* B ise B'nin birim olmayan tüm kuralları A'ya kopyalandı, A → B kuralları silindi."


def _step_useless(g: Grammar) -> tuple[Grammar, str]:
    generating: set[str] = set()
    changed = True
    while changed:
        changed = False
        for head, bodies in g.rules.items():
            if head not in generating and any(all(not is_variable(s) or s in generating for s in b) for b in bodies):
                generating.add(head)
                changed = True
    pruned = {
        head: [b for b in bodies if all(not is_variable(s) or s in generating for s in b)]
        for head, bodies in g.rules.items()
        if head in generating
    }
    reachable = [g.start]
    for current in reachable:
        for body in pruned.get(current, []):
            for s in body:
                if is_variable(s) and s not in reachable:
                    reachable.append(s)
    result = Grammar(g.start, {h: pruned[h] for h in g.rules if h in pruned and h in reachable})
    removed_gen = sorted(set(g.variables()) - generating)
    removed_reach = sorted(set(pruned) - set(reachable))
    if g.start not in generating:
        return Grammar(g.start, {}), f"Başlangıç değişkeni {g.start} hiçbir terminal dize türetemiyor: gramerin dili boş kümedir (∅)."
    notes = []
    if removed_gen:
        notes.append(f"terminal dize türetemeyen değişkenler {_show_set(removed_gen)}")
    if removed_reach:
        notes.append(f"başlangıçtan ulaşılamayan değişkenler {_show_set(removed_reach)}")
    if not notes:
        return result, "Gereksiz (üretken olmayan ya da ulaşılamayan) değişken yok."
    return result, "Silinenler: " + "; ".join(notes) + "."


def _step_terminals(g: Grammar, names: _Names) -> tuple[Grammar, str]:
    owner = {
        bodies[0][0]: head
        for head, bodies in g.rules.items()
        if head != g.start and len(bodies) == 1 and len(bodies[0]) == 1 and not is_variable(bodies[0][0])
    }
    created: list[tuple[str, str]] = []
    replaced = False
    result = Grammar(g.start, {h: [] for h in g.rules})
    for head, bodies in g.rules.items():
        for body in bodies:
            if len(body) < 2:
                result.add(head, body)
                continue
            new_body = []
            for s in body:
                if is_variable(s):
                    new_body.append(s)
                    continue
                if s not in owner:
                    owner[s] = names.take([s.upper()] if s.islower() else [])
                    created.append((owner[s], s))
                new_body.append(owner[s])
                replaced = True
            result.add(head, tuple(new_body))
    for head, terminal in created:
        result.add(head, (terminal,))
    if not replaced:
        return result, "Uzunluğu 2 veya daha fazla olan kurallarda terminal yok; değişiklik olmadı."
    text = f"Yeni kurallar: {', '.join(f'{h} → {t}' for h, t in created)}. " if created else ""
    return result, text + "Uzun kurallardaki her terminal, yalnızca o terminali üreten bir değişkenle değiştirildi."


def _step_binary(g: Grammar, names: _Names) -> tuple[Grammar, str]:
    chains: dict[Body, str] = {}
    created = []
    result = Grammar(g.start, {h: [] for h in g.rules})

    def shorten(body: Body) -> Body:
        if len(body) <= 2:
            return body
        tail = body[1:]
        if tail not in chains:
            chains[tail] = names.take()
            result.rules.setdefault(chains[tail], [])
            reduced = shorten(tail)
            result.add(chains[tail], reduced)
            created.append(f"{chains[tail]} → {_join(reduced)}")
        return (body[0], chains[tail])

    for head, bodies in g.rules.items():
        for body in bodies:
            result.add(head, shorten(body))
    if not created:
        return result, "Sağ tarafı 2'den uzun kural yok; değişiklik olmadı."
    return result, f"Uzun kurallar ikişerli zincirlere bölündü. Yeni kurallar: {', '.join(created)}."


def is_cnf(g: Grammar) -> bool:
    starts_on_rhs = any(g.start in b for bs in g.rules.values() for b in bs)
    for head, bodies in g.rules.items():
        for body in bodies:
            if len(body) == 0 and (head != g.start or starts_on_rhs):
                return False
            if len(body) == 1 and is_variable(body[0]):
                return False
            if len(body) == 2 and not all(is_variable(s) for s in body):
                return False
            if len(body) > 2:
                return False
    return True


def to_cnf(text: str) -> dict:
    grammar = parse(text)
    names = _Names(grammar)
    steps = [{"key": "original", "title": "Verilen gramer", "description": "Ayrıştırılan gramer.", "grammar": format_grammar(grammar)}]
    pipeline = [
        ("start", "1. Yeni başlangıç değişkeni", lambda g: _step_start(g, names)),
        ("epsilon", "2. ε-kurallarını kaldırma", _step_epsilon),
        ("unit", "3. Birim kuralları kaldırma", _step_unit),
        ("useless", "4. Gereksiz değişkenleri temizleme", _step_useless),
        ("terminals", "5. Terminalleri ayırma", lambda g: _step_terminals(g, names)),
        ("binary", "6. Uzun kuralları ikiye bölme", lambda g: _step_binary(g, names)),
    ]
    current = grammar
    for key, title, step in pipeline:
        before = format_grammar(current)
        current, description = step(current)
        after = format_grammar(current)
        steps.append({"key": key, "title": title, "description": description, "grammar": after, "changed": after != before})
    return {
        "steps": steps,
        "cnf": format_grammar(current),
        "start": current.start,
        "empty_language": not current.rules,
        "is_cnf": is_cnf(current),
        "variables": sorted(current.variables()) if current.rules else [current.start],
        "terminals": sorted(current.terminals()),
        "rule_count": current.count(),
    }


def cyk(text: str, word: str) -> dict:
    grammar = parse(text)
    require(is_cnf(grammar), "CYK algoritması yalnızca Chomsky normal formundaki gramerlerde çalışır. Önce CNF'ye dönüştürün.")
    terminals = grammar.terminals()
    for ch in word:
        require(ch in terminals, f"'{ch}' sembolü gramerin terminalleri arasında yok.")
    n = len(word)
    if n == 0:
        accepted = () in grammar.rules.get(grammar.start, [])
        return {"accepted": accepted, "table": [], "word": word}
    unary = [(h, b[0]) for h, bs in grammar.rules.items() for b in bs if len(b) == 1]
    binary = [(h, b[0], b[1]) for h, bs in grammar.rules.items() for b in bs if len(b) == 2]
    table: list[list[set[str]]] = [[set() for _ in range(n)] for _ in range(n)]
    for i, ch in enumerate(word):
        table[0][i] = {h for h, t in unary if t == ch}
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            cell = table[length - 1][i]
            for split in range(1, length):
                left = table[split - 1][i]
                right = table[length - split - 1][i + split]
                cell.update(h for h, b, c in binary if b in left and c in right)
    return {
        "accepted": grammar.start in table[n - 1][0],
        "word": word,
        "table": [[sorted(cell) for cell in row[: n - r]] for r, row in enumerate(table)],
    }


__all__ = ["AutomatonError", "Grammar", "parse", "format_grammar", "to_cnf", "cyk", "is_cnf"]
