from fastapi import APIRouter

from app.core import fa as fa_core
from app.core import pda as pda_core
from app.core import tm as tm_core
from app.schemas import (
    FASimulateRequest,
    FASimulateResponse,
    FiniteAutomaton,
    PDASimulateRequest,
    PDASimulateResponse,
    RegexResponse,
    Template,
    TMSimulateRequest,
    TMSimulateResponse,
)
from app.templates import FA_TEMPLATES, PDA_TEMPLATES, TM_TEMPLATES

fa_router = APIRouter(prefix="/api/fa", tags=["Sonlu Otomatlar"])
pda_router = APIRouter(prefix="/api/pda", tags=["Yığıtlı Otomat"])
tm_router = APIRouter(prefix="/api/tm", tags=["Turing Makinesi"])


@fa_router.post("/simulate", response_model=FASimulateResponse)
def fa_simulate(req: FASimulateRequest):
    return fa_core.simulate(req.automaton, req.input)


@fa_router.post("/nfa-to-dfa", response_model=FiniteAutomaton)
def fa_nfa_to_dfa(automaton: FiniteAutomaton):
    return fa_core.nfa_to_dfa(automaton)


@fa_router.post("/minimize", response_model=FiniteAutomaton)
def fa_minimize(automaton: FiniteAutomaton):
    return fa_core.minimize(automaton)


@fa_router.post("/to-regex", response_model=RegexResponse)
def fa_to_regex(automaton: FiniteAutomaton):
    return RegexResponse(regex=fa_core.to_regex(automaton))


@fa_router.get("/templates", response_model=list[Template])
def fa_templates():
    return FA_TEMPLATES


@pda_router.post("/simulate", response_model=PDASimulateResponse)
def pda_simulate(req: PDASimulateRequest):
    return pda_core.simulate(req.automaton, req.input, req.max_configurations)


@pda_router.get("/templates", response_model=list[Template])
def pda_templates():
    return PDA_TEMPLATES


@tm_router.post("/simulate", response_model=TMSimulateResponse)
def tm_simulate(req: TMSimulateRequest):
    return tm_core.simulate(req.machine, req.input, req.max_steps)


@tm_router.get("/templates", response_model=list[Template])
def tm_templates():
    return TM_TEMPLATES
