import os
import threading
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Reuse existing app logic
from admin_rag import init_db, initialize_rag_chain, campus_sathi_router, rag_chain


class ChatRequest(BaseModel):
    uid: str | None = None
    message: str
    language: str | None = None  # e.g., "English", "हिंदी", etc.


class ChatResponse(BaseModel):
    reply: str


def build_app() -> FastAPI:
    app = FastAPI(title="CampusSathi API", version="1.0.0")

    # CORS for local dev and common origins
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        os.getenv("ALLOWED_ORIGIN", "") or "*",
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health():  # type: ignore[no-redef]
        return {"status": "ok"}

    @app.get("/status")
    def status():  # type: ignore[no-redef]
        return {
            "kb_ready": bool(rag_chain),
        }

    @app.post("/chat", response_model=ChatResponse)
    def chat(req: ChatRequest):  # type: ignore[no-redef]
        msg = req.message
        if req.language:
            # Nudge LLM to reply in selected language
            msg = f"Please answer in {req.language}. " + msg
        reply = campus_sathi_router(msg, req.uid)
        return ChatResponse(reply=reply)

    return app


app = build_app()


if __name__ == "__main__":
    # Ensure DB exists; warm RAG in background (lazy init)
    init_db()
    threading.Thread(target=initialize_rag_chain, daemon=True).start()

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host=host, port=port)


