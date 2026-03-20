'use client';

import AiChat from '../components/aiChat/AiChat';

export default function Home() {
  return (
    <main style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: '#111',
      color: 'white'
    }}>
      <h1>My Custom AI Product</h1>
      <p style={{ marginBottom: '20px' }}>Click the button below to launch the experience.</p>

      {/* Button to open the AI Modal */}
      <button 
        onClick={() => window.__openAiChat?.()}
        style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', borderRadius: '8px' }}
      >
        Talk to my AI
      </button>

      {/* The AI Component mounting invisibly in the background */}
      <AiChat />
    </main>
  );
}
