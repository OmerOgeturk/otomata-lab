from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class _Base(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class FATransition(_Base):
    from_: str = Field(alias="from")
    to: str
    symbol: str


class FiniteAutomaton(_Base):
    type: Literal["DFA", "NFA", "ENFA"] = "DFA"
    states: list[str]
    alphabet: list[str]
    start_state: str
    accept_states: list[str]
    transitions: list[FATransition]


class PDATransition(_Base):
    from_: str = Field(alias="from")
    to: str
    input: str
    pop: str
    push: str


class PDA(_Base):
    type: Literal["PDA"] = "PDA"
    states: list[str]
    alphabet: list[str]
    stack_alphabet: list[str]
    initial_stack_symbol: str = "$"
    start_state: str
    accept_states: list[str]
    transitions: list[PDATransition]


class TMTransition(_Base):
    from_: str = Field(alias="from")
    to: str
    read: str
    write: str
    move: Literal["L", "R"]


class TuringMachine(_Base):
    type: Literal["DTM"] = "DTM"
    states: list[str]
    input_alphabet: list[str]
    tape_alphabet: list[str]
    blank_symbol: str = "_"
    start_state: str
    accept_states: list[str]
    transitions: list[TMTransition]


class FASimulateRequest(BaseModel):
    automaton: FiniteAutomaton
    input: str = ""


class FAStep(_Base):
    index: int
    symbol: Optional[str] = None
    active_states: list[str]
    transitions: list[FATransition]


class FASimulateResponse(BaseModel):
    accepted: bool
    steps: list[FAStep]


class RegexResponse(BaseModel):
    regex: str


class PDASimulateRequest(BaseModel):
    automaton: PDA
    input: str = ""
    max_configurations: int = Field(default=20000, ge=1, le=200000)


class PDAStep(_Base):
    index: int
    state: str
    consumed: str
    remaining: str
    stack: list[str]
    transition: Optional[PDATransition] = None


class PDASimulateResponse(BaseModel):
    accepted: bool
    verified: Optional[bool]
    limit_reached: bool
    steps: list[PDAStep]


class TMSimulateRequest(BaseModel):
    machine: TuringMachine
    input: str = ""
    max_steps: int = Field(default=2000, ge=1, le=100000)


class TMStep(_Base):
    index: int
    state: str
    tape: list[str]
    head: int
    transition: Optional[TMTransition] = None


class TMSimulateResponse(BaseModel):
    result: Literal["accepted", "rejected", "limit"]
    steps: list[TMStep]
    output: str


class Template(BaseModel):
    id: str
    name: str
    description: str
    automaton: dict


class AIGenerateRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=1000)


class AIExplainResponse(BaseModel):
    regex: str
    explanation: str
