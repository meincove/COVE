

import os
import json
import jwt
import requests
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, FileResponse
from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.mail import EmailMessage
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

from django.db import connections
from django.db.utils import OperationalError


User = get_user_model()

@csrf_exempt
def sync_user(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST allowed'}, status=405)

    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith("Bearer "):
        return JsonResponse({'error': 'Authorization header missing or malformed'}, status=401)

    session_token = auth_header.split(" ")[1]

    try:
        decoded = jwt.decode(session_token, options={"verify_signature": False})
        session_id = decoded.get("sid")
        clerk_user_id = decoded.get("sub")
        print("🔑 Clerk Session ID:", session_id)
        print("👤 Clerk User ID:", clerk_user_id)
    except Exception as e:
        print("❌ Error decoding JWT:", e)
        return JsonResponse({'error': 'Invalid session token'}, status=400)

    if not session_id or not clerk_user_id:
        return JsonResponse({'error': 'Invalid session structure'}, status=400)

    try:
        response = requests.get(
            f"https://api.clerk.dev/v1/users/{clerk_user_id}",
            headers={"Authorization": f"Bearer {settings.CLERK_SECRET_KEY}"},
            timeout=5
        )
    except requests.exceptions.RequestException as e:
        print("❌ Clerk API request error:", e)
        return JsonResponse({'error': 'Failed to reach Clerk API'}, status=503)

    if response.status_code != 200:
        print("❌ Clerk API error:", response.text)
        return JsonResponse({'error': 'Invalid Clerk user ID'}, status=401)

    clerk_data = response.json()
    print("📄 Clerk Response:", json.dumps(clerk_data, indent=2))

    # Extract Clerk data
    email = clerk_data.get("email_addresses", [{}])[0].get("email_address", "")
    first_name = clerk_data.get("first_name", "")
    last_name = clerk_data.get("last_name", "")
    username = clerk_data.get("username") or None
    image_url = clerk_data.get("image_url", "")

    # 💡 Check if user with this email exists but no user_id
    try:
        existing = User.objects.get(email=email)
        if not existing.user_id:
            print("⚠️ Email already exists in DB. Updating existing user with Clerk ID.")
            existing.user_id = clerk_user_id
            existing.first_name = first_name
            existing.last_name = last_name
            existing.username = username
            existing.image_url = image_url
            existing.save()
            created = False
            user = existing
        elif existing.user_id != clerk_user_id:
            return JsonResponse({'error': 'Email already linked to a different user'}, status=400)
        else:
            user = existing
            user.first_name = first_name
            user.last_name = last_name
            user.username = username
            user.image_url = image_url
            user.save()
            created = False
    except User.DoesNotExist:
        user = User.objects.create(
            email=email,
            user_id=clerk_user_id,
            first_name=first_name,
            last_name=last_name,
            username=username,
            image_url=image_url,
        )
        created = True

    return JsonResponse({
        'status': 'success',
        'user_id': user.user_id,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'username': user.username,
        'image_url': user.image_url,
        'created_user': created,
    })


@csrf_exempt
def send_invoice_email(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid method'}, status=405)

    email = request.POST.get('email')
    name = request.POST.get('name')
    # order_id = request.POST.get('order_id')
    invoice_file = request.FILES.get('invoice')

    if not email or not invoice_file:
        return JsonResponse({'error': 'Missing email or order_id'}, status=400)


    subject = "🎉 Your Cove Invoice"
    body = f"""
Dear {name},

Thank you for your purchase at Cove.
Please find your invoice attached in PDF format.

Style with pride,  
— Team Cove
"""

    email_msg = EmailMessage(
        subject,
        body,
        from_email=os.getenv("EMAIL_HOST_USER"),  # safer than hardcoding
        to=[email]
    )

   
    email_msg.attach(invoice_file.name, invoice_file.read(), 'application/pdf')
    
    try:
        email_msg.send(fail_silently=False)
        return JsonResponse({'status': 'Invoice email sent successfully'})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

    # email_msg.send(fail_silently=False)

    # return JsonResponse({'status': 'Invoice email sent successfully'})


@csrf_exempt
def save_invoice_file(request):
    if request.method == 'POST':
        invoice_file = request.FILES.get('invoice')
        order_id = request.POST.get('order_id')

        if not invoice_file or not order_id:
            return JsonResponse({'error': 'Missing invoice or order_id'}, status=400)

        save_path = os.path.join(settings.BASE_DIR, 'generated_invoices', f"invoice_{order_id}.pdf")
        os.makedirs(os.path.dirname(save_path), exist_ok=True)

        with open(save_path, 'wb') as f:
            for chunk in invoice_file.chunks():
                f.write(chunk)

        return JsonResponse({'message': 'Invoice saved successfully'})
    else:
        return JsonResponse({'error': 'Invalid request'}, status=405)

def download_invoice_pdf(request):
    order_id = request.GET.get("order_id")
    if not order_id:
        return JsonResponse({"error": "Missing order_id"}, status=400)

    file_path = f"generated_invoices/invoice_{order_id}.pdf"
    if not os.path.exists(file_path):
        return JsonResponse({"error": "Invoice not found"}, status=404)

    return FileResponse(
        open(file_path, 'rb'),
        content_type='application/pdf',
        as_attachment=True,
        filename=f"invoice_{order_id}.pdf"
    )


def healthz(request):
    # Liveness: app can serve requests
    return JsonResponse({"ok": True})

def readiness(request):
    # Readiness: DB reachable
    try:
        with connections["default"].cursor() as cursor:
            cursor.execute("SELECT 1")
        db_ok = True
    except OperationalError:
        db_ok = False
    return JsonResponse({"ok": db_ok})
