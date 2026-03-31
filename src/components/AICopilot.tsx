import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sparkles, Send, Bot, User, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
}

export function AICopilot() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: "Hello! I'm Luminous AI. How can I help you with your portfolio today?", sender: 'ai' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: currentInput,
        config: {
          systemInstruction: "You are Luminous AI, a professional financial analyst and market copilot. Provide concise, data-driven insights about stocks, market trends, and portfolio management. Be professional, objective, and helpful. If asked about specific stocks, mention that you are analyzing current market sentiment and technical indicators.",
        },
      });

      const aiMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        text: response.text || "I'm sorry, I couldn't process that request.", 
        sender: 'ai' 
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("AI Error:", error);
      const errorMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        text: "I encountered an error while processing your request. Please check if your GEMINI_API_KEY is correctly set in the environment.", 
        sender: 'ai' 
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-full flex flex-col border-l rounded-none shadow-none bg-muted/10">
      <CardHeader className="border-b bg-background/50 backdrop-blur-sm">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          AI Copilot
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 flex flex-col min-h-0">
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`p-2 rounded-full shrink-0 ${msg.sender === 'ai' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {msg.sender === 'ai' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${
                    msg.sender === 'ai' 
                      ? 'bg-background border shadow-sm rounded-tl-none' 
                      : 'bg-primary text-primary-foreground rounded-tr-none'
                  }`}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3"
                >
                  <div className="p-2 rounded-full shrink-0 bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="p-3 rounded-2xl bg-background border shadow-sm rounded-tl-none flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Thinking...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
        <div className="p-4 border-t bg-background/50">
          <div className="flex gap-2">
            <Input 
              placeholder="Ask about a stock..." 
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              className="rounded-full"
              disabled={isLoading}
            />
            <Button size="icon" onClick={handleSend} className="rounded-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
