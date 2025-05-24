"""
Pydantic Models for Lesson Generation System
Contains all data models used across the lesson generation pipeline
"""

from typing import List, Dict, Optional
from pydantic import BaseModel
import datetime

# =============================================================================
# USER CONTEXT MODEL
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

# =============================================================================
# CONTENT MODELS
# =============================================================================

class Question(BaseModel):
    """QCM Question model - aligned with program structure"""
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
    """Generated lesson entity - aligned with program structure"""
    lesson_id: str
    topic: str
    category: str
    subcategory: str
    lesson_content: str
    learning_objectives: List[str]
    exercise_id: str
    difficulty_level: str
    semester: int
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

# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

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
# ACADEMIC PROGRAM MODELS
# =============================================================================

class ProgramMapping(BaseModel):
    """Mapping for academic program structure"""
    topic: str
    category: str
    subcategory: str
    semester: int
    similarity_score: float = 0.0 