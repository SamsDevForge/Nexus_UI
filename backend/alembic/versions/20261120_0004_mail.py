"""Separate encrypted mail copies and consent state."""

import sqlalchemy as sa

from alembic import op

revision = "20261120_0004"
down_revision = "20261120_0003"
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
        "mail_connections",
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
        sa.Column("last_synced_at", sa.DateTime(timezone=True)),
        sa.Column("next_sync_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("lease_until", sa.DateTime(timezone=True)),
        sa.Column("lease_token", sa.Uuid()),
        sa.Column("error_code", sa.String(64)),
        sa.Column("truncated", sa.Boolean(), nullable=False),
        *timestamps(),
        sa.UniqueConstraint("user_id", "provider", name="uq_mail_owner_provider"),
        sa.UniqueConstraint("id", "user_id", name="uq_mail_connection_owner"),
    )
    op.create_index("ix_mail_connections_user_id", "mail_connections", ["user_id"])
    op.create_index("ix_mail_sync_due", "mail_connections", ["status", "next_sync_at"])
    op.create_table(
        "mail_oauth_states",
        sa.Column("state_hash", sa.String(64), primary_key=True),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("provider", sa.String(16), nullable=False),
        sa.Column("verifier_encrypted", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_mail_oauth_states_user_id", "mail_oauth_states", ["user_id"])
    op.create_table(
        "mail_messages",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column("connection_id", sa.Uuid(), nullable=False),
        sa.Column("external_key", sa.String(64), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("payload_encrypted", sa.Text(), nullable=False),
        sa.Column("correction_encrypted", sa.Text()),
        sa.Column("revision", sa.Integer(), nullable=False),
        *timestamps(),
        sa.UniqueConstraint("connection_id", "external_key", name="uq_mail_source_message"),
        sa.ForeignKeyConstraint(
            ["connection_id", "user_id"],
            ["mail_connections.id", "mail_connections.user_id"],
            ondelete="CASCADE",
        ),
    )
    op.create_index("ix_mail_owner_received", "mail_messages", ["user_id", "received_at"])


def downgrade():
    op.drop_table("mail_messages")
    op.drop_table("mail_oauth_states")
    op.drop_table("mail_connections")
