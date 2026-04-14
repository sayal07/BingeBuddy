"""
Views for BingeBuddy accounts app.
Handles signup, OTP verification, login, profile management.
"""

from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone

from .models import User
from .serializers import (
    SignupSerializer, OTPVerifySerializer, ResendOTPSerializer,
    LoginSerializer, UserProfileSerializer, ChangePasswordSerializer,
    ForgotPasswordSerializer, ResetPasswordSerializer
)
from .utils import generate_otp, send_otp_email, is_otp_valid, can_resend_otp


class SignupView(APIView):
    """Register a new user and send OTP to their email."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate and send OTP
        otp = generate_otp()
        user.otp_code = otp
        user.otp_created_at = timezone.now()
        user.save()

        try:
            send_otp_email(user.email, otp)
        except Exception as e:
            import traceback
            print(f"EMAIL ERROR: {e}")
            print(traceback.format_exc())
            return Response(
                {'error': f'Failed to send OTP email: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            {'message': 'Account created. OTP sent to your email.',
             'email': user.email},
            status=status.HTTP_201_CREATED
        )


class VerifyOTPView(APIView):
    """Verify the 6-digit OTP code."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = User.objects.get(email=serializer.validated_data['email'])
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        success, error = is_otp_valid(user, serializer.validated_data['otp'])
        if not success:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Email verified successfully.',
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        }, status=status.HTTP_200_OK)


class ResendOTPView(APIView):
    """Resend OTP with cooldown enforcement."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            user = User.objects.get(email=serializer.validated_data['email'])
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if user.is_otp_locked:
            return Response(
                {'error': 'Account is temporarily locked. Try again later.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        if not can_resend_otp(user):
            return Response(
                {'error': 'Please wait 60 seconds before requesting a new OTP.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        otp = generate_otp()
        user.otp_code = otp
        user.otp_created_at = timezone.now()
        user.save()

        try:
            send_otp_email(user.email, otp)
        except Exception:
            return Response(
                {'error': 'Failed to send OTP email.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            {'message': 'New OTP sent to your email.'},
            status=status.HTTP_200_OK
        )


class LoginView(APIView):
    """Authenticate user and return JWT tokens."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        refresh = RefreshToken.for_user(user)
        user.is_online = True
        user.save()

        return Response({
            'message': 'Login successful.',
            'user': UserProfileSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """Blacklist the refresh token to log out."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            request.user.is_online = False
            request.user.save()
        except Exception:
            pass
        return Response(
            {'message': 'Logged out successfully.'},
            status=status.HTTP_200_OK
        )


class ProfileView(generics.RetrieveUpdateAPIView):
    """Get or update the authenticated user's profile."""
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """Change password for authenticated user."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'error': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response(
            {'message': 'Password changed successfully.'},
            status=status.HTTP_200_OK
        )


class ForgotPasswordView(APIView):
    """Send OTP to user's email for password reset."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].lower()

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            # Don't reveal whether email exists for security
            return Response(
                {'message': 'If an account with that email exists, a reset code has been sent.'},
                status=status.HTTP_200_OK
            )

        if not user.is_verified:
            return Response(
                {'error': 'This account has not been verified yet.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user.is_otp_locked:
            return Response(
                {'error': 'Account is temporarily locked. Try again later.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        if not can_resend_otp(user):
            return Response(
                {'error': 'Please wait 60 seconds before requesting a new code.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        otp = generate_otp()
        user.otp_code = otp
        user.otp_created_at = timezone.now()
        user.save()

        try:
            send_otp_email(user.email, otp)
        except Exception:
            return Response(
                {'error': 'Failed to send reset email. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            {'message': 'If an account with that email exists, a reset code has been sent.',
             'email': email},
            status=status.HTTP_200_OK
        )


class ResetPasswordView(APIView):
    """Verify OTP and set new password."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email'].lower()
        otp = serializer.validated_data['otp']
        new_password = serializer.validated_data['new_password']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        success, error = is_otp_valid(user, otp)
        if not success:
            return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()

        return Response(
            {'message': 'Password reset successfully. You can now log in.'},
            status=status.HTTP_200_OK
        )
