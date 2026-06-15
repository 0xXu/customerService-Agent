from core.retrieval import KnowledgeService


def test_split_text_preserves_content_and_creates_multiple_chunks():
    text = "\n\n".join(
        [
            "第一段" * 80,
            "第二段" * 80,
            "第三段" * 80,
        ]
    )

    chunks = KnowledgeService._split_text(text, chunk_size=200, overlap=20)

    assert len(chunks) >= 3
    assert all(chunk.strip() for chunk in chunks)
    assert "第一段" in chunks[0]
