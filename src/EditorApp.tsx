import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Editor from '@monaco-editor/react';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'highlight.js/styles/vs2015.css';
import 'katex/dist/katex.min.css';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { ChartRenderer } from './ChartRenderer';
import {
  UploadCloud,
  Trash2,
  RefreshCw,
  Plus,
  Settings,
  X,
  FileText,
  FolderOpen,
  Printer,
  Menu,
  Wand2,
  Bot,
  Coffee,
  Heart,
  ChevronUp,
  ChevronDown,
  Moon,
  Sun,
  MessageSquare,
  Send,
  CheckSquare,
  Square,
  Copy
} from 'lucide-react';
import { cn } from './lib/utils';

// --- Local Hook ---
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      console.log(`[useLocalStorage] Update triggered for key: ${key}`);
      setStoredValue(prev => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        console.log(`[useLocalStorage] Persisted to localStorage -> key: ${key}`);
        return valueToStore;
      });
    } catch (error) {
      console.warn(error);
    }
  };
  return [storedValue, setValue] as const;
}

// --- Types ---
export type Theme = 'sleek' | 'neutral' | 'vibrant' | 'dark' | 'midnight' | 'dracula' | 'terminal';
export type ElementTag = 'h1' | 'h2' | 'h3' | 'p';

export interface ElementStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  padding: number;
}

export type TypographySettings = Partial<Record<ElementTag, ElementStyle>>;

export interface DocumentSettings {
  fontFamily: string; // Base defaults
  fontSize: number;
  lineHeight: number;
  padding: number;
  theme: Theme;
  paperFormat: 'a4' | 'letter' | 'legal';
  typography?: TypographySettings; // Element overrides
}

export interface PageSettings {
  typography?: TypographySettings; // Page-specific element overrides
}

export interface Page {
  id: string;
  content: string;
  customSettings?: PageSettings; // Each page can have custom overrides
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  contextPages?: string[]; 
}

export interface ChatSession {
  id: string;
  name: string;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface Project {
  id: string;
  name: string;
  pages: Page[];
  settings: DocumentSettings;
  updatedAt: number;
  createdAt: number;
}

const DEFAULT_MARKDOWN = `# Welcome to MarkdownToPDF

This editor supports standard markdown, **rich formatting**, and even ==custom highlighting== syntax!

## Code Block Highlighting

\`\`\`javascript
function calculateFactorial(n) {
  if (n === 0 || n === 1) return 1;
  return n * calculateFactorial(n - 1);
}
console.log(calculateFactorial(5)); // Outputs: 120
\`\`\`

## Advanced Elements

We now support **Tables**, **Checklists**, and **Math Equations!**

### Tables
| Feature | Supported | Description |
| :--- | :---: | :--- |
| Tables | ✅ | Markdown tables via GFM |
| Task Lists | ✅ | Checkboxes for lists |
| Math (KaTeX) | ✅ | Blocks and inline math |

### Checklists
- [x] Integrate \`remark-gfm\`
- [x] Integrate \`rehype-katex\`
- [x] Configure Tailwind Prose
- [ ] Write a masterpiece

### Math Equations (KaTeX)
Here is an inline equation: $E = mc^2$

And a block equation:
$$
\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

> Use the **Settings** icon in the top right to change paper formats, adjust document paddings, set font sizes, and explore multiple design themes!`;

const DEFAULT_SETTINGS: DocumentSettings = {
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 15,
  lineHeight: 1.6,
  padding: 56,
  theme: 'sleek',
  paperFormat: 'a4'
};

const THEMES: Record<Theme, string> = {
  sleek: 'prose-slate prose-a:text-blue-600',
  neutral: 'prose-stone prose-a:text-amber-700',
  vibrant: 'prose-rose prose-a:text-rose-600',
  dark: 'prose-invert prose-slate prose-a:text-blue-400',
  midnight: 'prose-invert prose-indigo prose-a:text-indigo-400',
  dracula: 'prose-invert prose-purple prose-a:text-pink-500',
  terminal: 'prose-invert prose-emerald prose-a:text-emerald-400'
};

const DARK_THEMES: Theme[] = ['dark', 'midnight', 'dracula', 'terminal'];

const BACKGROUNDS: Record<Theme, { hex: string, tw: string }> = {
  sleek: { hex: '#ffffff', tw: 'bg-white' },
  neutral: { hex: '#fafaf9', tw: 'bg-stone-50' },
  vibrant: { hex: '#fff1f2', tw: 'bg-rose-50' },
  dark: { hex: '#0f172a', tw: 'bg-slate-900 border border-slate-700' },
  midnight: { hex: '#1e1b4b', tw: 'bg-indigo-950 border border-indigo-800' },
  dracula: { hex: '#282a36', tw: 'bg-[#282a36] border border-purple-900' },
  terminal: { hex: '#000000', tw: 'bg-black border border-emerald-900' }
};

const FONTS = [
  { name: 'Inter (Default)', value: '"Inter", system-ui, sans-serif' },
  { name: 'Roboto', value: '"Roboto", sans-serif' },
  { name: 'Outfit', value: '"Outfit", sans-serif' },
  { name: 'Space Grotesk', value: '"Space Grotesk", sans-serif' },
  { name: 'Playfair Display', value: '"Playfair Display", serif' },
  { name: 'Merriweather', value: '"Merriweather", serif' },
  { name: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
  { name: 'Fira Code', value: '"Fira Code", monospace' },
];

const DIMENSIONS = {
  a4: { w: 794, h: 1123 },
  letter: { w: 816, h: 1056 },
  legal: { w: 816, h: 1344 }
};

export function EditorApp() {
  const [projects, setProjects] = useLocalStorage<Project[]>('md2pdf_projects', [
    {
      id: 'default',
      name: 'My First Project',
      pages: [{ id: 'page1', content: DEFAULT_MARKDOWN }],
      settings: DEFAULT_SETTINGS,
      updatedAt: Date.now(),
      createdAt: Date.now()
    }
  ]);

  const [activeProjectId, setActiveProjectId] = useLocalStorage<string>('md2pdf_active_prj', 'default');
  const [activePageId, setActivePageId] = useState<string>('');
  const activeProjectIdRef = useRef(activeProjectId);
  const activePageIdRef = useRef(activePageId);

  useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  useEffect(() => {
    activePageIdRef.current = activePageId;
  }, [activePageId]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsScope, setSettingsScope] = useState<'global' | 'page'>('global');
  const [selectedTag, setSelectedTag] = useState<ElementTag | 'base'>('base');
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'editor'|'preview'>('editor');
  const [previewScale, setPreviewScale] = useState(1);
  
  // AI Settings & States
  const [apiKey, setApiKey] = useLocalStorage<string>('md2pdf_gemini_key', '');
  const [aiModel, setAiModel] = useLocalStorage<string>('md2pdf_gemini_model', 'gemini-2.5-flash');
  const [aiThinkingLevel, setAiThinkingLevel] = useLocalStorage<string>('md2pdf_gemini_thinking', 'none');
  const [aiMaxTokens, setAiMaxTokens] = useLocalStorage<number>('md2pdf_gemini_tokens', 8192);
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);
  const [globalChatSessions, setGlobalChatSessions] = useLocalStorage<Record<string, ChatSession[]>>('md2pdf_chat_sessions_v3', {});
  const [activeSessionIds, setActiveSessionIds] = useLocalStorage<Record<string, string>>('md2pdf_active_session_ids_v3', {});

  const projectSessions = globalChatSessions[activeProjectId] || [{ id: 'default', name: 'Chat 1', messages: [], updatedAt: Date.now() }];
  const defaultActiveId = projectSessions[0]?.id || 'default';
  const activeSessionId = activeSessionIds[activeProjectId] || defaultActiveId;

  const activeSession = projectSessions.find(s => s.id === activeSessionId) || projectSessions[0];
  const chatHistory = activeSession?.messages || [];

  const updateChatHistory = (action: React.SetStateAction<ChatMessage[]>) => {
    setGlobalChatSessions(prev => {
      const curProjectSessions = prev[activeProjectId] || [{ id: 'default', name: 'Chat 1', messages: [], updatedAt: Date.now() }];
      const sessionIndex = curProjectSessions.findIndex(s => s.id === activeSessionId);
      if (sessionIndex === -1) return prev;
      
      const curMessages = curProjectSessions[sessionIndex].messages;
      const nextMessages = typeof action === 'function' ? (action as any)(curMessages) : action;
      
      const newSessions = [...curProjectSessions];
      newSessions[sessionIndex] = { ...newSessions[sessionIndex], messages: nextMessages, updatedAt: Date.now() };
      
      return { ...prev, [activeProjectId]: newSessions };
    });
  };

  const createNewSession = () => {
      const newId = Date.now().toString();
      setGlobalChatSessions(prev => {
          const curProjectSessions = prev[activeProjectId] || [{ id: 'default', name: 'Chat 1', messages: [], updatedAt: Date.now() }];
          return {
              ...prev,
              [activeProjectId]: [...curProjectSessions, { id: newId, name: `Chat ${curProjectSessions.length + 1}`, messages: [], updatedAt: Date.now() }]
          };
      });
      setActiveSessionIds(prev => ({ ...prev, [activeProjectId]: newId }));
  };

  const switchSession = (sessionId: string) => {
      setActiveSessionIds(prev => ({ ...prev, [activeProjectId]: sessionId }));
  };

  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setGlobalChatSessions(prev => {
          const curProjectSessions = prev[activeProjectId] || [];
          const newSessions = curProjectSessions.filter(s => s.id !== sessionId);
          if (newSessions.length === 0) {
              newSessions.push({ id: 'default', name: 'Chat 1', messages: [], updatedAt: Date.now() });
          }
          return { ...prev, [activeProjectId]: newSessions };
      });
      if (activeSessionId === sessionId) {
          setActiveSessionIds(prev => {
              const next = { ...prev };
              delete next[activeProjectId];
              return next;
          });
      }
  };
  
