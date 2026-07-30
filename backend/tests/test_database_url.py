from nexus_api.db import normalize_async_database_url


def test_normalizes_direct_neon_url_for_asyncpg_without_reencoding_query() -> None:
    direct_url = (
        "postgresql://nexus:encoded%2Fpassword@ep-direct.example.neon.tech/nexus"
        "?sslmode=require&channel_binding=require"
        "&application_name=nexus%20api&options=endpoint%3Dep-direct"
    )

    assert normalize_async_database_url(direct_url) == (
        "postgresql+asyncpg://nexus:encoded%2Fpassword@ep-direct.example.neon.tech/nexus"
        "?ssl=require&application_name=nexus%20api&options=endpoint%3Dep-direct"
    )


def test_normalizes_pooled_neon_url_and_preserves_unrelated_parameter_order() -> None:
    pooled_url = (
        "postgresql://nexus:encoded%2Bpassword@ep-pooled-pooler.example.neon.tech/nexus"
        "?options=project%3Dnexus+phase6&channel_binding=prefer"
        "&sslmode=require&statement_cache_size=0"
    )

    assert normalize_async_database_url(pooled_url) == (
        "postgresql+asyncpg://nexus:encoded%2Bpassword@ep-pooled-pooler.example.neon.tech/nexus"
        "?options=project%3Dnexus+phase6&ssl=require&statement_cache_size=0"
    )
