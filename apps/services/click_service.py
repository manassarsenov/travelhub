import hashlib
import hmac
import requests
from django.conf import settings
from decimal import Decimal


class ClickService:
    """
    Click.uz payment service integration
    Dokumentatsiya: https://docs.click.uz/
    """
    
    BASE_URL = "https://api.click.uz/v2"
    
    @staticmethod
    def _generate_signature(params, secret_key):
        """Click signature generatsiya qilish"""
        # Parametrlarni tartiblash va signature yaratish
        sorted_params = sorted(params.items())
        sign_string = ''.join([f"{k}={v}" for k, v in sorted_params])
        return hmac.new(
            secret_key.encode(),
            sign_string.encode(),
            hashlib.md5
        ).hexdigest()
    
    @staticmethod
    def create_payment(booking):
        """
        Payment yaratish
        """
        service_id = getattr(settings, 'CLICK_SERVICE_ID')
        merchant_id = getattr(settings, 'CLICK_MERCHANT_ID')
        secret_key = getattr(settings, 'CLICK_SECRET_KEY')
        
        # Payment parametrlari
        amount = int(booking.total_price)  # Click so'mda ishlaydi
        order_id = booking.booking_number
        
        params = {
            'service_id': service_id,
            'merchant_id': merchant_id,
            'amount': amount,
            'order_id': order_id,
            'transaction_param': f"booking_{booking.id}",
            'return_url': f"{settings.SITE_URL}/my_bookings/",
        }
        
        # Signature generatsiya qilish
        params['sign'] = ClickService._generate_signature(params, secret_key)
        
        # Payment URL yaratish
        payment_url = f"{ClickService.BASE_URL}/merchant/payment"
        
        return {
            'payment_url': payment_url,
            'params': params,
            'method': 'click'
        }
    
    @staticmethod
    def verify_webhook(request_data):
        """
        Webhook verification - Click serverdan kelgan ma'lumotlarni tekshirish
        """
        secret_key = getattr(settings, 'CLICK_SECRET_KEY')
        
        # Clickdan kelgan ma'lumotlar
        click_trans_id = request_data.get('click_trans_id')
        service_id = request_data.get('service_id')
        merchant_trans_id = request_data.get('merchant_trans_id')
        amount = request_data.get('amount')
        action = request_data.get('action')  # 0 - prepare, 1 - complete
        sign_time = request_data.get('sign_time')
        sign_string = request_data.get('sign_string')
        
        # Signature tekshirish
        params = {
            'click_trans_id': click_trans_id,
            'service_id': service_id,
            'merchant_trans_id': merchant_trans_id,
            'amount': amount,
            'action': action,
            'sign_time': sign_time,
        }
        
        calculated_sign = ClickService._generate_signature(params, secret_key)
        
        if calculated_sign != sign_string:
            return False, "Invalid signature"
        
        return True, "Valid signature"
    
    @staticmethod
    def prepare_payment(request_data):
        """
        Payment prepare - Click tomonidan chaqiriladi
        """
        is_valid, message = ClickService.verify_webhook(request_data)
        if not is_valid:
            return {'error': -1, 'error_note': message}
        
        # Bookingni topish
        booking_number = request_data.get('merchant_trans_id')
        from apps.models import Booking
        try:
            booking = Booking.objects.get(booking_number=booking_number)
        except Booking.DoesNotExist:
            return {'error': -5, 'error_note': 'Booking not found'}
        
        # Summani tekshirish
        amount = Decimal(request_data.get('amount'))
        if amount != booking.total_price:
            return {'error': -2, 'error_note': 'Incorrect amount'}
        
        # Success response
        return {
            'click_trans_id': request_data.get('click_trans_id'),
            'merchant_trans_id': booking_number,
            'error': 0,
            'error_note': 'Success'
        }
    
    @staticmethod
    def complete_payment(request_data):
        """
        Payment complete - to'lov muvaffaqiyatli bo'lganda chaqiriladi
        """
        is_valid, message = ClickService.verify_webhook(request_data)
        if not is_valid:
            return {'error': -1, 'error_note': message}
        
        booking_number = request_data.get('merchant_trans_id')
        from apps.models import Booking
        try:
            booking = Booking.objects.get(booking_number=booking_number)
        except Booking.DoesNotExist:
            return {'error': -5, 'error_note': 'Booking not found'}
        
        # Booking statusini yangilash
        booking.is_paid = True
        booking.status = Booking.Status.CONFIRMED
        booking.transaction_id = request_data.get('click_trans_id')
        booking.payment_method = 'click'
        booking.save()
        
        return {
            'click_trans_id': request_data.get('click_trans_id'),
            'merchant_trans_id': booking_number,
            'error': 0,
            'error_note': 'Success'
        }
