"""
Mistral API Service
Clean, lightweight lesson content generation using Mistral API
"""

import os
import json
import aiohttp
from typing import List, Dict

from api.models.lesson_models import UserContext, ProgramMapping

class MistralService:
    """
    Clean Mistral service for concise medical education content
    Focuses on technical overviews with key notions
    """
    
    def __init__(self):
        """Initialize Mistral service"""
        self.api_key = os.environ.get("MISTRAL_API_KEY")
        if not self.api_key:
            raise ValueError("MISTRAL_API_KEY environment variable required")
        
        self.api_url = "https://api.mistral.ai/v1/chat/completions"
        print("✅ Clean Mistral API service initialized")
    
    async def generate_lesson_content(self, topic: str, user_context: UserContext, 
                                    relevant_content: List[Dict], topic_mapping: ProgramMapping,
                                    related_topics: List[str]) -> Dict:
        """Generate clean, concise lesson content"""
        print(f"📝 Generating concise lesson for '{topic}'")
        
        # Build content summary
        content_summary = self._build_content_summary(relevant_content)
        
        # Build clean prompt
        prompt = self._build_clean_prompt(
            topic, user_context, content_summary, topic_mapping, related_topics
        )
        
        # Clean API request
        payload = {
            "model": "mistral-small-latest",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3,
            "max_tokens": 2500,
            "response_format": {"type": "json_object"}
        }
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        try:
            print(f"🔧 Calling Mistral API for {topic}")
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    
                    if response.status != 200:
                        error_text = await response.text()
                        raise Exception(f"Mistral API error {response.status}: {error_text}")
                    
                    result = await response.json()
                    generated_content = result['choices'][0]['message']['content']
                    
                    print(f"✅ Generated {len(generated_content)} characters")
                    
                    return self._parse_generated_content(generated_content, topic, user_context, topic_mapping)
                        
        except Exception as api_error:
            print(f"❌ Mistral API error: {api_error}")
            return self._create_fallback_content(topic, user_context, topic_mapping)
    
    def _build_content_summary(self, relevant_content: List[Dict]) -> str:
        """Build simple content summary"""
        if not relevant_content:
            return "Generate from general medical knowledge."
        
        return "\n".join([
            f"- {doc.get('title', 'Document')}: {doc.get('content', '')[:300]}..."
            for doc in relevant_content[:3]
        ])
    
    def _build_clean_prompt(self, topic: str, user_context: UserContext, 
                           content_summary: str, topic_mapping: ProgramMapping,
                           related_topics: List[str]) -> str:
        """Build clean, focused prompt"""
        
        return f"""You are a medical education AI. Create a concise, technical lesson overview.

TOPIC: {topic}
CATEGORY: {topic_mapping.category}
SUBCATEGORY: {topic_mapping.subcategory}
STUDENT LEVEL: {user_context.current_level}
WEAK AREAS: {user_context.weak_concepts}

MEDICAL CONTENT:
{content_summary}

Create a clean, technical overview focusing on KEY NOTIONS and essential concepts.

Return EXACTLY this JSON format:

{{
    "lesson_content": "**{topic}**\n\n**Definition:**\n[Clear, technical definition]\n\n**Key Notions:**\n• [Essential concept 1]\n• [Essential concept 2]\n• [Essential concept 3]\n\n**Clinical Relevance:**\n[Brief clinical application]\n\n**Related Concepts:**\n{', '.join(related_topics[:3])}",
    
    "target_concepts": ["{topic}", "{user_context.weak_concepts[0] if user_context.weak_concepts else 'fundamentals'}", "{related_topics[0] if related_topics else 'clinical_application'}"],
    
    "questions": [
        {{
            "question_id": "q1_{topic.replace(' ', '_').lower()}",
            "text": "What is the primary mechanism of {topic}?",
            "category": "{topic_mapping.category}",
            "subcategory": "{topic_mapping.subcategory}",
            "topic": "{topic}",
            "difficulty": "{user_context.current_level}",
            "options": [
                {{"id": "a", "text": "[Option A]"}},
                {{"id": "b", "text": "[Option B]"}},
                {{"id": "c", "text": "[Correct option]"}},
                {{"id": "d", "text": "[Option D]"}}
            ],
            "correct_answer": "c",
            "explanation": "Explanation focusing on the key mechanism and clinical relevance."
        }},
        {{
            "question_id": "q2_{topic.replace(' ', '_').lower()}",
            "text": "In clinical practice, {topic} is most important for:",
            "category": "{topic_mapping.category}",
            "subcategory": "{topic_mapping.subcategory}",
            "topic": "{topic}",
            "difficulty": "{user_context.current_level}",
            "options": [
                {{"id": "a", "text": "[Clinical option A]"}},
                {{"id": "b", "text": "[Correct clinical option]"}},
                {{"id": "c", "text": "[Clinical option C]"}},
                {{"id": "d", "text": "[Clinical option D]"}}
            ],
            "correct_answer": "b",
            "explanation": "Brief explanation of clinical application and relevance."
        }}
    ],
    
    "learning_objectives": [
        "Define {topic}",
        "Identify key mechanisms",
        "Apply to clinical scenarios"
    ],
    
    "academic_context": {{
        "category": "{topic_mapping.category}",
        "subcategory": "{topic_mapping.subcategory}",
        "semester": {topic_mapping.semester},
        "related_topics": {json.dumps(related_topics[:3])},
        "content_type": "technical_overview"
    }}
}}

Keep it concise, technical, and focused on essential notions. No extra formatting or complex structures."""
    
    def _parse_generated_content(self, generated_content: str, topic: str, 
                               user_context: UserContext, topic_mapping: ProgramMapping) -> Dict:
        """Parse generated content"""
        try:
            parsed_content = json.loads(generated_content)
            
            # Ensure academic context
            if "academic_context" in parsed_content:
                parsed_content["academic_context"].update({
                    "category": topic_mapping.category,
                    "subcategory": topic_mapping.subcategory,
                    "semester": topic_mapping.semester,
                    "topic": topic_mapping.topic,
                    "similarity_score": topic_mapping.similarity_score
                })
            
            print(f"✅ Parsed lesson with {len(parsed_content.get('questions', []))} questions")
            return parsed_content
            
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON parsing failed: {e}")
            return self._create_structured_fallback(topic, user_context, topic_mapping)
    
    def _create_structured_fallback(self, topic: str, user_context: UserContext, 
                                  topic_mapping: ProgramMapping) -> Dict:
        """Create structured fallback content"""
        return {
            "lesson_content": f"**{topic}**\n\n**Definition:**\nA fundamental concept in {topic_mapping.subcategory}\n\n**Key Notions:**\n• Core mechanisms\n• Clinical applications\n• Related pathways\n\n**Clinical Relevance:**\nImportant for understanding {topic_mapping.subcategory} principles",
            
            "target_concepts": [topic] + user_context.weak_concepts[:2],
            
            "questions": [
                {
                    "question_id": f"q1_{topic.replace(' ', '_').lower()}",
                    "text": f"What is the primary function of {topic}?",
                    "category": topic_mapping.category,
                    "subcategory": topic_mapping.subcategory,
                    "topic": topic,
                    "difficulty": user_context.current_level,
                    "options": [
                        {"id": "a", "text": "Option A"},
                        {"id": "b", "text": "Option B"},
                        {"id": "c", "text": "Correct answer"},
                        {"id": "d", "text": "Option D"}
                    ],
                    "correct_answer": "c",
                    "explanation": f"Brief explanation of {topic} function and relevance."
                }
            ],
            
            "learning_objectives": [
                f"Define {topic}",
                "Identify key mechanisms", 
                "Apply to clinical scenarios"
            ],
            
            "academic_context": {
                "category": topic_mapping.category,
                "subcategory": topic_mapping.subcategory,
                "semester": topic_mapping.semester,
                "topic": topic_mapping.topic,
                "similarity_score": topic_mapping.similarity_score,
                "content_type": "technical_overview",
                "status": "fallback_structured"
            }
        }
    
    def _create_fallback_content(self, topic: str, user_context: UserContext, 
                               topic_mapping: ProgramMapping) -> Dict:
        """Simple fallback when API fails"""
        return {
            "lesson_content": f"**{topic}**\n\nBasic overview of {topic} in {topic_mapping.subcategory}.\n\n**Key Notions:**\n• Fundamental concepts\n• Clinical applications\n• Related mechanisms",
            "target_concepts": [topic],
            "questions": [],
            "learning_objectives": [f"Understand {topic} basics"],
            "academic_context": {
                "category": topic_mapping.category,
                "subcategory": topic_mapping.subcategory,
                "semester": topic_mapping.semester,
                "topic": topic_mapping.topic,
                "similarity_score": topic_mapping.similarity_score,
                "content_type": "technical_overview",
                "status": "api_fallback"
            }
        } 