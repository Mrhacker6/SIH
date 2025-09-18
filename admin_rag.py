import os
import sqlite3
from datetime import datetime
import gradio as gr
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import Chroma
from langchain_community.llms import Ollama
from langchain_core.prompts import ChatPromptTemplate
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain.retrievers import EnsembleRetriever
import pandas as pd
import shutil

# --- Global Variables ---
# We need to be able to modify these after initialization
retriever = None
rag_chain = None

# ----------------------------
# 1. SQLite DB Init & Helpers
# ----------------------------
DB_FILE = "campus.db"

def init_db():
    """Initializes the SQLite database and tables."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS students (
        uid TEXT PRIMARY KEY, name TEXT, section TEXT, nationality TEXT,
        department TEXT, hod_contact TEXT, admin_contact TEXT, fees_status TEXT
    )""")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS query_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT, query TEXT,
        bot_response TEXT, fallback_needed BOOLEAN, timestamp TEXT
    )""")
    conn.commit()
    conn.close()

def log_query(uid, query, response, fallback=False):
    """Logs a query and its response to the database."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO query_logs (uid, query, bot_response, fallback_needed, timestamp)
    VALUES (?, ?, ?, ?, ?)
    """, (uid, query, response, fallback, datetime.now().isoformat()))
    conn.commit()
    conn.close()

# ----------------------------
# 2. Vectorstore & RAG Chain Logic
# ----------------------------
def build_or_load_chroma_collection(documents, embedding, persist_directory, collection_name):
    """Builds a new Chroma collection or loads an existing one."""
    if not documents:
        if os.path.exists(persist_directory) and os.listdir(persist_directory):
            try:
                return Chroma(persist_directory=persist_directory, embedding_function=embedding, collection_name=collection_name)
            except Exception:
                return None
        return None
    return Chroma.from_documents(documents=documents, embedding=embedding, persist_directory=persist_directory, collection_name=collection_name)

def load_vectorstores():
    """Loads PDFs, creates embeddings, and initializes the retriever."""
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    faq_chunks, timetable_chunks = [], []

    if os.path.exists("faq.pdf"):
        faq_chunks = text_splitter.split_documents(PyPDFLoader("faq.pdf").load())
    if os.path.exists("timetable.pdf"):
        timetable_chunks = text_splitter.split_documents(PyPDFLoader("timetable.pdf").load())

    if not faq_chunks and not timetable_chunks:
        return None # No documents to process

    eng_embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
    indic_embeddings = HuggingFaceEmbeddings(model_name="l3cube-pune/indic-sentence-similarity-sbert")

    eng_vs = build_or_load_chroma_collection(faq_chunks + timetable_chunks, eng_embeddings, "./chroma_eng", "English_Collection")
    indic_vs = build_or_load_chroma_collection(faq_chunks + timetable_chunks, indic_embeddings, "./chroma_indic", "Indic_Collection")

    retrievers = []
    if eng_vs: retrievers.append(eng_vs.as_retriever(search_kwargs={"k": 3}))
    if indic_vs: retrievers.append(indic_vs.as_retriever(search_kwargs={"k": 3}))

    return EnsembleRetriever(retrievers=retrievers, weights=[1/len(retrievers)]*len(retrievers)) if retrievers else None

def initialize_rag_chain():
    """Initializes or re-initializes the global retriever and RAG chain."""
    global retriever, rag_chain, llm, prompt
    
    retriever = load_vectorstores()
    
    llm = Ollama(model="llama3.1:8b")
    system_prompt = """
    You are "CampusSathi" a multilingual college assistant. Answer ONLY from context (FAQs, Timetable) or student DB.
    If info is missing, reply: "Sorry, I don’t have this information right now. Please check with the college administration."
    Rules:
    - Answer in query language (English, Hindi, Marwari, Marathi, etc.).
    - Keep answers short, clear, student-friendly.
    - Always mention the source (FAQ / Timetable / Student DB).
    Context: {context}
    """
    prompt = ChatPromptTemplate.from_messages([("system", system_prompt), ("human", "{input}")])
    
    if retriever:
        document_chain = create_stuff_documents_chain(llm, prompt)
        rag_chain = create_retrieval_chain(retriever, document_chain)
    else:
        rag_chain = None

# ----------------------------
# 3. Router Function
# ----------------------------
def fetch_from_db(uid, query):
    """Fetches personalized student data based on keywords in the query."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM students WHERE uid=?", (uid,))
    student = cursor.fetchone()
    conn.close()

    if not student: return None

    uid, name, section, nationality, department, hod_contact, admin_contact, fees_status = student
    query_lower = query.lower()

    if "fee" in query_lower: return f"💰 {name}, your fee status is: {fees_status} (Source: Student DB)"
    if "hod" in query_lower: return f"👨‍🏫 HOD Contact ({department}): {hod_contact} (Source: Student DB)"
    if any(k in query_lower for k in ["admin", "admission"]): return f"🏢 Admin Dept Contact: {admin_contact} (Source: Student DB)"
    if "nationality" in query_lower: return f"🌎 {name} is registered as: {nationality} student (Source: Student DB)"
    if "section" in query_lower: return f"📌 {name}, your section is: {section} (Source: Student DB)"
    return None

