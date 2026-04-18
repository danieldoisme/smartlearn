import random
import re
from collections import Counter

from backend.app.models.enums import QuestionType

_STOPWORDS = {
    "the",
    "and",
    "for",
    "that",
    "with",
    "this",
    "from",
    "have",
    "into",
    "your",
    "các",
    "những",
    "được",
    "trong",
    "theo",
    "một",
    "này",
    "khi",
    "cho",
    "của",
    "với",
    "tài",
    "liệu",
    "chương",
    "phần",
}
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+|\n+")
_WORD_RE = re.compile(r"[A-Za-zÀ-ỹ0-9][A-Za-zÀ-ỹ0-9_-]{2,}")


def build_questions(
    chapter_title: str, content_text: str, question_type: str, count: int
) -> list[dict]:
    sentences = _extract_sentences(content_text)
    if not sentences:
        return []

    keyword_pool = _build_keyword_pool(sentences)
    if not keyword_pool:
        return []

    cycle = _resolve_types(question_type)
    generated: list[dict] = []
    used_signatures: set[str] = set()
    sentence_index = 0
    max_attempts = max(count * 10, 20)
    attempts = 0

    while len(generated) < count and attempts < max_attempts:
        q_type = cycle[len(generated) % len(cycle)]
        sentence = sentences[sentence_index % len(sentences)]
        sentence_index += 1
        attempts += 1
        question = _generate_one(q_type, sentence, keyword_pool, chapter_title)
        if not question:
            continue
        signature = f"{q_type}:{question['content']}"
        if signature in used_signatures:
            continue
        used_signatures.add(signature)
        generated.append(question)
    return generated


def _extract_sentences(content_text: str) -> list[str]:
    sentences = []
    for raw in _SENTENCE_SPLIT_RE.split(content_text or ""):
        sentence = " ".join(raw.split()).strip()
        if len(sentence) >= 35 and len(sentence) <= 280:
            sentences.append(sentence)
    return sentences


def _build_keyword_pool(sentences: list[str]) -> list[str]:
    counter: Counter[str] = Counter()
    for sentence in sentences:
        for word in _extract_keywords(sentence):
            counter[word] += 1
    ranked = [
        word for word, _count in counter.most_common() if word.lower() not in _STOPWORDS
    ]
    return ranked[:50]


def _resolve_types(question_type: str) -> list[QuestionType]:
    if question_type == "mixed":
        return [QuestionType.MCQ, QuestionType.MULTI, QuestionType.FILL]
    return [QuestionType(question_type)]


def _generate_one(
    question_type: QuestionType,
    sentence: str,
    keyword_pool: list[str],
    chapter_title: str,
) -> dict | None:
    sentence_keywords = _extract_keywords(sentence)
    if question_type == QuestionType.FILL:
        answer = _pick_keyword(sentence_keywords, keyword_pool)
        if not answer:
            return None
        blanked = _blank_keyword(sentence, answer)
        return {
            "question_type": QuestionType.FILL,
            "content": f'Điền từ còn thiếu trong câu sau: "{blanked}"',
            "correct_answer": answer,
            "source_text": sentence,
            "options": [],
        }

    if question_type == QuestionType.MCQ:
        answer = _pick_keyword(sentence_keywords, keyword_pool)
        if not answer:
            return None
        blanked = _blank_keyword(sentence, answer)
        distractors = _pick_distractors(answer, keyword_pool, 3)
        if len(distractors) < 3:
            distractors.extend(_fallback_words(answer, 3 - len(distractors)))
        choices = [answer, *distractors[:3]]
        random.Random(f"{chapter_title}:{sentence}:{answer}").shuffle(choices)
        return {
            "question_type": QuestionType.MCQ,
            "content": f'Theo tài liệu, từ phù hợp với chỗ trống là gì? "{blanked}"',
            "correct_answer": answer,
            "source_text": sentence,
            "options": _build_options(choices, {answer}),
        }

    correct_terms = (
        sentence_keywords[:2] if len(sentence_keywords) >= 2 else sentence_keywords
    )
    if len(correct_terms) < 2:
        return None
    distractors = _pick_distractors_multi(correct_terms, keyword_pool, 2)
    if len(distractors) < 2:
        distractors.extend(_fallback_words(correct_terms[0], 2 - len(distractors)))
    choices = [*correct_terms[:2], *distractors[:2]]
    random.Random(f"{chapter_title}:{sentence}:multi").shuffle(choices)
    return {
        "question_type": QuestionType.MULTI,
        "content": f'Chọn các từ khóa xuất hiện trong câu sau: "{sentence}"',
        "correct_answer": None,
        "source_text": sentence,
        "options": _build_options(choices, set(correct_terms[:2])),
    }


def _extract_keywords(sentence: str) -> list[str]:
    seen: set[str] = set()
    keywords: list[str] = []
    for match in _WORD_RE.findall(sentence):
        lower = match.lower()
        if lower in _STOPWORDS or lower in seen:
            continue
        seen.add(lower)
        keywords.append(match)
    return keywords


def _pick_keyword(sentence_keywords: list[str], keyword_pool: list[str]) -> str | None:
    for keyword in sentence_keywords:
        if len(keyword) >= 4:
            return keyword
    for keyword in keyword_pool:
        if len(keyword) >= 4:
            return keyword
    return None


def _pick_distractors(answer: str, keyword_pool: list[str], count: int) -> list[str]:
    out: list[str] = []
    answer_lower = answer.lower()
    for keyword in keyword_pool:
        if keyword.lower() == answer_lower:
            continue
        if keyword in out:
            continue
        out.append(keyword)
        if len(out) >= count:
            break
    return out


def _pick_distractors_multi(
    correct_terms: list[str], keyword_pool: list[str], count: int
) -> list[str]:
    correct_lower = {term.lower() for term in correct_terms}
    out: list[str] = []
    for keyword in keyword_pool:
        if keyword.lower() in correct_lower:
            continue
        if keyword in out:
            continue
        out.append(keyword)
        if len(out) >= count:
            break
    return out


def _fallback_words(answer: str, count: int) -> list[str]:
    seeds = ["Khái niệm", "Định nghĩa", "Quy trình", "Thành phần", "Mô hình"]
    out = []
    for seed in seeds:
        candidate = seed
        if candidate.lower() == answer.lower():
            continue
        out.append(candidate)
        if len(out) >= count:
            break
    return out


def _blank_keyword(sentence: str, keyword: str) -> str:
    pattern = re.compile(re.escape(keyword), re.IGNORECASE)
    return pattern.sub("_____", sentence, count=1)


def _build_options(choices: list[str], correct_values: set[str]) -> list[dict]:
    labels = ["A", "B", "C", "D", "E"]
    options = []
    for index, choice in enumerate(choices[: len(labels)]):
        options.append(
            {
                "label": labels[index],
                "content": choice,
                "is_correct": choice in correct_values,
            }
        )
    return options
