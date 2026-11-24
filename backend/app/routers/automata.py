from fastapi import APIRouter

from app.core import algebra as algebra_core
from app.core import cfg as cfg_core
from app.core import fa as fa_core
from app.core import pda as pda_core
from app.core import tm as tm_core
from app.schemas import (
    AlgebraRequest,
    CFGRequest,
    CYKRequest,
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
cfg_router = APIRouter(prefix="/api/cfg", tags=["Bağlamdan Bağımsız Gramer"])


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


@fa_router.post("/algebra")
def fa_algebra(req: AlgebraRequest):
    languages = {name: d.model_dump() for name, d in req.languages.items()}
    return algebra_core.evaluate(req.alphabet, languages, req.expression)


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


@cfg_router.post("/cnf")
def cfg_cnf(req: CFGRequest):
    return cfg_core.to_cnf(req.grammar)


@cfg_router.post("/cyk")
def cfg_cyk(req: CYKRequest):
    return cfg_core.cyk(req.grammar, req.input)
