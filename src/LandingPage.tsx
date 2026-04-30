import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  ArrowRight, 
  Layers, 
  Palette, 
  Download, 
  Github, 
  Linkedin, 
  CheckCircle2,
  Coffee,
  Heart,
  Sparkles,
  Star
} from 'lucide-react';

import { Link } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { Logo } from './components/Logo';

export function LandingPage() {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    fetch('https://api.github.com/repos/ayhamDev/MarkdownPDF')
      .then(res => res.json())
      .then(data => {
        if (data.stargazers_count !== undefined) {
          setStars(data.stargazers_count);
        }
      })
      .catch(err => console.error('Failed to fetch github stars', err));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 flex flex-col">
      <Helmet>
        <title>MarkdownPDF | Browser-Native Markdown to PDF</title>
        <meta name="description" content="A blazingly fast, privacy-first markdown renderer. Write with AI assistance and export directly to flawless vector PDFs in your browser." />
        <link rel="canonical" href="https://markdownpdf.pages.dev/" />
        <meta property="og:title" content="MarkdownPDF | Beautiful Markdown to PDF Converter" />
        <meta property="og:description" content="A blazingly fast, browser-native markdown renderer. Write with AI and export to vector PDFs." />
      </Helmet>

      {/* Navigation Layer */}
      <div className="absolute top-0 inset-x-0 p-4 md:p-6 z-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo className="w-8 h-8" />
          <span className="text-xl font-bold tracking-tight text-slate-800">
            Markdown<span className="text-blue-600">PDF</span>
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <a 
            href="https://github.com/ayhamDev/MarkdownPDF" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-sm font-medium transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            <Github className="w-4 h-4" />
            <span className="hidden sm:inline">Star on GitHub</span>
            {stars !== null && (
              <div className="flex items-center gap-1 bg-white/20 px-1.5 py-0.5 rounded text-xs ml-1 font-semibold">
                 <Star className="w-3 h-3 fill-current text-yellow-300" /> {stars}
              </div>
            )}
          </a>
          <a 
            href="https://ko-fi.com/ayhamdev" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-sm font-semibold transition-all shadow-sm shadow-amber-100 hover:shadow-md hover:-translate-y-0.5"
          >
            <Coffee className="w-4 h-4" />
            <span className="hidden sm:inline">Buy me a coffee</span>
          </a>
        </div>
      </div>

      {/* 1. Hero Section */}
      <main className="flex-1">
        <section className="relative pt-24 pb-32 overflow-hidden px-6 lg:px-8">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50" />
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-8 border border-blue-100">
              <Sparkles className="w-4 h-4" /> 
              <span>Markdown to PDF</span>
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-8 leading-[1.1]">
              Craft beautiful PDFs <br className="hidden lg:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                from simple markdown.
              </span>
            </h1>
            <p className="text-lg lg:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Write in a powerful Monaco editor, apply native styling hooks, customize typography, and export directly to flawless vector PDFs using your browser engine.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                to="/editor"
                className="group w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-lg transition-all shadow-lg shadow-blue-200 active:scale-95"
              >
                Start Writing
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a 
                href="#features"
                className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 hover:text-slate-900 font-medium text-lg rounded-xl transition-all shadow-sm border border-slate-200 hover:border-slate-300"
              >
                Learn More
              </a>
            </div>
          </div>
        </section>

        {/* 2. What It Is Section */}
        <section id="features" className="py-24 bg-white border-y border-slate-100">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="mb-16 max-w-3xl">
              <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 mb-4">
                What is this app?
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed">
                A blazingly fast, browser-native markdown renderer designed for creating highly-styled PDFs. It skips the heavy remote server compilation and relies directly on CSS `@page` orchestration for absolute document precision.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Layers,
                  title: 'Pro-level Editor',
                  desc: 'Integrated Monaco text engine with syntax highlighting, auto-completion, and native math equation formatting.',
                  color: 'bg-indigo-50 text-indigo-600 ring-indigo-100'
                },
                {
                  icon: Palette,
                  title: 'Aesthetic Themes',
                  desc: 'Deploy multiple structural themes (Brutalist, Ocean, Sleek, Rose) with natively-supported Google Fonts integration.',
                  color: 'bg-rose-50 text-rose-600 ring-rose-100'
                },
                {
                  icon: Download,
                  title: 'Vector Native Export',
                  desc: 'Bypasses canvas drawing. Sends literal DOM elements to the OS print spooler for infinite-resolution vector PDFs.',
                  color: 'bg-emerald-50 text-emerald-600 ring-emerald-100'
                }
              ].map((ftr, i) => (
                <div key={i} className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:shadow-md transition-shadow">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ring-1 ring-inset ${ftr.color}`}>
                    <ftr.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">{ftr.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{ftr.desc}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-16 bg-slate-900 rounded-3xl p-8 lg:p-12 text-center lg:text-left flex flex-col lg:flex-row items-center justify-between gap-8">
              <div>
                <h3 className="text-2xl font-bold text-white mb-2">Ready to create a document?</h3>
                <p className="text-slate-400">Everything is automatically saved to your local storage.</p>
              </div>
              <Link 
                to="/editor"
                className="shrink-0 px-8 py-3.5 bg-white text-slate-900 hover:bg-slate-50 rounded-xl font-medium transition-colors shadow-sm active:scale-95 flex items-center gap-2"
              >
                Launch App
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* 3. Credits Section */}
      <footer className="bg-slate-50 py-12 px-6 lg:px-8 border-t border-slate-200">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center gap-6">
          <div className="flex items-center gap-2 text-slate-700 font-medium tracking-tight">
            <span>Built by</span>
            <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">AyhamDev</span>
          </div>
          
          <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
            Crafted with modern React, Tailwind CSS, Monaco Editor, and pure browser-native PDF synthesis arrays.
          </p>

          <div className="flex items-center gap-4 mt-2">
            <a 
              href="http://github.com/ayhamDev" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-full transition-all"
              title="GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
            <a 
              href="https://linkedin.com/in/ayhamdev/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-all"
              title="Linkedin"
            >
              <Linkedin className="w-5 h-5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
