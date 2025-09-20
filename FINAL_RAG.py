# campussathi_prod.py
import os
import json
import sqlite3
from datetime import datetime
import gradio as gr
from dotenv import load_dotenv
load_dotenv()

# LangChain / embeddings / vectorstore / LLM
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document
from langchain_community.vectorstores import Chroma
from langchain_ollama import OllamaLLM
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain.retrievers import EnsembleRetriever, ContextualCompressionRetriever
from langchain.retrievers.document_compressors import EmbeddingsFilter

# ---------- Config ----------
DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)
FAQ_PDF_PATH = os.path.join(DATA_DIR, "faq.pdf")
TIMETABLE_PDF_PATH = os.path.join(DATA_DIR, "timetable.pdf")
TIMETABLE_JSON_PATH = os.path.join(DATA_DIR, "timetable_structured.json")
DB_PATH = "campus.db"

CHROMA_ENG_DIR = "./chroma_eng"
CHROMA_INDIC_DIR = "./chroma_indic"
CHROMA_TIMETABLE_DIR = "./chroma_timetable"

HF_TOKEN = os.getenv("HF_TOKEN") or None

# ---------- Utilities: DB ----------
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS students (
            uid TEXT PRIMARY KEY, name TEXT, section TEXT, nationality TEXT,
            department TEXT, hod_contact TEXT, admin_contact TEXT, fees_status TEXT
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS query_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uid TEXT, query TEXT, bot_response TEXT, fallback_needed INTEGER, timestamp TEXT
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS unanswered_queries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uid TEXT, query TEXT, timestamp TEXT, status TEXT DEFAULT 'pending'
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS announcements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message TEXT, is_active INTEGER, created_at TEXT
        )
    """)
    conn.commit()
    conn.close()

def add_sample_students():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    students = [
        ("24MCI10030", "Yash Singh", "24MAM-4", "Domestic", "Computer Applications", "hod_ca@college.ac.in", "admin@college.ac.in", "Paid"),
        ("24MCI10050", "Priya Sharma", "24MAM-2", "International", "Computer Science", "hod_cs@college.ac.in", "admin@college.ac.in", "Pending"),
        ("24MCI10020", "Riya Sharma", "24MAM-1", "Domestic", "Hotel management", "hod_cs@college.ac.in", "admin@college.ac.in", "Pending"),
    ]
    cur.executemany("""
        INSERT OR REPLACE INTO students (uid,name,section,nationality,department,hod_contact,admin_contact,fees_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, students)
    conn.commit()
    conn.close()

def log_query(uid, query, response, fallback=False):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO query_logs (uid, query, bot_response, fallback_needed, timestamp)
        VALUES (?, ?, ?, ?, ?)
    """, (uid or "Guest", query, response, int(bool(fallback)), datetime.now().isoformat()))
    conn.commit()
    conn.close()

def log_unanswered(uid, query):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO unanswered_queries (uid, query, timestamp)
        VALUES (?, ?, ?)
    """, (uid or "Guest", query, datetime.now().isoformat()))
    conn.commit()
    conn.close()

def get_pending_unanswered():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT id, uid, query, timestamp FROM unanswered_queries WHERE status='pending' ORDER BY id ASC")
    rows = cur.fetchall()
    conn.close()
    return rows

def get_pending_count():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM unanswered_queries WHERE status='pending'")
    count = cur.fetchone()[0]
    conn.close()
    return count

def mark_unanswered_resolved(qid):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("UPDATE unanswered_queries SET status='resolved' WHERE id=?", (qid,))
    conn.commit()
    conn.close()

def set_active_announcement(message):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("UPDATE announcements SET is_active = 0")
    cur.execute("INSERT INTO announcements (message, is_active, created_at) VALUES (?, 1, ?)", (message, datetime.now().isoformat()))
    conn.commit()
    conn.close()
    return f"Announcement posted: '{message}'"

def get_active_announcement():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT message FROM announcements WHERE is_active = 1 ORDER BY id DESC LIMIT 1")
    row = cur.fetchone()
    conn.close()
    return row[0] if row else None

def clear_active_announcement():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("UPDATE announcements SET is_active = 0")
    conn.commit()
    conn.close()
    return "All announcements cleared."

text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)

