import base64
import hashlib
import hmac
from datetime import datetime
from django.conf import settings
from decimal import Decimal


class PaymeService:
    """
    Payme payment service integration
    Dokumentatsiya: https://developer.payme.uz/
    """
    
    BASE_URL = "https://checkout.paycom.uz"
    
    @staticmethod
    def _generate_password(password):
        """Payme password encoding"""
        return base64.b64encode(password.encode()).decode()
    
    @staticmethod
    def _generate_signature(params, key):
        """Payme signature generatsiya qilish"""
        # Payme MD5 signature
        sorted_params = sorted(params.items())
        sign_string = ''.join([f"{k}={v}" for k, v in sorted_params])
        return hashlib.md5((sign_string + key).encode()).hexdigest()
    
    @staticmethod
    def create_payment(booking):
        """
        Payment yaratish - Payme checkout URL
        """
        merchant_id = getattr(settings, 'PAYME_MERCHANT_ID')
        password = getattr(settings, 'PAYME_PASSWORD')
        
        # Payment parametrlari
        amount = int(booking.total_price * 100)  # Payme tiyinlarda ishlaydi (1 so'm = 100 tiyin)
        order_id = booking.booking_number
        
        # Payme checkout URL
        params = {
            'm': merchant_id,
            'ac': order_id,
            'a': amount,
            'c': f"{settings.SITE_URL}/payment/payme/callback/",
            'l': 'uz',  # language
        }
        
        # URL yaratish
        payment_url = f"{PaymeService.BASE_URL}?" + '&'.join([f"{k}={v}" for k, v in params.items()])
        
        return {
            'payment_url': payment_url,
            'params': params,
            'method': 'payme'
        }
    
    @staticmethod
    def verify_request(request_data, headers):
        """
        Payme request verification
        """
        merchant_id = getattr(settings, 'PAYME_MERCHANT_ID')
        key = getattr(settings, 'PAYME_KEY')
        
        # Authorization header tekshirish
        auth_header = headers.get('Authorization', '')
        if not auth_header.startswith('Basic '):
            return False, "Missing authorization"
        
        # Password tekshirish
        encoded_password = auth_header.replace('Basic ', '')
        decoded_password = base64.b64decode(encoded_password).decode()
        password = getattr(settings, 'PAYME_PASSWORD')
        
        if decoded_password != password:
            return False, "Invalid password"
        
        return True, "Valid request"
    
    @staticmethod
    def handle_request(request_data):
        """
        Payme request handler - barcha Payme methodlari uchun
        """
        method = request_data.get('method')
        params = request_data.get('params', {})
        id = request_data.get('id')
        
        response = {
            'jsonrpc': '2.0',
            'id': id,
            'result': None,
            'error': None
        }
        
        try:
            if method == 'CreateTransaction':
                result = PaymeService.create_transaction(params)
            elif method == 'PerformTransaction':
                result = PaymeService.perform_transaction(params)
            elif method == 'CancelTransaction':
                result = PaymeService.cancel_transaction(params)
            elif method == 'CheckTransaction':
                result = PaymeService.check_transaction(params)
            elif method == 'GetStatement':
                result = PaymeService.get_statement(params)
            else:
                response['error'] = {
                    'code': -32601,
                    'message': 'Method not found'
                }
                return response
            
            response['result'] = result
            
        except Exception as e:
            response['error'] = {
                'code': -32400,
                'message': str(e)
            }
        
        return response
    
    @staticmethod
    def create_transaction(params):
        """
        Transaction yaratish
        """
        account = params.get('account')
        amount = params.get('amount')
        time = params.get('time')
        
        # Bookingni topish
        from apps.models import Booking
        try:
            booking = Booking.objects.get(booking_number=account)
        except Booking.DoesNotExist:
            return {'code': -31050, 'message': 'Booking not found'}
        
        # Summani tekshirish
        expected_amount = int(booking.total_price * 100)  # tiyin
        if amount != expected_amount:
            return {'code': -31001, 'message': 'Incorrect amount'}
        
        # Transaction yaratish (agar mavjud bo'lmasa)
        from apps.models import Transaction
        transaction_id = params.get('id')
        
        transaction, created = Transaction.objects.get_or_create(
            payme_id=transaction_id,
            defaults={
                'booking': booking,
                'amount': amount,
                'state': 'created',
                'created_at': datetime.fromtimestamp(time / 1000)
            }
        )
        
        return {
            'create_time': int(transaction.created_at.timestamp() * 1000),
            'transaction': str(transaction.id),
            'state': transaction.state
        }
    
    @staticmethod
    def perform_transaction(params):
        """
        Transactionni bajarish (to'lov muvaffaqiyatli)
        """
        transaction_id = params.get('id')
        
        from apps.models import Transaction, Booking
        try:
            transaction = Transaction.objects.get(payme_id=transaction_id)
        except Transaction.DoesNotExist:
            return {'code': -31050, 'message': 'Transaction not found'}
        
        if transaction.state == 'completed':
            return {
                'perform_time': int(transaction.perform_time.timestamp() * 1000),
                'transaction': str(transaction.id),
                'state': transaction.state
            }
        
        # Bookingni yangilash
        booking = transaction.booking
        booking.is_paid = True
        booking.status = Booking.Status.CONFIRMED
        booking.transaction_id = transaction_id
        booking.payment_method = 'payme'
        booking.save()
        
        # Transactionni yangilash
        transaction.state = 'completed'
        transaction.perform_time = datetime.now()
        transaction.save()
        
        return {
            'perform_time': int(transaction.perform_time.timestamp() * 1000),
            'transaction': str(transaction.id),
            'state': transaction.state
        }
    
    @staticmethod
    def cancel_transaction(params):
        """
        Transactionni bekor qilish
        """
        transaction_id = params.get('id')
        reason = params.get('reason')
        
        from apps.models import Transaction, Booking
        try:
            transaction = Transaction.objects.get(payme_id=transaction_id)
        except Transaction.DoesNotExist:
            return {'code': -31050, 'message': 'Transaction not found'}
        
        if transaction.state == 'cancelled':
            return {
                'cancel_time': int(transaction.cancel_time.timestamp() * 1000),
                'transaction': str(transaction.id),
                'state': transaction.state
            }
        
        # Bookingni bekor qilish
        booking = transaction.booking
        booking.status = Booking.Status.CANCELLED
        booking.save()
        
        # Transactionni yangilash
        transaction.state = 'cancelled'
        transaction.cancel_time = datetime.now()
        transaction.reason = reason
        transaction.save()
        
        return {
            'cancel_time': int(transaction.cancel_time.timestamp() * 1000),
            'transaction': str(transaction.id),
            'state': transaction.state
        }
    
    @staticmethod
    def check_transaction(params):
        """
        Transaction holatini tekshirish
        """
        transaction_id = params.get('id')
        
        from apps.models import Transaction
        try:
            transaction = Transaction.objects.get(payme_id=transaction_id)
        except Transaction.DoesNotExist:
            return {'code': -31050, 'message': 'Transaction not found'}
        
        result = {
            'create_time': int(transaction.created_at.timestamp() * 1000),
            'transaction': str(transaction.id),
            'state': transaction.state
        }
        
        if transaction.perform_time:
            result['perform_time'] = int(transaction.perform_time.timestamp() * 1000)
        
        if transaction.cancel_time:
            result['cancel_time'] = int(transaction.cancel_time.timestamp() * 1000)
            result['reason'] = transaction.reason
        
        return result
    
    @staticmethod
    def get_statement(params):
        """
        Hisob-faktura olish
        """
        from django.utils import timezone
        from apps.models import Transaction
        
        start = params.get('from')
        end = params.get('to')
        
        start_time = datetime.fromtimestamp(start / 1000)
        end_time = datetime.fromtimestamp(end / 1000)
        
        transactions = Transaction.objects.filter(
            created_at__range=[start_time, end_time]
        )
        
        result = []
        for transaction in transactions:
            item = {
                'id': transaction.payme_id,
                'time': int(transaction.created_at.timestamp() * 1000),
                'amount': transaction.amount,
                'account': transaction.booking.booking_number,
                'state': transaction.state
            }
            if transaction.perform_time:
                item['perform_time'] = int(transaction.perform_time.timestamp() * 1000)
            if transaction.cancel_time:
                item['cancel_time'] = int(transaction.cancel_time.timestamp() * 1000)
            
            result.append(item)
        
        return {'transactions': result}
