import re

# Tech families — used to assess suitability of gap keywords
TECH_FAMILIES: dict[str, list[str]] = {
    "python": ["python", "pandas", "numpy", "scipy", "pydantic", "fastapi", "django", "flask",
               "sqlalchemy", "celery", "pytest", "jupyter", "conda", "pip"],
    "data_processing": ["spark", "pyspark", "hadoop", "hive", "flink", "kafka", "airflow",
                        "dbt", "dagster", "prefect", "luigi", "beam", "nifi", "glue"],
    "sql": ["sql", "postgresql", "postgres", "mysql", "sqlite", "oracle", "t-sql", "plpgsql",
            "redshift", "bigquery", "snowflake", "dbt"],
    "nosql": ["mongodb", "cassandra", "redis", "elasticsearch", "dynamodb", "couchdb", "neo4j"],
    "cloud": ["aws", "gcp", "azure", "s3", "ec2", "lambda", "cloud functions", "bigquery",
              "redshift", "snowflake", "databricks", "sagemaker", "vertex ai"],
    "devops": ["docker", "kubernetes", "k8s", "terraform", "ansible", "jenkins", "github actions",
               "gitlab ci", "ci/cd", "helm", "prometheus", "grafana"],
    "ml": ["machine learning", "deep learning", "sklearn", "scikit-learn", "tensorflow", "pytorch",
           "keras", "xgboost", "lightgbm", "mlflow", "feature engineering", "model training"],
    "data_viz": ["tableau", "power bi", "looker", "metabase", "grafana", "matplotlib",
                 "seaborn", "plotly", "d3.js"],
    "scala_java": ["scala", "java", "jvm", "spring", "maven", "gradle"],
    "streaming": ["kafka", "kinesis", "pubsub", "rabbitmq", "activemq", "flink", "spark streaming"],
    "data_modeling": ["data modeling", "data warehouse", "data lake", "lakehouse", "medallion",
                      "star schema", "dimensional modeling", "erd"],
    "orchestration": ["airflow", "dagster", "prefect", "luigi", "argo", "kubeflow"],
    "version_control": ["git", "github", "gitlab", "bitbucket"],
    "bi": ["tableau", "power bi", "looker", "qlik", "microstrategy", "superset"],
}

# Flat set for quick lookup
ALL_TECH_TERMS: set[str] = {term for terms in TECH_FAMILIES.values() for term in terms}

# Seniority keywords
SENIOR_KEYWORDS = {"senior", "lead", "principal", "staff", "head", "director", "manager", "architect"}
JUNIOR_KEYWORDS = {"junior", "entry", "graduate", "intern", "trainee", "associate"}


def extract_tech_keywords_from_jd(text: str) -> list[str]:
    """Extract known tech terms from a job description."""
    if not text:
        return []
    text_lower = text.lower()
    found = []
    for term in ALL_TECH_TERMS:
        pattern = r"\b" + re.escape(term) + r"\b"
        if re.search(pattern, text_lower):
            found.append(term)
    return list(set(found))


def get_families_for_skill(skill: str) -> set[str]:
    """Return which tech families a skill belongs to."""
    skill_lower = skill.lower()
    families = set()
    for family, terms in TECH_FAMILIES.items():
        if skill_lower in terms:
            families.add(family)
    return families


def assess_keyword_suitability(
    keyword: str,
    user_skills: list[str],
    experience_years: int | None,
) -> dict:
    """
    Assess whether a gap keyword is suitable for the user.
    Returns: {keyword, suitable: bool, reason: str}
    """
    kw_families = get_families_for_skill(keyword)
    user_skill_lower = [s.lower() for s in user_skills]
    user_families: set[str] = set()
    for skill in user_skill_lower:
        user_families |= get_families_for_skill(skill)

    overlapping_families = kw_families & user_families

    if overlapping_families:
        related = [s for s in user_skills if get_families_for_skill(s.lower()) & overlapping_families]
        reason = (
            f"Likely suitable — related to {', '.join(related[:3])} "
            f"which you already know ({', '.join(overlapping_families)})"
        )
        return {"keyword": keyword, "suitable": True, "reason": reason}
    elif experience_years and experience_years >= 3 and kw_families:
        reason = (
            f"Possibly learnable — outside your current stack "
            f"({', '.join(kw_families)}) but you have {experience_years}y experience"
        )
        return {"keyword": keyword, "suitable": None, "reason": reason}
    else:
        reason = (
            f"Outside your current skill set "
            f"({', '.join(kw_families) if kw_families else 'unknown area'})"
        )
        return {"keyword": keyword, "suitable": False, "reason": reason}


def detect_seniority(title: str) -> str:
    """Return 'senior', 'junior', or 'mid' based on job title."""
    title_lower = title.lower()
    if any(kw in title_lower for kw in SENIOR_KEYWORDS):
        return "senior"
    if any(kw in title_lower for kw in JUNIOR_KEYWORDS):
        return "junior"
    return "mid"
