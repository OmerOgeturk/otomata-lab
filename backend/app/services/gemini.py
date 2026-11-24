import base64
import binascii
import json
import os
import time
from pathlib import Path

from dotenv import load_dotenv
from pydantic import ValidationError

from app.core import cfg as cfg_core
from app.core import fa as fa_core
from app.core.common import AutomatonError, require
from app.schemas import FiniteAutomaton

ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
DEFAULT_MODEL = "gemini-3.8-flash"
DEFAULT_FALLBACKS = "gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite"
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


def _quota_message(exhausted: int, total: int) -> str:
    if exhausted >= total:
        return (
            "Ücretsiz Gemini kotası tüm modellerde doldu (model başına günde yaklaşık 20 istek). "
            "Kota her gün sıfırlanır; yarın tekrar deneyin ya da Google AI Studio'da faturalandırmayı açın."
        )
    return (
        "Bazı Gemini modellerinin günlük ücretsiz kotası doldu, kalan yedek modeller de şu anda çok yoğun. "
        "Birkaç dakika sonra tekrar deneyin."
    )


def _generate(contents, instruction: str, schema: dict | None = None) -> str:
    from google.genai import errors, types

    client, models = _client()
    config = types.GenerateContentConfig(system_instruction=instruction, temperature=0.2)
    if schema:
        config.response_mime_type = "application/json"
        config.response_schema = schema
    last: Exception | None = None
    exhausted: set[str] = set()
    for attempt in range(PASSES):
        if attempt:
            time.sleep(2)
        for model in models:
            if model in exhausted:
                continue
            try:
                response = client.models.generate_content(model=model, contents=contents, config=config)
            except errors.APIError as exc:
                last = exc
                if exc.code in (404, 429):
                    exhausted.add(model)
                if exc.code in TRANSIENT_CODES or exc.code == 404:
                    continue
                raise AIError(_friendly(exc)) from exc
            except Exception as exc:
                last = exc
                continue
            if response.text:
                return response.text
            last = AIError("Gemini boş yanıt döndürdü.")
    if exhausted and getattr(last, "code", None) != 401:
        raise AIError(_quota_message(len(exhausted), len(models))) from last
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


GRAMMAR_SCHEMA = {
    "type": "OBJECT",
    "properties": {"grammar": {"type": "STRING"}, "notes": {"type": "STRING"}},
    "required": ["grammar", "notes"],
}

IMAGE_FA_SCHEMA = {
    **FA_RESPONSE_SCHEMA,
    "properties": {**FA_RESPONSE_SCHEMA["properties"], "notes": {"type": "STRING"}},
}

IMAGE_GRAMMAR_INSTRUCTION = """Sen bir otomata teorisi uzmanısın. Görseldeki (fotoğraf, ekran görüntüsü ya da el yazısı)
bağlamdan bağımsız grameri olduğu gibi metne aktar; dönüştürme ya da sadeleştirme YAPMA.
grammar alanının biçimi:
- Her değişken için tek satır: S -> aSb | ε
- Değişkenler büyük harf (alt indisli olanları S_0, A_1 gibi yaz; çok harfli adları <İfade> gibi açılı parantezle yaz).
- Terminaller küçük harf, rakam ya da tek karakterlik semboller; boş dize için ε yaz (λ veya e ile gösterilmişse de ε yaz).
- İlk satır başlangıç değişkeninin kuralı olsun.
notes alanına yalnızca okunması belirsiz kısımları ve yaptığın varsayımları kısaca Türkçe yaz; her şey net okunduysa notes alanını boş bırak, ne yaptığını anlatma.
Görselde gramer yoksa grammar alanını boş bırak ve notes alanında ne gördüğünü açıkla."""