def campus_sathi_router(query, uid=None):
    """Routes the query to the DB or the RAG chain."""
    db_response = fetch_from_db(uid, query) if uid else None

    if db_response:
        log_query(uid, query, db_response)
        return db_response

    if rag_chain:
        result = rag_chain.invoke({"input": query})
        response = result["answer"]
        fallback_needed = "Sorry, I don’t have this information" in response
        log_query(uid or "Guest", query, response, fallback=fallback_needed)
        return response
    else:
        return "⚠️ No knowledge base available. Please upload FAQ/Timetable via the Admin Dashboard."

# ----------------------------
# 4. Gradio Chatbot Interface
# ----------------------------
def create_chatbot_ui():
    """Creates the Gradio UI for the chatbot."""
    with gr.Blocks(analytics_enabled=False) as chatbot_app:
        gr.Markdown("## 🤖 CampusSathi - Multilingual College Assistant")
        with gr.Row():
            uid = gr.Textbox(label="Enter UID (optional)", scale=1)
        with gr.Row():
            chatbot = gr.Chatbot(label="Chat with CampusSathi", height=500)
        with gr.Row():
            msg = gr.Textbox(label="Your Question", scale=4)
            submit_btn = gr.Button("Send", variant="primary", scale=1)
        
        # State to hold the chat history
        history = gr.State([])

        def chatbot_interface(message, uid_input, chat_history):
            response = campus_sathi_router(message, uid_input)
            chat_history.append((message, response))
            return "", chat_history

        submit_btn.click(chatbot_interface, [msg, uid, history], [msg, chatbot])
        msg.submit(chatbot_interface, [msg, uid, history], [msg, chatbot])
    
    return chatbot_app

# ----------------------------
# 5. Gradio Admin Dashboard
# ----------------------------

# --- Admin DB Functions ---
def get_query_logs(filter_fallback_only):
    conn = sqlite3.connect(DB_FILE)
    query = "SELECT * FROM query_logs"
    if filter_fallback_only:
        query += " WHERE fallback_needed = 1"
    query += " ORDER BY timestamp DESC"
    df = pd.read_sql_query(query, conn)
    conn.close()
    return df

def get_all_students():
    conn = sqlite3.connect(DB_FILE)
    df = pd.read_sql_query("SELECT * FROM students", conn)
    conn.close()
    return df

def add_or_update_student(uid, name, section, nationality, dept, hod, admin, fees):
    if not uid: return "UID is required.", get_all_students()
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO students (uid, name, section, nationality, department, hod_contact, admin_contact, fees_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (uid, name, section, nationality, dept, hod, admin, fees))
    conn.commit()
    conn.close()
    return f"Student '{uid}' saved successfully.", get_all_students()

def delete_student(uid):
    if not uid: return "Please select a student to delete.", get_all_students()
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM students WHERE uid=?", (uid,))
    conn.commit()
    conn.close()
    return f"Student '{uid}' deleted.", get_all_students()

# --- Admin KB Functions ---
def upload_kb_file(file, filename):
    if file is not None:
        shutil.copy(file.name, filename)
        return f"✅ **{filename}** uploaded successfully. Please click 'Reload Knowledge Base'."
    return "No file selected."

def reload_knowledge_base():
    # This function re-runs the RAG chain initialization
    initialize_rag_chain()
    if rag_chain:
        return "✅ Knowledge base reloaded successfully!"
    else:
        return "⚠️ Reload failed. Ensure PDF documents exist and are readable."

