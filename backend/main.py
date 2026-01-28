from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal, Tuple
import os
from dotenv import load_dotenv
import requests
import re
from collections import Counter

load_dotenv()


app = FastAPI(
    title="Classificador de E-mails",
    description="Classifica emails com IA (Hugging Face)",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN")
HF_MODEL = os.getenv("HF_MODEL") or "joeddav/xlm-roberta-large-xnli"
HF_URL = f"https://router.huggingface.co/hf-inference/models/{HF_MODEL}"

class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Texto do email")

class AnalyzeResponse(BaseModel):
    category: Literal["produtivo", "improdutivo"] = Field(..., description="Categoria do email")
    confidence: float = Field(..., ge=0, le=1, description="Confiança (0 a 1)")
    suggested_reply: str = Field(..., description="Resposta automática sugerida")
    reason: str = Field(..., description="Justificativa curta")



CANDIDATE_LABELS = ["produtivo", "improdutivo"]


THRESHOLD = 0.70

MIN_ALPHA_CHARS = 10          
MIN_TOTAL_CHARS = 15          
MAX_SINGLE_CHAR_RATIO = 0.60  


def reply_template(category: str) -> str:
    if category == "produtivo":
        return (
            "Olá! Recebemos sua solicitação e ela foi encaminhada para o time responsável. "
            "Em breve retornaremos com uma atualização. Agradecemos o contato."
        )
    return (
        "Olá! Agradecemos sua mensagem. Caso precise de suporte ou tenha alguma solicitação, "
        "por favor nos envie mais detalhes e ficaremos à disposição."
    )


def _hf_headers() -> dict:
    if not HF_TOKEN:
        raise HTTPException(status_code=500, detail="HF_TOKEN não configurado no .env.")
    return {"Authorization": f"Bearer {HF_TOKEN}"}


def _parse_zero_shot_response(data) -> Tuple[str, float]:
    if not (isinstance(data, dict) and "labels" in data and "scores" in data):
        raise ValueError(f"Formato inesperado: {str(data)[:300]}")

    labels = data.get("labels") or []
    scores = data.get("scores") or []

    if not labels or not scores:
        raise ValueError("labels/scores vazios")

    top_label = str(labels[0]).strip().lower()
    top_score = float(scores[0])
    top_score = max(0.0, min(1.0, top_score))

    if top_label not in ("produtivo", "improdutivo"):
        raise ValueError(f"Labels inesperadas: {labels}")

    return top_label, top_score


def _is_gibberish(text: str) -> Tuple[bool, str]:
    clean = " ".join(text.split()).strip()
    if len(clean) < MIN_TOTAL_CHARS:
        return True, f"Texto muito curto para analise"
    alpha = re.findall(r"[A-Za-zÀ-ÖØ-öø-ÿ]", clean)
    if len(alpha) < MIN_ALPHA_CHARS:
        return True, f"Poucas letras para análise"

    chars = [c.lower() for c in clean if not c.isspace()]
    if chars:
        most_common = Counter(chars).most_common(1)[0][1]
        ratio = most_common / len(chars)
        if ratio >= MAX_SINGLE_CHAR_RATIO:
            return True, "Texto repetido."

    return False, ""

def has_action_intent(text: str) -> bool:
    t = text.lower()
    return any(word in t for word in [
        "agendar", "reunião", "retornar", "contato",
        "pode", "poderia", "consegue", "gostaria", "quero"
    ])


def classify_with_hf(email_text: str) -> dict:
    clean = " ".join(email_text.split()).strip()

    gib, reason = _is_gibberish(clean)
    if gib:
        category = "improdutivo"
        return {
            "category": category,
            "confidence": 0.0,
            "suggested_reply": reply_template(category),
            "reason": f"Regra: {reason}",
        }

    payload = {
        "inputs": clean,
        "parameters": {
            "candidate_labels": CANDIDATE_LABELS,
            "multi_label": False,
            "hypothesis_template": "Este e-mail é {}. Produtivo = contém um pedido/ação clara (ex: solicitar orçamento, suporte, prazo, reunião, documento). Improdutivo = apenas cumprimento, elogio/agradecimento, mensagem casual, newsletter ou spam, sem pedido.",
        },
    }

    try:
        r = requests.post(HF_URL, headers=_hf_headers(), json=payload, timeout=45)
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Falha ao chamar Hugging Face: {str(e)}")

    try:
        data = r.json()
    except Exception:
        raise HTTPException(
            status_code=502,
            detail=f"Resposta não-JSON da Hugging Face (HTTP {r.status_code}): {r.text[:200]}",
        )

    if isinstance(data, dict) and data.get("error"):
        raise HTTPException(status_code=502, detail=f"Hugging Face erro: {data['error']}")

    if r.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"Hugging Face HTTP {r.status_code}: {str(data)[:200]}")

    try:
        category, confidence = _parse_zero_shot_response(data)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Resposta inesperada HF: {str(e)} | data={str(data)[:300]}")

    
    if confidence < THRESHOLD:
        if category == "produtivo" and has_action_intent(clean):
            pass  
        else:
            category = "improdutivo"

    return {
        "category": category,
        "confidence": confidence,
        "suggested_reply": reply_template(category),
        "reason": f"Zero-shot HF ({HF_MODEL}). confidence={confidence:.3f} (threshold={THRESHOLD}).",
    }


@app.get("/health", summary="Healthcheck")
def health():
    return {"status": "ok", "model": HF_MODEL, "threshold": THRESHOLD}


@app.post(
    "/analyze",
    summary="Analisa o conteúdo de um email",
    description="Recebe o texto do email, classifica em produtivo/improdutivo e sugere uma resposta.",
    response_model=AnalyzeResponse,
)
def analyze_email(body: AnalyzeRequest):
    return classify_with_hf(body.text)
