from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.core.mail import send_mail
from django.conf import settings
from .models import ContactMessage
from .serializers import ContactMessageSerializer

class ContactCreateView(generics.CreateAPIView):
    queryset = ContactMessage.objects.all()
    serializer_class = ContactMessageSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        instance = serializer.save()
        
        # Send email notification to Admin
        try:
            subject = f"New Contact Message: {instance.subject}"
            message = f"You received a new message from {instance.name} ({instance.email}):\n\n{instance.message}"
            
            # Use the service email as both sender and recipient for now (since user said they want it in their mail)
            # Actually, user said their personal email is NOT logged in, but they want it to POP.
            # I will use the app's default contact email.
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [settings.DEFAULT_FROM_EMAIL], # Sends it to the service email
                fail_silently=True,
            )
        except Exception as e:
            print(f"Error sending contact email: {e}")
