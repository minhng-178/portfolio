import json

from app.config import CV_DATA_PATH
from app.services.prompt import build_off_topic_replies, build_system_prompt

with open(CV_DATA_PATH, encoding="utf-8") as f:
    CV = json.load(f)


def test_system_prompt_is_built_from_cv_data():
    prompt = build_system_prompt(CV)
    assert CV["personal_info"]["name"] in prompt
    assert CV["assistant"]["salary_statement"] in prompt
    for job in CV["work_experience"]:
        assert job["company"] in prompt


def test_off_topic_replies_use_candidate_name():
    replies = build_off_topic_replies(CV)
    given_name = CV["personal_info"]["name"].split()[-1]
    assert given_name in replies["en"]
    assert given_name in replies["vi"]
