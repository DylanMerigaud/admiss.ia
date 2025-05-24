"""
Simplified Lesson Generation Service - Main Orchestrator
Now uses modular components for better organization

This is the main entry point for lesson generation, orchestrating:
- Academic program mapping
- Weaviate search and generation
- Response structuring
"""

import datetime
from typing import Optional

from api.models.lesson_models import (
    UserContext, 
    LessonResponse, 
    Lesson, 
    Exercise, 
    Question, 
    ProgramMapping
)
from api.utils.academic_program import AcademicProgramLoader
from api.utils.weaviate_service import WeaviateService


class LessonOrchestrator:
    """
    Main orchestrator for lesson generation
    Coordinates academic program mapping and Weaviate RAG pipeline
    """
    
    def __init__(self):
        """Initialize the lesson orchestrator"""
        self.program_loader = AcademicProgramLoader()
        self.weaviate_service = WeaviateService()
    
    async def create_lesson(self, topic: str, user_context: UserContext) -> LessonResponse:
        """
        Create adaptive lesson using Weaviate RAG pipeline with academic program alignment
        
        This implements the complete workflow:
        1. Map topic to academic program structure
        2. RAG Retrieval - Semantic search through medical knowledge
        3. LLM Generation - Use Mistral API for content generation
        4. Personalized content adaptation
        
        Args:
            topic: Academic topic to create lesson for
            user_context: User's learning profile for personalization
            
        Returns:
            LessonResponse: Complete lesson with RAG-generated content
        """
        
        # Step 1: Map topic to academic program structure
        topic_mapping = self.program_loader.find_topic_mapping(topic)
        if not topic_mapping:
            # Fallback mapping for unknown topics
            topic_mapping = ProgramMapping(
                topic=topic,
                category="UE 5 - Anatomy",
                subcategory="General Anatomy",
                semester=1,
                similarity_score=0.0
            )
            print(f"⚠️ Using fallback mapping for unknown topic: {topic}")
        
        # Get related topics for enhanced search context
        related_topics = self.program_loader.get_related_topics(
            topic_mapping.category, 
            topic_mapping.subcategory, 
            limit=5
        )
        
        # Step 2: RAG Retrieval - Program-scoped semantic search
        relevant_content = await self.weaviate_service.search_medical_knowledge(
            topic, user_context, topic_mapping, related_topics
        )
        
        # Step 3: LLM Generation - Use Mistral API for content generation
        lesson_data = await self.weaviate_service.generate_lesson_content(
            topic, user_context, relevant_content, topic_mapping, related_topics
        )
        
        # Step 4: Structure response with program mapping
        return self._structure_lesson_response(lesson_data, topic, user_context, topic_mapping)
    
    def _structure_lesson_response(self, lesson_data: dict, topic: str, 
                                  user_context: UserContext, topic_mapping: ProgramMapping) -> LessonResponse:
        """Structure the lesson data into a proper response with academic program context"""
        
        # Ensure required fields exist
        lesson_content = lesson_data.get("lesson_content", f"Academic lesson on {topic} in {topic_mapping.subcategory}")
        target_concepts = lesson_data.get("target_concepts", [topic])
        learning_objectives = lesson_data.get("learning_objectives", ["understand", "apply"])
        
        # Generate unique IDs
        lesson_id = f"lesson_{abs(hash(topic + user_context.user_id + topic_mapping.category)) % 100000}"
        exercise_id = f"ex_{abs(hash(topic + user_context.user_id + topic_mapping.subcategory)) % 100000}"
        
        # Process questions with academic context
        questions = []
        for i, q_data in enumerate(lesson_data.get("questions", [])[:5]):
            try:
                question = Question(
                    question_id=q_data.get("question_id", f"q{i+1}_{topic.replace(' ', '_')}"),
                    text=q_data.get("text", f"Question about {topic} in {topic_mapping.subcategory}?"),
                    category=q_data.get("category", topic_mapping.category),
                    subcategory=q_data.get("subcategory", topic_mapping.subcategory),
                    topic=q_data.get("topic", topic),
                    difficulty=q_data.get("difficulty", user_context.current_level),
                    options=q_data.get("options", []),
                    correct_answer=q_data.get("correct_answer", "a"),
                    explanation=q_data.get("explanation", f"Explanation needed for {topic}")
                )
                questions.append(question)
            except Exception as e:
                print(f"Question parsing error: {e}")
                continue
        
        # Build lesson entity with academic program context
        lesson = Lesson(
            lesson_id=lesson_id,
            topic=topic,
            category=topic_mapping.category,
            subcategory=topic_mapping.subcategory,
            lesson_content=lesson_content,
            learning_objectives=learning_objectives,
            exercise_id=exercise_id,
            difficulty_level=user_context.current_level,
            semester=topic_mapping.semester,
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
        
        print(f"📋 Created lesson: {topic_mapping.category} > {topic_mapping.subcategory} > {topic}")
        
        return LessonResponse(
            lesson=lesson,
            exercise=exercise,
            questions=questions
        )
    
    def close(self):
        """Close connections"""
        self.weaviate_service.close()


# =============================================================================
# PUBLIC API - SIMPLIFIED INTERFACE
# =============================================================================

async def create_adaptive_lesson(topic: str, user_context: UserContext) -> LessonResponse:
    """
    Create adaptive lesson using Weaviate RAG pipeline with academic program alignment
    
    This is the main public interface for lesson generation.
    
    Args:
        topic: Academic topic from the program (e.g., "The Atom", "Cardiovascular System")
        user_context: User's learning profile and weak concepts
        
    Returns:
        LessonResponse: RAG-generated personalized lesson with academic program context
        
    Environment Variables Required:
        - WEAVIATE_URL: Your Weaviate Cloud instance URL
        - WEAVIATE_API_KEY: Your Weaviate API key
        - MISTRAL_API_KEY: For LLM generation
    """
    orchestrator = LessonOrchestrator()
    try:
        lesson_response = await orchestrator.create_lesson(topic, user_context)
        return lesson_response
    finally:
        orchestrator.close()


# For backward compatibility, export models and program loader
from api.models.lesson_models import *
from api.utils.academic_program import AcademicProgramLoader 