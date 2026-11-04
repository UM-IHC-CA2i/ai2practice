"""
rl_data.py - your personal practice data for the AI2Practice Research Lab.

Every learner gets slightly different data, made from their GitHub username.
The same username always gives exactly the same rows, so the lab page on the
website can check the numbers you report back.

You do not need to read this file to do the labs. If you are curious: it uses
a small random number generator (mulberry32) seeded from your username, and
only simple arithmetic, so a JavaScript copy on the website (rl-data.js)
produces exactly the same rows.

Usage:
    import rl_data
    df = rl_data.dataset(1, "your-github-username")      # a pandas DataFrame
    rl_data.save(1, "your-github-username", "ct_log.csv")  # or .json

Labs with generated data: 1 (ct_log), 2 (clinical), 3 (detector), 5 (reports).
Keep this file in sync with site2/ai2practice/assets/js/rl-data.js.
"""

import json
import math

LABS = (1, 2, 3, 5)
NAMES = {1: "ct_log", 2: "clinical", 3: "detector", 5: "reports"}

_M32 = 0xFFFFFFFF


# ---------------------------------------------------------------- PRNG ----

def _imul(a, b):
    return (a * b) & _M32


def normalize_username(username):
    u = str(username if username is not None else "").strip().lower()
    return u or "demo"


def seed_for(lab, username):
    """32-bit FNV-1a hash of "<lab>:<username>" (UTF-8 bytes)."""
    h = 0x811C9DC5
    for b in ("%d:%s" % (lab, normalize_username(username))).encode("utf-8"):
        h ^= b
        h = _imul(h, 16777619)
    return h


class _Rng:
    """mulberry32, identical to the JavaScript version."""

    def __init__(self, seed):
        self.a = seed & _M32

    def u(self):
        self.a = (self.a + 0x6D2B79F5) & _M32
        a = self.a
        t = _imul(a ^ (a >> 15), a | 1)
        t = ((t + _imul(t ^ (t >> 7), t | 61)) & _M32) ^ t
        return ((t ^ (t >> 14)) & _M32) / 4294967296

    def int(self, n):
        """Whole number from 0 to n-1."""
        return int(math.floor(self.u() * n))

    def pick(self, items):
        return items[self.int(len(items))]

    def weighted(self, items, weights):
        x = self.u()
        acc = 0.0
        for item, w in zip(items, weights):
            acc += w
            if x < acc:
                return item
        return items[-1]

    def normal(self):
        """Roughly bell-shaped, mean 0, SD 1: sum of 12 uniforms minus 6."""
        s = 0.0
        for _ in range(12):
            s += self.u()
        return s - 6


def _round(x, d):
    p = 10 ** d
    return math.floor(x * p + 0.5) / p


def _clamp(x, lo, hi):
    return lo if x < lo else hi if x > hi else x


# ---------------------------------------------------------- Lab 1 ----

REGIONS = ["Head", "Chest", "Abdomen/Pelvis", "Spine", "Extremity"]
REGION_W = [0.29, 0.25, 0.28, 0.10, 0.08]
DEPTS = ["ED", "Inpatient", "Outpatient"]
DEPT_W = [0.45, 0.25, 0.30]


def _lab1(r):
    rows = []
    # October 2026: the 1st is a Thursday (Monday = 0, so Thursday = 3).
    for day in range(1, 32):
        weekday = (3 + day - 1) % 7
        n = 6 + r.int(5) if weekday >= 5 else 12 + r.int(8)
        for _ in range(n):
            region = r.weighted(REGIONS, REGION_W)
            dept = r.weighted(DEPTS, DEPT_W)
            mean = 58 if region in ("Chest", "Abdomen/Pelvis") else 50
            age = int(math.floor(_clamp(mean + 19 * r.normal(), 18, 97)))
            rows.append({
                "study_id": "CT%04d" % (len(rows) + 1),
                "date": "2026-10-%02d" % day,
                "body_region": region,
                "age": age,
                "ordering_dept": dept,
            })
    return rows


# ---------------------------------------------------------- Lab 2 ----

MALE_CODES = ["M", "M", "M", "male", "Male", "m"]
FEMALE_CODES = ["F", "F", "F", "female", "Female", "f"]


def _lab2(r):
    n = 200 + r.int(41)
    rows = []
    for i in range(n):
        modality = "CT" if r.u() < 0.55 else "MRI"
        mean = 61 if modality == "CT" else 53
        age = int(math.floor(_clamp(mean + 16 * r.normal(), 18, 96)))
        sex = r.pick(MALE_CODES) if r.u() < 0.5 else r.pick(FEMALE_CODES)
        x = r.u()
        if x < 0.05:
            age = None          # missing
        elif x < 0.065:
            age = 999           # impossible (data entry error)
        rows.append({
            "patient_id": "P%04d" % (i + 1),
            "modality": modality,
            "age": age,
            "sex": sex,
        })
    n_dup = 5 + r.int(5)
    for _ in range(n_dup):
        src = r.int(len(rows))
        dst = r.int(len(rows) + 1)
        rows.insert(dst, dict(rows[src]))
    return rows


