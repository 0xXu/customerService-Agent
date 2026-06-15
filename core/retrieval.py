from __future__ import annotations

import asyncio
import hashlib
from dataclasses import dataclass
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from fastembed import SparseTextEmbedding, TextEmbedding
from qdrant_client import AsyncQdrantClient, models

from core.settings import Settings


@dataclass(frozen=True)
class SearchResult:
    content: str
    source: str
    score: float


class KnowledgeService:
    dense_vector_name = "dense"
    sparse_vector_name = "sparse"

    def __init__(self, settings: Settings):
        self.settings = settings
        self.client = AsyncQdrantClient(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key,
            timeout=30,
        )
        self.dense = TextEmbedding(model_name=settings.dense_model, lazy_load=True)
        self.sparse = SparseTextEmbedding(
            model_name=settings.sparse_model, lazy_load=True
        )
        self._ready = False
        self._lock = asyncio.Lock()

    async def close(self) -> None:
        await self.client.close()

    async def initialize(self) -> None:
        async with self._lock:
            if self._ready:
                return

            collections = await self.client.get_collections()
            exists = any(
                item.name == self.settings.qdrant_collection
                for item in collections.collections
            )
            if not exists:
                dense_size = await asyncio.to_thread(
                    lambda: len(next(self.dense.embed(["dimension probe"])))
                )
                await self.client.create_collection(
                    collection_name=self.settings.qdrant_collection,
                    vectors_config={
                        self.dense_vector_name: models.VectorParams(
                            size=dense_size, distance=models.Distance.COSINE
                        )
                    },
                    sparse_vectors_config={
                        self.sparse_vector_name: models.SparseVectorParams(
                            modifier=models.Modifier.IDF
                        )
                    },
                )
            await self._index_documents()
            self._ready = True

    async def _index_documents(self) -> None:
        points: list[models.PointStruct] = []
        root = Path(self.settings.knowledge_path)
        for path in sorted(root.glob("*.txt")):
            text = path.read_text(encoding="utf-8")
            for index, chunk in enumerate(self._split_text(text)):
                digest = hashlib.sha256(chunk.encode("utf-8")).hexdigest()
                point_id = str(uuid5(NAMESPACE_URL, f"{path.name}:{index}:{digest}"))
                dense_vector, sparse_vector = await asyncio.gather(
                    asyncio.to_thread(lambda value=chunk: next(self.dense.embed([value]))),
                    asyncio.to_thread(
                        lambda value=chunk: next(self.sparse.embed([value]))
                    ),
                )
                points.append(
                    models.PointStruct(
                        id=point_id,
                        vector={
                            self.dense_vector_name: dense_vector.tolist(),
                            self.sparse_vector_name: models.SparseVector(
                                indices=sparse_vector.indices.tolist(),
                                values=sparse_vector.values.tolist(),
                            ),
                        },
                        payload={
                            "content": chunk,
                            "source": path.name,
                            "chunk": index,
                            "digest": digest,
                        },
                    )
                )

        if points:
            await self.client.upsert(
                collection_name=self.settings.qdrant_collection,
                points=points,
                wait=True,
            )

    @staticmethod
    def _split_text(text: str, chunk_size: int = 500, overlap: int = 80) -> list[str]:
        paragraphs = [part.strip() for part in text.split("\n\n") if part.strip()]
        chunks: list[str] = []
        current = ""
        for paragraph in paragraphs:
            candidate = f"{current}\n\n{paragraph}".strip()
            if current and len(candidate) > chunk_size:
                chunks.append(current)
                current = f"{current[-overlap:]}\n{paragraph}".strip()
            else:
                current = candidate
        if current:
            chunks.append(current)
        return chunks

    async def search(self, query: str) -> list[SearchResult]:
        if not self._ready:
            await self.initialize()

        dense_vector, sparse_vector = await asyncio.gather(
            asyncio.to_thread(lambda: next(self.dense.query_embed(query))),
            asyncio.to_thread(lambda: next(self.sparse.query_embed(query))),
        )
        response = await self.client.query_points(
            collection_name=self.settings.qdrant_collection,
            prefetch=[
                models.Prefetch(
                    query=dense_vector.tolist(),
                    using=self.dense_vector_name,
                    limit=self.settings.retrieval_candidates,
                ),
                models.Prefetch(
                    query=models.SparseVector(
                        indices=sparse_vector.indices.tolist(),
                        values=sparse_vector.values.tolist(),
                    ),
                    using=self.sparse_vector_name,
                    limit=self.settings.retrieval_candidates,
                ),
            ],
            query=models.FusionQuery(fusion=models.Fusion.RRF),
            limit=self.settings.retrieval_limit,
            with_payload=True,
        )
        return [
            SearchResult(
                content=str(point.payload.get("content", "")),
                source=str(point.payload.get("source", "")),
                score=float(point.score),
            )
            for point in response.points
        ]
