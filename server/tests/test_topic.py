import json

import pytest

from app.config import CV_DATA_PATH
from app.utils.topic import build_topic_matcher, contains_vietnamese, is_on_topic

with open(CV_DATA_PATH, encoding="utf-8") as f:
    MATCHER = build_topic_matcher(json.load(f))


@pytest.mark.parametrize(
    "text",
    [
        "hi",
        "What is your React Native experience?",
        "What projects have you built?",
        "Tell me about BonVoye",
        "Are you open to remote work?",
        "Kinh nghiệm làm việc của bạn là gì?",
        "kinh nghiem lam viec",  # typed without diacritics
        "Mức lương mong muốn?",
    ],
)
def test_on_topic(text):
    assert is_on_topic(text, MATCHER)


@pytest.mark.parametrize(
    "text",
    [
        # Each of these used to pass via substrings ("hi" in "this"/"which").
        "Which team won the World Cup?",
        "Translate this sentence to French",
        "Write something about this movie",
        "Tell me a joke",
        "What is the capital of France?",
        "networking tips please",  # "work" inside another word
    ],
)
def test_off_topic(text):
    assert not is_on_topic(text, MATCHER)


def test_contains_vietnamese():
    assert contains_vietnamese("Xin chào")
    assert not contains_vietnamese("Hello there")