# ---------------------------------------------------------- Lab 3 ----

def _lab3(r):
    n = 380 + r.int(61)
    rows = []
    for i in range(n):
        site = "A" if r.u() < 0.55 else "B"
        truth = 1 if r.u() < 0.30 else 0
        z = r.normal()
        if site == "A":
            score = 0.72 + 0.14 * z if truth else 0.25 + 0.14 * z
        else:
            score = 0.58 + 0.17 * z if truth else 0.33 + 0.16 * z
        score = _round(_clamp(score, 0.001, 0.999), 3)
        rows.append({
            "case_id": "PTX%04d" % (i + 1),
            "site": site,
            "truth": truth,
            "score": score,
        })
    return rows


# ---------------------------------------------------------- Lab 5 ----

TECHNIQUE = [
    "CT chest with contrast.",
    "CT chest without contrast.",
    "CT chest, pulmonary embolism protocol.",
    "Low-dose CT chest.",
]
INDICATION = [
    "Indication: shortness of breath.",
    "Indication: chest pain.",
    "Indication: cough for three weeks.",
    "Indication: trauma, motor vehicle collision.",
    "Indication: fever, rule out pneumonia.",
    "Indication: staging, colon cancer.",
]
# (sentence, truth_nodule, kind). kind: pos = says nodule, syn = nodule
# described with another word, neg = mentions "nodule" but none present,
# clear = no nodule and no mention.
LUNG_POS = [
    ("A 6 mm solid nodule in the right upper lobe.", "pos"),
    ("There is a 5 mm pulmonary nodule in the left lower lobe.", "pos"),
    ("Small 4 mm nodule in the lingula.", "pos"),
    ("New 8 mm part-solid nodule in the right lower lobe.", "pos"),
    ("A 7 mm ground-glass nodule in the left upper lobe.", "pos"),
]
LUNG_SYN = [
    ("An 8 mm rounded opacity in the right middle lobe, indeterminate.", "syn"),
    ("A 6 mm lesion in the left upper lobe.", "syn"),
    ("A 9 mm spiculated density in the right upper lobe.", "syn"),
]
LUNG_NEG = [
    ("No pulmonary nodule.", "neg"),
    ("No suspicious pulmonary nodules or masses.", "neg"),
    ("The previously described nodule has resolved.", "neg"),
    ("Lungs are clear without nodule or consolidation.", "neg"),
]
LUNG_CLEAR = [
    ("Lungs are clear.", "clear"),
    ("Mild dependent atelectasis at both lung bases.", "clear"),
    ("Mild emphysematous changes in the upper lobes.", "clear"),
    ("Patchy consolidation in the right lower lobe, consistent with pneumonia.", "clear"),
    ("Small bilateral pleural effusions.", "clear"),
]
OTHER = [
    "Heart size is normal.",
    "Mild coronary artery calcification.",
    "No pericardial effusion.",
    "No enlarged mediastinal or hilar lymph nodes.",
    "No acute fracture.",
    "Degenerative changes of the thoracic spine.",
    "The visualized upper abdomen is unremarkable.",
    "Small hiatal hernia.",
]
IMPRESSION_POS = [
    "Impression: pulmonary finding as above; follow-up CT recommended per Fleischner Society guidelines.",
    "Impression: indeterminate small lung finding; recommend follow-up chest CT.",
]
IMPRESSION_NEG = [
    "Impression: no acute cardiopulmonary abnormality.",
    "Impression: findings as above. No follow-up imaging needed for the lungs.",
]
LLM_ERROR_P = {"pos": 0.02, "syn": 0.18, "neg": 0.15, "clear": 0.01}


def _lab5(r):
    n = 115 + r.int(11)
    rows = []
    for i in range(n):
        x = r.u()
        if x < 0.18:
            sentence, kind = r.pick(LUNG_POS)
        elif x < 0.27:
            sentence, kind = r.pick(LUNG_SYN)
        elif x < 0.47:
            sentence, kind = r.pick(LUNG_NEG)
        else:
            sentence, kind = r.pick(LUNG_CLEAR)
        truth = 1 if kind in ("pos", "syn") else 0
        o1 = r.pick(OTHER)
        o2 = r.pick(OTHER)
        parts = [r.pick(TECHNIQUE), r.pick(INDICATION), sentence, o1]
        if o2 != o1:
            parts.append(o2)
        parts.append(r.pick(IMPRESSION_POS) if truth else r.pick(IMPRESSION_NEG))
        llm = truth
        if r.u() < LLM_ERROR_P[kind]:
            llm = 1 - truth
        rows.append({
            "report_id": "R%03d" % (i + 1),
            "text": " ".join(parts),
            "truth_nodule": truth,
            "llm_nodule": llm,
        })
    return rows


