'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './AiChat.module.scss';

// Suggested quick questions
const SUGGESTIONS = [
  'Tell me about Gaurav',
  'What projects have you built?',
  'Tell me about InboxPilot AI',
  'What hackathons have you won?',
  'How can I hire you?',
];

// Simple markdown-ish renderer
function renderContent(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>');
}

// Modal Variants
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0, scale: 0.97, y: 10,
    transition: { duration: 0.25, ease: 'easeIn' },
  },
};

const staggerContainer = {
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

// ─── Voice Visualizer Component ──────────────────────────────────────────────
function VoiceVisualizer({ isActive }) {
  const bars = 24;
  return (
    <div className={styles.voiceVisualizer}>
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className={styles.voiceBar}
          animate={isActive ? {
            scaleY: [0.3, Math.random() * 0.7 + 0.3, 0.3],
          } : { scaleY: 0.15 }}
          transition={isActive ? {
            duration: 0.4 + Math.random() * 0.4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.03,
          } : { duration: 0.3 }}
        />
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AiChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('intro'); // 'intro' | 'chat' | 'voice'
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [callDuration, setCallDuration] = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);
  const abortRef = useRef(null);
  const callTimerRef = useRef(null);

  // ── Scroll to bottom ────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Focus input when chat view opens ────────────────────────────────────────
  useEffect(() => {
    if (isOpen && view === 'chat' && !isLoading) {
      setTimeout(() => inputRef.current?.focus(), 400);
    }
  }, [isOpen, view, isLoading]);

  // ── Lock body scroll when modal is open ─────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // ── Call duration timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (isVoiceCallActive) {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(callTimerRef.current);
    }
    return () => clearInterval(callTimerRef.current);
  }, [isVoiceCallActive]);

  // ── Handle ESC key ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) closeModal();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen]);

  // ── Open/Close ──────────────────────────────────────────────────────────────
  const openModal = useCallback(() => {
    setIsOpen(true);
    setView('intro');
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setIsVoiceCallActive(false);
    voiceCallActiveRef.current = false;
    abortRef.current?.abort();
    if (recognitionRef.current) recognitionRef.current.stop();
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setSpeakingMsgId(null);
  }, []);

  // ── Speech Recognition (Voice Input for chat) ──────────────────────────────
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      return;
    }
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join('');
      setInput(transcript);
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  // ── Text-to-Speech ──────────────────────────────────────────────────────────
  const speakText = useCallback((text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/🚀|⚡|💼|🎨|📬|👋|😄|🌙|☕|🇮🇳/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) =>
        v.name.includes('Daniel') ||
        v.name.includes('Alex') ||
        v.name.includes('Microsoft David') ||
        v.name.includes('Microsoft Mark') ||
        v.name.includes('Google UK English Male') ||
        v.name.includes('Male')
    ) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  const speakMessage = useCallback((text, msgId) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    if (speakingMsgId === msgId) {
      setIsSpeaking(false);
      setSpeakingMsgId(null);
      return;
    }

    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/🚀|⚡|💼|🎨|📬|👋|😄|🌙|☕|🇮🇳/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) =>
        v.name.includes('Daniel') ||
        v.name.includes('Alex') ||
        v.name.includes('Microsoft David') ||
        v.name.includes('Microsoft Mark') ||
        v.name.includes('Google UK English Male') ||
        v.name.includes('Male')
    ) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => { setIsSpeaking(true); setSpeakingMsgId(msgId); };
    utterance.onend = () => { setIsSpeaking(false); setSpeakingMsgId(null); };
    utterance.onerror = () => { setIsSpeaking(false); setSpeakingMsgId(null); };

    window.speechSynthesis.speak(utterance);
  }, [speakingMsgId]);

  // ── Voice Call Mode ─────────────────────────────────────────────────────────
  // Use a ref to track voice call active state to avoid stale closures
  const voiceCallActiveRef = useRef(false);

  const startVoiceCall = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Voice is not supported in your browser. Please try Chrome.');
      return;
    }
    setView('voice');
    setIsVoiceCallActive(true);
    voiceCallActiveRef.current = true;
    setVoiceTranscript('');

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join('');
      setVoiceTranscript(transcript);

      // When user stops speaking, send the final result
      const lastResult = e.results[e.results.length - 1];
      if (lastResult.isFinal && lastResult[0].transcript.trim()) {
        const userText = lastResult[0].transcript.trim();
        setVoiceTranscript(userText);

        // Handle spoken stop commands gracefully
        const lowerText = userText.toLowerCase().replace(/[^\w\s]/g, '');
        if (['stop', 'stop talking', 'stop call', 'end call', 'quit', 'exit', 'shut up', 'pause'].includes(lowerText)) {
          window.speechSynthesis?.cancel();
          abortRef.current?.abort();
          setIsSpeaking(false);
          speakText("Alright, I've stopped. Let me know if you need anything else!");
          return;
        }

        // Send to API and speak back
        (async () => {
          try {
            abortRef.current = new AbortController();
            setIsSpeaking(true);
            const res = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: [], userMessage: userText }),
              signal: abortRef.current.signal,
            });

            if (!res.ok) {
              speakText("Sorry, I couldn't process that. Try again.");
              return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              fullText += decoder.decode(value, { stream: true });
            }

            if (fullText && voiceCallActiveRef.current) {
              speakText(fullText);
            }
          } catch (err) {
            if (voiceCallActiveRef.current) {
              speakText("Sorry, something went wrong. Try again.");
            }
          }
        })();
      }
    };

    recognition.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') {
        setTimeout(() => {
          if (voiceCallActiveRef.current && recognitionRef.current) {
            try { recognitionRef.current.start(); } catch (err) { /* ignore */ }
          }
        }, 500);
      }
    };

    recognition.onend = () => {
      setTimeout(() => {
        if (voiceCallActiveRef.current && recognitionRef.current) {
          try { recognitionRef.current.start(); } catch (err) { /* ignore */ }
        }
      }, 500);
    };

    recognition.start();
    recognitionRef.current = recognition;

    // Greet with voice after a small delay
    setTimeout(() => {
      if (voiceCallActiveRef.current) {
        speakText("Hey! I'm Gaurav's AI. Ask me anything about my projects, skills, or how to connect!");
      }
    }, 300);
  }, [speakText]);

  const endVoiceCall = useCallback(() => {
    setIsVoiceCallActive(false);
    voiceCallActiveRef.current = false;
    abortRef.current?.abort();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
      recognitionRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setView('intro');
  }, []);

  // ── Send message (chat mode) ───────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const messageText = (text || input).trim();
    if (!messageText || isLoading) return;

    setInput('');
    setIsLoading(true);

    const userMsg = { id: Date.now(), role: 'user', content: messageText, timestamp: new Date() };
    const aiMsgId = Date.now() + 1;
    const aiMsg = { id: aiMsgId, role: 'assistant', content: '', timestamp: new Date(), streaming: true };

    setMessages((prev) => [...prev, userMsg, aiMsg]);

    const historyToSend = [...messages.slice(-8), userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      abortRef.current = new AbortController();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: historyToSend.slice(0, -1),
          userMessage: messageText,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Something went wrong');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId ? { ...m, content: fullText } : m))
        );
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsgId ? { ...m, streaming: false } : m))
      );
    } catch (err) {
      if (err.name === 'AbortError') return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, content: '<span style="color: #ff8787; font-weight: 500;">⚠️ ' + (err.message || 'System error detected. Please try again.') + '</span>', streaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages]);

  // ── Keyboard handler ───────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // ── Clear chat ─────────────────────────────────────────────────────────────
  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    window.speechSynthesis?.cancel();
    setMessages([]);
    setIsSpeaking(false);
    setSpeakingMsgId(null);
  }, []);

  const formatTime = (date) =>
    date?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const formatCallDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── Expose open function globally for Header button ─────────────────────────
  useEffect(() => {
    window.__openAiChat = openModal;
    return () => { delete window.__openAiChat; };
  }, [openModal]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.backdrop}
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={closeModal}
        >
          <motion.div
            className={styles.modal}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Top Bar ────────────────────────────────────────────── */}
            <div className={styles.topBar}>
              <div className={styles.topBarLeft}>
                {view !== 'intro' && (
                  <motion.button
                    className={styles.backBtn}
                    onClick={() => {
                      if (view === 'voice') endVoiceCall();
                      setView('intro');
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                  </motion.button>
                )}
                <span className={styles.topBarTitle}>
                  {view === 'intro' && (
                    <span className={styles.disclaimer}>Powered by AI & built by me.</span>
                  )}
                  {view === 'chat' && (
                    <>Chat with Gaurav&apos;s AI</>
                  )}
                  {view === 'voice' && (
                    <span className={styles.callTimer}>{formatCallDuration(callDuration)}</span>
                  )}
                </span>
              </div>
              <motion.button
                className={styles.closeBtn}
                onClick={closeModal}
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
                whileTap={{ scale: 0.95 }}
              >
                Close
              </motion.button>
            </div>

            {/* ── INTRO VIEW ─────────────────────────────────────────── */}
            <AnimatePresence mode="wait">
              {view === 'intro' && (
                <motion.div
                  key="intro"
                  className={styles.introView}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className={styles.introContent}
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                  >
                    {/* Avatar */}
                    <motion.div className={styles.introAvatar} variants={fadeUp}>
                      <div className={styles.avatarCircle}>
                        <span>GJ</span>
                      </div>
                      <div className={styles.avatarPulse} />
                    </motion.div>

                    {/* Name */}
                    <motion.h2 className={styles.introName} variants={fadeUp}>
                      Gaurav Jain
                    </motion.h2>

                    {/* Subtitle */}
                    <motion.p className={styles.introSub} variants={fadeUp}>
                      He codes. I talk. Same brain.
                    </motion.p>

                    {/* Buttons */}
                    <motion.div className={styles.introButtons} variants={fadeUp}>
                      <motion.button
                        className={styles.btnPrimary}
                        onClick={startVoiceCall}
                        whileHover={{ scale: 1.03, backgroundColor: '#ffffff' }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                          <rect x="9" y="2" width="6" height="11" rx="3" />
                          <path d="M5 10a7 7 0 0 0 14 0M12 19v3M8 22h8" />
                        </svg>
                        Let's Talk Live
                      </motion.button>
                      <motion.button
                        className={styles.btnSecondary}
                        onClick={() => {
                          setView('chat');
                          if (messages.length === 0) {
                            setTimeout(() => {
                              setMessages([{
                                id: Date.now(),
                                role: 'assistant',
                                content: "Hey there! 👋 I'm Gaurav's AI — I know everything about him. Ask me anything about his projects, skills, or how to connect!",
                                timestamp: new Date(),
                              }]);
                            }, 300);
                          }
                        }}
                        whileHover={{ scale: 1.03, borderColor: 'rgba(255,255,255,0.5)' }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Chat with me
                      </motion.button>
                    </motion.div>

                    {/* Info text */}
                    <motion.p className={styles.introInfo} variants={fadeUp}>
                      Ask me to <strong>&quot;explain the project&quot;</strong> and I&apos;ll walk you through it
                    </motion.p>
                  </motion.div>
                </motion.div>
              )}

              {/* ── CHAT VIEW ─────────────────────────────────────────── */}
              {view === 'chat' && (
                <motion.div
                  key="chat"
                  className={styles.chatView}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Messages */}
                  <div className={styles.messagesArea}>
                    {messages.length === 0 && (
                      <div className={styles.emptyState}>
                        <motion.div
                          className={styles.emptyIcon}
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 16.4 5.7 21l2.3-7L2 9.4h7.6L12 2z" />
                          </svg>
                        </motion.div>
                        <p className={styles.emptyTitle}>Ask me anything</p>
                        <span className={styles.emptyDesc}>
                          Ask about projects, experience, design philosophy, or anything else.
                        </span>
                      </div>
                    )}

                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        className={`${styles.message} ${styles[msg.role]}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className={styles.msgBubble}>
                          <div
                            className={styles.msgContent}
                            dangerouslySetInnerHTML={{
                              __html: renderContent(msg.content) || (msg.streaming ? '' : '&nbsp;'),
                            }}
                          />
                          {msg.streaming && <span className={styles.cursor} />}
                          <div className={styles.msgMeta}>
                            <span className={styles.msgTime}>{formatTime(msg.timestamp)}</span>
                            {msg.role === 'assistant' && msg.content && !msg.streaming && (
                              <button
                                className={`${styles.speakBtn} ${speakingMsgId === msg.id ? styles.speakActive : ''}`}
                                onClick={() => speakMessage(msg.content, msg.id)}
                              >
                                {speakingMsgId === msg.id ? (
                                  <svg viewBox="0 0 24 24" fill="currentColor">
                                    <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                                  </svg>
                                ) : (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                  </svg>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {isLoading && messages[messages.length - 1]?.role === 'user' && (
                      <motion.div
                        className={`${styles.message} ${styles.assistant}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className={styles.msgBubble}>
                          <div className={styles.typingDots}>
                            <span /><span /><span />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>

                  {/* Suggestions */}
                  {messages.length <= 1 && (
                    <motion.div 
                      className={styles.suggestions}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {SUGGESTIONS.map((s, i) => (
                        <motion.button
                          key={s}
                          className={styles.suggestionChip}
                          onClick={() => sendMessage(s)}
                          disabled={isLoading}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 + (i * 0.08), duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                          whileHover={{ scale: 1.03, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.08)' }}
                          whileTap={{ scale: 0.97 }}
                        >
                          {s}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}

                  {/* Input */}
                  <div className={styles.inputArea}>
                    <div className={styles.inputWrapper}>
                      <textarea
                        ref={inputRef}
                        className={styles.input}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        rows={1}
                        maxLength={500}
                        disabled={isLoading}
                      />
                    </div>

                    {/* Voice input for chat */}
                    <motion.button
                      className={`${styles.voiceBtn} ${isListening ? styles.voiceActive : ''}`}
                      onClick={isListening ? stopListening : startListening}
                      disabled={isLoading}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                    >
                      {isListening ? (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <rect x="6" y="4" width="4" height="16" rx="1" />
                          <rect x="14" y="4" width="4" height="16" rx="1" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="2" width="6" height="11" rx="3" />
                          <path d="M5 10a7 7 0 0 0 14 0M12 19v3M8 22h8" />
                        </svg>
                      )}
                      {isListening && <span className={styles.listeningRing} />}
                    </motion.button>

                    {/* Send */}
                    <motion.button
                      className={`${styles.sendBtn} ${input.trim() ? styles.sendActive : ''}`}
                      onClick={() => sendMessage()}
                      disabled={isLoading || !input.trim()}
                      whileHover={input.trim() ? { scale: 1.08 } : {}}
                      whileTap={input.trim() ? { scale: 0.92 } : {}}
                    >
                      {isLoading ? (
                        <svg className={styles.spinIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 19-7z" />
                        </svg>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* ── VOICE CALL VIEW ──────────────────────────────────── */}
              {view === 'voice' && (
                <motion.div
                  key="voice"
                  className={styles.voiceView}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={styles.voiceContent}>
                    {/* Visualizer */}
                    <VoiceVisualizer isActive={isSpeaking || isVoiceCallActive} />

                    {/* Avatar */}
                    <motion.div
                      className={styles.voiceAvatar}
                      animate={isSpeaking ? {
                        boxShadow: ['0 0 0 0px rgba(255,255,255,0.15)', '0 0 0 20px rgba(255,255,255,0)', '0 0 0 0px rgba(255,255,255,0.15)'],
                      } : {}}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <span>GJ</span>
                    </motion.div>

                    <h3 className={styles.voiceName}>Gaurav&apos;s AI</h3>
                    <p className={styles.voiceStatus}>
                      {isSpeaking ? 'Speaking...' : 'Listening...'}
                    </p>

                    {voiceTranscript && (
                      <motion.p
                        className={styles.voiceTranscript}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        &quot;{voiceTranscript}&quot;
                      </motion.p>
                    )}

                    {/* End call */}
                    <motion.button
                      className={styles.endCallBtn}
                      onClick={endVoiceCall}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
                      </svg>
                      End Call
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
