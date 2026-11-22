"""Read-only calendar connections, PKCE state and owned normalized events."""

import sqlalchemy as sa

from alembic import op

revision = "20261120_0003"
down_revision = "20261120_0002"
branch_labels = None
depends_on = None


def timestamps():
    return [
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    ]


def upgrade():
    op.create_table(
        "calendar_connections",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("provider", sa.String(16), nullable=False),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("generation", sa.Integer(), nullable=False),
        sa.Column("sync_version", sa.Integer(), nullable=False),
        sa.Column("access_encrypted", sa.Text()),
        sa.Column("refresh_encrypted", sa.Text()),
        sa.Column("expires_at", sa.DateTime(timezone=True)),
        sa.Column("scopes", sa.JSON(), nullable=False),
        sa.Column("cursor_encrypted", sa.Text()),
        sa.Column("last_synced_at", sa.DateTime(timezone=True)),
        sa.Column("last_full_sync_at", sa.DateTime(timezone=True)),
        sa.Column("next_sync_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("lease_until", sa.DateTime(timezone=True)),
        sa.Column("lease_token", sa.Uuid()),
        sa.Column("window_start", sa.DateTime(timezone=True)),
        sa.Column("window_end", sa.DateTime(timezone=True)),
        sa.Column("watch_id", sa.String(255)),
        sa.Column("watch_resource", sa.String(255)),
        sa.Column("watch_secret_hash", sa.String(64)),
        sa.Column("watch_expires_at", sa.DateTime(timezone=True)),
        sa.Column("error_code", sa.String(64)),
        *timestamps(),
        sa.UniqueConstraint("user_id", "provider", name="uq_calendar_owner_provider"),
        sa.UniqueConstraint("id", "user_id", name="uq_calendar_connection_owner"),
    )
    op.create_index("ix_calendar_connections_user_id", "calendar_connections", ["user_id"])
    op.create_index("ix_calendar_sync_due", "calendar_connections", ["status", "next_sync_at"])
    op.create_table(
        "calendar_oauth_states",
        sa.Column("state_hash", sa.String(64), primary_key=True),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("provider", sa.String(16), nullable=False),
        sa.Column("verifier_encrypted", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_calendar_oauth_states_user_id", "calendar_oauth_states", ["user_id"])
    op.create_table(
        "calendar_collections",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("fingerprint", sa.String(64)),
        *timestamps(),
        sa.UniqueConstraint("user_id", "kind", "name", name="uq_calendar_collection_name"),
        sa.UniqueConstraint("id", "user_id", name="uq_calendar_collection_owner"),
    )
    op.create_index("ix_calendar_collections_user_id", "calendar_collections", ["user_id"])
    op.create_table(
        "calendar_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("connection_id", sa.Uuid()),
        sa.Column("collection_id", sa.Uuid()),
        sa.Column("external_key", sa.String(64), nullable=False),
        sa.Column("source", sa.String(16), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("location", sa.String(300), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("timezone", sa.String(64), nullable=False),
        sa.Column("all_day", sa.Boolean(), nullable=False),
        sa.Column("starts_on", sa.String(10)),
        sa.Column("ends_on", sa.String(10)),
        sa.Column("busy", sa.Boolean(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("preparation_minutes", sa.Integer(), nullable=False),
        sa.Column("source_updated_at", sa.DateTime(timezone=True)),
        *timestamps(),
        sa.ForeignKeyConstraint(
            ["connection_id", "user_id"],
            ["calendar_connections.id", "calendar_connections.user_id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["collection_id", "user_id"],
            ["calendar_collections.id", "calendar_collections.user_id"],
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint("connection_id", "external_key", name="uq_calendar_remote_event"),
        sa.UniqueConstraint("collection_id", "external_key", name="uq_calendar_local_event"),
        sa.CheckConstraint(
            "(connection_id IS NULL) != (collection_id IS NULL)", name="ck_calendar_one_source"
        ),
    )
    op.create_index("ix_calendar_owner_start", "calendar_events", ["user_id", "starts_at"])


def downgrade():
    for name in (
        "calendar_events",
        "calendar_collections",
        "calendar_oauth_states",
        "calendar_connections",
    ):
        op.drop_table(name)
