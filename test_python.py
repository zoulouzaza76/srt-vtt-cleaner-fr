import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "python")))

from tests.test_cleaner import TestSrtVttCleanerFr  # noqa: E402, F401

if __name__ == "__main__":
    unittest.main()
