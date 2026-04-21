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
  Heart
} from 'lucide-react';
import { cn } from './lib/utils';
import { LandingPage } from './LandingPage';

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

export default function App() {
  const [isStarted, setIsStarted] = useState(false);

  if (!isStarted) {
    return <LandingPage onStart={() => setIsStarted(true)} />;
  }

  return <EditorApp />;
}

function EditorApp() {
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
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSelection, setAiSelection] = useState<{ text: string, range: any } | null>(null);
  
  const [showCoffeeModal, setShowCoffeeModal] = useState<{ show: boolean, intention: 'export' | 'project' | 'write' | 'manual', pendingFn?: () => void }>({ show: false, intention: 'manual' });
  const [keystrokeCount, setKeystrokeCount] = useState(0);

  const exportContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);

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
    let pageTypo = undefined;
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
        setIsAiModalOpen(true);
      }
    });
  };

  const executeAiPrompt = async () => {
    if (!aiPrompt.trim()) return;
    const finalKey = apiKey || process.env.GEMINI_API_KEY;
    if (!finalKey) {
      alert("Please provide a Gemini API Key in Document Settings first.");
      setIsAiModalOpen(false);
      setIsSettingsOpen(true);
      return;
    }

    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: finalKey });
      const fullContext = activePage?.content || '';
      const hasSelection = aiSelection !== null;

      let promptStr = `You are an expert AI Markdown copilot inside a document editor.\n\n`;
      promptStr += `Current Page Content:\n---\n${fullContext}\n---\n\n`;
      promptStr += `CRITICAL INSTRUCTION: You MUST use rich, stylized markdown formatting (headings, bold, lists, math) where appropriate for text. Handle the user's intent to either update the current text, create entirely new pages, or both.\n\n`;

      if (hasSelection) {
        promptStr += `The user has highlighted the following exact text for editing:\n"${aiSelection.text}"\n\n`;
        promptStr += `User Request: ${aiPrompt}\n\n`;
      } else {
        promptStr += `User Request: ${aiPrompt}\n\n`;
      }

      const configObj: any = {
        responseMimeType: 'application/json',
        responseSchema: {
          type: "object",
          properties: {
            updatedText: {
              type: "string",
              description: hasSelection 
                ? "The exact string replacement for ONLY the highlighted text. It should dynamically merge seamlessly. If the user didn't ask to modify the existing text at all, echo the highlighted text back identically."
                : "The exact complete updated markdown for the CURRENT page. If the user only wanted to create new pages and leave this one alone, echo the existing page content."
            },
            newPagesToCreate: {
              type: "array",
              description: "If the user requested to create new pages, provide the full structured markdown strings for each new page you want to generate.",
              items: { type: "string" }
            }
          },
          required: ["updatedText", "newPagesToCreate"]
        }
      };

      if (aiThinkingLevel && aiThinkingLevel !== 'none') {
        configObj.thinkingConfig = { thinkingLevel: aiThinkingLevel };
      }
      if (aiMaxTokens) {
        configObj.maxOutputTokens = aiMaxTokens;
      }

      const response = await ai.models.generateContent({
        model: aiModel || 'gemini-2.5-flash',
        contents: promptStr,
        config: configObj
      });

      const parsed = JSON.parse(response.text || '{}');
      let finalContent = fullContext;

      if (hasSelection && editorRef.current && parsed.updatedText) {
        editorRef.current.executeEdits('ai-assistant', [{
          range: aiSelection.range,
          text: parsed.updatedText,
          forceMoveMarkers: true
        }]);
        finalContent = editorRef.current.getValue();
      } else if (parsed.updatedText) {
        finalContent = parsed.updatedText;
      }

      let newPagesList = activeProject.pages.map(p => 
        p.id === activePageId ? { ...p, content: finalContent } : p
      );

      if (parsed.newPagesToCreate && parsed.newPagesToCreate.length > 0) {
        const createdPages = parsed.newPagesToCreate.map((content: string, i: number) => ({ 
          id: Date.now().toString() + i, 
          content 
        }));
        newPagesList = [...newPagesList, ...createdPages];
        
        updateActiveProject({ pages: newPagesList });
        handleSelectPage(createdPages[0].id);
      } else {
        updateActiveProject({ pages: newPagesList });
      }

      setIsAiModalOpen(false);
      setAiPrompt('');
    } catch (e: any) {
      console.error(e);
      alert("Error reaching Gemini AI: " + e.message);
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

  // Pre-process markdown for highlighting (==highlight== -> <mark>highlight</mark>)
  const processMarkdown = (text: string) => {
    return text.replace(/==([^=]+)==/g, '<mark>$1</mark>');
  };

  // Native PDF Export
  const downloadPDF = async () => {
    const executeExport = () => {
      setIsGenerating(true);
      // Give state a moment to clear interactive borders, then pop native print OS dialog
      setTimeout(() => {
        try {
          window.print();
        } catch (e) {
          console.error("Print restricted:", e);
        } finally {
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
        color: ${isDark(activeProject.settings.theme) ? '#f8fafc' : 'inherit'};
      }
      .custom-prose-styling .prose h1,
      .custom-prose-styling .prose h2,
      .custom-prose-styling .prose h3,
      .custom-prose-styling .prose h4 {
        font-family: inherit !important;
        color: ${isDark(activeProject.settings.theme) ? '#fff' : 'inherit'};
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

  return (
    <div 
      className="h-screen print:h-auto flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden print:overflow-visible print:block"
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" /> Document Settings
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/50 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-500">Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(THEMES).map((th) => (
                    <button
                      key={th}
                      onClick={() => updateSettings({ theme: th as Theme })}
                      className={cn(
                        "px-3 py-2 text-sm font-medium rounded-lg border text-left capitalize transition-all",
                        activeProject.settings.theme === th ? "bg-blue-50 border-blue-600 text-blue-800" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      {th}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 bg-slate-50 p-4 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <label className="text-xs font-semibold uppercase text-slate-500">Typography Tuning</label>
                  <div className="flex bg-slate-200/50 p-1 rounded-md">
                    <button 
                      onClick={() => setSettingsScope('global')}
                      className={cn("px-2 py-1 text-xs font-medium rounded transition-colors", settingsScope === 'global' ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >
                      Global
                    </button>
                    <button 
                      onClick={() => setSettingsScope('page')}
                      className={cn("px-2 py-1 text-xs font-medium rounded transition-colors", settingsScope === 'page' ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                    >
                      This Page
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-1.5 bg-slate-200/50 p-1 rounded-lg">
                  {['base', 'h1', 'h2', 'h3', 'p'].map(tag => (
                    <button 
                      key={tag}
                      onClick={() => setSelectedTag(tag as any)}
                      className={cn(
                        "py-1.5 text-xs font-medium rounded text-center transition-all uppercase tracking-wider",
                        selectedTag === tag ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 block">Font Family</label>
                    <select 
                      value={getStyleForTag(selectedTag).fontFamily || ''}
                      onChange={(e) => {
                        if (selectedTag === 'base') updateSettings({ fontFamily: e.target.value });
                        else updatePageSettings(selectedTag as ElementTag, { fontFamily: e.target.value });
                      }}
                      className="w-full border-slate-200 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white"
                    >
                      <option value="">Inherit / Default</option>
                      {FONTS.map(f => (
                        <option key={f.name} value={f.value}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 block w-full truncate" title="Size (px)">Size (px)</label>
                      <input 
                        type="number" min="8" max="72" step="1"
                        value={getStyleForTag(selectedTag).fontSize || ''}
                        onChange={(e) => {
                          if (selectedTag === 'base') updateSettings({ fontSize: parseInt(e.target.value) || 15 });
                          else updatePageSettings(selectedTag as ElementTag, { fontSize: parseInt(e.target.value) || undefined as any });
                        }}
                        className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm"
                        placeholder="Default"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 block w-full truncate" title="Height">Height</label>
                      <input 
                        type="number" min="1.0" max="3.0" step="0.1"
                        value={getStyleForTag(selectedTag).lineHeight || ''}
                        onChange={(e) => {
                          if (selectedTag === 'base') updateSettings({ lineHeight: parseFloat(e.target.value) || 1.6 });
                          else updatePageSettings(selectedTag as ElementTag, { lineHeight: parseFloat(e.target.value) || undefined as any });
                        }}
                        className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm"
                        placeholder="Default"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 block w-full truncate" title="Padding (px)">Padding</label>
                      <input 
                        type="number" min="0" max="100" step="2"
                        value={getStyleForTag(selectedTag).padding || ''}
                        onChange={(e) => {
                          if (selectedTag === 'base') updateSettings({ padding: parseInt(e.target.value) || 56 });
                          else updatePageSettings(selectedTag as ElementTag, { padding: parseInt(e.target.value) || undefined as any });
                        }}
                        className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm"
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
                        className="text-[10px] text-red-500 hover:text-red-700 uppercase font-bold"
                      >
                        Reset Tag
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-500">Layout</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Paper Format</label>
                    <select 
                      value={activeProject.settings.paperFormat}
                      onChange={(e) => updateSettings({ paperFormat: e.target.value as any })}
                      className="w-full border-slate-200 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="a4">A4 (210 × 297mm)</option>
                      <option value="letter">Letter (8.5 × 11in)</option>
                      <option value="legal">Legal (8.5 × 14in)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Padding ({activeProject.settings.padding}px)</label>
                    <input 
                      type="range" min="0" max="150" step="4"
                      value={activeProject.settings.padding}
                      onChange={(e) => updateSettings({ padding: parseInt(e.target.value) })}
                      className="w-full mt-2"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pb-6 bg-emerald-50/50 p-4 border border-emerald-100 rounded-xl">
                <label className="text-xs font-semibold uppercase text-slate-700 flex items-center gap-2 border-b border-emerald-200 pb-2">
                  <Bot className="w-4 h-4 text-emerald-600" /> AI Assistant Configuration
                </label>
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">API Key (Stored Locally)</label>
                    <input 
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Paste GEMINI_API_KEY here..."
                      className="w-full border-slate-200 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Model Name</label>
                    <input 
                      type="text"
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      placeholder="gemini-2.5-flash"
                      className="w-full border-slate-200 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 bg-white font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Thinking Mode</label>
                      <select 
                        value={aiThinkingLevel}
                        onChange={(e) => setAiThinkingLevel(e.target.value)}
                        className="w-full border-slate-200 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 bg-white"
                      >
                        <option value="none">Disabled</option>
                        <option value="LOW">Low</option>
                        <option value="HIGH">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block" title="Max Output Tokens">Token Budget</label>
                      <input 
                        type="number" min="100" max="64000" step="100"
                        value={aiMaxTokens || ''}
                        onChange={(e) => setAiMaxTokens(parseInt(e.target.value) || 8192)}
                        className="w-full border-slate-200 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Prompt Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-opacity p-4" onClick={() => !isAiLoading && setIsAiModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
              <h3 className="text-lg font-semibold text-indigo-900 flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-indigo-600" /> 
                {aiSelection ? 'Edit Highlighted Text' : 'AI Page Assistant'}
              </h3>
              <button disabled={isAiLoading} onClick={() => setIsAiModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/50 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              {aiSelection && (
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-sm text-slate-600 font-mono italic max-h-32 overflow-y-auto custom-scrollbar">
                  "{aiSelection.text}"
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                <p className="text-sm text-slate-600 font-medium">
                  {aiSelection ? 'How should AI modify this text?' : 'What do you want to write or change on this page?'}
                </p>
                <textarea
                  autoFocus
                  placeholder={aiSelection ? "e.g., 'Make it more professional', 'Summarize this in 3 bullets'" : "e.g., 'Write a comprehensive introduction chapter about quantum physics'"}
                  className="w-full border-slate-200 border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-none h-24 custom-scrollbar"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      executeAiPrompt();
                    }
                  }}
                  disabled={isAiLoading}
                />
              </div>

              <button
                onClick={executeAiPrompt}
                disabled={isAiLoading || !aiPrompt.trim()}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isAiLoading ? (
                  <><RefreshCw className="w-5 h-5 animate-spin" /> Thinking...</>
                ) : (
                  <><Wand2 className="w-5 h-5" /> Run AI Assistant</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coffee Support Modal */}
      {showCoffeeModal.show && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-opacity p-4" onClick={() => {
           if (showCoffeeModal.pendingFn) showCoffeeModal.pendingFn();
           setShowCoffeeModal({ show: false, intention: 'manual' });
        }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col text-center" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-amber-50/50 text-left">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Coffee className="w-5 h-5 text-amber-600" /> Support the Developer
              </h3>
              <button 
                onClick={() => {
                  if (showCoffeeModal.pendingFn) showCoffeeModal.pendingFn();
                  setShowCoffeeModal({ show: false, intention: 'manual' });
                }} 
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/50 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center">
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-amber-600 mb-4 border border-amber-200">
                <Coffee className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Enjoying the app?</h3>
              <p className="text-sm text-slate-600 leading-relaxed px-4 mb-6">
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
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-xl font-medium transition-all shadow-md shadow-amber-200 flex items-center justify-center gap-2 text-base"
                >
                  <Heart className="w-4 h-4" fill="currentColor" /> Buy me a coffee
                </a>
                <button 
                  onClick={() => {
                    if (showCoffeeModal.pendingFn) showCoffeeModal.pendingFn();
                    setShowCoffeeModal({ show: false, intention: 'manual' });
                  }}
                  className="w-full py-2.5 bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-700 rounded-xl font-medium transition-colors text-sm"
                >
                  {showCoffeeModal.intention === 'manual' ? 'Close' : 'No thanks, continue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="print:hidden h-14 px-4 sm:px-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 z-10 w-full relative">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 flex items-center justify-center font-bold text-lg bg-blue-600 rounded-lg text-white">
            M
          </div>
          <h1 className="text-lg font-bold tracking-tight text-slate-800 hidden sm:block">
            Markdown<span className="text-blue-600">PDF</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowCoffeeModal({ show: true, intention: 'manual' })}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 sm:px-3 py-1.5 rounded-full transition-colors border border-amber-200"
          >
            <Coffee className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Buy me a coffee</span>
          </button>
          
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
            title="Document Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          
          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block mx-1"></div>
          
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
        <div className="lg:hidden flex bg-slate-100 p-1.5 shrink-0 border-b border-slate-200 gap-1.5">
          <button
            onClick={() => setMobileTab('editor')}
            className={cn("flex-1 py-1.5 text-sm font-medium rounded-md text-center transition-all", mobileTab === 'editor' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            Editor
          </button>
          <button
            onClick={() => setMobileTab('preview')}
            className={cn("flex-1 py-1.5 text-sm font-medium rounded-md text-center transition-all", mobileTab === 'preview' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            Preview
          </button>
        </div>

        {/* Unified Sidebar for Projects and Pages */}
        {/* Desktop Sidebar */}
        <aside className="w-full lg:w-64 bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 shrink-0 z-10 custom-scrollbar shadow-sm lg:shadow-none hidden lg:flex lg:flex-col">
          {/* Projects Section */}
          <div className="p-3 border-b border-slate-200">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2 px-1">Projects Saved Locally</div>
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto custom-scrollbar">
              {projects.map(p => (
                <div 
                  key={p.id}
                  onClick={() => setActiveProjectId(p.id)}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors border group",
                    activeProjectId === p.id 
                      ? "bg-white border-blue-200 shadow-sm ring-1 ring-blue-500/10" 
                      : "bg-transparent border-transparent hover:bg-slate-200/50"
                  )}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FolderOpen className={cn("w-4 h-4 shrink-0", activeProjectId === p.id ? "text-blue-600" : "text-slate-400")} />
                    {activeProjectId === p.id ? (
                      <input 
                        type="text" 
                        value={p.name}
                        onChange={(e) => updateActiveProject({ name: e.target.value })}
                        className="bg-transparent border-none outline-none text-sm font-medium w-full text-blue-900 focus:ring-0 p-0"
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <span className="text-sm font-medium text-slate-600 truncate">{p.name}</span>
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
            
            <div className="flex-1 overflow-x-auto lg:overflow-y-auto px-3 pb-3 gap-2 flex lg:flex-col custom-scrollbar">
              {activeProject.pages.map((p, idx) => (
                <div 
                  key={p.id} 
                  onClick={() => handleSelectPage(p.id)}
                  className={cn(
                    "relative group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors border min-w-[120px] lg:min-w-0 shrink-0",
                    activePageId === p.id 
                      ? "bg-white border-slate-200 shadow-sm text-slate-900" 
                      : "bg-transparent border-transparent text-slate-500 hover:bg-slate-200/50"
                  )}
                >
                  <div className="flex items-center gap-2 truncate text-sm">
                    <FileText className={cn("w-4 h-4 shrink-0", activePageId === p.id ? "text-blue-500" : "text-slate-400")} />
                    <span className={cn("truncate", activePageId === p.id ? "font-semibold" : "font-medium")}>Page {idx + 1}</span>
                  </div>
                  {activeProject.pages.length > 1 && (
                    <button 
                      onClick={(e) => deletePage(p.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all rounded hidden lg:block"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
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
        <section className={cn("w-full lg:w-[45%] xl:w-1/3 flex-col bg-white border-b lg:border-b-0 lg:border-r border-slate-200 shrink-0 z-0 h-full lg:h-auto", mobileTab === 'editor' ? "flex" : "hidden lg:flex")}>
          <div className="h-10 px-4 bg-slate-50/50 backdrop-blur-md border-b border-slate-200 flex items-center justify-between shadow-sm shrink-0 sticky top-0 z-10 w-full">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Markdown Source</span>
            <button
              onClick={() => {
                const ed = editorRef.current;
                if (ed) {
                  const selection = ed.getSelection();
                  const selectedText = ed.getModel()?.getValueInRange(selection);
                  setAiSelection(selectedText?.trim().length > 0 ? { text: selectedText, range: selection } : null);
                  setIsAiModalOpen(true);
                }
              }}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
            >
              <Wand2 className="w-3.5 h-3.5" /> Ask AI
            </button>
          </div>
          <div className="flex-1 min-h-0 relative w-full">
            <Editor
              height="100%"
              language="markdown"
              theme="vs-light"
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
        <section className={cn("flex-1 flex-col relative bg-slate-100/80", mobileTab === 'preview' ? "flex" : "hidden lg:flex")}>
          <div className="h-10 px-4 bg-slate-50/50 backdrop-blur-md border-b border-slate-200 flex items-center justify-center shadow-sm shrink-0 sticky top-0 z-10 w-full">
            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium tracking-wide">
              <span>{activeProject.pages.findIndex(p => p.id === activePageId) + 1} of {activeProject.pages.length} Pages • {activeProject.settings.paperFormat.toUpperCase()}</span>
            </div>
          </div>
          
          <div 
            ref={exportContainerRef}
            className="flex-1 overflow-auto p-6 lg:p-10 flex flex-col items-center custom-scrollbar gap-10 lg:gap-14 bg-slate-200"
          >
            {activeProject.pages.map((p) => (
              <div 
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
                      >
                        {processMarkdown(p.content)}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[200] flex lg:hidden">
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <aside className="relative w-4/5 max-w-sm bg-slate-50 h-full shadow-2xl flex flex-col animate-in slide-in-from-left-full duration-200">
            <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white">
              <span className="font-semibold text-slate-800">Menu</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md">
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
                          ? "bg-white border-blue-200 shadow-sm ring-1 ring-blue-500/10" 
                          : "bg-transparent border-transparent hover:bg-slate-200/50"
                      )}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FolderOpen className={cn("w-4 h-4 shrink-0", activeProjectId === p.id ? "text-blue-600" : "text-slate-400")} />
                        {activeProjectId === p.id ? (
                          <input 
                            type="text" 
                            value={p.name}
                            onChange={(e) => updateActiveProject({ name: e.target.value })}
                            className="bg-transparent border-none outline-none text-sm font-medium w-full text-blue-900 focus:ring-0 p-0"
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <span className="text-sm font-medium text-slate-600 truncate">{p.name}</span>
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
                          ? "bg-white border-slate-200 shadow-sm text-slate-900" 
                          : "bg-transparent border-transparent text-slate-500 hover:bg-slate-200/50"
                      )}
                    >
                      <div className="flex items-center gap-2 truncate text-sm">
                        <FileText className={cn("w-4 h-4 shrink-0", activePageId === p.id ? "text-blue-500" : "text-slate-400")} />
                        <span className={cn("truncate", activePageId === p.id ? "font-semibold" : "font-medium")}>Page {idx + 1}</span>
                      </div>
                      {activeProject.pages.length > 1 && (
                        <button 
                          onClick={(e) => deletePage(p.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
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
      <div className="hidden print:block w-full text-left bg-transparent">
        {activeProject.pages.map((p, index) => (
          <div 
            key={p.id} 
            className={cn(
               "custom-prose-styling w-full w-max-[none]",
               THEMES[activeProject.settings.theme]
            )}
            style={{ 
               padding: `${activeProject.settings.padding}px`, 
               pageBreakAfter: index === activeProject.pages.length - 1 ? 'auto' : 'always',
               minHeight: '100vh',
               boxSizing: 'border-box'
            }}
          >
            <div className="prose prose-sm w-full max-w-none">
              <ReactMarkdown 
                 remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]} 
                 rehypePlugins={[rehypeRaw, rehypeHighlight, rehypeKatex]}
              >
                {processMarkdown(p.content)}
              </ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