def build_or_load_chroma_collection(docs, embedding, persist_directory, collection_name):
    if (not docs or len(docs) == 0):
        if os.path.exists(persist_directory) and os.listdir(persist_directory):
            try:
                vs = Chroma(persist_directory=persist_directory, embedding_function=embedding, collection_name=collection_name)
                return vs
            except Exception as e:
                print("Could not load existing Chroma collection:", persist_directory, e)
                return None
        else:
            return None
    try:
        if os.path.exists(persist_directory) and os.listdir(persist_directory):
            vs = Chroma(persist_directory=persist_directory, embedding_function=embedding, collection_name=collection_name)
            try:
                count = vs._collection.count()
            except Exception:
                count = 0
            if count == 0:
                vs.add_documents(docs)
            return vs
        else:
            vs = Chroma.from_documents(documents=docs, embedding=embedding, persist_directory=persist_directory, collection_name=collection_name)
            return vs
    except Exception as e:
        print("Error building/loading Chroma:", e)
        return None

def load_vectorstores(force_refresh=False):
    faq_chunks = []
    timetable_chunks = []
    if os.path.exists(FAQ_PDF_PATH):
        try:
            faq_docs = PyPDFLoader(FAQ_PDF_PATH).load()
            faq_chunks = text_splitter.split_documents(faq_docs)
        except Exception as e:
            print("Error loading faq.pdf:", e)
    if os.path.exists(TIMETABLE_PDF_PATH):
        try:
            tt_docs = PyPDFLoader(TIMETABLE_PDF_PATH).load()
            timetable_chunks = text_splitter.split_documents(tt_docs)
        except Exception as e:
            print("Error loading timetable.pdf:", e)

    eng_embeddings = HuggingFaceEmbeddings(model_name="Qwen/Qwen3-Embedding-0.6B") 
    indic_embeddings = HuggingFaceEmbeddings(model_name="l3cube-pune/indic-sentence-bert-nli")

    docs_all = faq_chunks + timetable_chunks

    if force_refresh:
        for d in [CHROMA_ENG_DIR, CHROMA_INDIC_DIR, CHROMA_TIMETABLE_DIR]:
            if os.path.exists(d):
                try:
                    import shutil
                    shutil.rmtree(d)
                except Exception as e:
                    print(f"Error removing directory {d}: {e}")
    
    os.makedirs(CHROMA_ENG_DIR, exist_ok=True)
    os.makedirs(CHROMA_INDIC_DIR, exist_ok=True)
    os.makedirs(CHROMA_TIMETABLE_DIR, exist_ok=True)


    eng_vs = build_or_load_chroma_collection(docs_all, eng_embeddings, CHROMA_ENG_DIR, "English_Collection")
    indic_vs = build_or_load_chroma_collection(docs_all, indic_embeddings, CHROMA_INDIC_DIR, "Indic_Collection")
    timetable_vs = build_or_load_chroma_collection(timetable_chunks, eng_embeddings, CHROMA_TIMETABLE_DIR, "Timetable_Collection")

    retrievers = []
    if eng_vs:
        retrievers.append(eng_vs.as_retriever(search_kwargs={"k": 5}))
    if indic_vs:
        retrievers.append(indic_vs.as_retriever(search_kwargs={"k": 5}))

    if not retrievers:
        return {"retriever": None, "eng_vs": eng_vs, "indic_vs": indic_vs, "timetable_vs": timetable_vs}

    ensemble_retriever = EnsembleRetriever(retrievers=retrievers, weights=[0.5, 0.5])
    
    embeddings_filter = EmbeddingsFilter(
        embeddings=eng_embeddings, 
        similarity_threshold=0.7
    )

    compression_retriever = ContextualCompressionRetriever(
        base_compressor=embeddings_filter,
        base_retriever=ensemble_retriever
    )

    return {"retriever": compression_retriever, "eng_vs": eng_vs, "indic_vs": indic_vs, "timetable_vs": timetable_vs}

stores = load_vectorstores(force_refresh=False)

# ---------- LLM & RAG ----------
llm = OllamaLLM(model="llama3.1:8b")
system_prompt = """
You are "CampusSathi", a multilingual college assistant for Rajasthan students.
Answer ONLY from the retrieved context (FAQ or Timetable) or from Student DB when requested.
If the answer is not available in context or DB, reply politely:
"Sorry, I don’t have this information right now. Please check with the college administration."
Rules:
- Reply in the language of the user's query (English, Hindi, Marwari, Marathi).
- Keep answers short, clear and student-friendly.
- Mention "Source: Student DB" or "Source: College FAQ/Timetable" appropriately.
Context:
{context}
"""
prompt = ChatPromptTemplate.from_messages([("system", system_prompt), ("human", "{input}")])
document_chain = create_stuff_documents_chain(llm, prompt)
rag_chain = create_retrieval_chain(stores["retriever"], document_chain) if stores.get("retriever") else None

