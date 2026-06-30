import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

// ─── Floating AI Chat Widget for Admin ───────────────────────────────────────
const AIChatWidget = ({ accent = '#6366f1' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Bonjour ! Je suis votre assistant IA. Je peux analyser les rapports des délégués, les ventes grossistes, les congés, les cycles... Posez-moi n\'importe quelle question sur vos données !'
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            setTimeout(() => inputRef.current?.focus(), 200);
        }
    }, [isOpen, messages]);

    const sendMessage = async () => {
        const question = input.trim();
        if (!question || loading) return;

        const userMessage = { role: 'user', content: question };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({ question, history: messages })
            });
            const data = await res.json();
            if (!res.ok) {
                setMessages(prev => [...prev, { role: 'assistant', content: `❌ Erreur : ${data.message || 'Impossible de contacter l\'IA.'}` }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: '❌ Erreur de connexion au serveur.' }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const clearChat = () => {
        setMessages([{
            role: 'assistant',
            content: 'Conversation réinitialisée. Posez-moi une nouvelle question !'
        }]);
    };

    return (
        <>
            {/* Floating Button */}
            <button
                id="ai-chat-toggle"
                onClick={() => setIsOpen(prev => !prev)}
                title="Assistant IA"
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    zIndex: 1000,
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${accent}, #8b5cf6)`,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 8px 32px ${accent}55, 0 2px 8px rgba(0,0,0,0.2)`,
                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    transform: isOpen ? 'rotate(90deg) scale(1.05)' : 'scale(1)',
                }}
            >
                {isOpen ? (
                    <svg width="22" height="22" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                )}

                {/* Pulse ring */}
                {!isOpen && (
                    <span style={{
                        position: 'absolute',
                        inset: '-4px',
                        borderRadius: '50%',
                        border: `2px solid ${accent}`,
                        animation: 'chat-pulse 2s infinite',
                        opacity: 0.5
                    }} />
                )}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div
                    id="ai-chat-panel"
                    style={{
                        position: 'fixed',
                        bottom: '92px',
                        right: '24px',
                        zIndex: 999,
                        width: '420px',
                        maxWidth: 'calc(100vw - 48px)',
                        height: '560px',
                        maxHeight: 'calc(100vh - 120px)',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '20px',
                        background: 'var(--bg-surface, #1e293b)',
                        border: `1px solid ${accent}33`,
                        boxShadow: `0 24px 80px rgba(0,0,0,0.4), 0 0 0 1px ${accent}22`,
                        overflow: 'hidden',
                        animation: 'chat-slide-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '16px 20px',
                        background: `linear-gradient(135deg, ${accent}22, ${accent}08)`,
                        borderBottom: `1px solid ${accent}22`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexShrink: 0
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '50%',
                                background: `linear-gradient(135deg, ${accent}, #8b5cf6)`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: `0 4px 12px ${accent}44`
                            }}>
                                <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .3 2.7-1.2 2.7H4c-1.5 0-2.2-1.7-1.2-2.7L5 14.5" />
                                </svg>
                            </div>
                            <div>
                                <p style={{ fontWeight: '800', fontSize: '14px', color: 'white', margin: 0 }}>Assistant IA</p>
                                <p style={{ fontSize: '11px', color: `${accent}cc`, margin: 0, fontWeight: '600' }}>Accès à toutes vos données</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={clearChat}
                                title="Effacer la conversation"
                                style={{
                                    background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px',
                                    padding: '6px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                            >
                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div style={{
                        flex: 1, overflowY: 'auto', padding: '16px',
                        display: 'flex', flexDirection: 'column', gap: '12px',
                        scrollbarWidth: 'thin', scrollbarColor: `${accent}44 transparent`
                    }}>
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                                gap: '8px', alignItems: 'flex-end'
                            }}>
                                {msg.role === 'assistant' && (
                                    <div style={{
                                        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                                        background: `linear-gradient(135deg, ${accent}, #8b5cf6)`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
                                            <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 010 2h-1v1a7 7 0 01-7 7H9a7 7 0 01-7-7v-1H1a1 1 0 010-2h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z" />
                                        </svg>
                                    </div>
                                )}
                                <div style={{
                                    maxWidth: '80%',
                                    padding: '10px 14px',
                                    borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                    background: msg.role === 'user'
                                        ? `linear-gradient(135deg, ${accent}, #8b5cf6)`
                                        : 'rgba(255,255,255,0.07)',
                                    border: msg.role === 'user' ? 'none' : '1px solid rgba(0,0,0,0.1)',
                                    fontSize: '13px',
                                    lineHeight: '1.6',
                                    color: msg.role === 'user' ? 'white' : '#111827'
                                }}>
                                    {msg.role === 'assistant' ? (
                                        <div className="ai-chat-markdown">
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        </div>
                                    ) : (
                                        msg.content
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Loading indicator */}
                        {loading && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                                <div style={{
                                    width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                                    background: `linear-gradient(135deg, ${accent}, #8b5cf6)`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
                                        <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 010 2h-1v1a7 7 0 01-7 7H9a7 7 0 01-7-7v-1H1a1 1 0 010-2h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z" />
                                    </svg>
                                </div>
                                <div style={{
                                    padding: '12px 16px', borderRadius: '18px 18px 18px 4px',
                                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                                    display: 'flex', gap: '5px', alignItems: 'center'
                                }}>
                                    {[0, 1, 2].map(i => (
                                        <span key={i} style={{
                                            width: '7px', height: '7px', borderRadius: '50%',
                                            background: accent,
                                            animation: `chat-dot-bounce 1.2s ${i * 0.2}s infinite ease-in-out`
                                        }} />
                                    ))}
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Suggested questions (only at start) */}
                    {messages.length === 1 && (
                        <div style={{ padding: '0 16px 8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {[
                                'Quels grossistes n\'ont pas commandé ce mois ?',
                                'Résumé des visites de la semaine',
                                'Délégués avec le plus de visites ce mois',
                                'Congés en attente'
                            ].map((q, i) => (
                                <button key={i} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                                    style={{
                                        padding: '5px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                                        background: `${accent}18`, border: `1px solid ${accent}44`, color: `${accent}cc`,
                                        cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = `${accent}30`; e.currentTarget.style.color = accent; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = `${accent}18`; e.currentTarget.style.color = `${accent}cc`; }}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Input */}
                    <div style={{
                        padding: '12px 16px',
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex', gap: '10px', alignItems: 'flex-end',
                        background: 'rgba(0,0,0,0.2)', flexShrink: 0
                    }}>
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Posez votre question... (Entrée pour envoyer)"
                            rows={1}
                            style={{
                                flex: 1, resize: 'none', border: `1px solid ${accent}44`,
                                borderRadius: '14px', padding: '10px 14px',
                                background: 'rgba(255,255,255,0.07)', color: 'white',
                                fontSize: '13px', outline: 'none', fontFamily: 'inherit',
                                lineHeight: '1.5', maxHeight: '100px', overflowY: 'auto',
                                transition: 'border-color 0.2s',
                                scrollbarWidth: 'thin'
                            }}
                            onFocus={e => e.target.style.borderColor = accent}
                            onBlur={e => e.target.style.borderColor = `${accent}44`}
                            disabled={loading}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || loading}
                            style={{
                                width: '42px', height: '42px', borderRadius: '12px',
                                background: !input.trim() || loading ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${accent}, #8b5cf6)`,
                                border: 'none', cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s', flexShrink: 0,
                                boxShadow: !input.trim() || loading ? 'none' : `0 4px 12px ${accent}44`
                            }}
                        >
                            {loading ? (
                                <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"
                                    style={{ animation: 'spin 1s linear infinite' }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            ) : (
                                <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Styles */}
            <style>{`
                @keyframes chat-pulse {
                    0%, 100% { transform: scale(1); opacity: 0.5; }
                    50% { transform: scale(1.15); opacity: 0.2; }
                }
                @keyframes chat-slide-in {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes chat-dot-bounce {
                    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
                    40% { transform: translateY(-6px); opacity: 1; }
                }
                .ai-chat-markdown p { margin: 0 0 6px 0; }
                .ai-chat-markdown p:last-child { margin-bottom: 0; }
                .ai-chat-markdown ul, .ai-chat-markdown ol { padding-left: 18px; margin: 6px 0; }
                .ai-chat-markdown li { margin: 3px 0; }
                .ai-chat-markdown h1, .ai-chat-markdown h2, .ai-chat-markdown h3 {
                    font-weight: 800; margin: 8px 0 4px 0; color: #111827;
                }
                .ai-chat-markdown strong { color: #111827; font-weight: 700; }
                .ai-chat-markdown code {
                    background: rgba(255,255,255,0.1); padding: 1px 5px;
                    border-radius: 4px; font-size: 12px;
                }
            `}</style>
        </>
    );
};

export default AIChatWidget;
