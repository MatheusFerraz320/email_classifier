from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import Literal
import os
from dotenv import load_dotenv
from openai import OpenAI
import json 
import re

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI(
    title="Classificador de E-mails",
    description="Classifica email com uso de IA , classifica entre produtivo || improdutivo",
    version="1.0.0"
)

class AnalyzeRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=5,
        description="texto do email"
    )

class AnalyzeResponse(BaseModel):
    category: Literal["produtivo", "improdutivo"] = Field(..., description="Categoria do email")
    confidence: float = Field(..., ge=0, le=1, description="Confiança da classificação")
    suggested_reply: str = Field(..., description="Resposta automática sugerida")
    reason: str = Field(..., description="Justificativa da classificação")

@app.post(
    "/analyze",
    summary="Analisa o conteúdo de um email",
    description="Recebe o texto do email e retorna a classificação.",
    response_model=AnalyzeResponse
)
def analyze_email(body: AnalyzeRequest):
    result = classify_and_reply_with_openai(body.text)
    return result


def classify_and_reply_with_openai(email_text: str) -> dict:
    prompt = f"""
Você é um assistente para uma empresa do setor financeiro.

Tarefa:
1) Classifique o email como "produtivo" ou "improdutivo".
2) Sugira uma resposta curta, educada e corporativa em português do Brasil.
3) Dê uma confiança (0 a 1).
4) Dê uma justificativa curta (1 frase).

Responda APENAS em JSON válido exatamente neste formato:
{{
  "category": "produtivo" ou "improdutivo",
  "confidence": 0.0,
  "suggested_reply": "string",
  "reason": "string"
}}

EMAIL:
\"\"\"{email_text}\"\"\"
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Responda somente com JSON válido, sem texto extra."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
    )

    content = (response.choices[0].message.content or "").strip()

    # 1) Validação
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        # 2) Extrair texto , para tentar resgatar resposta
        match = re.search(r"\{.*\}", content, flags=re.DOTALL)
        if not match:
            raise HTTPException(
                status_code=502,
                detail=f"OpenAI retornou resposta fora de JSON: {content[:200]}"
            )
        try:
            data = json.loads(match.group(0))
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=502,
                detail=f"OpenAI retornou JSON inválido: {content[:200]}"
            )

    # 3) Validação
    category = str(data.get("category", "")).strip().lower()
    if category not in ("produtivo", "improdutivo"):
        # fallback seguro
        category = "produtivo"

    confidence = data.get("confidence", 0.5)
    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        confidence = 0.5
    confidence = max(0.0, min(1.0, confidence))  # garante 0..1

    suggested_reply = str(data.get("suggested_reply", "")).strip()
    if not suggested_reply:
        suggested_reply = "Olá! Recebemos sua mensagem e retornaremos em breve."

    reason = str(data.get("reason", "")).strip()
    if not reason:
        reason = "Classificação automática baseada no conteúdo do email."

    return {
        "category": category,
        "confidence": confidence,
        "suggested_reply": suggested_reply,
        "reason": reason,
    }


