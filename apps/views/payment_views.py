import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.views import View
from apps.services.click_service import ClickService
from apps.services.payme_service import PaymeService


@method_decorator(csrf_exempt, name='dispatch')
@method_decorator(require_http_methods(["POST"]), name='dispatch')
class ClickWebhookView(View):
    """
    Click webhook endpoint - Click server tomonidan chaqiriladi
    """
    
    def post(self, request):
        try:
            data = json.loads(request.body)
            action = data.get('action')
            
            if action == 0:  # Prepare
                result = ClickService.prepare_payment(data)
            elif action == 1:  # Complete
                result = ClickService.complete_payment(data)
            else:
                result = {'error': -3, 'error_note': 'Invalid action'}
            
            return JsonResponse(result)
        
        except json.JSONDecodeError:
            return JsonResponse({'error': -2, 'error_note': 'Invalid JSON'})
        except Exception as e:
            return JsonResponse({'error': -1, 'error_note': str(e)})


@method_decorator(csrf_exempt, name='dispatch')
@method_decorator(require_http_methods(["POST"]), name='dispatch')
class PaymeWebhookView(View):
    """
    Payme webhook endpoint - Payme server tomonidan chaqiriladi
    """
    
    def post(self, request):
        try:
            data = json.loads(request.body)
            
            # Request verification
            is_valid, message = PaymeService.verify_request(data, request.headers)
            if not is_valid:
                return JsonResponse({
                    'jsonrpc': '2.0',
                    'id': data.get('id'),
                    'error': {
                        'code': -32504,
                        'message': message
                    }
                })
            
            # Request handler
            result = PaymeService.handle_request(data)
            return JsonResponse(result)
        
        except json.JSONDecodeError:
            return JsonResponse({
                'jsonrpc': '2.0',
                'id': None,
                'error': {
                    'code': -32700,
                    'message': 'Parse error'
                }
            })
        except Exception as e:
            return JsonResponse({
                'jsonrpc': '2.0',
                'id': None,
                'error': {
                    'code': -32400,
                    'message': str(e)
                }
            })
