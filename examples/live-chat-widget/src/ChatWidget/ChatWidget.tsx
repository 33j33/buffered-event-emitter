import { useState, useEffect, useRef } from "preact/hooks";
import { eventEmitter } from "../mockMessages";
import "./ChatWidget.css";

interface Message {
  id: string;
  text: string;
  timestamp: number;
  sender: string;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      // Load cached messages when widget opens
      const cachedMessages = eventEmitter.getCache("new-message") as Message[];
      console.log(cachedMessages);
      if (cachedMessages && cachedMessages.length > 0) {
        // Flatten the cached data since it might contain arrays from buffered emissions
        const flatMessages = cachedMessages.flat();
        setMessages(flatMessages.slice(-20));
      }

      const handleNewMessages = (messageArray: Message[]) => {
        setMessages((prev) => [...prev, ...messageArray]);
      };

      eventEmitter.on("new-message", handleNewMessages, {
        buffered: true,
        bufferCapacity: 4,
        bufferInactivityTimeout: 2000,
      });

      return () => {
        eventEmitter.off("new-message", handleNewMessages, {
          buffered: true,
          bufferCapacity: 4,
          bufferInactivityTimeout: 2000,
        });
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleWidget = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setMessages([]); // Clear messages when closing
    }
  };

  return (
    <div className={`chat-widget ${isOpen ? "open" : "closed"}`}>
      {isOpen && (
        <div className="chat-container">
          <div className="chat-header">
            <h3>Live Chat</h3>
            <button className="close-btn" onClick={toggleWidget}>
              ×
            </button>
          </div>
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="no-messages">Loading messages...</div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="message">
                  <div className="message-header">
                    <span className="sender">{message.sender}</span>
                    <span className="timestamp">{formatTimestamp(message.timestamp)}</span>
                  </div>
                  <div className="message-text">{message.text}</div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      <button className="chat-toggle" onClick={toggleWidget}>
        {isOpen ? "Close Chat" : "Open Chat"}
      </button>
    </div>
  );
}
