"""
NexusBank ML service — uvicorn entry point.

Run with:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload

This file only exists to expose the FastAPI application instance under the
name that uvicorn/gunicorn expect. The actual app is constructed by the
factory in `app/__init__.py`, which keeps the module import graph clean and
makes the app easy to instantiate inside tests.
"""

from app import create_app

app = create_app()


if __name__ == "__main__":
    # Convenience: `python main.py` also boots the server. In practice you
    # will use `uvicorn main:app --reload` for local development.
    import uvicorn

    from app.config import get_settings

    settings = get_settings()
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.env == "development",
        log_config=None,  # our own JSON logger is installed inside create_app
    )