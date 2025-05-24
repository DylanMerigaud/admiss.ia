"""
Weaviate RAG Service
Handles Weaviate connection, search, and content generation
"""

import os
import json
import aiohttp
from typing import List, Dict

import weaviate
from weaviate.classes.init import Auth
from weaviate.classes.query import MetadataQuery

from api.models.lesson_models import UserContext, ProgramMapping

class WeaviateService:
    """
    Weaviate-based RAG service for medical content retrieval and generation
    Handles connection, search, and LLM generation through Mistral API
    """
    
    def __init__(self):
        """Initialize Weaviate client connection"""
        self.client = self._connect_to_weaviate()
        self.use_external_generation = False
        self._ensure_medical_schema()
    
    def _connect_to_weaviate(self):
        """Connect to Weaviate Cloud instance with Mistral API integration"""
        weaviate_url = os.environ.get("WEAVIATE_URL")
        weaviate_api_key = os.environ.get("WEAVIATE_API_KEY")
        mistral_api_key = os.environ.get("MISTRAL_API_KEY")
        
        if not weaviate_url or not weaviate_api_key:
            raise ValueError(
                "Missing Weaviate credentials. Please set WEAVIATE_URL and WEAVIATE_API_KEY environment variables."
            )
        
        try:
            headers = {}
            if mistral_api_key:
                headers["X-Mistral-Api-Key"] = mistral_api_key
                print("✅ Mistral API key added to headers")
            else:
                print("⚠️ MISTRAL_API_KEY not found - generative queries may fail")
            
            client = weaviate.connect_to_weaviate_cloud(
                cluster_url=weaviate_url,
                auth_credentials=Auth.api_key(weaviate_api_key),
                headers=headers
            )
            
            if not client.is_ready():
                raise ConnectionError("Failed to connect to Weaviate instance")
                
            print(f"✅ Connected to Weaviate Cloud: {weaviate_url}")
            return client
            
        except Exception as e:
            raise ConnectionError(f"Weaviate connection failed: {e}")
    
    def _ensure_medical_schema(self):
        """Ensure the MedistralDocument collection exists and check generative config"""
        try:
            collections = self.client.collections.list_all()
            
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
                try:
                    self.client.collections.create(
                        name="MedistralDocument",
                        description="Medical education content for RAG pipeline - aligned with academic program",
                        vectorizer_config=weaviate.classes.config.Configure.Vectorizer.text2vec_weaviate(),
                        generative_config=weaviate.classes.config.Configure.Generative.mistral(),
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
                                description="Academic program category"
                            ),
                            weaviate.classes.config.Property(
                                name="subcategory",
                                data_type=weaviate.classes.config.DataType.TEXT,
                                description="Academic subcategory"
                            ),
                            weaviate.classes.config.Property(
                                name="topic",
                                data_type=weaviate.classes.config.DataType.TEXT,
                                description="Specific academic topic"
                            ),
                            weaviate.classes.config.Property(
                                name="difficulty",
                                data_type=weaviate.classes.config.DataType.TEXT,
                                description="Content difficulty level"
                            ),
                            weaviate.classes.config.Property(
                                name="semester",
                                data_type=weaviate.classes.config.DataType.INT,
                                description="Academic semester (1 or 2)"
                            )
                        ]
                    )
                    print("✅ Created MedistralDocument collection")
                except Exception as create_error:
                    print(f"Could not create collection: {create_error}")
            else:
                # Check if collection has generative config
                try:
                    collection = self.client.collections.get("MedistralDocument")
                    config = collection.config.get()
                    
                    if not config.generative_config:
                        print("⚠️ Collection exists but lacks generative config")
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
    
    async def search_medical_knowledge(self, topic: str, user_context: UserContext, 
                                     topic_mapping: ProgramMapping, related_topics: List[str]) -> List[Dict]:
        """Perform semantic search using Weaviate's vector database"""
        try:
            collection = self.client.collections.get("MedistralDocument")
            
            # Build enhanced search query with academic context
            search_terms = [
                topic,
                topic_mapping.topic,
                topic_mapping.category,
                topic_mapping.subcategory,
                "medical education",
                "anatomy", "physiology", "medicine",
                *user_context.weak_concepts,
                *related_topics
            ]
            
            search_query = " ".join(search_terms)
            
            print(f"🔍 Semantic search: {topic_mapping.category} > {topic_mapping.subcategory} > {topic}")
            
            # Try search with optional filter, fallback without filter
            try:
                response = collection.query.near_text(
                    query=search_query,
                    limit=15,
                    return_metadata=MetadataQuery(score=True),
                    filters=weaviate.classes.query.Filter.by_property("medical_domain").like("*medical*")
                )
            except Exception:
                response = collection.query.near_text(
                    query=search_query,
                    limit=15,
                    return_metadata=MetadataQuery(score=True)
                )
            
            # Extract relevant content
            relevant_docs = []
            for obj in response.objects:
                relevant_docs.append({
                    "title": obj.properties.get("title", ""),
                    "content": obj.properties.get("content", ""), 
                    "abstract": obj.properties.get("abstract", ""),
                    "source_file": obj.properties.get("source_file", ""),
                    "content_type": obj.properties.get("content_type", ""),
                    "medical_domain": obj.properties.get("medical_domain", ""),
                    "content_category": obj.properties.get("content_category", ""),
                    "mistral_domain": obj.properties.get("mistral_domain", ""),
                    "mistral_concepts": obj.properties.get("mistral_concepts", []),
                    "difficulty_level": obj.properties.get("difficulty_level", user_context.current_level),
                    "learning_objectives": obj.properties.get("learning_objectives", []),
                    "score": obj.metadata.score if obj.metadata else 0,
                    "category": topic_mapping.category,
                    "subcategory": topic_mapping.subcategory,
                    "topic": topic,
                    "semester": topic_mapping.semester,
                    "academic_context": f"{topic_mapping.category} > {topic_mapping.subcategory}"
                })
            
            print(f"📚 Found {len(relevant_docs)} documents for '{topic}'")
            return relevant_docs
            
        except Exception as e:
            print(f"❌ Search error: {e}")
            return []
    
    async def generate_lesson_content(self, topic: str, user_context: UserContext, 
                                    relevant_content: List[Dict], topic_mapping: ProgramMapping,
                                    related_topics: List[str]) -> Dict:
        """Generate lesson content using Mistral API"""
        print(f"🤖 Generating lesson for '{topic}' with {len(relevant_content)} content pieces")
        
        # Use external Mistral API
        if self.use_external_generation:
            return await self._generate_with_external_mistral(
                topic, user_context, relevant_content, topic_mapping, related_topics
            )
        
        # Try Weaviate's integrated generation
        try:
            collection = self.client.collections.get("MedistralDocument")
            prompt = self._build_generation_prompt(
                topic, user_context, relevant_content, topic_mapping, related_topics
            )
            
            response = collection.generate.near_text(
                query=topic,
                limit=5,
                single_prompt=prompt
            )
            
            if response.generated:
                try:
                    return json.loads(response.generated)
                except json.JSONDecodeError:
                    return self._parse_unstructured_generation(response.generated, topic, user_context, topic_mapping)
            else:
                raise Exception("No content generated by Weaviate")
                
        except Exception as e:
            print(f"⚠️ Weaviate generation failed: {e}")
            print("🔄 Falling back to external Mistral API")
            return await self._generate_with_external_mistral(
                topic, user_context, relevant_content, topic_mapping, related_topics
            )
    
    async def _generate_with_external_mistral(self, topic: str, user_context: UserContext, 
                                            relevant_content: List[Dict], topic_mapping: ProgramMapping,
                                            related_topics: List[str]) -> Dict:
        """Generate lesson content using external Mistral API"""
        mistral_api_key = os.environ.get("MISTRAL_API_KEY")
        if not mistral_api_key:
            raise ValueError("MISTRAL_API_KEY environment variable required")
        
        # Build content summary
        content_summary = "\n\n".join([
            f"Document: {doc.get('title', 'Untitled')}\n{doc.get('content', '')[:500]}..."
            for doc in relevant_content[:5]
        ])
        
        prompt = self._build_generation_prompt(
            topic, user_context, relevant_content, topic_mapping, related_topics, content_summary
        )
        
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
            print(f"🌐 Calling Mistral API for {topic_mapping.category} > {topic_mapping.subcategory} > {topic}")
            
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
                        parsed_content = json.loads(generated_content)
                        parsed_content["academic_context"] = {
                            "category": topic_mapping.category,
                            "subcategory": topic_mapping.subcategory,
                            "semester": topic_mapping.semester,
                            "topic": topic_mapping.topic,
                            "similarity_score": topic_mapping.similarity_score
                        }
                        return parsed_content
                    except json.JSONDecodeError:
                        return self._parse_unstructured_generation(generated_content, topic, user_context, topic_mapping)
                        
        except Exception as api_error:
            print(f"❌ Mistral API error: {api_error}")
            return {
                "lesson_content": f"Basic lesson content for {topic} in {topic_mapping.category} > {topic_mapping.subcategory}.",
                "target_concepts": [topic] + user_context.weak_concepts[:2],
                "questions": [],
                "learning_objectives": ["understand", "apply", "remember"],
                "academic_context": {
                    "category": topic_mapping.category,
                    "subcategory": topic_mapping.subcategory,
                    "semester": topic_mapping.semester,
                    "topic": topic_mapping.topic,
                    "similarity_score": topic_mapping.similarity_score
                }
            }
    
    def _build_generation_prompt(self, topic: str, user_context: UserContext, 
                               relevant_content: List[Dict], topic_mapping: ProgramMapping,
                               related_topics: List[str], content_summary: str = "") -> str:
        """Build the generation prompt for lesson content"""
        
        if not content_summary:
            content_summary = "\n".join([
                f"- {doc['title']}: {doc['content'][:200]}..." 
                for doc in relevant_content[:3]
            ])
        
        return f"""You are a medical education AI creating personalized lessons for medical and dental students following the French medical education program.

ACADEMIC CONTEXT:
- Category: {topic_mapping.category}
- Subcategory: {topic_mapping.subcategory}
- Topic: {topic_mapping.topic}
- Semester: {topic_mapping.semester}
- Related Topics: {', '.join(related_topics)}

STUDENT PROFILE:
- User ID: {user_context.user_id}
- Current Level: {user_context.current_level}
- Weak Areas: {user_context.weak_concepts}
- Learning Velocity: {user_context.learning_velocity}
- Learning Style: {user_context.learning_style}

RETRIEVED MEDICAL CONTENT:
{content_summary}

Create a comprehensive educational lesson specifically for the topic "{topic}" within the context of {topic_mapping.category} > {topic_mapping.subcategory}. 

Return valid JSON in this exact format:

{{
    "lesson_content": "Detailed educational content covering {topic}...",
    "target_concepts": ["{topic}", "related_concept1", "related_concept2"],
    "questions": [
        {{
            "question_id": "q1_{topic.replace(' ', '_')}",
            "text": "Academic question about {topic}?",
            "category": "{topic_mapping.category}",
            "subcategory": "{topic_mapping.subcategory}", 
            "topic": "{topic}",
            "difficulty": "{user_context.current_level}",
            "options": [
                {{"id": "a", "text": "Option A"}},
                {{"id": "b", "text": "Option B"}},
                {{"id": "c", "text": "Option C"}},
                {{"id": "d", "text": "Option D"}}
            ],
            "correct_answer": "a",
            "explanation": "Academic explanation..."
        }}
    ],
    "learning_objectives": ["understand", "apply", "analyze", "evaluate"],
    "academic_context": {{
        "category": "{topic_mapping.category}",
        "subcategory": "{topic_mapping.subcategory}",
        "semester": {topic_mapping.semester},
        "related_topics": {json.dumps(related_topics)}
    }}
}}

Focus on French medical education standards and curriculum alignment."""
    
    def _parse_unstructured_generation(self, generated_text: str, topic: str, 
                                     user_context: UserContext, topic_mapping: ProgramMapping) -> Dict:
        """Parse unstructured generation into expected format"""
        return {
            "lesson_content": generated_text,
            "target_concepts": [topic] + user_context.weak_concepts[:2],
            "questions": [],
            "learning_objectives": ["understand", "apply", "remember"],
            "academic_context": {
                "category": topic_mapping.category,
                "subcategory": topic_mapping.subcategory,
                "semester": topic_mapping.semester,
                "topic": topic_mapping.topic,
                "similarity_score": topic_mapping.similarity_score
            }
        }
    
    def close(self):
        """Close Weaviate client connection"""
        if self.client:
            self.client.close() 