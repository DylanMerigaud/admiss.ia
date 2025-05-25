"""
FastAPI application for AI-powered medical education
Serves lessons generation via Weaviate RAG pipeline
"""

import os
import json
from typing import List
from openai.types.chat.chat_completion_message_param import ChatCompletionMessageParam
from pydantic import BaseModel
from dotenv import load_dotenv
from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI

# Import your custom modules (make sure these imports work)
from api.utils.prompt import ClientMessage, convert_to_openai_messages
from api.utils.tools import get_current_weather
from api.utils.lesson_service import LessonRequest, LessonResponse, create_adaptive_lesson, UserContext

load_dotenv(".env.local")

app = FastAPI(
    title="Medical AI Education API",
    description="AI-powered adaptive learning for medical education using Weaviate RAG",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Chat request model
class ChatRequest(BaseModel):
    messages: List[ClientMessage]

# Available tools for chat
available_tools = {
    "get_current_weather": get_current_weather,
}

def stream_text(messages: List[ChatCompletionMessageParam], protocol: str = 'data'):
    """Stream chat completions"""
    draft_tool_calls = []
    draft_tool_calls_index = -1

    stream = client.chat.completions.create(
        messages=messages,
        model="gpt-4o",
        stream=True,
        tools=[{
            "type": "function",
            "function": {
                "name": "get_current_weather",
                "description": "Get the current weather at a location",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "latitude": {
                            "type": "number",
                            "description": "The latitude of the location",
                        },
                        "longitude": {
                            "type": "number",
                            "description": "The longitude of the location",
                        },
                    },
                    "required": ["latitude", "longitude"],
                },
            },
        }]
    )

    for chunk in stream:
        for choice in chunk.choices:
            if choice.finish_reason == "stop":
                continue

            elif choice.finish_reason == "tool_calls":
                for tool_call in draft_tool_calls:
                    yield '9:{{"toolCallId":"{id}","toolName":"{name}","args":{args}}}\n'.format(
                        id=tool_call["id"],
                        name=tool_call["name"],
                        args=tool_call["arguments"])

                for tool_call in draft_tool_calls:
                    tool_result = available_tools[tool_call["name"]](
                        **json.loads(tool_call["arguments"]))

                    yield 'a:{{"toolCallId":"{id}","toolName":"{name}","args":{args},"result":{result}}}\n'.format(
                        id=tool_call["id"],
                        name=tool_call["name"],
                        args=tool_call["arguments"],
                        result=json.dumps(tool_result))

            elif choice.delta.tool_calls:
                for tool_call in choice.delta.tool_calls:
                    id = tool_call.id
                    name = tool_call.function.name
                    arguments = tool_call.function.arguments

                    if (id is not None):
                        draft_tool_calls_index += 1
                        draft_tool_calls.append(
                            {"id": id, "name": name, "arguments": ""})

                    else:
                        draft_tool_calls[draft_tool_calls_index]["arguments"] += arguments

            else:
                yield '0:{text}\n'.format(text=json.dumps(choice.delta.content))

        if chunk.choices == []:
            usage = chunk.usage
            prompt_tokens = usage.prompt_tokens
            completion_tokens = usage.completion_tokens

            yield 'e:{{"finishReason":"{reason}","usage":{{"promptTokens":{prompt},"completionTokens":{completion}}},"isContinued":false}}\n'.format(
                reason="tool-calls" if len(
                    draft_tool_calls) > 0 else "stop",
                prompt=prompt_tokens,
                completion=completion_tokens
            )

@app.post("/api/chat")
async def handle_chat_data(request: ChatRequest, protocol: str = Query('data')):
    """Handle chat requests with streaming"""
    messages = request.messages
    openai_messages = convert_to_openai_messages(messages)

    response = StreamingResponse(stream_text(openai_messages, protocol))
    response.headers['x-vercel-ai-data-stream'] = 'v1'
    return response

