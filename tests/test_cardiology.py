#!/usr/bin/env python3
"""
Simple test for cardiology lesson generation with Mistral API
"""

import sys
import os
# Add parent directory to path so we can import api module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
import json
from datetime import datetime
from dotenv import load_dotenv
from api.utils.lesson_service import create_adaptive_lesson, UserContext

async def test_cardiology_lesson():
    """Test cardiology lesson generation and save the result"""
    
    print("🫀 Testing Cardiology Lesson Generation")
    print("=" * 50)
    
    # Load environment variables from .env.local
    load_dotenv(".env.local")
    
    # Check environment variables
    required_vars = ['WEAVIATE_URL', 'WEAVIATE_API_KEY', 'MISTRAL_API_KEY']
    for var in required_vars:
        status = "✅" if os.getenv(var) else "❌"
        print(f"{var}: {status}")
    
    # Create test user context
    user_context = UserContext(
        user_id="test_user_123",
        current_level="intermediate",
        weak_concepts=["heart_anatomy", "cardiac_physiology"],
        learning_velocity=0.7,
        learning_style="visual"
    )
    
    print(f"\n👤 Test User Profile:")
    print(f"   - Level: {user_context.current_level}")
    print(f"   - Weak Areas: {user_context.weak_concepts}")
    print(f"   - Learning Velocity: {user_context.learning_velocity}")
    
    try:
        print(f"\n🔍 Generating lesson for: 'cardiology'")
        
        # Generate lesson
        lesson_response = await create_adaptive_lesson(
            topic="cardiology",
            user_context=user_context
        )
        
        print("✅ Lesson generation successful!")
        
        # Save the complete output
        output_data = {
            "timestamp": datetime.now().isoformat(),
            "topic": "cardiology",
            "user_context": user_context.dict(),
            "lesson_response": {
                "lesson": lesson_response.lesson.dict(),
                "exercise": lesson_response.exercise.dict(),
                "questions": [q.dict() for q in lesson_response.questions]
            }
        }
        
        # Save to file
        output_file = f"tests/cardiology_lesson_output_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)
        
        print(f"📄 Complete output saved to: {output_file}")
        
        # Display summary
        print(f"\n📋 Lesson Summary:")
        print(f"   - Lesson ID: {lesson_response.lesson.lesson_id}")
        print(f"   - Content Length: {len(lesson_response.lesson.lesson_content)} characters")
        print(f"   - Questions Generated: {len(lesson_response.questions)}")
        print(f"   - Learning Objectives: {len(lesson_response.lesson.learning_objectives)}")
        
        # Show a preview of the content
        content_preview = lesson_response.lesson.lesson_content[:300] + "..." if len(lesson_response.lesson.lesson_content) > 300 else lesson_response.lesson.lesson_content
        print(f"\n📖 Content Preview:")
        print(f"   {content_preview}")
        
        if lesson_response.questions:
            print(f"\n❓ First Question Preview:")
            q = lesson_response.questions[0]
            print(f"   Q: {q.text}")
            print(f"   Options: {len(q.options)} choices")
            print(f"   Answer: {q.correct_answer}")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_cardiology_lesson())
    if success:
        print("\n🎉 Cardiology lesson test completed successfully!")
    else:
        print("\n💥 Test failed!") 