IMAGE_FA_INSTRUCTION = """Sen bir otomata teorisi uzmanısın. Görseldeki durum diyagramını (DFA, NFA ya da ε-NFA) olduğu gibi
JSON'a aktar; otomatı değiştirme, tamamlama ya da küçültme.
Kurallar:
- Durum adlarını görseldeki gibi yaz (q0, q1, A, B ...); adı yoksa q0, q1 ... ver.
- Başlangıç durumu: dışarıdan gelen ok ya da "start" etiketiyle gösterilen durum. Kabul durumları: çift halkalı durumlar.
- "0,1" gibi çok sembollü kenar etiketlerini her sembol için ayrı geçişe böl. ε veya λ etiketleri için symbol "ε".
- type: ε-geçişi varsa "ENFA"; her durumdan her sembol için tam olarak bir geçiş varsa "DFA"; aksi halde (eksik ya da çoklu geçiş) "NFA".
- alphabet: kenarlarda geçen tüm tek karakterli semboller (ε hariç).
notes alanına yalnızca okunması belirsiz kısımları kısaca Türkçe yaz; her şey net okunduysa notes alanını boş bırak, ne yaptığını anlatma."""

IMAGE_QUESTION_INSTRUCTION = """Sen otomata teorisi ve biçimsel diller dersi veren sabırlı bir öğretim görevlisisin.
Görseldeki soruyu, otomatı, grameri ya da ifadeyi incele ve kullanıcının sorusunu üniversite öğrencisinin anlayacağı sade
bir Türkçe ile adım adım yanıtla. Matematiksel ifadeler için $...$ biçiminde LaTeX kullanabilirsin. Yanıtı Markdown ver.
Görsel konuyla ilgisizse bunu nazikçe belirt."""


def _image_part(image: str, mime_type: str):
    from google.genai import types

    data = image.split(",", 1)[1] if image.startswith("data:") else image
    try:
        raw = base64.b64decode(data, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise AutomatonError("Görsel verisi çözülemedi (geçersiz base64).") from exc
    require(len(raw) <= 10 * 1024 * 1024, "Görsel 10 MB'tan büyük olamaz.")
    return types.Part.from_bytes(data=raw, mime_type=mime_type)


def _read_structured(part, instruction: str, schema: dict, parse, attempts: int = 2):
    prompt = "Görseldekini kurallara uygun biçimde aktar."
    last_error = ""
    for _ in range(attempts):
        raw = _generate([part, prompt], instruction, schema)
        try:
            return parse(json.loads(raw))
        except (json.JSONDecodeError, ValidationError, AutomatonError) as exc:
            last_error = str(exc)
            prompt = f"Önceki yanıtın geçersizdi: {last_error}\nGörseli yeniden incele ve hatayı düzelterek aktar."
    raise AIError(f"Görsel okunamadı: {last_error}")


def _parse_grammar(data: dict) -> dict:
    grammar = (data.get("grammar") or "").strip()
    notes = (data.get("notes") or "").strip()
    if not grammar:
        raise AIError(notes or "Görselde bir gramer bulunamadı.")
    return {"grammar": cfg_core.format_grammar(cfg_core.parse(grammar)), "notes": notes}


def _parse_automaton(data: dict) -> dict:
    notes = (data.pop("notes", "") or "").strip()
    automaton = FiniteAutomaton.model_validate(data)
    fa_core.validate(automaton)
    return {"automaton": automaton, "notes": notes}


def analyze_image(task: str, image: str, mime_type: str, question: str = "") -> dict:
    part = _image_part(image, mime_type)
    if task == "grammar":
        return _read_structured(part, IMAGE_GRAMMAR_INSTRUCTION, GRAMMAR_SCHEMA, _parse_grammar)
    if task == "automaton":
        result = _read_structured(part, IMAGE_FA_INSTRUCTION, IMAGE_FA_SCHEMA, _parse_automaton)
        result["regex"] = fa_core.to_regex(result["automaton"])
        return result
    text = question.strip() or "Bu görselde ne var? Otomata teorisi açısından açıkla ve varsa soruyu çöz."
    return {"answer": _generate([part, text], IMAGE_QUESTION_INSTRUCTION)}