def create_admin_ui():
    """Creates the Gradio UI for the admin dashboard."""
    with gr.Blocks(analytics_enabled=False) as admin_app:
        gr.Markdown("## 👑 CampusSathi - Admin Dashboard")

        with gr.Tabs():
            # --- Tab 1: Query Insights ---
            with gr.TabItem("📊 Query Insights"):
                gr.Markdown("View and analyze user queries to improve the chatbot.")
                filter_fallback = gr.Checkbox(label="Show only queries needing fallback")
                refresh_logs_btn = gr.Button("Refresh Logs")
                log_df = gr.DataFrame(headers=["id", "uid", "query", "bot_response", "fallback_needed", "timestamp"], interactive=False)
                refresh_logs_btn.click(get_query_logs, inputs=[filter_fallback], outputs=[log_df])
                filter_fallback.change(get_query_logs, inputs=[filter_fallback], outputs=[log_df])

            # --- Tab 2: Student Management ---
            with gr.TabItem("🎓 Student Management"):
                gr.Markdown("Add, update, or delete student records.")
                student_df = gr.DataFrame(headers=["uid", "name", "section", "nationality", "department", "hod_contact", "admin_contact", "fees_status"], interactive=True)
                
                with gr.Row():
                    s_uid = gr.Textbox(label="UID")
                    s_name = gr.Textbox(label="Name")
                    s_section = gr.Textbox(label="Section")
                    s_nationality = gr.Textbox(label="Nationality")
                with gr.Row():
                    s_dept = gr.Textbox(label="Department")
                    s_hod = gr.Textbox(label="HOD Contact")
                    s_admin = gr.Textbox(label="Admin Contact")
                    s_fees = gr.Dropdown(label="Fees Status", choices=["Paid", "Due", "Partial"])
                
                with gr.Row():
                    add_btn = gr.Button("Add / Update Student", variant="primary")
                    del_btn = gr.Button("Delete Selected Student")
                    clr_btn = gr.Button("Clear Form", variant="secondary")

                status_box = gr.Textbox(label="Status", interactive=False)
                
                # Load student data on tab load
                admin_app.load(get_all_students, None, [student_df])

                # Form Actions
                form_fields = [s_uid, s_name, s_section, s_nationality, s_dept, s_hod, s_admin, s_fees]
                add_btn.click(add_or_update_student, inputs=form_fields, outputs=[status_box, student_df])
                del_btn.click(delete_student, inputs=[s_uid], outputs=[status_box, student_df])
                
                def clear_form(): return [""]*len(form_fields)
                clr_btn.click(clear_form, [], form_fields)

                def select_student_from_table(evt: gr.SelectData):
                    selected_row = student_df.value.iloc[evt.index[0]]
                    return [selected_row[col] for col in student_df.headers]
                student_df.select(select_student_from_table, None, form_fields)

            # --- Tab 3: Knowledge Base ---
            with gr.TabItem("🧠 Knowledge Base"):
                gr.Markdown("Update the chatbot's knowledge by uploading new PDF files.")
                with gr.Row():
                    faq_file = gr.File(label="Upload faq.pdf", file_types=[".pdf"])
                    timetable_file = gr.File(label="Upload timetable.pdf", file_types=[".pdf"])
                
                reload_kb_btn = gr.Button("Reload Knowledge Base", variant="primary")
                kb_status = gr.Markdown()
                
                faq_file.upload(lambda f: upload_kb_file(f, "faq.pdf"), inputs=[faq_file], outputs=[kb_status])
                timetable_file.upload(lambda f: upload_kb_file(f, "timetable.pdf"), inputs=[timetable_file], outputs=[kb_status])
                reload_kb_btn.click(reload_knowledge_base, [], [kb_status])

    return admin_app

# ----------------------------
# 6. Main App Execution
# ----------------------------
if __name__ == "__main__":
    init_db()
    initialize_rag_chain() # Initial load of the RAG chain
    
    # Combine both UIs into a tabbed interface
    demo = gr.TabbedInterface(
        [create_chatbot_ui(), create_admin_ui()],
        ["CampusSathi Chat", "Admin Dashboard"],
        title="CampusSathi Suite"
    )
    
    demo.launch(server_name="0.0.0.0", server_port=7860)