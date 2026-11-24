from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool

from app.core import fa as fa_core
from app.schemas import AIExplainResponse, AIGenerateRequest, AIImageRequest, AIImageResponse, FiniteAutomaton
from app.services import gemini

router = APIRouter(prefix="/api/ai", tags=["Yapay Zeka"])


@router.get("/status")
def ai_status():
    return gemini.status()


@router.post("/generate", response_model=FiniteAutomaton)
async def ai_generate(req: AIGenerateRequest):
    return await run_in_threadpool(gemini.generate_automaton, req.prompt)


@router.post("/explain", response_model=AIExplainResponse)
async def ai_explain(automaton: FiniteAutomaton):
    regex = fa_core.to_regex(automaton)
    explanation = await run_in_threadpool(gemini.explain_language, automaton, regex)
    return AIExplainResponse(regex=regex, explanation=explanation)


@router.post("/image", response_model=AIImageResponse)
async def ai_image(req: AIImageRequest):
    result = await run_in_threadpool(gemini.analyze_image, req.task, req.image, req.mime_type, req.question)
    return AIImageResponse(task=req.task, **result)
