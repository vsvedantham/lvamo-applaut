import enum


class JobrefUserType(str, enum.Enum):
    """API-level discriminator for the two registration paths (employee vs.
    job seeker) — backs RegisterRequest's discriminated union and API
    responses. Not a DB column any more: jobref.users has a single
    is_employee boolean instead (see models/jobref_user.py, migration
    0013)."""

    EMPLOYEE = "employee"
    JOB_SEEKER = "job_seeker"


class ReferFrequency(str, enum.Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class ReferralViewCapacity(str, enum.Enum):
    """How many incoming referral requests (from job seekers) an employee
    is willing to look at per day — distinct from refer_frequency/
    referral_capacity, which is about how many candidates they'll actively
    refer. Reused for both, per product decision (Aug 2026)."""

    UP_TO_5 = "up_to_5"
    FIVE_TO_TEN = "5_to_10"
    TEN_TO_TWENTY = "10_to_20"
    NO_CAP = "no_cap"


class JobSeekerStatus(str, enum.Enum):
    NONE = "none"  # not currently employed
    PART_TIME = "part_time"
    MINI_JOB = "mini_job"
    SERVING_NOTICE = "serving_notice"
