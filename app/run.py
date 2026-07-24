# -*- coding: utf-8 -*-
"""Lanceur de l'application (backend + frontend). Usage : python app/run.py"""
import os, sys, uvicorn
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if __name__ == "__main__":
    print("Application d'aide à la décision -> http://127.0.0.1:8000")
    uvicorn.run("app.backend.main:app", host="127.0.0.1", port=8000, reload=False)
