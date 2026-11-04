"""
toolkit.py - your own small library of research functions.

You build this file up lab by lab. Each function below starts as a "stub":
a name, a description of what it should do, and a line that raises an error
until you write the real code. In the labs you write each function in a
notebook cell, test it, and then save it into this file with
save_to_toolkit(). Later labs import it again instead of rewriting it, the way
real research projects grow.

    Lab 1  count_by(df, column)        how many rows have each value
    Lab 2  describe_by(df, group, col) a small "Table 1" for one number column
    Lab 3  sens_spec(truth, pred)      confusion matrix, sensitivity, specificity,
                                       PPV and NPV (reused in Labs 4 and 5)

To keep your functions between Colab sessions, upload your updated toolkit.py
to the notebooks/ folder of your fork on GitHub (each lab's "Save to GitHub"
steps show how). The setup cell of every lab downloads toolkit.py from your
fork first, so your own versions come back.

To use a function after saving it:
    import importlib, toolkit
    importlib.reload(toolkit)     # picks up the newest saved version
    from toolkit import count_by
"""

import inspect
import os
import re

import numpy as np    # available to your functions as np
import pandas as pd   # available to your functions as pd

TOOLKIT_FUNCTIONS = ["count_by", "describe_by", "sens_spec"]


# >>> count_by
def count_by(df, column):
    """Count how many rows have each value of `column`, most common first.

    Example: count_by(df, "body_region") -> a pandas Series such as
        Head 130, Abdomen/Pelvis 121, Chest 108, ...

    You write this in Lab 1, Part 4.
    """
    raise NotImplementedError("count_by() is still a stub. Write it in Lab 1, Part 4, "
                              "then run save_to_toolkit(count_by).")
# <<< count_by


# >>> describe_by
def describe_by(df, group, column):
    """Summarize the number column `column` separately for each value of `group`.

    Returns a pandas DataFrame with one row per group and the columns
    N, mean, SD, median, min, max (rounded to 1 decimal). This is the core of
    a research paper's "Table 1".

    Example: describe_by(clean, "modality", "age")

    You write this in Lab 2, Part 2.
    """
    raise NotImplementedError("describe_by() is still a stub. Write it in Lab 2, Part 2, "
                              "then run save_to_toolkit(describe_by).")
# <<< describe_by


# >>> sens_spec
def sens_spec(truth, pred):
    """Compare predictions with the truth (both lists or columns of 0 and 1).

    Returns a dictionary with the four confusion-matrix counts and four rates
    (as fractions between 0 and 1):
        {"tp": ..., "fp": ..., "fn": ..., "tn": ...,
         "sensitivity": ..., "specificity": ..., "ppv": ..., "npv": ...}
    A rate whose denominator is zero is returned as float("nan").

    You write this in Lab 3, Part 2, and reuse it in Labs 4 and 5.
    """
    raise NotImplementedError("sens_spec() is still a stub. Write it in Lab 3, Part 2, "
                              "then run save_to_toolkit(sens_spec).")
# <<< sens_spec


# ---------------------------------------------------------------------------
# Helpers provided for you (you do not need to change anything below).
# ---------------------------------------------------------------------------

def save_to_toolkit(func, path=None):
    """Replace the stub of `func` in toolkit.py with the function you wrote.

    Use it right after a function's test cell passes:
        save_to_toolkit(count_by)
    """
    name = func.__name__
    if name not in TOOLKIT_FUNCTIONS:
        raise ValueError("save_to_toolkit() only stores these functions: %s" % ", ".join(TOOLKIT_FUNCTIONS))
    try:
        source = inspect.getsource(func)
    except (OSError, TypeError):
        raise RuntimeError("Could not read the code of %s(). Run the cell that defines it again, "
                           "then try save_to_toolkit(%s) once more." % (name, name))
    path = path or os.path.join(os.path.dirname(os.path.abspath(__file__)), "toolkit.py")
    with open(path) as f:
        text = f.read()
    pattern = re.compile(r"(# >>> %s\n).*?(\n# <<< %s)" % (name, name), re.S)
    if not pattern.search(text):
        raise RuntimeError("Could not find the markers for %s in %s." % (name, path))
    text = pattern.sub(lambda m: m.group(1) + source.rstrip("\n") + m.group(2), text)
    with open(path, "w") as f:
        f.write(text)
    import importlib
    import sys
    if "toolkit" in sys.modules:   # so "from toolkit import ..." gets the new version
        importlib.reload(sys.modules["toolkit"])
    print("Saved %s() into %s. Upload toolkit.py to your fork to keep it." % (name, os.path.basename(path)))


def toolkit_status():
    """Print which toolkit functions you have written so far."""
    for name in TOOLKIT_FUNCTIONS:
        src = inspect.getsource(globals()[name])
        state = "still a stub" if "is still a stub" in src else "written"
        print("%-12s %s" % (name, state))
