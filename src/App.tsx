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
  Menu
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

export interface DocumentSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  padding: number;
  theme: Theme;
  paperFormat: 'a4' | 'letter' | 'legal';
}

export interface Page {
  id: string;
  content: string;
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'editor'|'preview'>('editor');
  const [previewScale, setPreviewScale] = useState(1);
  
  const exportContainerRef = useRef<HTMLDivElement>(null);

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

  const handleContentChange = (content: string) => {
    const updatedPages = activeProject.pages.map(p => 
      p.id === activePageId ? { ...p, content } : p
    );
    updateActiveProject({ pages: updatedPages });
  };

  // Projects
  const createProject = () => {
    const newId = Date.now().toString();
    const newProject: Project = {
      id: newId,
      name: `Project ${projects.length + 1}`,
      pages: [{ id: '1', content: '# New Project' }],
      settings: DEFAULT_SETTINGS,
      updatedAt: Date.now(),
      createdAt: Date.now()
    };
    setProjects([...projects, newProject]);
    setActiveProjectId(newId);
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

  const isDark = (theme: Theme) => DARK_THEMES.includes(theme);

  return (
    <div 
      className="h-screen print:h-auto flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden print:overflow-visible print:block"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={handleDrop}
    >
      <style>{`
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
          /* Ensure explicit text color prints even against background engine stripped contexts */
          .prose {
             color: ${isDark(activeProject.settings.theme) ? '#f8fafc' : '#1e293b'} !important;
          }
        }
      `}</style>

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

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-500">Typography Settings</label>
                <select 
                  value={activeProject.settings.fontFamily}
                  onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                  className="w-full border-slate-200 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 appearance-none bg-white"
                >
                  {FONTS.map(f => (
                    <option key={f.name} value={f.value}>{f.name}</option>
                  ))}
                </select>
                
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Font Size ({activeProject.settings.fontSize}px)</label>
                    <input 
                      type="range" min="10" max="28" step="1"
                      value={activeProject.settings.fontSize}
                      onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Line Height ({activeProject.settings.lineHeight})</label>
                    <input 
                      type="range" min="1.0" max="2.5" step="0.1"
                      value={activeProject.settings.lineHeight}
                      onChange={(e) => updateSettings({ lineHeight: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
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

        <div className="flex items-center gap-3">
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
          <Editor
            height="100%"
            language="markdown"
            theme="vs-light"
            value={editorContent}
            onChange={(value) => handleContentChange(value || '')}
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
