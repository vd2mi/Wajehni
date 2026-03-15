from __future__ import annotations

import hashlib
import logging
import os
from pathlib import Path
from dataclasses import dataclass, field

import fitz
import faiss
import numpy as np
import tiktoken
from openai import OpenAI

logger = logging.getLogger("wajehni.rag")

CHUNK_SIZE = 800
CHUNK_OVERLAP = 120
EMBEDDING_MODEL = "text-embedding-3-large"
EMBEDDING_DIM = 3072
TOP_K = 5

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

tokenizer = tiktoken.encoding_for_model("gpt-4o")


def token_len(text: str) -> int:
    return len(tokenizer.encode(text))


def extract_pdf_text(pdf_path: Path) -> str:
    doc = fitz.open(str(pdf_path))
    pages: list[str] = []
    for page in doc:
        pages.append(page.get_text("text"))
    doc.close()
    return "\n".join(pages)


@dataclass
class Chunk:
    chunk_id: str
    course_id: str
    text: str
    token_count: int


def chunk_text(text: str, course_id: str, filename: str) -> list[Chunk]:
    tokens = tokenizer.encode(text)
    chunks: list[Chunk] = []
    start = 0

    while start < len(tokens):
        end = min(start + CHUNK_SIZE, len(tokens))
        chunk_tokens = tokens[start:end]
        chunk_text_decoded = tokenizer.decode(chunk_tokens)

        raw_id = f"{course_id}:{filename}:{start}"
        chunk_id = hashlib.md5(raw_id.encode()).hexdigest()[:12]

        chunks.append(Chunk(
            chunk_id=chunk_id,
            course_id=course_id,
            text=chunk_text_decoded,
            token_count=len(chunk_tokens),
        ))

        start += CHUNK_SIZE - CHUNK_OVERLAP

    return chunks


def embed_texts(client: OpenAI, texts: list[str]) -> np.ndarray:
    batch_size = 128
    all_embeddings: list[list[float]] = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = client.embeddings.create(model=EMBEDDING_MODEL, input=batch)
        for item in response.data:
            all_embeddings.append(item.embedding)

    return np.array(all_embeddings, dtype=np.float32)


@dataclass
class CourseIndex:
    course_id: str
    chunks: list[Chunk] = field(default_factory=list)
    index: faiss.IndexFlatIP | None = None


class RAGEngine:
    def __init__(self, openai_client: OpenAI):
        self.client = openai_client
        self.course_indices: dict[str, CourseIndex] = {}

    def index_course(self, course_id: str, pdf_filenames: list[str]) -> int:
        if course_id in self.course_indices:
            return len(self.course_indices[course_id].chunks)

        all_chunks: list[Chunk] = []

        for filename in pdf_filenames:
            pdf_path = DATA_DIR / filename
            if not pdf_path.exists():
                logger.warning("PDF not found: %s", pdf_path)
                continue

            raw_text = extract_pdf_text(pdf_path)
            if not raw_text.strip():
                logger.warning("Empty PDF: %s", pdf_path)
                continue

            file_chunks = chunk_text(raw_text, course_id, filename)
            all_chunks.extend(file_chunks)

        if not all_chunks:
            logger.warning("No chunks produced for course %s", course_id)
            return 0

        texts = [c.text for c in all_chunks]
        embeddings = embed_texts(self.client, texts)

        faiss.normalize_L2(embeddings)

        index = faiss.IndexFlatIP(EMBEDDING_DIM)
        index.add(embeddings)

        self.course_indices[course_id] = CourseIndex(
            course_id=course_id,
            chunks=all_chunks,
            index=index,
        )

        logger.info("Indexed %d chunks for course %s", len(all_chunks), course_id)
        return len(all_chunks)

    def retrieve(self, course_id: str, query: str, top_k: int = TOP_K) -> list[Chunk]:
        course_index = self.course_indices.get(course_id)
        if course_index is None or course_index.index is None:
            return []

        query_embedding = embed_texts(self.client, [query])
        faiss.normalize_L2(query_embedding)

        scores, indices = course_index.index.search(query_embedding, top_k)

        retrieved: list[Chunk] = []
        for idx in indices[0]:
            if idx < 0:
                continue
            retrieved.append(course_index.chunks[idx])

        return retrieved

    def build_context_xml(self, chunks: list[Chunk], max_tokens: int = 6000) -> str:
        selected: list[Chunk] = []
        running_tokens = 0

        for chunk in chunks:
            if running_tokens + chunk.token_count > max_tokens:
                break
            selected.append(chunk)
            running_tokens += chunk.token_count

        parts = ["<context>"]
        for chunk in selected:
            parts.append(f'<chunk id="{chunk.chunk_id}">')
            parts.append(chunk.text)
            parts.append("</chunk>")
        parts.append("</context>")

        return "\n".join(parts)
