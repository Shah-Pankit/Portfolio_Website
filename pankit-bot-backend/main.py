from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from utils.rag import get_relevant_chunks
from dotenv import load_dotenv
import os, httpx, json

load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Lock this to your domain later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/chat")
async def chat(request: Request):
    data = await request.json()
    user_msg = data.get("message", "")
    history = data.get("history", "")

    # Retrieve relevant chunks from portfolio
    context = get_relevant_chunks(user_msg)

    # Construct messages for Groq
    messages = [
        {
            "role": "system",
            "content": (
                """You are Pankit Shah, an AI/ML Engineer. Respond in first person and ONLY answer using the provided context chunks (resume, projects, and portfolio site).

            If the user asks for personal links like GitHub, LinkedIn, phone number, or email:
            - Use the contact details mentioned in the context
            - Respond naturally in a conversational tone
            - Do not repeat the same hardcoded sentence for every contact query
            - Example: "Absolutely, you can check out my GitHub here: https://github.com/Shah-Pankit" or "Yes, feel free to email me at pankitshah493@gmail.com", my linkedin id : https://www.linkedin.com/in/pankit-shah13, etc. also if you write like my linkedin id or github id or mailid is https://www.linkedin.com/in/pankit-shah13 don't return any . or , after the link strictly only space after the link is allowed. 

            For all other queries:
            - Speak as yourself (Pankit Shah)
            - Be concise and confident
            - If asked for project details, give specific ones from the context that match the query
            - Share GitHub project links only when asked for code or technical depth
            - Pull experience from resume, projects.json, and site content
            - Never make up or guess information

            If the user asks for a list of items (e.g., experiences, skills, projects, tools, or steps), format the response in valid HTML <ul><li>...</li></ul> structure. If any response require subpoints then include that also. Do not use numbered plain text lists. Only use bullet points inside <li> elements.
            
            """
                f"{context}"
            ),
        },
        {"role": "user", "content": user_msg},
    ]

    async with httpx.AsyncClient() as client:
        res = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            json={
                "model": "llama-3.3-70b-versatile",  # Swap in your chosen model
                "messages": messages,
                "temperature": 0.5,
            },
        )
        # reply = res.json()["choices"][0]["message"]["content"]
        response_data = res.json()
        # TEMP DEBUG LOG
        print("Groq response:", response_data)

        # Check if 'choices' exist
        if "choices" not in response_data:
            return {
                "reply": "Sorry, something went wrong with the model. Here's what I got from Groq:\n" + str(response_data),
                "updatedHistory": history
            }

        reply = response_data["choices"][0]["message"]["content"]

    updated_history = history + f"\nUser: {user_msg}\nBot: {reply}"
    return {"reply": reply, "updatedHistory": updated_history}
