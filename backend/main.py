from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict
import os
from dotenv import load_dotenv
from datetime import datetime
import google.generativeai as genai
import traceback

load_dotenv()

app = FastAPI(title="CloudChat AI - Gemma 4 31B", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    MODEL_NAME = "models/gemma-4-31b-it"
    
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        print(f"✅ Gemma 4 31B model loaded successfully!")
    except Exception as e:
        print(f"⚠️ Could not load {MODEL_NAME}: {e}")
        model = None
else:
    print("⚠️ No API key found")
    model = None

chat_sessions: Dict[str, List[Dict]] = {}

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    temperature: Optional[float] = 0.9
    max_tokens: Optional[int] = 32768

def get_system_prompt() -> str:
    """Return a clean system prompt that won't leak"""
    return """You are CloudChat, a friendly AI assistant. 

Rules:
- Be natural and conversational
- Never explain how you're responding or what you're doing
- Just give the response directly
- Use emojis occasionally but not forced
- Keep it real and helpful

Examples of correct responses:
User: "hi" → "Hey! 👋 What's up? Ready to help with whatever you need."
User: "what can you do?" → "Pretty much anything from coding to brainstorming. What do you need help with?"
User: "thanks" → "Anytime! 😊 That's what I'm here for."

Remember: Just respond naturally. No meta commentary."""

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        session_id = request.session_id or f"session_{datetime.now().timestamp()}"
        
        if session_id not in chat_sessions:
            chat_sessions[session_id] = []
        
        # Add user message
        chat_sessions[session_id].append({
            "role": "user",
            "content": request.message,
            "timestamp": datetime.now().isoformat()
        })
        
        if model and GOOGLE_API_KEY:
            try:
                # Build conversation
                conversation = []
                
                # Add system instruction (hidden from user)
                conversation.append({
                    "role": "user",
                    "parts": [get_system_prompt()]
                })
                conversation.append({
                    "role": "model",
                    "parts": ["Got it. I'll respond naturally without meta commentary."]
                })
                
                # Add recent conversation history
                for msg in chat_sessions[session_id][-8:]:
                    role = "user" if msg["role"] == "user" else "model"
                    conversation.append({
                        "role": role,
                        "parts": [msg["content"]]
                    })
                
                # Start chat
                if len(conversation) > 2:
                    chat_session = model.start_chat(history=conversation[2:])
                else:
                    chat_session = model.start_chat()
                
                # Get response
                response = chat_session.send_message(
                    request.message,
                    generation_config={
                        "temperature": request.temperature,
                        "max_output_tokens": request.max_tokens,
                        "top_p": 0.95,
                        "top_k": 40,
                    }
                )
                
                # Extract clean response
                if hasattr(response, 'candidates') and response.candidates:
                    response_text = response.candidates[0].content.parts[0].text.strip()
                elif hasattr(response, 'text'):
                    response_text = response.text.strip()
                else:
                    response_text = str(response)
                
                # Remove any meta comments if they somehow appear
                meta_phrases = [
                    "The user said", "This is a standard", "Respond politely",
                    "offer assistance", "donot add", "kind of shit"
                ]
                for phrase in meta_phrases:
                    if phrase.lower() in response_text.lower():
                        response_text = "Hey! 👋 How can I help you today?"
                        break
                
            except Exception as e:
                response_text = "Hey! Something went wrong. Can you try again?"
                print(f"Error: {e}")
        else:
            response_text = "Hey! 👋 I'm CloudChat. What can I help you with today?"
        
        # Add assistant response
        chat_sessions[session_id].append({
            "role": "assistant",
            "content": response_text,
            "timestamp": datetime.now().isoformat()
        })
        
        # Keep last 30 messages
        if len(chat_sessions[session_id]) > 30:
            chat_sessions[session_id] = chat_sessions[session_id][-30:]
        
        return {
            "response": response_text,
            "session_id": session_id,
            "model_used": "gemma-4-31b-it"
        }
        
    except Exception as e:
        print(f"Error: {traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={"detail": str(e)}
        )

@app.get("/health")
def health():
    return {"status": "ok", "model": "gemma-4-31b-it"}

@app.get("/model/info")
def model_info():
    return {
        "model": "gemma-4-31b-it",
        "status": "ready"
    }