_GEN = {1: _lab1, 2: _lab2, 3: _lab3, 5: _lab5}
COLUMNS = {
    1: ["study_id", "date", "body_region", "age", "ordering_dept"],
    2: ["patient_id", "modality", "age", "sex"],
    3: ["case_id", "site", "truth", "score"],
    5: ["report_id", "text", "truth_nodule", "llm_nodule"],
}


def rows(lab, username):
    """The dataset as a list of dicts (no pandas needed)."""
    lab = int(lab)
    if lab not in _GEN:
        raise ValueError("Labs with generated data: 1, 2, 3, 5 (got %r)" % lab)
    return _GEN[lab](_Rng(seed_for(lab, username)))


def dataset(lab, username):
    """The learner's dataset for a lab, as a pandas DataFrame."""
    import pandas as pd
    lab = int(lab)
    df = pd.DataFrame(rows(lab, username), columns=COLUMNS[lab])
    if lab == 2:
        df["age"] = df["age"].astype("float")   # missing ages become NaN
    return df


def save(lab, username, path):
    """Write the dataset to a .csv or .json file. Returns the path."""
    lab = int(lab)
    if str(path).lower().endswith(".json"):
        with open(path, "w") as f:
            json.dump(rows(lab, username), f, indent=1)
    else:
        dataset(lab, username).to_csv(path, index=False, float_format="%g")
    return path


# ------------------------------------------------- expected values ----
# Used by the notebook test cells: rl_data.check(lab, username, key, value).
# Computed with plain Python (no pandas), so it is an independent check.

def _count(rows, fn):
    return sum(1 for r in rows if fn(r))


def _ss(rows, threshold=0.5):
    tp = _count(rows, lambda r: r["score"] >= threshold and r["truth"] == 1)
    fp = _count(rows, lambda r: r["score"] >= threshold and r["truth"] == 0)
    fn = _count(rows, lambda r: r["score"] < threshold and r["truth"] == 1)
    tn = _count(rows, lambda r: r["score"] < threshold and r["truth"] == 0)
    div = lambda a, b: a / b if b else float("nan")
    return {"tp": tp, "fp": fp, "fn": fn, "tn": tn,
            "sensitivity": div(tp, tp + fn), "specificity": div(tn, tn + fp),
            "ppv": div(tp, tp + fp), "npv": div(tn, tn + fn)}


def expected(lab, username):
    """Reference values for one learner's data (a dict)."""
    lab = int(lab)
    rs = rows(lab, username)
    if lab == 1:
        counts = {}
        for r in rs:
            counts[r["body_region"]] = counts.get(r["body_region"], 0) + 1
        return {"total": len(rs), "chest": counts.get("Chest", 0),
                "top_count": max(counts.values()), "n_days": len(set(r["date"] for r in rs)),
                "counts": counts}
    if lab == 2:
        seen, clean = set(), []
        for r in rs:
            key = (r["patient_id"], r["modality"], r["age"], r["sex"])
            if key in seen:
                continue
            seen.add(key)
            if r["age"] is None or r["age"] < 0 or r["age"] > 120:
                continue
            clean.append(r)
        out = {"n_raw": len(rs), "n_dups": len(rs) - len(seen), "rows_clean": len(clean)}
        for m in ("CT", "MRI"):
            ages = [r["age"] for r in clean if r["modality"] == m]
            out["n_" + m.lower()] = len(ages)
            out["mean_" + m.lower()] = sum(ages) / len(ages)
        out["n_female"] = _count(clean, lambda r: r["sex"][0].upper() == "F")
        return out
    if lab == 3:
        out = _ss(rs)
        for site in ("A", "B"):
            s = _ss([r for r in rs if r["site"] == site])
            out["n_" + site.lower()] = s["tp"] + s["fp"] + s["fn"] + s["tn"]
            out["sens_" + site.lower()] = s["sensitivity"]
            out["spec_" + site.lower()] = s["specificity"]
        out["n"] = len(rs)
        return out
    if lab == 5:
        fp = _count(rs, lambda r: r["llm_nodule"] == 1 and r["truth_nodule"] == 0)
        fn = _count(rs, lambda r: r["llm_nodule"] == 0 and r["truth_nodule"] == 1)
        return {"n": len(rs), "truth_n": _count(rs, lambda r: r["truth_nodule"] == 1),
                "keyword_n": _count(rs, lambda r: "nodule" in r["text"]),
                "llm_fp": fp, "llm_fn": fn, "llm_errors": fp + fn}
    raise ValueError("Labs with generated data: 1, 2, 3, 5")


def check(lab, username, key, value, tol=1e-6):
    """True if `value` matches the reference value `key` for this learner."""
    want = expected(lab, username)[key]
    try:
        return abs(float(value) - float(want)) <= tol
    except (TypeError, ValueError):
        return False


if __name__ == "__main__":
    import sys
    lab = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    user = sys.argv[2] if len(sys.argv) > 2 else "demo"
    print(json.dumps(rows(lab, user)))
