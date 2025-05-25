# Admiss.ia - Interactive Medical Education Platform

An intelligent educational platform designed for medical and life sciences curriculum with interactive course visualization and exercises, and AI based adaptive learning paths.

## Quick Start

```bash
# Install dependencies
npx pnpm install

# Start development server (Next.js + FastAPI)
npx pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## Features

- 🎯 **Interactive Curriculum Map** - Visual course progression with ReactFlow
- 🤖 **AI Systems** - Mistral AI (mistral-small-latest) + Weaviate RAG Database  
- 📱 **Responsive Design** - Modern UI with Tailwind CSS and smooth animations
- 🔄 **Adaptive Learning** - Personalized lesson paths based on Weaviate semantic search
- 📊 **Progress Tracking** - Iterative learning analytics and skill assessment

## Tech Stack

- **Frontend**: Next.js 13, React 18, TypeScript, Tailwind CSS
- **Backend**: FastAPI (Python), Uvicorn
- **AI Content**: Mistral AI (mistral-small-latest) + Weaviate Vector Database
- **Visualization**: ReactFlow for interactive course maps
- **UI Components**: Radix UI, Lucide React, Framer Motion
- **Deployment**: Vercel
- **Database**: Weaviate Cloud (Vector DB for semantic search)

## Architecture

The platform uses a sophisticated **Retrieval-Augmented Generation (RAG) + LLM queries** pipeline for lesson content generation:

### 🔍 **Semantic Search (Weaviate)**
- **Vector Database**: Weaviate Cloud with `text2vec-weaviate` vectorizer
- **Content Storage**: Medical education documents indexed by category, subcategory, and topic
- **Smart Retrieval**: Semantic search based on user context and curriculum alignment

### 🧠 **Content Generation (Mistral AI)**
- **Model**: `mistral-small-latest` for focused, technical content
- **Custom Prompts**: Academic program-aligned prompts for medical education
- **Output Format**: Structured JSON with lessons, questions, and learning objectives

### 🎯 **Adaptive Learning Flow**
1. **Context Analysis**: User level, weak concepts, and curriculum position
2. **Knowledge Retrieval**: Semantic search in Weaviate for relevant content  
3. **Content Generation**: Mistral AI creates personalized lessons with questions
4. **Progress Tracking**: Real-time adaptation based on learning outcomes

### 📚 **Content Structure**
- **Medical Collections**: Organized by UE (biochemistry, cell biology, biophysics, etc.)
- **Academic Alignment**: Semester-based curriculum mapping with difficulty levels
- **Quality Assurance**: Structured validation and fallback content generation


## Pipeline Overview
![RAG Pipeline Architecture](/ressources/pipeline_illustration.png)

## Project Structure

```
├── app/                   # Next.js App Router
│   ├── components/        # Custom React components
│   ├── lesson/           # Lesson content pages (with pre-generated data)
│   ├── exercise/         # Interactive exercise pages
│   └── og/               # Open Graph image generation
├── api/                   # FastAPI backend
│   ├── models/           # Pydantic data models
│   ├── utils/            # Backend utilities (Mistral, Weaviate services)
│   └── index.py          # Main FastAPI application
├── components/           # Shared UI components
│   ├── ui/              # Base UI components (Radix UI)
│   ├── chat.tsx         # Chat interface using Vercel AI SDK
│   ├── markdown.tsx     # Markdown rendering
│   └── multimodal-input.tsx  # Chat input with attachments
├── ressources/          # Educational content & data
│   ├── data/            # Pre-generated lesson JSON files
│   ├── program.json     # Medical curriculum structure (UE system)
│   └── exercise.json    # Exercise definitions
├── __tests__/           # Jest test files
├── scripts/             # Data generation and utility scripts
├── lib/                 # Shared utilities and schemas
├── hooks/               # Custom React hooks
├── public/              # Static assets
└── requirements.txt     # Python dependencies
```

## Contributors (team)
- Clément Castellon
- Dylan Mérigaud
- Matthieu Marchal
- Mikhail Biriuchinskii