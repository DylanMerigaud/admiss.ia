"""
Weaviate RAG Service
Handles Weaviate connection and search - uses MistralService for generation
"""

import os
from typing import List, Dict

import weaviate
from weaviate.classes.init import Auth
from weaviate.classes.query import MetadataQuery

from api.models.lesson_models import UserContext, ProgramMapping
from api.utils.mistral_service import MistralService

class WeaviateService:
    """
    Weaviate-based RAG service for medical content retrieval
    Uses dedicated MistralService for content generation
    """
    
    def __init__(self):
        """Initialize Weaviate client connection and Mistral service"""
        
        self.client = self._connect_to_weaviate()
        self.mistral_service = MistralService()
        self._ensure_medical_schema()
    
    def _connect_to_weaviate(self):
        import weaviate  # Add this line to be safe

        """Connect to Weaviate Cloud instance - robust v4 compatibility"""
        weaviate_url = os.environ.get("WEAVIATE_URL")
        weaviate_api_key = os.environ.get("WEAVIATE_API_KEY")
        
        if not weaviate_url or not weaviate_api_key:
            raise ValueError(
                "Missing Weaviate credentials. Please set WEAVIATE_URL and WEAVIATE_API_KEY environment variables."
            )
        
        print(f"🔗 Connecting to Weaviate: {weaviate_url}")
        print(f"📦 Weaviate version: {weaviate.__version__}")
        
        try:
            # Method 1: Try the standard v4 cloud connection
            if hasattr(weaviate, 'connect_to_weaviate_cloud'):
                print("🔄 Trying connect_to_weaviate_cloud...")
                try:
                    from weaviate.classes.init import Auth
                    client = weaviate.connect_to_weaviate_cloud(
                        cluster_url=weaviate_url,
                        auth_credentials=Auth.api_key(weaviate_api_key)
                    )
                    if client.is_ready():
                        print("✅ Connected using connect_to_weaviate_cloud")
                        return client
                except Exception as e:
                    print(f"❌ connect_to_weaviate_cloud failed: {e}")
            
            # Method 2: Try WeaviateClient direct instantiation (v4.4.0 style)
            if hasattr(weaviate, 'WeaviateClient'):
                print("🔄 Trying WeaviateClient...")
                try:
                    from weaviate.classes.init import Auth
                    client = weaviate.WeaviateClient(
                        connection_params=weaviate.connect.ConnectionParams.from_url(
                            url=weaviate_url,
                            auth_credentials=Auth.api_key(weaviate_api_key)
                        )
                    )
                    client.connect()
                    print("✅ Connected using WeaviateClient")
                    return client
                except Exception as e:
                    print(f"❌ WeaviateClient failed: {e}")
            
            # Method 3: Try weaviate.connect with URL (newer v4)
            print("🔄 Trying weaviate.connect...")
            try:
                client = weaviate.connect(
                    connection_params={
                        "url": weaviate_url,
                        "auth_credentials": {"api_key": weaviate_api_key}
                    }
                )
                print("✅ Connected using weaviate.connect")
                return client
            except Exception as e:
                print(f"❌ weaviate.connect failed: {e}")
            
            # Method 4: Try importing connection helpers differently
            print("🔄 Trying alternative v4 import...")
            try:
                import weaviate
                from weaviate.auth import AuthApiKey
                
                # Try different v4 connection patterns
                if hasattr(weaviate, 'connect_to_cloud'):
                    client = weaviate.connect_to_cloud(
                        cluster_url=weaviate_url,
                        auth_credentials=AuthApiKey(weaviate_api_key)
                    )
                else:
                    # Generic connection
                    client = weaviate.Client(
                        url=weaviate_url,
                        auth_client_secret=AuthApiKey(weaviate_api_key)
                    )
                
                print("✅ Connected using alternative method")
                return client
            except Exception as e:
                print(f"❌ Alternative method failed: {e}")
                
            raise ConnectionError("All Weaviate v4 connection methods failed")
            
        except Exception as e:
            print(f"❌ Critical connection error: {e}")
            raise ConnectionError(f"Weaviate connection failed: {e}")
    
    def _ensure_medical_schema(self):
        """Ensure the MedistralDocument collection exists (for search only)"""
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
                        description="Medical education content for RAG pipeline - search only",
                        vectorizer_config=weaviate.classes.config.Configure.Vectorizer.text2vec_weaviate(),
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
                    print("✅ Created MedistralDocument collection for search")
                except Exception as create_error:
                    print(f"Could not create collection: {create_error}")
            else:
                print("✅ MedistralDocument collection exists")
                
        except Exception as e:
            print(f"Warning: Could not verify/create schema: {e}")
    
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
        """Generate lesson content using MistralService"""
        return await self.mistral_service.generate_lesson_content(
            topic, user_context, relevant_content, topic_mapping, related_topics
        )
    
    def close(self):
        """Close Weaviate client connection"""
        if self.client:
            try:
                # Try different close methods for v4
                if hasattr(self.client, 'close'):
                    self.client.close()
                elif hasattr(self.client, 'disconnect'):
                    self.client.disconnect()
                elif hasattr(self.client, '__exit__'):
                    self.client.__exit__(None, None, None)
                else:
                    print("ℹ️ No close method needed for this client")
            except Exception as e:
                print(f"ℹ️ Client close warning: {e}")