timetable_structured = {}
def reload_timetable_structured():
    global timetable_structured
    if os.path.exists(TIMETABLE_JSON_PATH):
        try:
            with open(TIMETABLE_JSON_PATH, "r", encoding="utf-8") as f:
                timetable_structured = json.load(f)
        except Exception as e:
            print(f"Error loading structured timetable: {e}")
            timetable_structured = {}
    else:
        timetable_structured = {}

def fetch_from_db(uid, query):
    if not uid:
        return None
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT uid,name,section,nationality,department,hod_contact,admin_contact,fees_status FROM students WHERE uid=?", (uid,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return "❌ UID not found in student database."
    
    uid_db, name, section, nationality, department, hod_contact, admin_contact, fees_status = row
    q = query.lower()
    query_words = ["what", "what's", "show", "tell", "my", "is my", "do i have"]

    if any(qw in q for qw in query_words) and any(k in q for k in ["fee", "fees", "payment", "due"]):
        return f"💰 {name}, your fee status is: {fees_status}. (Source: Student DB)"
    if any(qw in q for qw in query_words) and any(k in q for k in ["hod", "head of department"]):
        return f"👨‍🏫 HOD Contact ({department}): {hod_contact}. (Source: Student DB)"
    if any(qw in q for qw in query_words) and any(k in q for k in ["admin", "admission"]):
        return f"🏢 Admin Dept Contact: {admin_contact}. (Source: Student DB)"
    if any(qw in q for qw in query_words) and any(k in q for k in ["nationality", "international", "domestic"]):
        return f"🌎 {name} is registered as: {nationality}. (Source: Student DB)"
    if any(qw in q for qw in query_words) and any(k in q for k in ["section", "class"]):
        return f"📌 {name}, your section is: {section}. (Source: Student DB)"
    return None

def get_timetable_by_uid(uid, day=None):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT section,name FROM students WHERE uid=?", (uid,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return "❌ UID not found in student DB."
    section, name = row
    if timetable_structured and section in timetable_structured:
        schedule = timetable_structured[section]
        if day:
            dkey = day.capitalize()
            if dkey in schedule:
                entries = schedule[dkey]
                resp = f"📅 {name} — Timetable for {section} ({dkey}):\n"
                for e in entries:
                    resp += f"- {e.get('time','')} | {e.get('subject','')} | {e.get('faculty','')} | {e.get('room','')}\n"
                return resp + "\n(Source: Structured Timetable)"
            else:
                return f"⚠️ No entries for {dkey} in structured timetable."
        else:
            resp = f"📅 {name} — Timetable for {section} (Mon–Fri):\n\n"
            for d in ["Monday","Tuesday","Wednesday","Thursday","Friday"]:
                if d in schedule:
                    resp += f"▶️ {d}:\n"
                    for e in schedule[d]:
                        resp += f"   - {e.get('time','')} | {e.get('subject','')} | {e.get('faculty','')} | {e.get('room','')}\n"
                    resp += "\n"
            return resp + "(Source: Structured Timetable)"
    timetable_vs = stores.get("timetable_vs")
    if not timetable_vs:
        return "⚠️ Timetable not available (no PDF indexed)."
    q_text = section if not day else f"{section} {day}"
    results = timetable_vs.similarity_search(q_text, k=6)
    if not results:
        return f"⚠️ No timetable chunks found for section {section}."
    resp = f"📅 {name} — Timetable for {section} (best-effort):\n"
    seen = set()
    for r in results:
        text = r.page_content.strip()
        if text in seen: continue
        seen.add(text)
        resp += f"- {text}\n"
    return resp + "\n(Source: Timetable PDF)"

def classify_intent(query: str) -> str:
    fast_llm = OllamaLLM(model="qwen:7b")
    intent_prompt = ChatPromptTemplate.from_messages([
        ("system", """You are an intent classifier. Your job is to determine the user's primary goal.
        Respond with one of the following categories ONLY:
        - timetable_request: The user is asking to see their class schedule or timetable.
        - personal_query: The user is asking about their personal data like fees, HOD contact, section, etc.
        - general_faq: The user is asking a general knowledge question or a question about the college that is not personal.
        Examples:
        - "what is my schedule tomorrow" -> timetable_request
        - "fees due date" -> personal_query
        - "hod email" -> personal_query
        - "when is the library open" -> general_faq
        - "the timetable has a mistake" -> general_faq
        - "why is my class not in the timetable" -> general_faq
        """),
        ("human", "{user_query}")
    ])
    intent_chain = intent_prompt | fast_llm
    try:
        response = intent_chain.invoke({"user_query": query}).strip()
        if response in ["timetable_request", "personal_query", "general_faq"]:
            return response
        else:
            return "general_faq"
    except Exception as e:
        print(f"Intent classification failed: {e}")
        return "general_faq"

