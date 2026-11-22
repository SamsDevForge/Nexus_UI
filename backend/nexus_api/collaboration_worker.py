"""Explicit selected-source worker: python -m nexus_api.collaboration_worker [--once]."""

import argparse
import asyncio
import json
import logging

from .collaboration_provider import CollaborationProvider
from .collaboration_service import CollaborationService
from .config import get_settings
from .db import Database


async def run(once: bool = False) -> None:
    settings = get_settings()
    if not settings.collaboration_enabled or not settings.database_url:
        raise SystemExit("Enable COLLABORATION_ENABLED and configure the database first.")
    database, provider = Database(settings), CollaborationProvider(settings)
    await database.start()
    service = CollaborationService(database, settings, provider)
    try:
        while True:
            try:
                print(json.dumps(await service.tick()), flush=True)
            except Exception:
                logging.error("Collaboration tick failed; review configuration.")
                if once:
                    raise SystemExit(1) from None
            if once:
                break
            await asyncio.sleep(30)
    finally:
        await provider.close()
        await database.stop()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    asyncio.run(run(parser.parse_args().once))
