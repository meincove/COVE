# backend/tools/migrations/0003_ai_core_vector.py
from django.db import migrations, connections

SQL = """
create schema if not exists ai_core;
create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists ai_core.docs(
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  title text,
  text  text not null,
  url   text,
  meta  jsonb default '{}'::jsonb,
  embedding vector(1536)
);
create index if not exists docs_idx
  on ai_core.docs
  using ivfflat (embedding vector_l2_ops) with (lists=100);

create table if not exists ai_core.popularity(
  product_id text primary key,
  score float default 1.0
);
"""

REVERSE = """
drop table if exists ai_core.popularity;
drop index if exists docs_idx;
drop table if exists ai_core.docs;
"""

def forwards(apps, schema_editor):
    # Skip on SQLite; only run on Postgres
    if schema_editor.connection.vendor != "postgresql":
        return
    with schema_editor.connection.cursor() as cur:
        cur.execute(SQL)

def backwards(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return
    with schema_editor.connection.cursor() as cur:
        cur.execute(REVERSE)

class Migration(migrations.Migration):
    dependencies = [
        ("tools", "0002_consent"),
    ]
    operations = [
        migrations.RunPython(forwards, backwards),
    ]
