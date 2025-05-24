"""
Weaviate-based Lesson Generation Service for Medical Education AI

This module handles the creation of adaptive, personalized lessons using Weaviate's
RAG (Retrieval Augmented Generation) capabilities as specified in the pipeline documentation.

References:
- Weaviate Quickstart: https://weaviate.io/developers/weaviate/quickstart
- Pipeline Documentation: docs/pipeline.md
- Mistral API: https://docs.mistral.ai/api/
"""

import json
import os
import datetime
import aiohttp
import asyncio
from typing import List, Dict, Optional
import weaviate
from weaviate.classes.init import Auth
from weaviate.classes.query import MetadataQuery
from pydantic import BaseModel

# =============================================================================
# MODELS
# =============================================================================

class UserContext(BaseModel):
    """User context for personalized lesson generation"""
    user_id: str
    current_level: str = "intermediate"
    concept_mastery: Dict[str, float] = {}
    weak_concepts: List[str] = []
    learning_velocity: float = 0.8
    error_patterns: List[str] = []
    learning_style: str = "mixed"

class Question(BaseModel):
    """QCM Question model - aligned with minimal data structure"""
    question_id: str
    text: str
    category: str
    subcategory: str
    topic: str
    difficulty: str
    options: List[Dict[str, str]]
    correct_answer: str
    explanation: str

class Lesson(BaseModel):
    """Generated lesson entity - from minimal data structure"""
    lesson_id: str
    topic: str
    category: str
    subcategory: str
    lesson_content: str
    learning_objectives: List[str]
    exercise_id: str
    difficulty_level: str
    generated_by: str = "weaviate_rag_pipeline"
    created_at: str

class Exercise(BaseModel):
    """Exercise entity - groups questions"""
    exercise_id: str
    lesson_id: str
    topic: str
    question_ids: List[str]
    difficulty_level: str
    target_concepts: List[str]
    created_at: str

class LessonResponse(BaseModel):
    """Complete lesson response with lesson, exercise, and questions"""
    lesson: Lesson
    exercise: Exercise
    questions: List[Question]

class LessonRequest(BaseModel):
    """Request model for lesson creation"""
    topic: str
    user_context: UserContext

# =============================================================================
# WEAVIATE RAG SERVICE
# =============================================================================