FALLBACK_PHRASE = "Sorry, I don’t have this information right now. Please check with the college administration."

def campus_sathi_router(query, uid=None):
    active_announcement = get_active_announcement()
    core_response = ""
    intent = classify_intent(query)
    print(f"Detected Intent: {intent}")

    if intent == "timetable_request":
        if not uid:
            core_response = "❌ Please provide your UID so I can fetch your timetable."
        else:
            day_found = None
            q_lower = query.lower()
            for d in ["monday", "tuesday", "wednesday", "thursday", "friday"]:
                if d in q_lower:
                    day_found = d
                    break
            core_response = get_timetable_by_uid(uid, day=day_found)
        log_query(uid, query, core_response, fallback=False)

    elif intent == "personal_query" and uid:
        db_r = fetch_from_db(uid, query)
        if db_r:
            core_response = db_r
            log_query(uid, query, core_response, fallback=False)
        else:
            intent = "general_faq"

    if intent == "general_faq" and not core_response:
        if not rag_chain:
            log_unanswered(uid, query)
            core_response = "⚠️ Knowledge base not available. Admin: please upload FAQ/timetable and refresh indexes."
        else:
            try:
                result = rag_chain.invoke({"input": query})
                response_text = result.get("answer") if isinstance(result, dict) else str(result)
                if FALLBACK_PHRASE.lower() in response_text.lower():
                    log_unanswered(uid, query)
                    log_query(uid or "Guest", query, response_text, fallback=True)
                else:
                    log_query(uid or "Guest", query, response_text, fallback=False)
                core_response = response_text
            except Exception as e:
                core_response = f"⚠️ Error querying RAG: {e}"

    if active_announcement:
        return f"📢 **Announcement:** {active_announcement}\n\n---\n\n{core_response}"
    else:
        return core_response

def admin_approve_unanswered(qid, answer_text):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT query, uid FROM unanswered_queries WHERE id=?", (qid,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return "Unanswered ID not found."
    question_text, uid = row
    doc_text = f"Q: {question_text}\nA: {answer_text}"
    new_doc = Document(page_content=doc_text, metadata={"source":"admin_approved"})
    chunks = text_splitter.split_documents([new_doc])
    eng_vs = stores.get("eng_vs")
    indic_vs = stores.get("indic_vs")
    added = 0
    try:
        if eng_vs:
            eng_vs.add_documents(chunks)
            added += 1
        if indic_vs:
            indic_vs.add_documents(chunks)
            added += 1
    except Exception as e:
        return f"Error adding to vectorstores: {e}"
    mark_unanswered_resolved(qid)
    return f"Approved and added to vectorstores (added to {added} stores)."

def admin_upload_file_bytes(file_bytes, kind):
    if kind == "faq": dest = FAQ_PDF_PATH
    elif kind == "timetable": dest = TIMETABLE_PDF_PATH
    elif kind == "structured_timetable":
        dest = TIMETABLE_JSON_PATH
        with open(dest, "wb") as f: f.write(file_bytes)
        reload_timetable_structured()
        return "Structured timetable JSON uploaded and reloaded."
    else: return "Unknown kind"
    with open(dest, "wb") as f: f.write(file_bytes)
    return f"{os.path.basename(dest)} uploaded. Click Refresh Indexes to apply."

def admin_refresh_indexes(force=False):
    global stores, rag_chain, llm, prompt, document_chain
    stores = load_vectorstores(force_refresh=force)
    document_chain = create_stuff_documents_chain(llm, prompt)
    rag_chain = create_retrieval_chain(stores["retriever"], document_chain) if stores.get("retriever") else None
    reload_timetable_structured()
    return "Indexes reloaded."

def chat_submit(user_message, uid, history):
    if history is None: history = []
    resp = campus_sathi_router(user_message, uid)
    history.append((user_message, resp))
    return history, history

def admin_upload_faq(file_obj):
    if not file_obj: return "No file"
    with open(file_obj, "rb") as f: b = f.read()
    return admin_upload_file_bytes(b, "faq")

def admin_upload_tt(file_obj):
    if not file_obj: return "No file"
    with open(file_obj, "rb") as f: b = f.read()
    return admin_upload_file_bytes(b, "timetable")

def admin_upload_struct(file_obj):
    if not file_obj: return "No file"
    with open(file_obj, "rb") as f: b = f.read()
    return admin_upload_file_bytes(b, "structured_timetable")

def load_pending_table():
    rows = get_pending_unanswered()
    # CORRECTED: Return a list of lists for the Dataframe
    return [list(row) for row in rows]

