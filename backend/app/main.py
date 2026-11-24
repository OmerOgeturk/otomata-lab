import os

from automata.base.exceptions import AutomatonException
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.common import AutomatonError
from app.routers import ai
from app.routers.automata import cfg_router, fa_router, pda_router, tm_router
from app.services.gemini import ENV_PATH, AIError, AIUnavailable

load_dotenv(ENV_PATH)

app = FastAPI(title="Otomata Teorisi Laboratuvarı API", version="0.1.0")

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(AutomatonError)
async def automaton_error(_: Request, exc: AutomatonError):
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.exception_handler(AutomatonException)
async def library_error(_: Request, exc: AutomatonException):
    return JSONResponse(status_code=422, content={"detail": f"Geçersiz otomat: {exc}"})


@app.exception_handler(AIUnavailable)
async def ai_unavailable(_: Request, exc: AIUnavailable):
    return JSONResponse(status_code=503, content={"detail": str(exc)})


@app.exception_handler(AIError)
async def ai_error(_: Request, exc: AIError):
    return JSONResponse(status_code=502, content={"detail": str(exc)})


@app.get("/api/health")
def health():
    return {"status": "ok"}


for router in (fa_router, pda_router, tm_router, cfg_router, ai.router):
    app.include_router(router)
