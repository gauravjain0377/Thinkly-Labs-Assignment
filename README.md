# Gaurav's AI - Personal Digital Twin 🧠

## 📌 What is this?
This project is my submission for the **Thinkly Labs Assignment**. Instead of building a generic customer support or Wikipedia wrapper, I chose to build a **Personal Digital Twin ("Gaurav's AI")**. 

It is an interactive, intelligent digital brain trained specifically on my own experience, projects, skills, and design philosophy. It acts as an interactive portfolio and a virtual representative of myself.

## 🎯 Why I Picked This Topic
I chose to build an AI version of myself for three main reasons:
1. **Purpose-Built Personality**: Building a personal twin requires strict prompt engineering to ensure the AI doesn't sound like a generic robot. It has to adopt my tone, use my exact context, and refuse to answer things it shouldn't know. 
2. **Showcase of UI/UX Skills**: A personal portfolio demands a premium, detail-oriented design. This gave me the perfect canvas to demonstrate my "Frontend Thinking" through animations, typography, and layout.
3. **Real-World Utility**: It transcends the assignment by becoming a genuinely useful tool I can attach to my resume or link to recruiters.

## ✨ "Frontend Thinking" & The User Experience
The assignment emphasized the experience designed *around* the chatbot. Here is how I approached it:

### 1. First Impressions (The Presentation)
- **Premium Dark Mode**: The landing page uses a sleek "Apple-like" monochrome UI with a subtle noise overlay (`bg-noise`) and an ambient background glow.
- **Micro-Interactions**: Features a pulsing active-status dot, Framer Motion staggered entrances, and smooth magnetic hover states to make the interface feel alive.

### 2. Conversational States
- **Empty State**: Before chatting, users are greeted by my avatar with a rotating CSS glow animation. They are presented with clickable "Suggestion Chips" to immediately break the ice without typing.
- **Loading State**: While the AI is "thinking," a custom bouncy 3-dot typing indicator (`typingBounce`) shows up inside an assistant bubble. The UI disables the submit button gracefully to prevent spam.
- **Error State**: If the API fails or rate-limits, the AI outputs a defensive, stylized red error message (`<span style="color: #ff8787">`) directly into the chat flow, ensuring the user is informed without breaking the UI.

### 3. Small Details That Show Care (The "Wow" Factor)
- **Native Voice Calling (Web Speech API)**: I built a hands-free "Voice Call" mode. The AI listens to the user, translates it to text, fetches the AI response, and speaks it back using native `window.speechSynthesis`.
- **Smart Voice Formatting**: The AI prompt is strictly engineered *never* to output raw URLs (like `https://...`). Instead, it speaks domains cleanly (e.g., "inbox pilot dot a i") so the TTS engine sounds natural and human-like.
- **Voice Abort Controllers**: If the user clicks "Close", "End Call", or literally says the word *"Stop"*, I utilized `AbortController` and TTS cancellation to instantly cut off the AI mid-sentence.
- **Auto-Scrolling**: The chat smoothly auto-scrolls to the newest message seamlessly.

## 🛠️ Tech Stack
- **Framework**: Next.js (App Router) & React
- **Styling**: Tailwind CSS, SCSS (CSS Modules)
- **Animations**: Framer Motion & CSS Keyframes
- **AI Integration**: Google Gemini 1.5 Flash (via REST API) + OpenAI fallback logic.
- **Speech**: Web Speech API (Recognition & Synthesis)
- **Deployment**: Vercel

## 🚀 How to Run Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/gauravjain0377/Thinkly-Labs-Assignment.git
   cd Thinkly-Labs-Assignment/my-standalone-ai
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the `my-standalone-ai` root and add your API keys:
   ```env
   OPENAI_API_KEY=your_openai_key_here
   GOOGLE_GEMINI_API_KEY=your_gemini_key_here
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---
*Built with ❤️ by Gaurav Jain*
