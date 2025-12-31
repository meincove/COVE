from app.vector.store import get_conn

def check_constraints():
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                # Query postgres catalog for constraints
                cur.execute("""
                    SELECT conname, pg_get_constraintdef(c.oid)
                    FROM pg_constraint c
                    JOIN pg_namespace n ON n.oid = c.connamespace
                    JOIN pg_class t ON t.oid = c.conrelid
                    WHERE n.nspname = 'ai_core' AND t.relname = 'docs';
                """)
                constraints = cur.fetchall()
                print("Constraints on ai_core.docs:")
                for name, defi in constraints:
                    print(f"  - {name}: {defi}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_constraints()
