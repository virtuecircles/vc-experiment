import { useState, useCallback, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Loader2, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/aristotle-chat`;

const MAX_MESSAGES_PER_SESSION = 20;
const MAX_MESSAGE_LENGTH = 300;

const offTopicTriggers = [
  'dating', 'sex', 'romantic', 'relationship advice', 'therapy',
  'depression', 'anxiety', 'suicide', 'self harm',
  'medical', 'doctor', 'diagnosis', 'medication',
  'legal', 'lawsuit', 'sue', 'attorney',
  'invest', 'stock', 'crypto', 'financial advice',
  'competitor', 'bumble', 'meetup', 'hinge', 'tinder',
  'ignore previous', 'ignore instructions', 'jailbreak',
  'pretend you are', 'act as', 'your real instructions',
  'system prompt', 'forget your rules',
];

const escalationTriggers = [
  'speak to human', 'talk to someone', 'real person',
  'manager', 'support team', 'refund', 'complaint',
];

  const quickReplies = [
  "What is my primary virtue?",
  "How does matching work?",
  "When is my next meetup?",
  "Tell me about my plan",
  "How do I become a Guide?",
  "What is SoulMatch AI?",
];

function checkMessageSafety(message: string): { blocked: boolean; response?: string } {
  const lower = message.toLowerCase();
  if (offTopicTriggers.some(t => lower.includes(t))) {
    return {
      blocked: true,
      response: "I'm here to help with your Virtue Circles experience. Is there something about your profile, events, or membership I can help with?",
    };
  }
  return { blocked: false };
}

function shouldEscalate(message: string): boolean {
  const lower = message.toLowerCase();
  return escalationTriggers.some(t => lower.includes(t));
}

function getWelcomeMessage(user: any, profile: any): string {
  if (!user) {
    return "Hi! I'm Aristotle AI, your Virtue Circles guide. Ask me anything about how the platform works, our plans, or the virtue quiz. 🏛️";
  }
  const firstName = profile?.first_name || "there";
  if (!profile?.primary_virtue) {
    return `Hi ${firstName}! I'm Aristotle AI. You haven't taken the Virtue Quiz yet — it only takes 8 minutes and unlocks your full profile. Want to start?`;
  }
  return `Hi ${firstName}! I'm Aristotle AI. As a ${profile.primary_virtue} type, you're in great company here. What can I help you with today?`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export const Chatbot = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [messageCount, setMessageCount] = useState(0);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  // Fetch user profile for personalization
  useEffect(() => {
    if (!user) {
      setUserProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("first_name, primary_virtue, secondary_virtue, current_plan, subscription_status, founding_100, city, virtue_scores")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setUserProfile(data));
  }, [user]);

  // Set welcome message when chatbot opens
  useEffect(() => {
    if (isOpen && !hasInitialized.current) {
      hasInitialized.current = true;
      const welcome = getWelcomeMessage(user, userProfile);
      setMessages([{ role: "assistant", content: welcome, timestamp: new Date() }]);
      setMessageCount(0);
      setShowQuickReplies(true);
    }
  }, [isOpen, user, userProfile]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const clearChat = () => {
    hasInitialized.current = false;
    const welcome = getWelcomeMessage(user, userProfile);
    setMessages([{ role: "assistant", content: welcome, timestamp: new Date() }]);
    setMessageCount(0);
    setShowQuickReplies(true);
  };

  const streamChat = useCallback(async (
    allMessages: { role: string; content: string }[],
    onDelta: (delta: string) => void,
    onDone: () => void
  ) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    if (!accessToken) {
      throw new Error("Please sign in to use Aristotle AI.");
    }

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        messages: allMessages,
      }),
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      if (resp.status === 429) throw new Error(errorData.error || "Rate limit exceeded. Please try again in a moment.");
      if (resp.status === 402) throw new Error(errorData.error || "AI credits exhausted.");
      throw new Error(errorData.error || "Failed to connect to Aristotle AI");
    }

    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    onDone();
  }, []);

  const handleSend = async (overrideText?: string) => {
    const trimmed = (overrideText || input).trim();
    if (!trimmed || isLoading) return;

    // Rate limit check
    if (messageCount >= MAX_MESSAGES_PER_SESSION) {
      toast.error("You've reached the session limit. Clear the conversation to start fresh or contact hello@virtue-circles.com.");
      return;
    }

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      toast.error(`Please keep messages under ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }

    if (trimmed.length < 2) return;

    setShowQuickReplies(false);

    // Check for escalation
    if (shouldEscalate(trimmed)) {
      const userMsg: Message = { role: "user", content: trimmed, timestamp: new Date() };
      const escalationMsg: Message = {
        role: "assistant",
        content: "I'll connect you with our team right away. You can reach us at hello@virtue-circles.com or use the Contact page. We typically respond within 24 to 48 hours. 🏛️",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg, escalationMsg]);
      setInput("");
      setMessageCount(prev => prev + 1);
      return;
    }

    // Check for off-topic / abuse
    const safety = checkMessageSafety(trimmed);
    if (safety.blocked) {
      const userMsg: Message = { role: "user", content: trimmed, timestamp: new Date() };
      const blockedMsg: Message = {
        role: "assistant",
        content: safety.response!,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg, blockedMsg]);
      setInput("");
      setMessageCount(prev => prev + 1);
      return;
    }

    const userMessage: Message = { role: "user", content: trimmed, timestamp: new Date() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setMessageCount(prev => prev + 1);

    let assistantContent = "";

    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length > newMessages.length) {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantContent } : m
          );
        }
        return [...prev.slice(0, newMessages.length), { role: "assistant", content: assistantContent, timestamp: new Date() }];
      });
    };

    try {
      // Only send role + content to the API (strip timestamps)
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
      await streamChat(
        apiMessages,
        updateAssistant,
        () => setIsLoading(false)
      );
    } catch (error) {
      console.error("Chat error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to get response");
      setIsLoading(false);
    }
  };

  const handleQuickReply = (text: string) => {
    handleSend(text);
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <Button
          variant="neon"
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl animate-float z-50"
          onClick={() => setIsOpen(true)}
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[360px] h-[500px] flex flex-col neon-border z-50 bg-card">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm">
                ⚖️
              </div>
              <div>
                <h3 className="font-display font-bold text-sm">Aristotle AI</h3>
                <p className="text-xs text-muted-foreground">Virtue Circles Guide</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={clearChat}
                title="Clear conversation"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
            <div className="space-y-3">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                        <ReactMarkdown
                          components={{
                            a: ({ href, children }) => {
                              const url = href || '';
                              if (url.startsWith('javascript:') || url.startsWith('data:')) {
                                return <span>{children}</span>;
                              }
                              return (
                                <a href={url} target="_blank" rel="noopener noreferrer">
                                  {children}
                                </a>
                              );
                            },
                            img: ({ src, alt }) => {
                              const url = src || '';
                              if (!url.startsWith('http://') && !url.startsWith('https://')) {
                                return null;
                              }
                              return <img src={url} alt={alt || ''} loading="lazy" />;
                            },
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm">{msg.content}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 px-1">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              ))}

              {/* Quick Replies */}
              {showQuickReplies && messages.length === 1 && !isLoading && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {quickReplies.map((text) => (
                    <button
                      key={text}
                      onClick={() => handleQuickReply(text)}
                      className="text-xs px-2.5 py-1.5 rounded-full border border-border bg-background text-foreground hover:bg-muted transition-colors"
                    >
                      {text}
                    </button>
                  ))}
                </div>
              )}

              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Aristotle AI is thinking...
                    </p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <div className="flex space-x-2">
              <Input
                placeholder="Ask about virtues, meetups, your plan..."
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                className="flex-1 text-sm"
                disabled={isLoading}
                maxLength={MAX_MESSAGE_LENGTH}
              />
              <Button size="icon" onClick={() => handleSend()} disabled={isLoading || !input.trim()}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 text-right">
              {input.length}/{MAX_MESSAGE_LENGTH}
            </p>
          </div>
        </Card>
      )}
    </>
  );
};
