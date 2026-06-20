import io

from fastapi import HTTPException, status


def extract_text(data: bytes, content_type: str) -> str:
    if content_type == "application/pdf":
        return _from_pdf(data)
    if content_type in (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ):
        return _from_docx(data)
    raise HTTPException(
        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
        detail="Only PDF and DOCX files are supported",
    )


def _from_pdf(data: bytes) -> str:
    from pdfminer.high_level import extract_text as pdf_extract_text

    return pdf_extract_text(io.BytesIO(data))


def _from_docx(data: bytes) -> str:
    import docx

    doc = docx.Document(io.BytesIO(data))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
