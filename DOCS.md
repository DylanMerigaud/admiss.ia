# Admiss.ia - Complete Platform Documentation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [API Documentation](#api-documentation)
3. [AI Pipeline Documentation](#ai-pipeline-documentation)
4. [Frontend Components](#frontend-components)
5. [Data Models](#data-models)
6. [Development Guide](#development-guide)
7. [Deployment](#deployment)

---

## Architecture Overview

Admiss.ia is a sophisticated AI-powered medical education platform that combines interactive visualization with adaptive learning through a RAG (Retrieval-Augmented Generation) pipeline.

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   AI Services   │
│   (Next.js)     │───▶│   (FastAPI)     │───▶│   Mistral AI    │
│                 │    │                 │    │   + Weaviate    │
│ • ReactFlow     │    │ • RESTful API   │    │                 │
│ • Interactive   │    │ • CORS enabled  │    │ • RAG Pipeline  │
│ • Progress      │    │ • Async/await   │    │ • Vector Search │
│   tracking      │    │ • Error handling│    │ • Content Gen   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Technologies

- **Frontend**: Next.js 13 with App Router, React 18, TypeScript, Tailwind CSS
- **Visualization**: ReactFlow for interactive curriculum maps
- **Backend**: FastAPI with async Python, Uvicorn server
- **AI Content**: Mistral AI (`mistral-small-latest`) for lesson generation
- **Vector Database**: Weaviate Cloud for semantic search and RAG
- **UI Components**: Radix UI primitives with custom styling

---

## API Documentation

### Base URL
- **Development**: `http://localhost:8000`
- **Production**: Set via `NEXT_PUBLIC_API_URL` environment variable

### Authentication
Currently uses API keys for external services (Mistral AI, Weaviate). No user authentication implemented.

### Endpoints

#### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "medical-ai-education"
}
```

#### Create Adaptive Lesson
```http
POST /api/lessons/create
```

**Request Body:**
```json
{
  "topic": "Heart Anatomy",
  "user_context": {
    "user_id": "user123",
    "current_level": "intermediate",
    "concept_mastery": {},
    "weak_concepts": ["cardiovascular physiology"],
    "learning_velocity": 0.8,
    "error_patterns": [],
    "learning_style": "visual"
  }
}
```

**Response:**
```json
{
  "success": true,
  "lesson": {
    "lesson_id": "lesson_heart_anatomy_20250525",
    "topic": "Heart Anatomy",
    "category": "UE 2 - Histology, Embryology, Anatomy",
    "subcategory": "Cardiovascular System",
    "lesson_content": "**Heart Anatomy**\n\n**Definition:**\n...",
    "learning_objectives": ["Define cardiac chambers", "..."],
    "difficulty_level": "intermediate",
    "created_at": "2025-05-25T10:30:00Z"
  },
  "exercise": {
    "exercise_id": "ex_heart_anatomy_20250525",
    "topic": "Heart Anatomy",
    "difficulty_level": "intermediate",
    "target_concepts": ["heart chambers", "cardiac circulation"],
    "created_at": "2025-05-25T10:30:00Z"
  },
  "questions": [
    {
      "question_id": "q1_heart_anatomy",
      "text": "What are the four chambers of the heart?",
      "category": "UE 2 - Histology, Embryology, Anatomy",
      "subcategory": "Cardiovascular System",
      "topic": "Heart Anatomy",
      "difficulty": "intermediate",
      "options": [
        {"id": "a", "text": "Left atrium, right atrium, left ventricle, right ventricle"},
        {"id": "b", "text": "Upper heart, lower heart, left side, right side"},
        {"id": "c", "text": "Aorta, vena cava, pulmonary artery, pulmonary vein"},
        {"id": "d", "text": "Systolic chamber, diastolic chamber, arterial chamber, venous chamber"}
      ],
      "correct_answer": "a",
      "explanation": "The heart has four chambers: two atria (upper chambers) and two ventricles (lower chambers)."
    }
  ]
}
```

#### Get Lesson by Topic
```http
GET /api/lessons/{topic}
```

**Example:**
```http
GET /api/lessons/Heart_Anatomy
```

Returns the same format as the create endpoint, using default user context.

#### Generate Precise Lesson
```http
GET /api/lessons/generate?topic=Heart_Anatomy&category=UE_2&subcategory=Cardiovascular_System
```

**Parameters:**
- `topic`: Specific medical topic
- `category`: Academic category (e.g., "UE 1 - Biochemistry")
- `subcategory`: Academic subcategory (e.g., "Organic Chemistry")

#### Chat Interface
```http
POST /api/chat
```

**Request Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Explain cardiac output calculation"
    }
  ]
}
```

**Response:** Streaming response with OpenAI-compatible format.

---

## AI Pipeline Documentation

### RAG Pipeline Architecture

The Admiss.ia platform uses a sophisticated Retrieval-Augmented Generation pipeline:

```
User Query → Weaviate Search → Content Retrieval → Mistral Generation → Structured Response
```

### 1. Weaviate Service (`WeaviateService`)

**Purpose**: Semantic search and content retrieval from medical knowledge base

**Key Features:**
- Connects to Weaviate Cloud with `text2vec-weaviate` vectorizer
- Maintains `MedistralDocument` collection for medical content
- Performs semantic search with context-aware queries
- Handles v4 Weaviate API compatibility

**Search Process:**
```python
# Enhanced search with academic context
search_terms = [
    topic,                          # e.g., "Heart Anatomy"
    topic_mapping.category,         # e.g., "UE 2 - Anatomy"
    topic_mapping.subcategory,      # e.g., "Cardiovascular System"
    "medical education",
    *user_context.weak_concepts,    # User's weak areas
    *related_topics                 # Related curriculum topics
]

# Semantic search with scoring
response = collection.query.near_text(
    query=" ".join(search_terms),
    limit=15,
    return_metadata=MetadataQuery(score=True)
)
```

**Document Structure:**
```json
{
  "title": "Cardiac Physiology Overview",
  "content": "Detailed medical content...",
  "category": "UE 2 - Histology, Embryology, Anatomy",
  "subcategory": "Cardiovascular System",
  "topic": "Heart Anatomy",
  "difficulty": "intermediate",
  "semester": 1,
  "medical_domain": "cardiology",
  "mistral_concepts": ["cardiac chambers", "blood flow"]
}
```

### 2. Mistral Service (`MistralService`)

**Purpose**: Generate structured, concise medical education content

**Model**: `mistral-small-latest` with optimized parameters:
- **Temperature**: 0.3 (focused, consistent output)
- **Max Tokens**: 2500 (sufficient for detailed lessons)
- **Response Format**: JSON object (structured data)

**Content Generation Process:**

1. **Context Building**: Combines user context, retrieved content, and academic mapping
2. **Prompt Engineering**: Uses medical education-specific prompts
3. **Structured Output**: Returns JSON with lessons, questions, and metadata
4. **Fallback Handling**: Graceful degradation when API fails

**Prompt Structure:**
```
You are a medical education AI. Create a concise, technical lesson overview.

TOPIC: {topic}
CATEGORY: {academic_category}
STUDENT LEVEL: {user_level}
WEAK AREAS: {user_weak_concepts}
MEDICAL CONTENT: {retrieved_content}

Return EXACTLY this JSON format:
{
  "lesson_content": "**Topic**\n\n**Definition:**\n...",
  "target_concepts": [...],
  "questions": [...],
  "learning_objectives": [...],
  "academic_context": {...}
}
```

### 3. Content Adaptation

**User Context Integration:**
- **Level Adaptation**: Adjusts complexity based on user's current level
- **Weak Concept Focus**: Emphasizes areas where user struggles
- **Learning Style**: Adapts presentation (visual, text-based, etc.)
- **Velocity Matching**: Adjusts content depth based on learning speed

**Academic Program Alignment:**
- **Curriculum Mapping**: Aligns with French medical education (UE system)
- **Semester Progression**: Respects academic timeline
- **Concept Dependencies**: Ensures prerequisite knowledge
- **Assessment Standards**: Matches expected learning outcomes

---

## Frontend Components

### Core Application (`app/page.tsx`)

The main page implements an interactive curriculum visualization using ReactFlow.

**Key Features:**
- **Dynamic Node Generation**: Creates category, subcategory, and topic nodes
- **Expansion Logic**: Hierarchical expansion with automatic sibling closure
- **Progress Tracking**: Visual progress indicators for each skill
- **Responsive Layout**: Intelligent positioning algorithm for node placement

**Component Hierarchy:**
```
HomePage
├── ProgressProvider (Context)
├── AnimatedBackground
├── FloatingStats
└── ReactFlow
    ├── CategoryNode (UE levels)
    ├── SubcategoryNode (Subject areas)
    └── TopicNode (Specific topics)
```

### Node Components

#### CategoryNode (`app/components/CategoryNode.tsx`)
- Represents UE (Unité d'Enseignement) level categories
- Expandable with smooth animations
- Shows aggregate progress across subcategories
- Dimensions: 300×140px

#### SubcategoryNode (`app/components/SubcategoryNode.tsx`)
- Represents subject areas within UEs
- Displays specific subject progress
- Connects categories to individual topics
- Dimensions: 250×110px

#### TopicNode (`app/components/TopicNode.tsx`)
- Individual learning topics
- Direct lesson access
- Detailed progress tracking
- Interactive skill updates
- Dimensions: 200×90px

### Layout Algorithm

**Intelligent Positioning:**
```typescript
// Consistent spacing between node levels
const horizontalGap = 150;  // Level separation
const verticalGap = 20;     // Sibling separation
const categoryGap = 75;     // Category separation

// Center-aligned children positioning
const totalSpaceNeeded = (childCount - 1) * verticalGap + 
                         childCount * nodeHeight;
const startOffset = -(totalSpaceNeeded / 2);

// Position each child symmetrically around parent center
for (let i = 0; i < childCount; i++) {
  const yPosition = startOffset + (i + 1) * nodeHeight + i * verticalGap;
  childPositions.push(yPosition);
}
```

### State Management

**Progress Context:**
```typescript
interface SkillProgress {
  [skillId: string]: {
    level: number;           // 0-100 completion percentage
    status: "locked" | "available" | "in-progress" | "completed" | "mastered";
    timeSpent: number;       // Minutes spent on topic
    lastAccessed: Date | null;
  };
}
```

**Expansion State:**
```typescript
const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

// Toggle with sibling closure logic
const toggleNode = (nodeId: string) => {
  // Close siblings of same level
  // Expand/collapse target node
  // Update all child visibility
};
```

---

## Data Models

### Core Models (`api/models/lesson_models.py`)

#### UserContext
```python
class UserContext(BaseModel):
    user_id: str
    current_level: str = "intermediate"          # beginner, intermediate, advanced
    concept_mastery: Dict[str, float] = {}       # skill_id -> mastery_score
    weak_concepts: List[str] = []                # Areas needing focus
    learning_velocity: float = 0.8               # Learning speed multiplier
    error_patterns: List[str] = []               # Common mistake patterns
    learning_style: str = "mixed"                # visual, auditory, kinesthetic
```

#### Question
```python
class Question(BaseModel):
    question_id: str                             # Unique identifier
    text: str                                    # Question content
    category: str                                # Academic category (UE)
    subcategory: str                            # Subject area
    topic: str                                  # Specific topic
    difficulty: str                             # beginner, intermediate, advanced
    options: List[Dict[str, str]]               # Multiple choice options
    correct_answer: str                         # Correct option ID
    explanation: str                            # Detailed explanation
```

#### Lesson
```python
class Lesson(BaseModel):
    lesson_id: str                              # Unique identifier
    topic: str                                  # Lesson topic
    category: str                               # Academic category
    subcategory: str                           # Subject area
    lesson_content: str                        # Markdown content
    learning_objectives: List[str]             # Learning goals
    exercise_id: str                           # Associated exercise
    difficulty_level: str                      # Content difficulty
    semester: int                              # Academic semester (1 or 2)
    generated_by: str                          # Generation method
    created_at: str                            # ISO timestamp
```

### Program Structure (`ressources/program.json`)

The curriculum follows the French medical education structure:

```json
[
  {
    "name": "UE 1 - Biochemistry",
    "semester": 1,
    "subcategories": [
      {
        "name": "Organic Chemistry",
        "topics": [
          "Alkanes, Alkenes, Alcohols, Amines, Aldehydes, Ketones, Acids",
          "Amino Acids",
          "Peptides, Proteins"
        ]
      },
      {
        "name": "Physical Chemistry", 
        "topics": [
          "The Atom",
          "Molecular Orbitals",
          "Covalent Bonds, Non-Covalent Bonds"
        ]
      }
    ]
  }
]
```

---

## Development Guide

### Prerequisites

- **Node.js**: 18.0+ (for Next.js 13)
- **Python**: 3.9+ (for FastAPI)
- **pnpm**: Package manager (recommended)

### Environment Setup

1. **Clone Repository:**
```bash
git clone <repository-url>
cd admiss.ia
```

2. **Install Dependencies:**
```bash
# Frontend dependencies
npx pnpm install

# Backend dependencies (if using virtual environment)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Environment Variables:**

Create `.env.local`:
```env
# Mistral AI Configuration
MISTRAL_API_KEY=your_mistral_api_key_here

# Weaviate Configuration  
WEAVIATE_URL=https://your-cluster.weaviate.network
WEAVIATE_API_KEY=your_weaviate_api_key_here

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Development Workflow

1. **Start Development Servers:**
```bash
# Start both frontend and backend
npx pnpm dev

# Or start separately:
# Frontend (port 3000)
npx next dev

# Backend (port 8000) 
uvicorn api.index:app --reload --host 0.0.0.0 --port 8000
```

2. **Access Applications:**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs (Swagger UI)

### Testing

```bash
# Run frontend tests
npm run test

# Run specific test files
npm run test -- __tests__/expansionLogic.test.tsx

# Run backend tests  
python -m pytest tests/
```

### Code Style

**Frontend (TypeScript/React):**
- Use TypeScript strict mode
- Follow React hooks patterns
- Implement proper error boundaries
- Use Tailwind for styling

**Backend (Python):**
- Follow PEP 8 style guidelines
- Use type hints with Pydantic models
- Implement async/await patterns
- Handle exceptions gracefully

### API Integration Testing

Test the RAG pipeline:
```bash
# Test lesson generation
curl -X POST "http://localhost:8000/api/lessons/create" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Heart Anatomy",
    "user_context": {
      "user_id": "test_user",
      "current_level": "intermediate",
      "weak_concepts": ["cardiovascular physiology"]
    }
  }'

# Test topic-based retrieval
curl "http://localhost:8000/api/lessons/Heart_Anatomy"
```

---

## Deployment

### Vercel Deployment (Recommended)

1. **Configure `vercel.json`:**
```json
{
  "builds": [
    {
      "src": "api/index.py",
      "use": "@vercel/python"
    },
    {
      "src": "package.json", 
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.py"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

2. **Environment Variables:**
Set in Vercel dashboard:
- `MISTRAL_API_KEY`
- `WEAVIATE_URL` 
- `WEAVIATE_API_KEY`
- `NEXT_PUBLIC_API_URL` (production URL)

3. **Deploy:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Alternative Deployment Options

**Docker Deployment:**
```dockerfile
FROM node:18-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM python:3.9-slim AS backend
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY api/ ./api/

# Multi-stage production image
FROM nginx:alpine
COPY --from=frontend /app/out /usr/share/nginx/html
COPY --from=backend /app /app
```

**Traditional Server Deployment:**
```bash
# Build frontend
npm run build

# Start production servers
pm2 start ecosystem.config.js

# Or with systemd services
sudo systemctl start admiss-frontend
sudo systemctl start admiss-backend
```

### Production Considerations

**Performance:**
- Enable gzip compression
- Configure CDN for static assets
- Implement request rate limiting
- Use database connection pooling

**Security:**
- Validate all API inputs
- Implement CORS properly
- Use HTTPS everywhere
- Secure API keys in environment

**Monitoring:**
- Set up application logging
- Monitor API response times
- Track lesson generation metrics
- Implement health checks

**Scaling:**
- Consider Redis for session storage
- Implement database read replicas
- Use load balancers for API
- Cache frequently accessed lessons

---

## Contributing

### Project Structure
```
├── app/                   # Next.js App Router pages
├── api/                   # FastAPI backend
│   ├── models/           # Pydantic data models
│   └── utils/            # Services (Mistral, Weaviate)
├── components/           # Shared React components
├── ressources/          # Static data and curriculum
├── scripts/             # Utility scripts
└── tests/              # Test files
```

### Development Guidelines

1. **API Changes**: Update both implementation and documentation
2. **Frontend Changes**: Ensure responsive design and accessibility
3. **AI Pipeline**: Test with various medical topics and user contexts
4. **Data Models**: Maintain backward compatibility when possible

### Reporting Issues

Include in bug reports:
- Environment details (Node.js, Python versions)
- Steps to reproduce
- Expected vs actual behavior  
- Error logs (frontend console, backend logs)
- API request/response examples

---
