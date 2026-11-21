"""Explicit process: python -m nexus_api.mail_worker [--once]."""

import argparse
import asyncio
import json
import logging

from .config import get_settings
from .db import Database
from .mail_provider import MailProvider
from .mail_sync import MailSync


async def run(once: bool = False) -> None:
    settings = get_settings()
    if not settings.mail_enabled or not settings.database_url:
        raise SystemExit("Enable MAIL_ENABLED and configure the database first.")
    database, provider = Database(settings), MailProvider(settings)
    await database.start()
    engine = MailSync(database, settings, provider)
    try:
        while True:
            try:
                print(json.dumps(await engine.tick()), flush=True)
            except Exception:
                logging.error("Mail worker tick failed; review configuration.")
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