class WeaviateLessonService:
    """
    Weaviate-based lesson generation service using RAG pipeline
    
    This service implements the exact pipeline from pipeline.md:
    1. RAG Model → Content Generation using Weaviate vector database
    2. Semantic search through medical knowledge base
    3. LLM generation through Weaviate's integrated model providers
    4. Personalization using user context
    """
    
    def __init__(self):
        """Initialize Weaviate client connection"""
        self.client = self._connect_to_weaviate()
        self.use_external_generation = False  # Flag for fallback to external API
        self._ensure_medical_schema()
    
    def _connect_to_weaviate(self):
        """
        Connect to Weaviate Cloud instance
        Following: https://weaviate.io/developers/weaviate/quickstart
        """
        weaviate_url = os.environ.get("WEAVIATE_URL")
        weaviate_api_key = os.environ.get("WEAVIATE_API_KEY")
        mistral_api_key = os.environ.get("MISTRAL_API_KEY")
        
        if not weaviate_url or not weaviate_api_key:
            raise ValueError(
                "Missing Weaviate credentials. Please set WEAVIATE_URL and WEAVIATE_API_KEY environment variables."
            )
        
        try:
            # Create headers dict for API keys
            headers = {}
            if mistral_api_key:
                headers["X-Mistral-Api-Key"] = mistral_api_key
            
            client = weaviate.connect_to_weaviate_cloud(
                cluster_url=weaviate_url,
                auth_credentials=Auth.api_key(weaviate_api_key),
                headers=headers  # Add Mistral API key header
            )
            
            # Verify connection
            if not client.is_ready():
                raise ConnectionError("Failed to connect to Weaviate instance")
                
            return client
            
        except Exception as e:
            raise ConnectionError(f"Weaviate connection failed: {e}")
    
    def _ensure_medical_schema(self):
        """
        Ensure the MedistralDocument collection exists in Weaviate
        This represents the medical knowledge base from pipeline.md
        """
        try:
            # Check if collection exists - fix the name attribute access
            collections = self.client.collections.list_all()
            
            # Handle different ways the collections might be returned
            collection_names = []
            if hasattr(collections, '__iter__'):
                for col in collections:
                    if hasattr(col, 'name'):
                        collection_names.append(col.name)
                    elif isinstance(col, str):
                        collection_names.append(col)
                    else:
                        collection_names.append(str(col))
            
            if "MedistralDocument" not in collection_names:
                
                # Create medical content collection with Mistral generative config
                try:
                    self.client.collections.create(
                        name="MedistralDocument",
                        description="Medical education content for RAG pipeline",
                        vectorizer_config=weaviate.classes.config.Configure.Vectorizer.text2vec_weaviate(),
                        generative_config=weaviate.classes.config.Configure.Generative.mistral(),  # Use Mistral instead of Cohere
                        properties=[
                            weaviate.classes.config.Property(
                                name="title",
                                data_type=weaviate.classes.config.DataType.TEXT,
                                description="Content title"
                            ),
                            weaviate.classes.config.Property(
                                name="content", 
                                data_type=weaviate.classes.config.DataType.TEXT,
                                description="Educational content text"
                            ),
                            weaviate.classes.config.Property(
                                name="category",
                                data_type=weaviate.classes.config.DataType.TEXT,
                                description="Main category (e.g., Basic Sciences, Medical Sciences)"
                            ),
                            weaviate.classes.config.Property(
                                name="subcategory",
                                data_type=weaviate.classes.config.DataType.TEXT,
                                description="Subcategory (e.g., General Chemistry, Clinical Practice)"
                            ),
                            weaviate.classes.config.Property(
                                name="topic",
                                data_type=weaviate.classes.config.DataType.TEXT,
                                description="Specific topic (e.g., atomic_structure, cardiology)"
                            ),
                            weaviate.classes.config.Property(
                                name="difficulty",
                                data_type=weaviate.classes.config.DataType.TEXT,
                                description="Content difficulty level"
                            )
                        ]
                    )
                except Exception as create_error:
                    print(f"Could not create collection: {create_error}")
                    print("Continuing with existing collections...")
            else:
                # Collection exists, check if it has generative config
                try:
                    collection = self.client.collections.get("MedistralDocument")
                    config = collection.config.get()
                    
                    if not config.generative_config:
                        print("⚠️ Collection exists but lacks generative config")
                        print("🔧 Will use external API for generation instead of Weaviate built-in")
                        self.use_external_generation = True
                    else:
                        self.use_external_generation = False
                        print("✅ Collection has generative config enabled")
                        
                except Exception as config_error:
                    print(f"⚠️ Could not check generative config: {config_error}")
                    self.use_external_generation = True
                
        except Exception as e:
            print(f"Warning: Could not verify/create schema: {e}")
            self.use_external_generation = True
    
    async def create_lesson(self, topic: str, user_context: UserContext) -> LessonResponse:
        """
        Create adaptive lesson using Weaviate RAG pipeline
        
        This implements the exact workflow from pipeline.md:
        1. RAG Retrieval - Semantic search through medical knowledge
        2. LLM Generation - Use Weaviate's integrated generation
        3. Personalized content adaptation
        
        Args:
            topic: Medical topic to create lesson for
            user_context: User's learning profile for personalization
            
        Returns:
            LessonResponse: Complete lesson with RAG-generated content
        """
        
        # Step 1: RAG Retrieval - Semantic search through medical knowledge
        relevant_content = await self._search_medical_knowledge(topic, user_context)
        # Step 2: LLM Generation - Use Weaviate's integrated generation
        lesson_data = await self._generate_lesson_content(topic, user_context, relevant_content)
        
        # Step 3: Structure response
        return self._structure_lesson_response(lesson_data, topic, user_context)
    
    async def _search_medical_knowledge(self, topic: str, user_context: UserContext) -> List[Dict]:
        """
        Perform semantic search using Weaviate's vector database
        """
        try:
            collection = self.client.collections.get("MedistralDocument")
            
            # Build search query with user context
            search_query = f"{topic} {' '.join(user_context.weak_concepts)}"
            
            # Semantic search
            response = collection.query.near_text(
                query=search_query,
                limit=10,
                return_metadata=MetadataQuery(score=True)
            )
            
            # Extract relevant content
            relevant_docs = []
            for obj in response.objects:
                relevant_docs.append({
                    "title": obj.properties.get("title", ""),
                    "content": obj.properties.get("content", ""), 
                    "category": obj.properties.get("category", "Medical Sciences"),
                    "subcategory": obj.properties.get("subcategory", "General"),
                    "topic": obj.properties.get("topic", topic),
                    "difficulty": obj.properties.get("difficulty", user_context.current_level),
                    "score": obj.metadata.score if obj.metadata else 0
                })
                
            print(f"🔍 Found {len(relevant_docs)} relevant documents for '{topic}'")
            return relevant_docs
            
        except Exception as e:
            print(f"❌ Search error: {e}")
            return []
    
    async def _generate_lesson_content(self, topic: str, user_context: UserContext, relevant_content: List[Dict]) -> Dict:
        """
        Generate lesson content using Mistral API (external or Weaviate integrated)
        """
        print(f"🤖 Generating lesson for '{topic}' with {len(relevant_content)} content pieces")
        
        # Use external Mistral API if Weaviate generation is not configured
        if self.use_external_generation:
            return await self._generate_with_external_mistral(topic, user_context, relevant_content)
        
        # Try Weaviate's integrated generation first
        try:
            collection = self.client.collections.get("MedistralDocument")
            prompt = self._build_medical_generation_prompt(topic, user_context, relevant_content)
            
            response = collection.generate.near_text(
                query=topic,
                limit=5,
                single_prompt=prompt
            )
            
            if response.generated:
                try:
                    return json.loads(response.generated)
                except json.JSONDecodeError:
                    return self._parse_unstructured_generation(response.generated, topic, user_context)
            else:
                raise Exception("No content generated by Weaviate")
                
        except Exception as e:
            print(f"⚠️ Weaviate generation failed: {e}")
            print("🔄 Falling back to external Mistral API")
            return await self._generate_with_external_mistral(topic, user_context, relevant_content)
    
    async def _generate_with_external_mistral(self, topic: str, user_context: UserContext, relevant_content: List[Dict]) -> Dict:
        """
        Generate lesson content using external Mistral API
        """
        mistral_api_key = os.environ.get("MISTRAL_API_KEY")
        if not mistral_api_key:
            raise ValueError("MISTRAL_API_KEY environment variable required")
        
        # Build content summary from retrieved documents
        content_summary = "\n\n".join([
            f"Document: {doc.get('title', 'Untitled')}\n{doc.get('content', '')[:500]}..."
            for doc in relevant_content[:5]
        ])
        
        # Build the generation prompt
        prompt = f"""You are a medical education AI creating personalized lessons for medical and dental students.

Topic: {topic}
Student Level: {user_context.current_level}
Weak Areas: {user_context.weak_concepts}

Retrieved Medical Content:
{content_summary}

Create a comprehensive educational lesson. Return valid JSON in this exact format:

{{
    "lesson_content": "Detailed educational content covering {topic}. Include definitions, clinical relevance, and practical applications.",
    "target_concepts": ["{topic}", "related_concept1", "related_concept2"],
    "questions": [
        {{
            "question_id": "q1_{topic.replace(' ', '_')}",
            "text": "Clinical question about {topic}?",
            "category": "Medical Sciences",
            "subcategory": "Clinical Practice", 
            "topic": "{topic}",
            "difficulty": "{user_context.current_level}",
            "options": [
                {{"id": "a", "text": "Option A"}},
                {{"id": "b", "text": "Option B"}},
                {{"id": "c", "text": "Option C"}},
                {{"id": "d", "text": "Option D"}}
            ],
            "correct_answer": "a",
            "explanation": "Medical explanation with clinical reasoning..."
        }}
    ],
    "learning_objectives": ["understand", "apply", "analyze"]
}}

Focus on addressing the student's weak concepts: {user_context.weak_concepts}"""

        # API request payload
        payload = {
            "model": "mistral-large-latest",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
            "max_tokens": 4000,
            "response_format": {"type": "json_object"}
        }
        
        headers = {
            "Authorization": f"Bearer {mistral_api_key}",
            "Content-Type": "application/json"
        }
        
        try:
            print("🌐 Calling Mistral API...")
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.mistral.ai/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    
                    if response.status != 200:
                        error_text = await response.text()
                        raise Exception(f"Mistral API error {response.status}: {error_text}")
                    
                    result = await response.json()
                    generated_content = result['choices'][0]['message']['content']
                    
                    print(f"✅ Generated {len(generated_content)} characters from Mistral API")
                    
                    try:
                        return json.loads(generated_content)
                    except json.JSONDecodeError:
                        return self._parse_unstructured_generation(generated_content, topic, user_context)
                        
        except Exception as api_error:
            print(f"❌ Mistral API error: {api_error}")
            # Return minimal fallback
            return {
                "lesson_content": f"Basic lesson content for {topic}. Review the retrieved medical documents for comprehensive information.",
                "target_concepts": [topic] + user_context.weak_concepts[:2],
                "questions": [],
                "learning_objectives": ["understand", "apply", "remember"]
            }
    
    def _build_medical_generation_prompt(self, topic: str, user_context: UserContext, content: List[Dict]) -> str:
        """Build the generation prompt for Weaviate's LLM integration"""
        
        content_summary = "\n".join([
            f"- {doc['title']}: {doc['content'][:200]}..." 
            for doc in content[:3]
        ])
        
        return f"""
        Based on the following medical content, create a comprehensive educational lesson for medical/dental students.

        Topic: {topic}
        Student Level: {user_context.current_level}
        Weak Areas: {user_context.weak_concepts}
        Learning Velocity: {user_context.learning_velocity}

        Retrieved Medical Content:
        {content_summary}

        Create a JSON response with:
        1. Comprehensive lesson content addressing the topic and weak areas
        2. 3-5 multiple-choice questions targeting knowledge gaps
        3. Learning objectives appropriate for the student level
        4. Clinical applications and real-world scenarios

        Return valid JSON in this exact format:
        {{
            "lesson_content": "Detailed educational content...",
            "target_concepts": ["{topic}", "related_concept1", "related_concept2"],
            "questions": [
                {{
                    "question_id": "q1_{topic.replace(' ', '_')}",
                    "text": "Clinical question about {topic}?",
                    "category": "Medical Sciences",
                    "subcategory": "Clinical Practice",
                    "topic": "{topic}",
                    "difficulty": "{user_context.current_level}",
                    "options": [
                        {{"id": "a", "text": "Option A"}},
                        {{"id": "b", "text": "Option B"}},
                        {{"id": "c", "text": "Option C"}},
                        {{"id": "d", "text": "Option D"}}
                    ],
                    "correct_answer": "a",
                    "explanation": "Medical explanation..."
                }}
            ],
            "learning_objectives": ["understand", "apply", "analyze"]
        }}

        Focus on the student's weak concepts: {user_context.weak_concepts}
        Adjust complexity for learning velocity: {user_context.learning_velocity}
        """
    
    def _parse_unstructured_generation(self, generated_text: str, topic: str, user_context: UserContext) -> Dict:
        """Parse unstructured generation into expected format"""
        return {
            "lesson_content": generated_text,
            "target_concepts": [topic] + user_context.weak_concepts[:2],
            "questions": [],  # Will be filled in fallback
            "learning_objectives": ["understand", "apply", "remember"]
        }
    
    def _structure_lesson_response(self, lesson_data: Dict, topic: str, user_context: UserContext) -> LessonResponse:
        """Structure the lesson data into a proper response"""
        
        # Ensure required fields exist
        lesson_content = lesson_data.get("lesson_content", f"Basic lesson on {topic}")
        target_concepts = lesson_data.get("target_concepts", [topic])
        learning_objectives = lesson_data.get("learning_objectives", ["understand", "apply"])
        
        # Generate unique IDs
        lesson_id = f"lesson_{abs(hash(topic + user_context.user_id)) % 100000}"
        exercise_id = f"ex_{abs(hash(topic + user_context.user_id)) % 100000}"
        
        # Process questions
        questions = []
        for i, q_data in enumerate(lesson_data.get("questions", [])[:5]):
            try:
                question = Question(
                    question_id=q_data.get("question_id", f"q{i+1}_{topic.replace(' ', '_')}"),
                    text=q_data.get("text", f"Question about {topic}?"),
                    category=q_data.get("category", "Medical Sciences"),
                    subcategory=q_data.get("subcategory", "General"),
                    topic=q_data.get("topic", topic),
                    difficulty=q_data.get("difficulty", user_context.current_level),
                    options=q_data.get("options", []),
                    correct_answer=q_data.get("correct_answer", "a"),
                    explanation=q_data.get("explanation", "Explanation needed")
                )
                questions.append(question)
            except Exception as e:
                print(f"Question parsing error: {e}")
                continue
        
        # Build lesson entity
        lesson = Lesson(
            lesson_id=lesson_id,
            topic=topic,
            category="Medical Sciences",  # Default category
            subcategory="General",       # Default subcategory
            lesson_content=lesson_content,
            learning_objectives=learning_objectives,
            exercise_id=exercise_id,
            difficulty_level=user_context.current_level,
            generated_by="weaviate_rag_pipeline",
            created_at=datetime.datetime.now().isoformat()
        )
        
        # Build exercise entity
        exercise = Exercise(
            exercise_id=exercise_id,
            lesson_id=lesson_id,
            topic=topic,
            question_ids=[q.question_id for q in questions],
            difficulty_level=user_context.current_level,
            target_concepts=target_concepts,
            created_at=datetime.datetime.now().isoformat()
        )
        
        return LessonResponse(
            lesson=lesson,
            exercise=exercise,
            questions=questions
        )
    
    def close(self):
        """Close Weaviate client connection"""
        if self.client:
            self.client.close()

# =============================================================================
# PUBLIC API - WEAVIATE RAG PIPELINE
# =============================================================================

async def create_adaptive_lesson(topic: str, user_context: UserContext) -> LessonResponse:
    """
    Create adaptive lesson using Weaviate RAG pipeline
    
    This implements the exact workflow from pipeline.md using Weaviate's
    vector database and RAG capabilities.
    
    Pipeline:
    1. Semantic search through medical knowledge base (Weaviate vector DB)
    2. RAG generation using integrated LLM (Mistral via Weaviate)
    3. Personalization based on user context
    4. Structured lesson output
    
    Args:
        topic: Medical topic (e.g., "cardiology", "tooth anatomy")
        user_context: User's learning profile and weak concepts
        
    Returns:
        LessonResponse: RAG-generated personalized lesson
        
    Environment Variables Required:
        - WEAVIATE_URL: Your Weaviate Cloud instance URL
        - WEAVIATE_API_KEY: Your Weaviate API key
        - MISTRAL_API_KEY: For LLM generation
    """
    service = WeaviateLessonService()
    try:
        # Generate lesson using Weaviate RAG
        lesson_response = await service.create_lesson(topic, user_context)
        return lesson_response
    finally:
        service.close() 