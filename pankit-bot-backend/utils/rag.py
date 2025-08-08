# import faiss
# import os
# import json
# import numpy as np
# from utils.embedder import get_embedding

# # Loads the experience.json file
# def load_experience_data(json_path="data/experience.json"):
#     if not os.path.exists(json_path):
#         return ""

#     with open(json_path, "r", encoding="utf-8") as file:
#         experiences = json.load(file)

#     full_text = ""
#     for exp in experiences:
#         entry = f"{exp['role']} at {exp['company']} ({exp['duration']}): {exp['description']}"
#         full_text += entry + "\n\n"

#     return full_text


# # Load line-based text files
# def load_text_lines(filepath):
#     if not os.path.exists(filepath):
#         return []
#     with open(filepath, "r", encoding="utf-8") as f:
#         return [line.strip() for line in f.readlines() if line.strip()]


# # Load data sources
# site_chunks = load_text_lines("data/site_chunks.txt")
# resume_chunks = load_text_lines("data/resume.txt")

# # Load and format projects
# project_chunks = []
# projects = []
# if os.path.exists("data/projects.json"):
#     with open("data/projects.json", "r", encoding="utf-8") as f:
#         projects = json.load(f)
#         for p in projects:
#             chunk = (
#                 f"This is an AI project I built.\n"
#                 f"Project Title: {p['name']}\n"
#                 f"Category: {p['category']}\n"
#                 f"Description: {p['desc']}\n"
#                 f"GitHub Link: {p['links']['code']}"
#             )
#             project_chunks.append(chunk)

# # Combine all chunks into one corpus
# all_chunks = site_chunks + resume_chunks + project_chunks

# # Embed all chunks
# embedding_list = [get_embedding(text) for text in all_chunks]
# embedding_matrix = np.vstack(embedding_list)  # (n, d) format

# # Create and index in FAISS
# embedding_dim = embedding_matrix.shape[1]
# index = faiss.IndexFlatL2(embedding_dim)
# index.add(embedding_matrix)


# # Retrieval function
# def get_relevant_chunks(query, k=15):
#     query_vec = get_embedding(query.lower()).reshape(1, -1)
#     D, I = index.search(query_vec, k)
#     chunks = [all_chunks[i] for i in I[0]]

#     # 🔍 DEBUGGING OUTPUT
#     print(f"\n🔍 Query: {query}")
#     print("🔍 Top Retrieved Chunks:")
#     for i, chunk in enumerate(chunks, 1):
#         print(f"[{i}] {chunk[:250]}...\n")

#     return "\n".join(chunks)

import os
import json
import numpy as np
import faiss
from utils.embedder import get_embedding

# === File paths ===
RESUME_PATH = "data/resume.txt"
PROJECTS_PATH = "data/projects.json"
EXPERIENCE_PATH = "data/experience.json"
SITE_CHUNKS_PATH = "data/site_chunks.txt"  # optional


# === Utilities ===
def load_json(path):
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def load_text(path):
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read().strip()
    return ""


# === Chunk generators ===
def get_resume_chunks():
    resume_text = load_text(RESUME_PATH)
    return [resume_text] if resume_text else []


def get_site_chunks():
    site_text = load_text(SITE_CHUNKS_PATH)
    return [site_text] if site_text else []


def get_project_chunks():
    projects = load_json(PROJECTS_PATH)
    return [
        f"This is an AI/ML project I built.\n"
        f"Project Title: {p.get('name')}\n"
        f"Category: {p.get('category')}\n"
        f"Description: {p.get('desc')}\n"
        f"GitHub Link: {p.get('links', {}).get('code', '')}"
        for p in projects
    ]


def get_experience_chunks():
    experience = load_json(EXPERIENCE_PATH)
    return [
        f"{exp.get('title')} at {exp.get('company')} ({exp.get('duration')}): {exp.get('description')}"
        for exp in experience
    ]


# === Combine all ===
resume_chunks = get_resume_chunks()
site_chunks = get_site_chunks()
project_chunks = get_project_chunks()
experience_chunks = get_experience_chunks()

all_chunks = resume_chunks + site_chunks + project_chunks + experience_chunks

# === Embed and index with FAISS ===
dimension = len(get_embedding("test sentence"))
index = faiss.IndexFlatL2(dimension)
chunk_embeddings = [get_embedding(chunk) for chunk in all_chunks]
index.add(np.array(chunk_embeddings).astype("float32"))


# === Main retrieval ===
def get_relevant_chunks(query, top_k=5):
    query_embedding = get_embedding(query).astype("float32").reshape(1, -1)
    _, indices = index.search(query_embedding, top_k)
    return "\n\n".join([all_chunks[i] for i in indices[0]])
