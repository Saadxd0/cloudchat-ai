import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [copied, setCopied] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Auto-focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const copyToClipboard = (text, messageIndex) => {
    navigator.clipboard.writeText(text);
    setCopied(messageIndex);
    setTimeout(() => setCopied(null), 2000);
  };

  // Format code blocks in text
  const formatMessage = (text) => {
    return text.split('\n').map((line, idx) => (
      <div key={idx} style={{ marginBottom: line.trim() === '' ? '0' : '5px' }}>
        {line}
      </div>
    ));
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { 
      role: 'user', 
      content: input, 
      timestamp: new Date().toISOString() 
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:8000/chat', {
        message: input,
        session_id: sessionId,
        temperature: 0.7,
        max_tokens: 2048
      });

      setSessionId(response.data.session_id);
      
      // Simulate slight delay for more natural feel
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const assistantMessage = { 
        role: 'assistant', 
        content: response.data.response, 
        timestamp: response.data.timestamp 
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = { 
        role: 'assistant', 
        content: '😕 Oops! I got a bit confused. Can you try that again?', 
        timestamp: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = async () => {
    if (sessionId) {
      try {
        await axios.delete(`http://localhost:8000/history/${sessionId}`);
      } catch (error) {
        console.error('Error clearing history:', error);
      }
    }
    setMessages([]);
    setSessionId(null);
    inputRef.current?.focus();
  };

  const createNewSession = () => {
    clearChat();
  };

  return (
    <div className="App">
      <div className="chat-container">
        <div className="chat-header">
          <div className="header-content">
            <h1>🤖 CloudChat AI</h1>
            <p className="subtitle">Powered by Gemma 4 31B</p>
          </div>
          <div className="header-buttons">
            <button onClick={createNewSession} className="new-chat-btn" title="Start a new conversation">
              ➕ New Chat
            </button>
            <button onClick={clearChat} className="clear-btn" title="Clear current chat">
              🗑️ Clear
            </button>
          </div>
        </div>
        
        <div className="messages-container">
          {messages.length === 0 && (
            <div className="welcome-message">
              <div className="welcome-icon">🤖</div>
              <h2>Welcome to CloudChat AI!</h2>
              <p>I'm Gemma 4 31B, a powerful AI assistant by Google.</p>
              <div className="welcome-features">
                <p>✨ I can help with:</p>
                <ul>
                  <li>💻 Coding & programming</li>
                  <li>📝 Writing & creative content</li>
                  <li>🧠 Problem solving & analysis</li>
                  <li>❓ Answering questions</li>
                  <li>🎯 Brainstorming ideas</li>
                </ul>
              </div>
              <p className="welcome-prompt">Start by typing a message below! 👇</p>
            </div>
          )}
          
          {messages.map((message, index) => (
            <div
              key={index}
              className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'} ${message.isError ? 'error-message' : ''}`}
            >
              <div className="message-content">
                <div className="message-header">
                  <span className="message-role">
                    {message.role === 'user' ? '👤 You' : '🤖 CloudChat'}
                  </span>
                  <span className="message-time">
                    {new Date(message.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <div className="message-text">
                  {formatMessage(message.content)}
                </div>
                {message.role === 'assistant' && (
                  <button 
                    className={`copy-btn ${copied === index ? 'copied' : ''}`}
                    onClick={() => copyToClipboard(message.content, index)}
                    title="Copy message"
                  >
                    {copied === index ? '✓ Copied' : '📋 Copy'}
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="message assistant-message typing-message">
              <div className="message-content">
                <span className="message-role">🤖 CloudChat</span>
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="input-container">
          <div className="input-wrapper">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything... (Shift+Enter for new line)"
              rows="3"
              disabled={loading}
              className="chat-input"
            />
            <button 
              onClick={sendMessage} 
              disabled={loading || !input.trim()}
              className="send-btn"
              title="Send message"
            >
              {loading ? '⏳' : '➤'}
            </button>
          </div>
          <div className="input-info">
            <span className="char-count">{input.length} characters</span>
            <span className="help-text">Press Enter to send • Shift+Enter for new line</span>
          </div>
        </div>
        
        <div className="chat-footer">
          <p>🚀 Powered by Google Gemini • Gemma 4 31B Model • {sessionId ? `Session: ${sessionId.slice(8, 13)}...` : 'No active session'}</p>
        </div>
      </div>
    </div>
  );
}

export default App;