def safe_admin_approve(qid, ans):
    if qid is None or not ans or not ans.strip():
        return "Error: Please provide both an Unanswered ID and an Approved Answer."
    return admin_approve_unanswered(int(qid), ans)

with gr.Blocks(title="CampusSathi (Prod Demo)") as demo:
    gr.Markdown("# CampusSathi — Multilingual College Assistant (Demo)")
    with gr.Tabs():
        with gr.TabItem("Chat"):
            uid_input = gr.Textbox(label="Enter UID (optional)", placeholder="24MCI10030")
            chatbot = gr.Chatbot(label="CampusSathi")
            message = gr.Textbox(placeholder="Ask anything (fees, timetable, FAQ)...")
            send_btn = gr.Button("Send")
            clear_btn = gr.Button("Clear Chat")
            state = gr.State([])
            send_btn.click(chat_submit, [message, uid_input, state], [chatbot, state])
            message.submit(chat_submit, [message, uid_input, state], [chatbot, state])
            clear_btn.click(lambda: ([], []), None, [chatbot, state])

        with gr.TabItem("Admin"):
            gr.Markdown("### Admin Dashboard")
            with gr.Row():
                with gr.Column(scale=3):
                    announcement_input = gr.Textbox(label="New Announcement", placeholder="e.g., Tomorrow is a holiday due to...")
                    announcement_status = gr.Textbox(label="Status", interactive=False)
                with gr.Column(scale=1):
                    post_announcement_btn = gr.Button("Post/Update Announcement")
                    clear_announcement_btn = gr.Button("Clear Announcement")
            post_announcement_btn.click(set_active_announcement, inputs=[announcement_input], outputs=[announcement_status])
            clear_announcement_btn.click(clear_active_announcement, inputs=[], outputs=[announcement_status])
            
            gr.Markdown("---")
            gr.Markdown("### Upload / Refresh Knowledge")
            with gr.Row():
                faq_file = gr.File(label="Upload faq.pdf", file_count="single", type="filepath")
                tt_file = gr.File(label="Upload timetable.pdf", file_count="single", type="filepath")
                struct_file = gr.File(label="Upload structured timetable JSON", file_count="single", type="filepath")
            with gr.Row():
                upload_faq_btn = gr.Button("Upload FAQ PDF")
                upload_tt_btn = gr.Button("Upload Timetable PDF")
                upload_struct_btn = gr.Button("Upload Structured JSON")
            refresh_btn = gr.Button("Refresh Indexes (rebuild)")
            with gr.Row():
                faq_out = gr.Textbox(label="FAQ upload result", interactive=False)
                tt_out = gr.Textbox(label="Timetable upload result", interactive=False)
                struct_out = gr.Textbox(label="Structured upload result", interactive=False)
            refresh_out = gr.Textbox(label="Refresh result", interactive=False)

            upload_faq_btn.click(admin_upload_faq, inputs=[faq_file], outputs=[faq_out])
            upload_tt_btn.click(admin_upload_tt, inputs=[tt_file], outputs=[tt_out])
            upload_struct_btn.click(admin_upload_struct, inputs=[struct_file], outputs=[struct_out])
            refresh_btn.click(lambda: admin_refresh_indexes(force=True), outputs=[refresh_out])

            gr.Markdown("---")
            pending_count_md = gr.Markdown()
            gr.Markdown("### Pending Unanswered Queries for Evaluation")
            pending_df = gr.Dataframe(headers=["id","uid","query","timestamp"])
            load_pending_btn = gr.Button("Load Pending Queries")
            load_pending_btn.click(load_pending_table, outputs=[pending_df])

            gr.Markdown("### Approve an Unanswered Query")
            approve_id = gr.Number(label="Unanswered ID")
            approve_answer = gr.Textbox(label="Approved Answer (what the bot should reply)")
            approve_btn = gr.Button("Approve & Add to KB")
            approve_out = gr.Textbox(label="Approve result", interactive=False)
            approve_btn.click(safe_admin_approve, inputs=[approve_id, approve_answer], outputs=[approve_out])

    def update_admin_dashboard():
        count = get_pending_count()
        current_announcement = get_active_announcement() or "No active announcement."
        return {
            pending_count_md: gr.Markdown(f"**<center>⚠️ You have {count} pending queries to review.</center>**"),
            announcement_status: gr.Textbox(value=current_announcement)
        }

    demo.load(update_admin_dashboard, outputs=[pending_count_md, announcement_status])

if __name__ == "__main__":
    init_db()
    add_sample_students()
    reload_timetable_structured()
    demo.launch(server_name="0.0.0.0", server_port=7860)