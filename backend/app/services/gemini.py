import json
import os
import time
from pathlib import Path

from dotenv import load_dotenv
from pydantic import ValidationError

from app.core import fa as fa_core
from app.core.common import AutomatonError
from app.schemas import FiniteAutomaton

ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
DEFAULT_MODEL = "gemini-3.8-flash"
DEFAULT_FALLBACKS = "gemini-3.7-flash,gemini-3.1-flash-lite"
REQUEST_TIMEOUT_MS = 30_000
TRANSIENT_CODES = {429, 500, 503, 504}
PASSES = 2


class AIUnavailable(RuntimeError):
    pass


class AIError(RuntimeError):
    pass


FA_RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "type": {"type": "STRING", "enum": ["DFA", "NFA", "ENFA"]},
        "states": {"type": "ARRAY", "items": {"type": "STRING"}},
        "alphabet": {"type": "ARRAY", "items": {"type": "STRING"}},
        "start_state": {"type": "STRING"},
        "accept_states": {"type": "ARRAY", "items": {"type": "STRING"}},
        "transitions": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "from": {"type": "STRING"},
                    "to": {"type": "STRING"},
                    "symbol": {"type": "STRING"},
                },
                "required": ["from", "to", "symbol"],
            },
        },
    },
    "required": ["type", "states", "alphabet", "start_state", "accept_states", "transitions"],
}

GENERATE_INSTRUCTION = """Sen bir otomata teorisi uzmanısın. Kullanıcının doğal dilde tarif ettiği dili tanıyan
sonlu otomatı JSON olarak üret.
Kurallar:
- type: kullanıcı DFA isterse "DFA", NFA isterse "NFA", ε-NFA isterse "ENFA"; belirtmezse "DFA".
- Durum adları q0, q1, q2 ... biçiminde olsun; start_state genelde q0.
- alphabet tek karakterli sembollerden oluşur; kullanıcı belirtmezse {0,1} kullan.
- Her transition tek bir sembol içerir; ε-geçişi için symbol "ε" yaz (yalnızca ENFA'da).
- DFA ise her durumdan her sembol için tam olarak bir geçiş olsun (gerekirse tuzak durumu ekle).
- Mümkün olan en az sayıda durum kullan."""

EXPLAIN_INSTRUCTION = """Sen otomata teorisi dersi veren sabırlı bir öğretim görevlisisin. Sana bir sonlu otomatın
geçiş tablosu ve bu otomattan matematiksel olarak türetilmiş kesin düzenli ifade verilecek.
Otomatın tanıdığı dili üniversite öğrencisinin anlayacağı sade bir Türkçe ile açıkla:
1. Dilin tek cümlelik tanımı.
2. Durumların sezgisel anlamı (her durum neyi "hatırlıyor").
3. Kabul edilen ve reddedilen 3'er örnek dize.
Düzenli ifade notasyonu: | birleşim, * Kleene yıldızı, ? isteğe bağlı. Düzenli ifadeyi değiştirme,
yalnızca yorumla. Yanıtı Markdown biçiminde ver."""


def _api_key() -> str:
    load_dotenv(ENV_PATH, override=True)
    return os.getenv("GEMINI_API_KEY", "").strip()


def _models() -> list[str]:
    primary = os.getenv("GEMINI_MODEL", "").strip() or DEFAULT_MODEL
    fallbacks = os.getenv("GEMINI_FALLBACK_MODELS", DEFAULT_FALLBACKS)
    models = [primary] + [m.strip() for m in fallbacks.split(",") if m.strip()]
    return list(dict.fromkeys(models))


def status() -> dict:
    configured = bool(_api_key())
    return {"configured": configured, "model": _models()[0]}


def _client():
    key = _api_key()
    if not key:
        raise AIUnavailable(
            "Gemini API anahtarı tanımlı değil. backend/.env dosyasına GEMINI_API_KEY ekleyin."
        )
    from google import genai
    from google.genai import types

    return genai.Client(api_key=key, http_options=types.HttpOptions(timeout=REQUEST_TIMEOUT_MS)), _models()


def _friendly(exc: Exception | None) -> str:
    code = getattr(exc, "code", None)
    if code in (401, 403) or (code == 400 and "API key" in str(exc)):
        return "Gemini API anahtarı geçersiz ya da yetkisiz. backend/.env dosyasındaki GEMINI_API_KEY değerini kontrol edin."
    if code == 429:
        return "Gemini istek/kota sınırına ulaşıldı. Bir süre bekleyip tekrar deneyin."
    if code in (500, 503, 504):
        return "Gemini modelleri şu anda çok yoğun. Birkaç saniye sonra tekrar deneyin."
    if code == 404:
        return "Gemini modeli bulunamadı. backend/.env içindeki GEMINI_MODEL değerini kontrol edin."
    if exc is not None and code is None:
        return "Gemini zamanında yanıt vermedi ya da bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin."
    return f"Gemini API isteği başarısız oldu: {exc}"


def _generate(contents: str, instruction: str, schema: dict | None = None) -> str:
    from google.genai import errors, types

    client, models = _client()
    config = types.GenerateContentConfig(system_instruction=instruction, temperature=0.2)
    if schema:
        config.response_mime_type = "application/json"
        config.response_schema = schema
    last: Exception | None = None
    for attempt in range(PASSES):
        if attempt:
            time.sleep(2)
        for model in models:
            try:
                response = client.models.generate_content(model=model, contents=contents, config=config)
            except errors.APIError as exc:
                last = exc
                if exc.code in TRANSIENT_CODES or exc.code == 404:
                    continue
                raise AIError(_friendly(exc)) from exc
            except Exception as exc:
                last = exc
                continue
            if response.text:
                return response.text
            last = AIError("Gemini boş yanıt döndürdü.")
    raise AIError(_friendly(last) if not isinstance(last, AIError) else str(last)) from last


def generate_automaton(prompt: str, attempts: int = 2) -> FiniteAutomaton:
    contents = prompt
    last_error = ""
    for _ in range(attempts):
        raw = _generate(contents, GENERATE_INSTRUCTION, FA_RESPONSE_SCHEMA)
        try:
            automaton = FiniteAutomaton.model_validate(json.loads(raw))
            fa_core.validate(automaton)
            return automaton
        except (json.JSONDecodeError, ValidationError, AutomatonError) as exc:
            last_error = str(exc)
            contents = f"{prompt}\n\nÖnceki yanıtın geçersizdi: {last_error}\nHatayı düzelterek yeniden üret."
    raise AIError(f"Yapay zeka geçerli bir otomat üretemedi: {last_error}")


def explain_language(automaton: FiniteAutomaton, regex: str) -> str:
    contents = (
        f"Otomat türü: {automaton.type}\n"
        f"Alfabe: {{{', '.join(automaton.alphabet)}}}\n"
        f"Başlangıç durumu: {automaton.start_state}\n"
        f"Kabul durumları: {{{', '.join(automaton.accept_states)}}}\n\n"
        f"Geçiş tablosu (→ başlangıç, * kabul):\n{fa_core.transition_table(automaton)}\n\n"
        f"Kesin düzenli ifade: {regex}"
    )
    return _generate(contents, EXPLAIN_INSTRUCTION)
