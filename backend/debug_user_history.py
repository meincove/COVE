
import os
import django
import sys

# Add backend to path so we can import modules
sys.path.append('/Users/ssg/Desktop/COVE/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from ai_profiles.models import ChatSession, ChatMessage, AiUserProfile, AiConversationEvent

User = get_user_model()

def check_history(name_query):
    print(f"🔍 Searching for user matching '{name_query}'...")
    
    # Search by name or email
    users = User.objects.filter(first_name__icontains=name_query) | \
            User.objects.filter(last_name__icontains=name_query) | \
            User.objects.filter(email__icontains=name_query)

    if not users.exists():
        print(f"❌ No users found matching '{name_query}'.")
        print("\n📋 Listing ALL users in database to debug:")
        for u in User.objects.all():
            print(f"   - {u.first_name} {u.last_name} ({u.email}) [ID: {u.user_id}]")
        return

    for user in users:
        print(f"\n👤 Found User: {user.first_name} {user.last_name}")
        print(f"   Email: {user.email}")
        print(f"   Clerk ID: {user.user_id}")
        
        # 1. Check Permanent Profile (Gender/Size Context)
        try:
            profile = AiUserProfile.objects.get(user=user)
            print(f"   📋 AiUserProfile:")
            print(f"      - Gender: {profile.gender}")
            print(f"      - Size Top: {profile.preferred_size_top}")
            print(f"      - Size Bottom: {profile.preferred_size_bottom}")
            print(f"      - Style Tags: {profile.style_tags}")
        except AiUserProfile.DoesNotExist:
            print("   ⚠️ No AiUserProfile found (User hasn't chatted yet or sync failed).")

        # 2. Check Chat History (Neon Persistence)
        sessions = ChatSession.objects.filter(user=user).order_by('-created_at')
        count = sessions.count()
        print(f"   🗄️  Chat History: Found {count} sessions in database.")
        
        if count > 0:
            # Show details of the most recent session
            latest = sessions.first()
            msg_count = latest.messages.count()
            print(f"      Latest Session ({latest.created_at.strftime('%Y-%m-%d %H:%M')}):")
            print(f"      ID: {latest.id}")
            print(f"      Messages: {msg_count}")
            
            # Print last 5 messages to prove context retention
            print("      Recent Transcripts:")
            for m in latest.messages.order_by('-created_at')[:5]:
                print(f"        [{m.role.upper()}]: {m.content[:80]}..." if len(m.content) > 80 else f"        [{m.role.upper()}]: {m.content}")

        # 3. Check V2 Conversation History (AiConversationEvent)
        events = AiConversationEvent.objects.filter(clerk_user_id=user.user_id).order_by('-created_at')
        event_count = events.count()
        print(f"\n   📜 V2 History (AiConversationEvent): Found {event_count} events.")
        if event_count > 0:
             print("      Latest V2 Events:")
             for e in events[:5]:
                 print(f"        [{e.role.upper()}]: {e.kind} - {e.content[:80]}...")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        query = sys.argv[1]
        check_history(query)
    else:
        print("Usage: python3 debug_user_history.py <Name or Email>")
        print("Example: python3 debug_user_history.py Adarsh")