  const [chatContextPages, setChatContextPages] = useState<string[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSelection, setAiSelection] = useState<{ text: string, range: any } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isChatDrawerOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isChatDrawerOpen]);
  
  const [showCoffeeModal, setShowCoffeeModal] = useState<{ show: boolean, intention: 'export' | 'project' | 'write' | 'manual', pendingFn?: () => void }>({ show: false, intention: 'manual' });
  const [keystrokeCount, setKeystrokeCount] = useState(0);
  
  const [isDarkMode, setIsDarkMode] = useLocalStorage<boolean>('md2pdf_dark_mode', false);

  const exportContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);

  // Apply dark mode to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Fallbacks
  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
  useEffect(() => {
    if (activeProject && !activeProject.pages.find(p => p.id === activePageId)) {
      setActivePageId(activeProject.pages[0]?.id || '');
    }
  }, [activeProject, activePageId]);

  const activePage = activeProject?.pages.find(p => p.id === activePageId) || activeProject?.pages[0];
  const editorContent = activePage?.content || '';

  const d = DIMENSIONS[activeProject.settings.paperFormat] || DIMENSIONS.a4;

  useEffect(() => {
    if (!exportContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      const padding = 48; // 24px padding each side roughly
      const availableWidth = width - padding;
      if (availableWidth < d.w && availableWidth > 0) {
        setPreviewScale(availableWidth / d.w);
      } else {
        setPreviewScale(1);
      }
    });
    observer.observe(exportContainerRef.current);
    return () => observer.disconnect();
  }, [d.w, mobileTab]);

  // Data Mutators
  const updateActiveProject = (updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => 
      p.id === activeProject.id ? { ...p, ...updates, updatedAt: Date.now() } : p
    ));
  };

  const updateSettings = (settingsOpts: Partial<DocumentSettings>) => {
    updateActiveProject({ settings: { ...activeProject.settings, ...settingsOpts } });
  };

  const updatePageSettings = (tag: ElementTag, styleUpdates: Partial<ElementStyle>) => {
    if (settingsScope === 'page') {
      // Update page-specific topography
      const updatedPages = activeProject.pages.map(p => {
        if (p.id === activePageId) {
          const existingTypo = p.customSettings?.typography || {};
          const existingTagObj = existingTypo[tag] || {} as ElementStyle;
          return {
            ...p,
            customSettings: {
               ...p.customSettings,
               typography: {
                 ...existingTypo,
                 [tag]: { ...existingTagObj, ...styleUpdates }
               }
            }
          };
        }
        return p;
      });
      updateActiveProject({ pages: updatedPages });
    } else {
      // Update global topography
      const existingTypo = activeProject.settings.typography || {};
      const existingTagObj = existingTypo[tag] || {} as ElementStyle;
      updateActiveProject({
        settings: {
          ...activeProject.settings,
          typography: {
            ...existingTypo,
            [tag]: { ...existingTagObj, ...styleUpdates }
          }
        }
      });
    }
  };

  const getStyleForTag = (tag: ElementTag | 'base') => {
    if (tag === 'base') {
      return {
        fontFamily: activeProject.settings.fontFamily,
        fontSize: activeProject.settings.fontSize,
        lineHeight: activeProject.settings.lineHeight,
        padding: activeProject.settings.padding,
      };
    }
    const globalTypo = activeProject.settings.typography?.[tag];
    let pageTypo: ElementStyle | undefined = undefined;
    if (settingsScope === 'page') {
      pageTypo = activePage?.customSettings?.typography?.[tag];
    }
    // Return page specific override, else global override, else empty/default hints
    return pageTypo || globalTypo || { 
      fontFamily: '', 
      fontSize: activeProject.settings.fontSize, 
      lineHeight: activeProject.settings.lineHeight, 
      padding: 0 
    };
  };

  const handleContentChange = (content: string) => {
    const updatedPages = activeProject.pages.map(p => 
      p.id === activePageId ? { ...p, content } : p
    );
    updateActiveProject({ pages: updatedPages });
    
    // Track typing to show modal after writing for a while
    setKeystrokeCount(prev => {
      const next = prev + 1;
      if (next === 30 && !sessionStorage.getItem('coffee_prompted_write')) {
        sessionStorage.setItem('coffee_prompted_write', 'true');
        setTimeout(() => setShowCoffeeModal({ show: true, intention: 'write' }), 500);
      }
      return next;
    });
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Remeasure fonts once DOM is settled, fixes selection highlighting offset bugs with loaded fonts
    if (document.fonts) {
      document.fonts.ready.then(() => {
        monaco.editor.remeasureFonts();
      });
    }

    // Add Context Menu Action for AI
    editor.addAction({
      id: 'ai-assistant',
      label: '✨ Ask AI (Edit/Summarize/Write)',
      contextMenuGroupId: 'navigation',
      run: (ed: any) => {
        const selection = ed.getSelection();
        const selectedText = ed.getModel().getValueInRange(selection);
        setAiSelection(selectedText.trim().length > 0 ? { text: selectedText, range: selection } : null);
        setIsChatDrawerOpen(true);
      }
    });

    editor.addAction({
      id: 'extract-page-prev',
      label: '📄 Extract to New Page (Before)',
      contextMenuGroupId: 'navigation',
      run: (ed: any) => {
        const selection = ed.getSelection();
        const selectedText = ed.getModel().getValueInRange(selection);
        if (!selectedText.trim()) return;
        ed.executeEdits('extract-page', [{ range: selection, text: '' }]);
        const newId = Date.now().toString();
        setTimeout(() => {
          setProjects(prevProjects => {
             const projId = activeProjectIdRef.current;
             const pageId = activePageIdRef.current;
             return prevProjects.map(p => {
               if (p.id !== projId) return p;
               const pIndex = p.pages.findIndex(px => px.id === pageId);
               if (pIndex === -1) return p;
               const newPages = [...p.pages];
               newPages.splice(pIndex, 0, { id: newId, content: selectedText });
               return { ...p, pages: newPages, updatedAt: Date.now() };
             });
          });
          setActivePageId(newId);
        }, 0);
      }
    });

    editor.addAction({
      id: 'extract-page-next',
      label: '📄 Extract to New Page (After)',
      contextMenuGroupId: 'navigation',
      run: (ed: any) => {
        const selection = ed.getSelection();
        const selectedText = ed.getModel().getValueInRange(selection);
        if (!selectedText.trim()) return;
        ed.executeEdits('extract-page', [{ range: selection, text: '' }]);
        const newId = Date.now().toString();
        setTimeout(() => {
          setProjects(prevProjects => {
             const projId = activeProjectIdRef.current;
             const pageId = activePageIdRef.current;
             return prevProjects.map(p => {
               if (p.id !== projId) return p;
               const pIndex = p.pages.findIndex(px => px.id === pageId);
               if (pIndex === -1) return p;
               const newPages = [...p.pages];
               newPages.splice(pIndex + 1, 0, { id: newId, content: selectedText });
               return { ...p, pages: newPages, updatedAt: Date.now() };
             });
          });
          setActivePageId(newId);
        }, 0);
      }
    });
  };

  const executeAiPrompt = async () => {
    const textToSend = aiPrompt.trim();
    if (!textToSend) return;
    const finalKey = apiKey || process.env.GEMINI_API_KEY;
    if (!finalKey) {
      alert("Please provide a Gemini API Key in Document Settings first.");
      setIsChatDrawerOpen(false);
      setIsSettingsOpen(true);
      return;
    }

    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: textToSend, contextPages: chatContextPages.length > 0 ? chatContextPages : [activePageId] };
    const historyWithUser = [...chatHistory, userMessage];
    updateChatHistory(historyWithUser);
    setAiPrompt('');
    setIsAiLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: finalKey });
      const hasSelection = aiSelection !== null;
      
      let promptStr = `You are an expert AI Markdown copilot inside a document editor.\n\n`;
      
      const contextPagesData = activeProject.pages.filter(p => userMessage.contextPages?.includes(p.id));
      if (contextPagesData.length > 0) {
        promptStr += `Context Pages:\n`;
        contextPagesData.forEach((p, idx) => {
          promptStr += `--- PAGE ID: ${p.id} (Page ${activeProject.pages.findIndex(ap => ap.id === p.id) + 1}) ---\n${p.content}\n\n`;
        });
      } else {
        promptStr += `Current Page Content:\n---\n${activePage?.content || ''}\n---\n\n`;
      }

      if (historyWithUser.length > 1) {
        promptStr += `Chat History:\n`;
        historyWithUser.slice(0, -1).forEach(m => {
          promptStr += `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}\n`;
        });
        promptStr += `\n`;
      }

      promptStr += `CRITICAL INSTRUCTION: You MUST use rich, stylized markdown formatting (headings, bold, lists, math) where appropriate for text.\n\n`;
      promptStr += `FORMAT EXPECTATION:
1. Respond conversationally first, explaining what you are doing.
2. If your task requires updating an existing page, append an XML block at the end of your message in this format:
<update_page id="PAGE_ID_HERE">
(Put the updated content here)
</update_page>
3. If your task requires creating a new page, append:
<new_page>
(Put the new page content here)
</new_page>\n\n`;

      if (hasSelection) {
        promptStr += `The user has highlighted the following exact text for editing on the ACTIVE page (${activePageId}):\n"${aiSelection?.text}"\n\n`;
        promptStr += `IMPORTANT: Because there is an active text selection, if you output an <update_page id="${activePageId}"> block, its content will ONLY replace the highlighted snippet. Provide JUST the replacement markdown.\n\n`;
      }
      
      promptStr += `User Request: ${textToSend}\n\n`;

      const targetModel = aiModel || 'gemini-2.5-flash';
      const configObj: any = {};
      
      // Thinking is only valid for Gemini 3.0+ models.
      // Gemini 2.x and 1.x models (including 2.0-flash-thinking-exp) will throw 400 Bad Request
      // if thinkingConfig is provided.
      const supportsThinkingConfig = targetModel.includes('gemini-3');
      
      if (aiThinkingLevel && aiThinkingLevel !== 'none' && supportsThinkingConfig) {
        if (aiThinkingLevel === 'true') {
           // For boolean true, default to HIGH or leave it undefined if that's preferred.
           // Setting thinking: true is invalid schema, so we map it to HIGH.
           configObj.thinkingConfig = { thinkingLevel: 'HIGH' };
        } else if (aiThinkingLevel === 'false') {
           // False maps to MINIMAL for Gemini 3
           configObj.thinkingConfig = { thinkingLevel: 'MINIMAL' };
        } else {
           configObj.thinkingConfig = { thinkingLevel: aiThinkingLevel };
        }
      }
      
      if (aiMaxTokens) {
        configObj.maxOutputTokens = aiMaxTokens;
      }

      const responseStream = await ai.models.generateContentStream({
        model: targetModel,
        contents: promptStr,
        config: configObj
      });

      const assistMsgId = Date.now().toString() + '-ai';
      updateChatHistory(prev => [...prev, { id: assistMsgId, role: 'model', content: '' }]);
      setIsAiLoading(false); // Enable chat interaction early
      
      let fullResponse = '';
      for await (const chunk of responseStream) {
        fullResponse += chunk.text;
        
        // Temporarily strip out any incomplete tags so they don't look ugly while typing
        const displayResponse = fullResponse
           .replace(/<update_page[\s\S]*?(<\/update_page>|$)/g, '')
           .replace(/<new_page>[\s\S]*?(<\/new_page>|$)/g, '')
           .trim();
           
        updateChatHistory(prev => prev.map(m => m.id === assistMsgId ? { ...m, content: displayResponse || "Thinking..." } : m));
      }

      // Final processing once stream is complete
      const updateRegex = /<update_page\s+id="([^"]+)">([\s\S]*?)<\/update_page>/g;
      const newRegex = /<new_page>([\s\S]*?)<\/new_page>/g;
      
      let newPagesList = [...activeProject.pages];
      let didUpdateActivePageSelection = false;

      let match;
      while ((match = updateRegex.exec(fullResponse)) !== null) {
          const pageId = match[1];
          const content = match[2].trim();
          
          if (hasSelection && pageId === activePageId && editorRef.current) {
              editorRef.current.executeEdits('ai-assistant', [{
                  range: aiSelection!.range,
                  text: content,
                  forceMoveMarkers: true
              }]);
              const finalContent = editorRef.current.getValue();
              newPagesList = newPagesList.map(p => p.id === activePageId ? { ...p, content: finalContent } : p);
              didUpdateActivePageSelection = true;
          } else {
              newPagesList = newPagesList.map(p => p.id === pageId ? { ...p, content } : p);
          }
      }

      let latestNewPageId: string | null = null;
      while ((match = newRegex.exec(fullResponse)) !== null) {
          const content = match[1].trim();
          const newId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
          latestNewPageId = newId;
          newPagesList.push({ id: newId, content });
      }

      const finalCleanedResponse = fullResponse
          .replace(updateRegex, '')
          .replace(newRegex, '')
          .trim();

      updateChatHistory(prev => prev.map(m => m.id === assistMsgId ? { ...m, content: finalCleanedResponse } : m));
      
      if (JSON.stringify(newPagesList) !== JSON.stringify(activeProject.pages)) {
          updateActiveProject({ pages: newPagesList });
          if (latestNewPageId) handleSelectPage(latestNewPageId);
      }
      
      if (!didUpdateActivePageSelection && hasSelection) {
          setAiSelection(null); 
      }

    } catch (e: any) {
      console.error(e);
      updateChatHistory(prev => [...prev, {
        id: Date.now().toString() + '-err',
        role: 'model',
        content: `**Error:** ${e.message}`
      }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Projects
  const createProject = () => {
    const executeCreateProject = () => {
      const newId = Date.now().toString();
      const newProject: Project = {
        id: newId,
        name: `Project ${projects.length + 1}`,
        pages: [{ id: '1', content: '# New Project' }],
        settings: activeProject ? JSON.parse(JSON.stringify(activeProject.settings)) : DEFAULT_SETTINGS,
        updatedAt: Date.now(),
        createdAt: Date.now()
      };
      setProjects([...projects, newProject]);
      setActiveProjectId(newId);
    };

    if (!sessionStorage.getItem('coffee_prompted_project')) {
      sessionStorage.setItem('coffee_prompted_project', 'true');
      setShowCoffeeModal({ show: true, intention: 'project', pendingFn: executeCreateProject });
    } else {
      executeCreateProject();
    }
  };

  const deleteProject = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    console.log(`[deleteProject] Triggered for project ID: ${id}`);
    console.log(`[deleteProject] Current project count before delete: ${projects.length}`);

    if (projects.length <= 1) {
      console.log(`[deleteProject] Blocked: Cannot delete the last remaining project.`);
      return;
    }
    
    const confirmDelete = window.confirm('Are you sure you want to delete this project permanently?');
    console.log(`[deleteProject] Confirmation dialog result: ${confirmDelete}`);
    if (!confirmDelete) return;
    
    setProjects(prev => {
      console.log(`[deleteProject|Updater] Internal prev count: ${prev.length}`);
      const nextList = prev.filter(p => p.id !== id);
      console.log(`[deleteProject|Updater] Filtered count: ${nextList.length}`);
      
      if (activeProjectId === id && nextList.length > 0) {
        console.log(`[deleteProject|Updater] Deleted active project. Switching tracking to: ${nextList[0].id}`);
        setActiveProjectId(nextList[0].id);
      }
      
      return nextList;
    });
  };

  // Pages
  const addPage = () => {
    const newId = Date.now().toString();
    const updatedPages = [...activeProject.pages, { id: newId, content: '' }];
    updateActiveProject({ pages: updatedPages });
    handleSelectPage(newId);
  };

  const addPageAfter = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const index = activeProject.pages.findIndex(p => p.id === id);
    if (index === -1) return;
    const newId = Date.now().toString();
    const updatedPages = [...activeProject.pages];
    updatedPages.splice(index + 1, 0, { id: newId, content: '' });
    updateActiveProject({ pages: updatedPages });
    handleSelectPage(newId);
  };
  
  const movePageUp = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const index = activeProject.pages.findIndex(p => p.id === id);
    if (index > 0) {
      const updatedPages = [...activeProject.pages];
      [updatedPages[index - 1], updatedPages[index]] = [updatedPages[index], updatedPages[index - 1]];
      updateActiveProject({ pages: updatedPages });
    }
  };

  const movePageDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const index = activeProject.pages.findIndex(p => p.id === id);
    if (index < activeProject.pages.length - 1) {
      const updatedPages = [...activeProject.pages];
      [updatedPages[index + 1], updatedPages[index]] = [updatedPages[index], updatedPages[index + 1]];
      updateActiveProject({ pages: updatedPages });
    }
  };

  const deletePage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeProject.pages.length === 1) return;
    const nextPages = activeProject.pages.filter(p => p.id !== id);
    updateActiveProject({ pages: nextPages });
    if (activePageId === id) {
      handleSelectPage(nextPages[0].id);
    }
  };

  const handleSelectPage = (id: string) => {
    setActivePageId(id);
    if (window.innerWidth < 1024) {
      setMobileTab('editor'); // automatically go to editor when clicking a page on mobile
      setIsMobileMenuOpen(false); // Close drawer on selection
    }
    setTimeout(() => {
      const el = document.getElementById(`preview-page-${id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  // Drag & Drop
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.md') || file.name.endsWith('.txt') || file.type.includes('text/')) {
        const text = await file.text();
        handleContentChange(text);
      } else alert('Please drop a Markdown (.md) or text file.');
    }
  };

  const copyPageContent = (pageContent: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(pageContent);
    // Could add a toast notification here
  };

  const copyAllPagesContent = () => {
    const combinedContent = activeProject.pages.map(p => p.content).join('\n\n---\n\n');
    navigator.clipboard.writeText(combinedContent);
  };

  // Pre-process markdown for highlighting (==highlight== -> <mark>highlight</mark>)
  const processMarkdown = (text: string) => {
    return text.replace(/==([^=]+)==/g, '<mark>$1</mark>');
  };

  // Native PDF Export
  const downloadPDF = async () => {
    const executeExport = () => {
      setIsGenerating(true);
      const originalTitle = document.title;
      // Set the document title to the project name so the PDF defaults to it
      document.title = activeProject.name || 'document';
      
      // Give state a moment to clear interactive borders, then pop native print OS dialog
      setTimeout(() => {
        try {
          window.print();
        } catch (e) {
          console.error("Print restricted:", e);
        } finally {
          document.title = originalTitle;
          setIsGenerating(false);
        }
      }, 400);
    };

    if (!sessionStorage.getItem('coffee_prompted_export')) {
      sessionStorage.setItem('coffee_prompted_export', 'true');
      setShowCoffeeModal({ show: true, intention: 'export', pendingFn: executeExport });
    } else {
      executeExport();
    }
  };

  const isDark = (theme: Theme) => DARK_THEMES.includes(theme);

  // Generate the dynamic CSS mapping for everything, including Page Overrides
  const generateStyles = () => {
    let css = `
      .custom-prose-styling .prose {
        font-family: ${activeProject.settings.fontFamily} !important;
        font-size: ${activeProject.settings.fontSize}px !important;
        line-height: ${activeProject.settings.lineHeight} !important;
        max-width: none !important;
        color: ${isDark(activeProject.settings.theme) ? '#f8fafc' : '#0f172a'} !important;
      }
      .custom-prose-styling .prose h1,
      .custom-prose-styling .prose h2,
      .custom-prose-styling .prose h3,
      .custom-prose-styling .prose h4 {
        font-family: inherit !important;
        color: ${isDark(activeProject.settings.theme) ? '#fff' : '#0f172a'} !important;
      }
      .custom-prose-styling .prose strong,
      .custom-prose-styling .prose a,
      .custom-prose-styling .prose :not(pre) > code,
      .custom-prose-styling .prose blockquote {
        color: ${isDark(activeProject.settings.theme) ? 'inherit' : '#0f172a'};
      }
      
      @media print {
        @page {
          size: ${activeProject.settings.paperFormat === 'letter' ? 'letter' : activeProject.settings.paperFormat === 'legal' ? 'legal' : 'A4'} portrait;
          margin: 0;
        }
        html, body {
          height: auto !important;
          overflow: visible !important;
        }
        body {
          background-color: ${BACKGROUNDS[activeProject.settings.theme].hex} !important;
        }
        .prose {
           color: ${isDark(activeProject.settings.theme) ? '#f8fafc' : '#1e293b'} !important;
        }
      }
    `;

    // Global Typographical Element Overrides
    const globalTypo = activeProject.settings.typography;
    if (globalTypo) {
      Object.entries(globalTypo).forEach(([tag, style]) => {
        if (!style) return;
        css += `
          .custom-prose-styling .prose ${tag} {
            ${style.fontFamily ? `font-family: ${style.fontFamily} !important;` : ''}
            ${style.fontSize ? `font-size: ${style.fontSize}px !important;` : ''}
            ${style.lineHeight ? `line-height: ${style.lineHeight} !important;` : ''}
            ${style.padding ? `padding-top: ${style.padding}px !important; padding-bottom: ${style.padding}px !important;` : ''}
          }
        `;
      });
    }

    // Page Specific Typographical Overrides
    activeProject.pages.forEach(p => {
      const pTypo = p.customSettings?.typography;
      if (pTypo) {
        Object.entries(pTypo).forEach(([tag, style]) => {
          if (!style) return;
          css += `
            #preview-page-${p.id} .prose ${tag}, 
            #print-page-${p.id} .prose ${tag} {
              ${style.fontFamily ? `font-family: ${style.fontFamily} !important;` : ''}
              ${style.fontSize ? `font-size: ${style.fontSize}px !important;` : ''}
              ${style.lineHeight ? `line-height: ${style.lineHeight} !important;` : ''}
              ${style.padding ? `padding-top: ${style.padding}px !important; padding-bottom: ${style.padding}px !important;` : ''}
            }
          `;
        });
      }
    });

    return css;
  };

  // Shared markdown components
  const markdownComponents = {
    code(props: any) {
      const { children, className, node, ...rest } = props;
      const match = /language-(\w+)/.exec(className || '');
      if (match && match[1] === 'chart') {
        return <ChartRenderer code={String(children).replace(/\n$/, '')} />;
      }
      return <code {...rest} className={className}>{children}</code>;
    }
  };

  return (
    <div 
      className="h-screen print:h-auto flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans overflow-hidden print:overflow-visible print:block"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={handleDrop}
    >
      <style>{generateStyles()}</style>

      {/* Fixed Overlays */}
      {isDragging && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-blue-600/90 backdrop-blur-sm">
          <div className="text-center text-white pointer-events-none">
            <UploadCloud className="w-32 h-32 mx-auto mb-6 opacity-90" />
            <h2 className="text-4xl font-bold tracking-tight">Drop Markdown to Replace Page</h2>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-opacity p-4" onClick={() => setIsSettingsOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600 dark:text-blue-500" /> Document Settings
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(THEMES).map((th) => (
                    <button
                      key={th}
                      onClick={() => updateSettings({ theme: th as Theme })}
                      className={cn(
                        "px-3 py-2 text-sm font-medium rounded-lg border text-left capitalize transition-all",
                        activeProject.settings.theme === th ? "bg-blue-50 dark:bg-blue-900/30 border-blue-600 dark:border-blue-500 text-blue-800 dark:text-blue-300" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
                      )}
                    >
                      {th}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-700 rounded-xl">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Typography Tuning</label>
                  <div className="flex bg-slate-200/50 dark:bg-slate-900/50 p-1 rounded-md">
                    <button 
                      onClick={() => setSettingsScope('global')}
                      className={cn("px-2 py-1 text-xs font-medium rounded transition-colors", settingsScope === 'global' ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")}
                    >
                      Global
                    </button>
                    <button 
                      onClick={() => setSettingsScope('page')}
                      className={cn("px-2 py-1 text-xs font-medium rounded transition-colors", settingsScope === 'page' ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")}
                    >
                      This Page
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1.5 bg-slate-200/50 dark:bg-slate-900/50 p-1 rounded-lg">
                  {['base', 'h1', 'h2', 'h3', 'p'].map(tag => (
                    <button 
                      key={tag}
                      onClick={() => setSelectedTag(tag as any)}
                      className={cn(
                        "py-1.5 text-xs font-medium rounded text-center transition-all uppercase tracking-wider",
                        selectedTag === tag ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1.5 block">Font Family</label>
                    <select 
                      value={getStyleForTag(selectedTag).fontFamily || ''}
                      onChange={(e) => {
                        if (selectedTag === 'base') updateSettings({ fontFamily: e.target.value });
                        else updatePageSettings(selectedTag as ElementTag, { fontFamily: e.target.value });
                      }}
                      className="w-full border-slate-200 dark:border-slate-700 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white dark:bg-slate-900 dark:text-slate-200"
                    >
                      <option value="">Inherit / Default</option>
                      {FONTS.map(f => (
                        <option key={f.name} value={f.value}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1.5 block w-full truncate" title="Size (px)">Size (px)</label>
                      <input 
                        type="number" min="8" max="72" step="1"
                        value={getStyleForTag(selectedTag).fontSize || ''}
                        onChange={(e) => {
                          if (selectedTag === 'base') updateSettings({ fontSize: parseInt(e.target.value) || 15 });
                          else updatePageSettings(selectedTag as ElementTag, { fontSize: parseInt(e.target.value) || undefined as any });
                        }}
                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="Default"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1.5 block w-full truncate" title="Height">Height</label>
                      <input 
                        type="number" min="1.0" max="3.0" step="0.1"
                        value={getStyleForTag(selectedTag).lineHeight || ''}
                        onChange={(e) => {
                          if (selectedTag === 'base') updateSettings({ lineHeight: parseFloat(e.target.value) || 1.6 });
                          else updatePageSettings(selectedTag as ElementTag, { lineHeight: parseFloat(e.target.value) || undefined as any });
                        }}
                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="Default"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1.5 block w-full truncate" title="Padding (px)">Padding</label>
                      <input 
                        type="number" min="0" max="100" step="2"
                        value={getStyleForTag(selectedTag).padding || ''}
                        onChange={(e) => {
                          if (selectedTag === 'base') updateSettings({ padding: parseInt(e.target.value) || 56 });
                          else updatePageSettings(selectedTag as ElementTag, { padding: parseInt(e.target.value) || undefined as any });
                        }}
                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 rounded-md px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="Default"
                      />
                    </div>
                  </div>
                  {settingsScope === 'page' && selectedTag !== 'base' && (
                    <div className="flex justify-end pt-1">
                      <button 
                        onClick={() => {
                          const existingTypo = activePage?.customSettings?.typography || {};
                          const copy = { ...existingTypo };
                          delete copy[selectedTag as ElementTag];
                          const updatedPages = activeProject.pages.map(p => 
                            p.id === activePageId ? { ...p, customSettings: { ...p.customSettings, typography: copy } } : p
                          );
                          updateActiveProject({ pages: updatedPages });
                        }}
                        className="text-[10px] text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 uppercase font-bold"
                      >
                        Reset Tag
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Layout</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Paper Format</label>
                    <select 
                      value={activeProject.settings.paperFormat}
                      onChange={(e) => updateSettings({ paperFormat: e.target.value as any })}
                      className="w-full border-slate-200 dark:border-slate-700 border bg-white dark:bg-slate-900 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="a4">A4 (210 × 297mm)</option>
                      <option value="letter">Letter (8.5 × 11in)</option>
                      <option value="legal">Legal (8.5 × 14in)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Padding ({activeProject.settings.padding}px)</label>
                    <input 
                      type="range" min="0" max="150" step="4"
                      value={activeProject.settings.padding}
                      onChange={(e) => updateSettings({ padding: parseInt(e.target.value) })}
                      className="w-full mt-2"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pb-6 bg-emerald-50/50 dark:bg-emerald-900/10 p-4 border border-emerald-100 dark:border-emerald-800/30 rounded-xl">
                <label className="text-xs font-semibold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-2 border-b border-emerald-200 dark:border-emerald-800/30 pb-2">
                  <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-500" /> AI Assistant Configuration
                </label>
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 block">API Key (Stored Locally)</label>
                    <input 
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Paste GEMINI_API_KEY here..."
                      className="w-full border-slate-200 dark:border-slate-700 border bg-white dark:bg-slate-900 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 block">Model Name</label>
                    <input 
                      type="text"
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      placeholder="gemini-2.5-flash"
                      className="w-full border-slate-200 dark:border-slate-700 border bg-white dark:bg-slate-900 dark:text-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 block">Thinking Mode</label>
                      <select 
                        value={aiThinkingLevel}
                        onChange={(e) => setAiThinkingLevel(e.target.value)}
                        className="w-full border-slate-200 dark:border-slate-700 border bg-white dark:bg-slate-900 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        <option value="none">Disabled</option>
                        <option value="true">True (Boolean)</option>
                        <option value="false">False (Boolean)</option>
                        <option value="LOW">Low</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 block" title="Max Output Tokens">Token Budget</label>
                      <input 
                        type="number" min="100" max="64000" step="100"
                        value={aiMaxTokens || ''}
                        onChange={(e) => setAiMaxTokens(parseInt(e.target.value) || 8192)}
                        className="w-full border-slate-200 dark:border-slate-700 border bg-white dark:bg-slate-900 dark:text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="px-6 py-2 bg-slate-900 dark:bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Prompt Modal Removed - Using Chat Drawer instead */}

      {/* Coffee Support Modal */}
      {showCoffeeModal.show && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-opacity p-4" onClick={() => {
           if (showCoffeeModal.pendingFn) showCoffeeModal.pendingFn();
           setShowCoffeeModal({ show: false, intention: 'manual' });
        }}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col text-center border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-amber-50/50 dark:bg-amber-900/10 text-left">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Coffee className="w-5 h-5 text-amber-600 dark:text-amber-500" /> Support the Developer
              </h3>
              <button 
                onClick={() => {
                  if (showCoffeeModal.pendingFn) showCoffeeModal.pendingFn();
                  setShowCoffeeModal({ show: false, intention: 'manual' });
                }} 
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center">
              <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center text-amber-600 dark:text-amber-500 mb-4 border border-amber-200 dark:border-amber-800/50">
                <Coffee className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Enjoying the app?</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed px-4 mb-6">
                If MarkdownToPDF saves you time, please consider buying me a coffee to support continued development and new features!
              </p>
              <div className="w-full flex flex-col gap-3">
                <a 
                  href="https://ko-fi.com/ayhamdev" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={() => {
                    if (showCoffeeModal.pendingFn) showCoffeeModal.pendingFn();
                    setShowCoffeeModal({ show: false, intention: 'manual' });
                  }}
                  className="w-full py-3.5 bg-amber-500 dark:bg-amber-600 hover:bg-amber-600 dark:hover:bg-amber-700 active:scale-[0.98] text-white rounded-xl font-medium transition-all shadow-md shadow-amber-200 dark:shadow-none flex items-center justify-center gap-2 text-base"
                >
                  <Heart className="w-4 h-4" fill="currentColor" /> Buy me a coffee
                </a>
                <button 
                  onClick={() => {
                    if (showCoffeeModal.pendingFn) showCoffeeModal.pendingFn();
                    setShowCoffeeModal({ show: false, intention: 'manual' });
                  }}
                  className="w-full py-2.5 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl font-medium transition-colors text-sm"
                >
                  {showCoffeeModal.intention === 'manual' ? 'Close' : 'No thanks, continue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="print:hidden h-14 px-4 sm:px-6 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0 z-10 w-full relative">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 flex items-center justify-center font-bold text-lg bg-blue-600 rounded-lg text-white">
            M
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100 hidden sm:block">
            Markdown<span className="text-blue-600 dark:text-blue-400">PDF</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowCoffeeModal({ show: true, intention: 'manual' })}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 px-2 sm:px-3 py-1.5 rounded-full transition-colors border border-amber-200 dark:border-amber-800"
          >
            <Coffee className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Buy me a coffee</span>
          </button>
          
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
            title="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
            title="Document Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          
          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block mx-1"></div>
          
          <button
            onClick={copyAllPagesContent}
            className="px-3 py-1.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 font-medium text-sm rounded-lg transition-all shadow-sm active:scale-95 flex items-center gap-2"
            title="Copy All MD Source"
          >
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">Copy All</span>
          </button>
          
          <button
            onClick={downloadPDF}
            disabled={isGenerating}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
            title="Generate Native PDF"
          >
            {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            {isGenerating ? 'Prepping...' : 'Export PDF'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="print:hidden flex flex-1 overflow-hidden lg:flex-row flex-col">
        
        {/* Mobile View Toggle */}
        <div className="lg:hidden flex bg-slate-100 dark:bg-slate-800 p-1.5 shrink-0 border-b border-slate-200 dark:border-slate-700 gap-1.5 z-20 relative">
          <button
            onClick={() => setMobileTab('editor')}
            className={cn("flex-1 py-1.5 text-sm font-medium rounded-md text-center transition-all", mobileTab === 'editor' ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")}
          >
            Editor
          </button>
          <button
            onClick={() => setMobileTab('preview')}
            className={cn("flex-1 py-1.5 text-sm font-medium rounded-md text-center transition-all", mobileTab === 'preview' ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")}
          >
            Preview
          </button>
        </div>

        {/* Unified Sidebar for Projects and Pages */}
        {/* Desktop Sidebar */}
        <aside className="w-full lg:w-64 bg-slate-50 dark:bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 shrink-0 z-10 custom-scrollbar shadow-sm lg:shadow-none hidden lg:flex lg:flex-col">
          {/* Projects Section */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2 px-1">Projects Saved Locally</div>
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto custom-scrollbar">
              {projects.map(p => (
                <div 
                  key={p.id}
                  onClick={() => setActiveProjectId(p.id)}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors border group",
                    activeProjectId === p.id 
                      ? "bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-900 shadow-sm ring-1 ring-blue-500/10 dark:ring-blue-500/20" 
                      : "bg-transparent border-transparent hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                  )}
                >
                  <div className="flex items-center gap-2 overflow-hidden w-full pr-1">
                    <FolderOpen className={cn("w-4 h-4 shrink-0", activeProjectId === p.id ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500")} />
                    {activeProjectId === p.id ? (
                      <input 
                        type="text" 
                        value={p.name}
                        onChange={(e) => updateActiveProject({ name: e.target.value })}
                        className="bg-transparent border-none outline-none text-sm font-medium w-full text-blue-900 dark:text-blue-100 focus:ring-0 p-0"
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate">{p.name}</span>
                    )}
                  </div>
                  {projects.length > 1 && (
                    <button 
                      type="button"
                      onClick={(e) => deleteProject(p.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 dark:text-slate-500 z-20 relative hover:text-red-500 dark:hover:text-red-400 transition-all rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button 
              onClick={createProject}
              className="mt-2 w-full flex items-center justify-center gap-2 p-1.5 border border-dashed border-slate-300 dark:border-slate-700 rounded text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> New Project
            </button>
          </div>

          {/* Pages Section */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-3 flex items-center justify-between shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pages ({activeProject.pages.length})</span>
            </div>
            
            <div className="flex-1 overflow-x-auto lg:overflow-y-auto px-3 pb-3 gap-2 flex lg:flex-col custom-scrollbar">
              <AnimatePresence initial={false}>
                {activeProject.pages.map((p, idx) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    key={p.id} 
                    onClick={() => handleSelectPage(p.id)}
                    className={cn(
                      "relative group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors border min-w-[120px] lg:min-w-0 shrink-0",
                      activePageId === p.id 
                        ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm text-slate-900 dark:text-slate-100" 
                        : "bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate text-sm">
                      <FileText className={cn("w-4 h-4 shrink-0", activePageId === p.id ? "text-blue-500" : "text-slate-400")} />
                      <span className={cn("truncate", activePageId === p.id ? "font-semibold" : "font-medium")}>Page {idx + 1}</span>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex items-center absolute right-2 px-1 bg-white dark:bg-slate-800 transition-all rounded gap-0.5">
                      <button onClick={(e) => copyPageContent(p.content, e)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors hidden lg:block" title="Copy MD Source"><Copy className="w-3.5 h-3.5" /></button>
                      <button onClick={(e) => addPageAfter(p.id, e)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors hidden lg:block" title="Add After"><Plus className="w-3.5 h-3.5" /></button>
                      {idx > 0 && <button onClick={(e) => movePageUp(p.id, e)} className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors rounded hidden lg:block" title="Move Up"><ChevronUp className="w-3.5 h-3.5" /></button>}
                      {idx < activeProject.pages.length - 1 && <button onClick={(e) => movePageDown(p.id, e)} className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors rounded hidden lg:block" title="Move Down"><ChevronDown className="w-3.5 h-3.5" /></button>}
                      {activeProject.pages.length > 1 && (
                        <button 
                          onClick={(e) => deletePage(p.id, e)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors rounded hidden lg:block"
                          title="Delete Page"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <button 
                onClick={addPage}
                className="lg:mt-1 min-w-[120px] lg:min-w-0 shrink-0 flex items-center justify-center gap-2 p-2.5 border border-dashed border-slate-300 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add Page</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Editor Pane */}
        <section className={cn("w-full lg:w-[45%] xl:w-1/3 flex-col bg-white dark:bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 shrink-0 z-0 h-full lg:h-auto", mobileTab === 'editor' ? "flex" : "hidden lg:flex")}>
          <div className="h-10 px-4 bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm shrink-0 sticky top-0 z-10 w-full">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Markdown Source</span>
            <button
              onClick={() => {
                const ed = editorRef.current;
                if (ed) {
                  const selection = ed.getSelection();
                  const selectedText = ed.getModel()?.getValueInRange(selection);
                  setAiSelection(selectedText?.trim().length > 0 ? { text: selectedText, range: selection } : null);
                  setIsChatDrawerOpen(true);
                }
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-2 py-1 rounded transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" /> AI Chat
            </button>
          </div>
          <div className="flex-1 min-h-0 relative w-full">
            <Editor
              height="100%"
              language="markdown"
              theme={isDarkMode ? 'vs-dark' : 'vs-light'}
              value={editorContent}
              onChange={(value) => handleContentChange(value || '')}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                wordWrap: 'on',
                lineNumbers: 'off',
                folding: false,
                padding: { top: 24, bottom: 24 },
                fontSize: 14,
                fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                quickSuggestions: true,
                snippetSuggestions: 'inline',
                suggestOnTriggerCharacters: true
              }}
            />
          </div>
        </section>

        {/* Live Preview Pane */}
        <section className={cn("flex-1 flex-col relative bg-slate-100/80 dark:bg-black/50", mobileTab === 'preview' ? "flex" : "hidden lg:flex")}>
          <div className="h-10 px-4 bg-slate-50/50 dark:bg-slate-800/50 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-sm shrink-0 sticky top-0 z-10 w-full">
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">
              <span>{activeProject.pages.findIndex(p => p.id === activePageId) + 1} of {activeProject.pages.length} Pages • {activeProject.settings.paperFormat.toUpperCase()}</span>
            </div>
          </div>
          
          <div 
            ref={exportContainerRef}
            className="flex-1 overflow-auto p-6 lg:p-10 flex flex-col items-center custom-scrollbar gap-10 lg:gap-14 bg-slate-200 dark:bg-slate-950"
          >
            <AnimatePresence initial={false}>
              {activeProject.pages.map((p) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 50, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  transition={{ type: "spring", stiffness: 250, damping: 25 }}
                  key={p.id}
                  style={{ width: `${d.w * previewScale}px`, height: `${d.h * previewScale}px` }} 
                  className="shrink-0 relative group"
                >
                  <div 
                    id={`preview-page-${p.id}`}
                    onClick={() => handleSelectPage(p.id)}
                    className={cn(
                      "pdf-page-render shadow-md bg-clip-padding absolute top-0 left-0 transition-all duration-200 cursor-pointer overflow-hidden custom-prose-styling origin-top-left",
                      activePageId === p.id && !isGenerating ? "ring-4 ring-blue-500 shadow-xl" : "hover:ring-2 hover:ring-blue-300 opacity-90 hover:opacity-100",
                      BACKGROUNDS[activeProject.settings.theme].tw
                    )}
                    style={{ width: `${d.w}px`, height: `${d.h}px`, transform: `scale(${previewScale})` }}
                  >
                    <div 
                      className="w-full h-full overflow-hidden"
                      style={{ padding: `${activeProject.settings.padding}px` }}
                    >
                      <div className={cn("prose prose-sm", THEMES[activeProject.settings.theme])}>
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]} 
                          rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
                          components={markdownComponents}
                        >
                          {processMarkdown(p.content)}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* Chat Drawer Side Panel */}
        <AnimatePresence>
          {isChatDrawerOpen && (
            <motion.section
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 384, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 lg:static flex-col border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 z-50 lg:z-20 h-full flex"
            >
              <div className="w-80 lg:w-96 min-w-[320px] flex flex-col h-full bg-white dark:bg-slate-900">
                <div className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-indigo-50/50 dark:bg-indigo-900/20">
                  <div className="flex items-center gap-2 max-w-[60%]">
                    <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" /> 
                    <div className="relative group/select flex-1 min-w-0">
                      <select 
                        value={activeSessionId}
                        onChange={(e) => switchSession(e.target.value)}
                        className="w-full bg-transparent appearance-none font-semibold text-indigo-900 dark:text-indigo-100 cursor-pointer pr-6 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 rounded flex-1 truncate"
                      >
                        {projectSessions.map(s => (
                          <option key={s.id} value={s.id} className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
                            {s.name} ({s.messages.filter(m => m.role === 'user').length})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-indigo-400 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={createNewSession} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-md transition-colors" title="New Chat">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => {
                       if(window.confirm("Clear this chat history?")) {
                         deleteSession(activeSessionId, e);
                       }
                    }} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-md transition-colors" title="Delete Chat">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setIsChatDrawerOpen(false)} className="p-1.5 text-slate-500 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-md ml-1">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
                  {chatHistory.length === 0 && (
                     <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-6 opacity-70">
                        <MessageSquare className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-700" />
                        <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">How can I help?</h4>
                        <p className="text-sm">I can rewrite paragraphs, generate new pages, summarize content, or answer questions.</p>
                     </div>
                  )}

                  {chatHistory.map(msg => (
                    <div key={msg.id} className={cn("flex flex-col max-w-[85%]", msg.role === 'user' ? "self-end items-end" : "self-start items-start")}>
                      <div className={cn(
                        "p-3 rounded-2xl text-sm", 
                        msg.role === 'user' 
                          ? "bg-indigo-600 text-white rounded-tr-sm" 
                          : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm border border-slate-200 dark:border-slate-700"
                        )}
                      >
                         <div className="prose prose-sm prose-invert max-w-none">
                           <ReactMarkdown remarkPlugins={[remarkGfm]}>
                             {msg.content}
                           </ReactMarkdown>
                         </div>
                      </div>
                      {msg.role === 'user' && msg.contextPages && msg.contextPages.length > 0 && (
                        <span className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">
                          Context: {msg.contextPages.length} Pages {aiSelection ? "+ Selection" : ""}
                        </span>
                      )}
                    </div>
                  ))}
                  
                  {isAiLoading && (
                    <div className="self-start max-w-[85%] p-3 rounded-2xl rounded-tl-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Thinking...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-2 shrink-0">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-slate-500">Context</span>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          if (editorRef.current) {
                            const sel = editorRef.current.getSelection();
                            const text = editorRef.current.getModel().getValueInRange(sel);
                            if (text.trim()) setAiSelection({ text, range: sel });
                          }
                        }}
                        className="text-[10px] uppercase font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Get Selection
                      </button>
                      <button 
                        onClick={() => setChatContextPages(chatContextPages.length === activeProject.pages.length ? [] : activeProject.pages.map(p => p.id))} 
                        className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400"
                      >
                        {chatContextPages.length === activeProject.pages.length ? "Deselect All Pages" : "Select All Pages"}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                    {activeProject.pages.map((p, idx) => {
                      const isSelected = chatContextPages.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => {
                            if (isSelected) setChatContextPages(chatContextPages.filter(id => id !== p.id));
                            else setChatContextPages([...chatContextPages, p.id]);
                          }}
                          className={cn(
                            "shrink-0 flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-medium transition-colors",
                            isSelected 
                              ? "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700"
                          )}
                        >
                           {isSelected ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                           P{idx + 1}
                        </button>
                      );
                    })}
                  </div>
                  
                  {aiSelection && (
                    <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-lg border border-indigo-100 dark:border-indigo-800/50 relative group mx-1">
                      <span className="text-[11px] text-indigo-700 dark:text-indigo-300 truncate pr-6 italic font-mono flex-1">
                        "{aiSelection.text}"
                      </span>
                      <button onClick={() => setAiSelection(null)} className="absolute right-2 p-1 text-indigo-400 hover:text-indigo-600 rounded">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-end gap-2 mt-1">
                    <textarea
                      placeholder="Ask AI to modify pages, write new ones, etc."
                      className="flex-1 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none max-h-32 min-h-[44px]"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          executeAiPrompt();
                        }
                      }}
                      disabled={isAiLoading}
                      rows={1}
                    />
                    <button
                      onClick={executeAiPrompt}
                      disabled={isAiLoading || !aiPrompt.trim()}
                      className="p-3 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[200] flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="relative w-4/5 max-w-sm bg-slate-50 dark:bg-slate-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-left-full duration-200">
            <div className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-800">
              <span className="font-semibold text-slate-800 dark:text-slate-100">Menu</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Same Sidebar Content (Projects & Pages) */}
            <div className="flex-1 overflow-y-auto w-full">
              {/* Projects Section */}
              <div className="p-3 border-b border-slate-200">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2 px-1">Projects Saved Locally</div>
                <div className="flex flex-col gap-1 max-h-40 overflow-y-hidden custom-scrollbar">
                  {projects.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => setActiveProjectId(p.id)}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors border group",
                        activeProjectId === p.id 
                          ? "bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-800 shadow-sm ring-1 ring-blue-500/10" 
                          : "bg-transparent border-transparent hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                      )}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FolderOpen className={cn("w-4 h-4 shrink-0", activeProjectId === p.id ? "text-blue-600 dark:text-blue-400" : "text-slate-400")} />
                        {activeProjectId === p.id ? (
                          <input 
                            type="text" 
                            value={p.name}
                            onChange={(e) => updateActiveProject({ name: e.target.value })}
                            className="bg-transparent border-none outline-none text-sm font-medium w-full text-blue-900 dark:text-blue-100 focus:ring-0 p-0"
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate">{p.name}</span>
                        )}
                      </div>
                      {projects.length > 1 && (
                        <button 
                          type="button"
                          onClick={(e) => deleteProject(p.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 z-20 relative hover:text-red-500 transition-all rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button 
                  onClick={createProject}
                  className="mt-2 w-full flex items-center justify-center gap-2 p-1.5 border border-dashed border-slate-300 rounded text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors text-xs font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> New Project
                </button>
              </div>

              {/* Pages Section */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="px-4 py-3 flex items-center justify-between shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pages ({activeProject.pages.length})</span>
                </div>
                
                <div className="flex-1 px-3 pb-3 gap-2 flex flex-col custom-scrollbar">
                  {activeProject.pages.map((p, idx) => (
                    <div 
                      key={p.id} 
                      onClick={() => handleSelectPage(p.id)}
                      className={cn(
                        "relative group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors border shrink-0",
                        activePageId === p.id 
                          ? "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm text-slate-900 dark:text-slate-100" 
                          : "bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate text-sm">
                        <FileText className={cn("w-4 h-4 shrink-0", activePageId === p.id ? "text-blue-500" : "text-slate-400")} />
                        <span className={cn("truncate", activePageId === p.id ? "font-semibold" : "font-medium")}>Page {idx + 1}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 px-1 bg-white dark:bg-slate-800 rounded">
                        <button onClick={(e) => copyPageContent(p.content, e)} className="p-1.5 text-slate-400 hover:text-blue-500 rounded"><Copy className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => addPageAfter(p.id, e)} className="p-1.5 text-slate-400 hover:text-blue-500 rounded"><Plus className="w-3.5 h-3.5" /></button>
                        {idx > 0 && <button onClick={(e) => movePageUp(p.id, e)} className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded"><ChevronUp className="w-3.5 h-3.5" /></button>}
                        {idx < activeProject.pages.length - 1 && <button onClick={(e) => movePageDown(p.id, e)} className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded"><ChevronDown className="w-3.5 h-3.5" /></button>}
                        {activeProject.pages.length > 1 && (
                          <button 
                            onClick={(e) => deletePage(p.id, e)}
                            className="p-1.5 text-slate-400 hover:text-red-500 transition-all rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={addPage}
                    className="min-w-0 shrink-0 flex items-center justify-center gap-2 p-2.5 border border-dashed border-slate-300 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors mt-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Add Page</span>
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Native Browser Print Engine Payload */}
      <div className="hidden print:block w-full text-left bg-white p-0 m-0 border-none outline-none overflow-visible">
        {activeProject.pages.map((p, index) => {
          const format = activeProject.settings.paperFormat;
          const width = format === 'a4' ? '210mm' : '8.5in';
          const height = format === 'a4' ? '296.8mm' : (format === 'letter' ? '10.9in' : '13.9in');
          
          return (
            <div 
              key={p.id} 
              id={`print-page-${p.id}`}
              className={cn(
                 "print-page",
                 "custom-prose-styling",
                 BACKGROUNDS[activeProject.settings.theme].tw
              )}
              style={{ 
                 width: width,
                 height: height,
                 padding: `${activeProject.settings.padding}px`, 
                 breakAfter: index === activeProject.pages.length - 1 ? 'auto' : 'page',
                 boxSizing: 'border-box'
              }}
            >
              <div className={cn("prose prose-sm w-full max-w-none h-full", THEMES[activeProject.settings.theme])}>
                <ReactMarkdown 
                   remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]} 
                   rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
                   components={markdownComponents}
                >
                  {processMarkdown(p.content)}
                </ReactMarkdown>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
