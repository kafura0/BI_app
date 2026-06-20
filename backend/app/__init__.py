import sys, os

_ai_engine_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../ai-engine"))
if _ai_engine_path not in sys.path:
    sys.path.insert(0, _ai_engine_path)
