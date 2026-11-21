"""Explicit process: python -m nexus_api.notification_worker [--once]."""

import argparse
import asyncio
import json
import logging

from .config import get_settings
from .db import Database
from .notification_engine import NotificationEngine
from .push import FirebasePushSender


async def run(once: bool = False) -> None:
    settings = get_settings()
    if not settings.notifications_enabled or not settings.database_url:
        raise SystemExit("Enable NOTIFICATIONS_ENABLED and configure DATABASE_URL first.")
    database = Database(settings)
    await database.start()
    sender = FirebasePushSender(settings) if settings.push_enabled else None
    engine = NotificationEngine(database, settings, sender)
    try:
        while True:
            try:
                print(json.dumps(await engine.tick()), flush=True)
            except Exception:
                # Provider exceptions can include tokens/URLs: emit a content-free error only.
                logging.error("Notification tick failed; check worker/database configuration.")
                if once:
                    raise SystemExit(1) from None
            if once:
                break
            await asyncio.sleep(30)
    finally:
        await database.stop()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    asyncio.run(run(parser.parse_args().once))
