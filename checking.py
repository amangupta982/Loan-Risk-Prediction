import os
from dotenv import load_dotenv
import google.generativeai as genai
from gtts import gTTS

# 1. Securely Load API Key from .env file
load_dotenv()
gemini_key = os.getenv("GEMINI_API_KEY")

if not gemini_key:
    raise ValueError("🚨 API Key not found! Make sure your .env file is set up correctly.")

genai.configure(api_key=gemini_key)

# 2. Inject your SHAP data into the prompt
biggest_issue_name = "Total Debt"
income = 2500
debt = 3000
missed_payments = 1

system_instruction = f"""
You are the 'FinTwin Financial Coach,' an empathetic AI loan advisor. 
Context: The user was REJECTED for a loan.
Main Reason: {biggest_issue_name}
User Profile: Income: ${income}, Debt: ${debt}, Missed Payments: {missed_payments}.
Explain the rejection gently, give 2 actionable steps to fix the Main Reason, keep it under 4 sentences, and ask if they have questions.
"""

# 3. Initialize the LLM Brain
model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    system_instruction=system_instruction
)
chat_session = model.start_chat(history=[])

# Helper function to generate and play audio
def speak(text):
    # Generate audio with an American accent
    tts = gTTS(text=text, lang='en', tld='us') 
    audio_file = "coach_audio.mp3"
    tts.save(audio_file)
    # Play natively in the background
    os.system(f"afplay {audio_file}") 

# 4. The Conversation Loop for your Terminal
print("🤖 AI Coach Initializing...")

# Kick off the conversation
initial_response = chat_session.send_message("Hello, I'm ready for my loan results.")
print(f"\n🧠 LLM Thinks: {initial_response.text}")

print("🔊 AI is speaking...")
speak(initial_response.text)

# Let the user ask follow-up questions in the terminal
while True:
    user_question = input("\n👤 You (Type 'quit' to exit): ")
    if user_question.lower() == 'quit':
        print("Exiting coach session...")
        break
        
    # Send user question to LLM
    llm_reply = chat_session.send_message(user_question)
    print(f"\n🧠 AI Coach: {llm_reply.text}")
    
    # Speak the answer
    print("🔊 AI is speaking...")
    speak(llm_reply.text)