@app.post("/api/lessons/create")
async def create_lesson_endpoint(request: LessonRequest):
    """
    Create a new adaptive lesson using Weaviate RAG pipeline

    Returns the complete lesson with content, exercises, and questions
    """
    try:
        lesson_response = await create_adaptive_lesson(
            topic=request.topic,
            user_context=request.user_context
        )

        return {
            "success": True,
            "lesson": {
                "lesson_id": lesson_response.lesson.lesson_id,
                "topic": lesson_response.lesson.topic,
                "category": lesson_response.lesson.category,
                "subcategory": lesson_response.lesson.subcategory,
                "lesson_content": lesson_response.lesson.lesson_content,
                "learning_objectives": lesson_response.lesson.learning_objectives,
                "difficulty_level": lesson_response.lesson.difficulty_level,
                "created_at": lesson_response.lesson.created_at
            },
            "exercise": {
                "exercise_id": lesson_response.exercise.exercise_id,
                "topic": lesson_response.exercise.topic,
                "difficulty_level": lesson_response.exercise.difficulty_level,
                "target_concepts": lesson_response.exercise.target_concepts,
                "created_at": lesson_response.exercise.created_at
            },
            "questions": [
                {
                    "question_id": q.question_id,
                    "text": q.text,
                    "category": q.category,
                    "subcategory": q.subcategory,
                    "topic": q.topic,
                    "difficulty": q.difficulty,
                    "options": q.options,
                    "correct_answer": q.correct_answer,
                    "explanation": q.explanation
                }
                for q in lesson_response.questions
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lesson generation failed: {str(e)}")

try:
    from api.utils.lesson_service import create_adaptive_lesson
    print("✅ Using real Weaviate lesson service")
except Exception as e:
    print(f"⚠️ Weaviate service error ({e}), check connection")
    # You can add a mock fallback here if needed

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "medical-ai-education"}

@app.get("/api/lessons/{topic}")
async def get_lesson_by_topic(topic: str):
    """
    Get a lesson by topic - returns the complete lesson data in the standard format
    
    Args:
        topic: The lesson topic (e.g., "Heart Anatomy")
        
    Returns:
        Complete lesson data with generation_metadata, lesson, exercise, and questions
    """
    try:
        # Create a default user context for topic-based requests
        default_user_context = UserContext(
            user_id="topic_request",
            current_level="intermediate",
            concept_mastery={},
            weak_concepts=[],
            learning_velocity=0.8,
            error_patterns=[],
            learning_style="mixed"
        )
        
        # Generate the lesson using your existing service
        lesson_response = await create_adaptive_lesson(
            topic=topic.replace('_', ' '),  # Handle URL encoding
            user_context=default_user_context
        )
        
        # Format the response in the exact format you want
        formatted_response = {
            "generation_metadata": {
                "generated_at": lesson_response.lesson.created_at,
                "topic": topic,
                "category": lesson_response.lesson.category,
                "subcategory": lesson_response.lesson.subcategory,
                "generator": "weaviate_rag_pipeline",
                "academic_program": "French Medical Education"
            },
            "lesson": {
                "lesson_id": lesson_response.lesson.lesson_id,
                "topic": lesson_response.lesson.topic,
                "category": lesson_response.lesson.category,
                "subcategory": lesson_response.lesson.subcategory,
                "lesson_content": lesson_response.lesson.lesson_content,
                "learning_objectives": lesson_response.lesson.learning_objectives,
                "exercise_id": lesson_response.exercise.exercise_id,
                "difficulty_level": lesson_response.lesson.difficulty_level,
                "semester": lesson_response.lesson.semester,
                "generated_by": lesson_response.lesson.generated_by,
                "created_at": lesson_response.lesson.created_at
            },
            "exercise": {
                "exercise_id": lesson_response.exercise.exercise_id,
                "lesson_id": lesson_response.lesson.lesson_id,
                "topic": lesson_response.exercise.topic,
                "question_ids": [q.question_id for q in lesson_response.questions],
                "difficulty_level": lesson_response.exercise.difficulty_level,
                "target_concepts": lesson_response.exercise.target_concepts,
                "created_at": lesson_response.exercise.created_at
            },
            "questions": [
                {
                    "question_id": q.question_id,
                    "text": q.text,
                    "category": q.category,
                    "subcategory": q.subcategory,
                    "topic": q.topic,
                    "difficulty": q.difficulty,
                    "options": q.options,
                    "correct_answer": q.correct_answer,
                    "explanation": q.explanation
                }
                for q in lesson_response.questions
            ]
        }
        
        return formatted_response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate lesson for topic '{topic}': {str(e)}")

@app.get("/api/lessons/generate")
async def generate_precise_lesson(topic: str, category: str, subcategory: str):
    """
    Generate a precise lesson using topic, category, and subcategory
    
    Args:
        topic: Specific topic (e.g., "Alkanes, Alkenes, Alcohols, Amines, Aldehydes, Ketones, Acids")
        category: Academic category (e.g., "UE 1 - Biochemistry") 
        subcategory: Academic subcategory (e.g., "Organic Chemistry")
        
    Returns:
        Complete lesson data with generation_metadata, lesson, exercise, and questions
    """
    try:
        # Create enhanced user context with category/subcategory info
        enhanced_user_context = UserContext(
            user_id="precise_request",
            current_level="intermediate",
            concept_mastery={},
            weak_concepts=[],
            learning_velocity=0.8,
            error_patterns=[],
            learning_style="mixed"
        )
        
        # Generate the lesson - the service will use the precise mapping
        lesson_response = await create_adaptive_lesson(
            topic=topic,
            user_context=enhanced_user_context
        )
        
        # Override the category/subcategory with precise values
        lesson_response.lesson.category = category
        lesson_response.lesson.subcategory = subcategory
        
        # Update questions with precise categorization
        for question in lesson_response.questions:
            question.category = category
            question.subcategory = subcategory
        
        # Format the response in your exact format
        formatted_response = {
            "generation_metadata": {
                "generated_at": lesson_response.lesson.created_at,
                "topic": topic,
                "category": category,
                "subcategory": subcategory,
                "generator": "precise_weaviate_rag_pipeline",
                "academic_program": "French Medical Education",
                "precision_mode": True
            },
            "lesson": {
                "lesson_id": lesson_response.lesson.lesson_id,
                "topic": topic,
                "category": category,
                "subcategory": subcategory,
                "lesson_content": lesson_response.lesson.lesson_content,
                "learning_objectives": lesson_response.lesson.learning_objectives,
                "exercise_id": lesson_response.exercise.exercise_id,
                "difficulty_level": lesson_response.lesson.difficulty_level,
                "semester": lesson_response.lesson.semester,
                "generated_by": lesson_response.lesson.generated_by,
                "created_at": lesson_response.lesson.created_at
            },
            "exercise": {
                "exercise_id": lesson_response.exercise.exercise_id,
                "lesson_id": lesson_response.lesson.lesson_id,
                "topic": topic,
                "question_ids": [q.question_id for q in lesson_response.questions],
                "difficulty_level": lesson_response.exercise.difficulty_level,
                "target_concepts": lesson_response.exercise.target_concepts,
                "created_at": lesson_response.exercise.created_at
            },
            "questions": [
                {
                    "question_id": q.question_id,
                    "text": q.text,
                    "category": category,
                    "subcategory": subcategory,
                    "topic": topic,
                    "difficulty": q.difficulty,
                    "options": q.options,
                    "correct_answer": q.correct_answer,
                    "explanation": q.explanation
                }
                for q in lesson_response.questions
            ]
        }
        
        return formatted_response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate precise lesson: {str(e)}")

# Also update your root endpoint to show the new endpoint
@app.get("/")
async def root():
    return {
        "message": "Medical AI Education API", 
        "version": "1.0.0", 
        "endpoints": [
            "/health", 
            "/api/lessons/create", 
            "/api/lessons/{topic}", 
            "/api/lessons/generate?topic=...&category=...&subcategory=...",  # NEW!
            "/api/chat"
        ]
    }
