from automata.base.exceptions import RejectionException
from automata.tm.dtm import DTM

from app.core.common import check_states, require
from app.schemas import TMSimulateResponse, TMStep, TMTransition, TuringMachine


def validate(tm: TuringMachine) -> dict:
    check_states(tm.states, tm.start_state, tm.accept_states, tm.transitions)
    tape = set(tm.tape_alphabet)
    require(tm.blank_symbol in tape, "Boşluk sembolü şerit alfabesinde olmalı.")
    require(tm.blank_symbol not in tm.input_alphabet, "Boşluk sembolü girdi alfabesinde olamaz.")
    require(tm.start_state not in tm.accept_states, "Başlangıç durumu kabul durumu olamaz.")
    for a in tape:
        require(len(a) == 1, f"Şerit sembolleri tek karakter olmalı: '{a}'.")
    for a in tm.input_alphabet:
        require(a in tape, f"Girdi sembolü '{a}' şerit alfabesinde olmalı.")
    lookup = {}
    for t in tm.transitions:
        require(t.read in tape and t.write in tape, f"Geçişteki semboller şerit alfabesinde olmalı ({t.from_} → {t.to}).")
        require(t.from_ not in tm.accept_states, f"Kabul durumundan ('{t.from_}') geçiş tanımlanamaz.")
        require((t.from_, t.read) not in lookup, f"DTM'de '{t.from_}' durumunda '{t.read}' için birden fazla geçiş var.")
        lookup[(t.from_, t.read)] = t
    return lookup


def to_library(tm: TuringMachine) -> DTM:
    validate(tm)
    table: dict = {s: {} for s in tm.states if s not in tm.accept_states}
    for t in tm.transitions:
        table[t.from_][t.read] = (t.to, t.write, t.move)
    return DTM(
        states=set(tm.states),
        input_symbols=set(tm.input_alphabet),
        tape_symbols=set(tm.tape_alphabet),
        transitions=table,
        initial_state=tm.start_state,
        blank_symbol=tm.blank_symbol,
        final_states=set(tm.accept_states),
    )


def _output(tape: list[str], blank: str) -> str:
    return "".join(tape).strip(blank)


def simulate(tm: TuringMachine, word: str, max_steps: int) -> TMSimulateResponse:
    lookup = validate(tm)
    for ch in word:
        require(ch in tm.input_alphabet, f"Girdi dizesindeki '{ch}' sembolü girdi alfabesinde yok.")
    dtm = to_library(tm)
    steps: list[TMStep] = []
    result = "accepted"
    transition: TMTransition | None = None
    try:
        for i, config in enumerate(dtm.read_input_stepwise(word)):
            tape = list(config.tape.tape)
            head = config.tape.current_position
            steps.append(TMStep(index=i, state=config.state, tape=tape, head=head, transition=transition))
            if i >= max_steps:
                result = "limit"
                break
            symbol = tape[head] if 0 <= head < len(tape) else tm.blank_symbol
            transition = lookup.get((config.state, symbol))
    except RejectionException:
        result = "rejected"
    last = steps[-1]
    return TMSimulateResponse(result=result, steps=steps, output=_output(last.tape, tm.blank_symbol))
