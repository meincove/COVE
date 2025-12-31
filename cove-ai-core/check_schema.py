from app.vector.store import get_conn

def check_schema():
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM ai_core.docs LIMIT 0")
                colnames = [desc[0] for desc in cur.description]
                print(f"Columns in ai_core.docs: {colnames}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_schema()
