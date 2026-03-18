import streamlit as st

from state.session_state import init_session_state
from services.document_service import list_documents, ingest_document, delete_document

st.set_page_config(page_title="Documents", page_icon="📄", layout="wide")
init_session_state()

if not st.session_state.get("authenticated"):
    st.warning("Please log in to manage documents.")
    st.stop()

st.title("📄 Documents")

uploaded = st.file_uploader("Upload a text document", type=["txt", "md"])
if uploaded:
    content = uploaded.read().decode("utf-8")
    result = ingest_document(uploaded.name, content)
    if result:
        st.success(f"Ingested '{uploaded.name}' ({result.get('chunks', 0)} chunks)")
    else:
        st.error("Failed to ingest document.")

st.subheader("Your Documents")
docs = list_documents()
if docs:
    for doc in docs:
        col1, col2 = st.columns([4, 1])
        col1.write(f"📄 **{doc.get('filename', 'Unknown')}** - {doc.get('chunk_count', 0)} chunks")
        if col2.button("Delete", key=doc["doc_id"]):
            if delete_document(doc["doc_id"]):
                st.success("Deleted.")
                st.rerun()
else:
    st.info("No documents uploaded yet.")
