# from sentence_transformers import SentenceTransformer

# model = SentenceTransformer("all-MiniLM-L6-v2")


# def get_embedding(text):
#     return model.encode([text])[0]

from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer("all-MiniLM-L6-v2")


def get_embedding(text):
    embedding = model.encode([text])[0]  # get a single vector
    return np.array(embedding)  # force conversion to np.array
