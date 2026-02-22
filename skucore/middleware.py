from django.shortcuts import redirect
from django.urls import reverse
from .models import School, UserSchool


class SchoolContextMiddleware:
    """
    Middleware to ensure school context is available on all requests.
    Sets request.school based on session data.
    Redirects to school selection if no school is selected.
    """
    
    # URLs that don't require school context
    EXEMPT_URLS = [
        '/login/',
        '/logout/',
        '/static/',
        '/media/',
        '/api/',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        path = request.path
        is_api_request = path.startswith('/api/')

        # For non-API exempt URLs (login, static, etc.), skip school context
        non_api_exempt = [url for url in self.EXEMPT_URLS if url != '/api/']
        if any(path.startswith(url) for url in non_api_exempt):
            request.school = None
            return self.get_response(request)

        # If user is not authenticated, just continue
        if not request.user.is_authenticated:
            request.school = None
            return self.get_response(request)

        # Try session first (works for browser requests)
        school_id = request.session.get('school_id')
        if school_id:
            try:
                request.school = School.objects.get(id=school_id)
                return self.get_response(request)
            except School.DoesNotExist:
                request.session.flush()

        # No session school — look up from UserSchool (covers API/token requests)
        user_school = UserSchool.objects.filter(
            user=request.user,
            is_primary=True,
            is_active=True
        ).select_related('school').first()

        if not user_school:
            user_school = UserSchool.objects.filter(
                user=request.user,
                is_active=True
            ).select_related('school').first()

        if user_school:
            request.session['school_id'] = user_school.school.id
            request.session['school_name'] = user_school.school.name
            request.school = user_school.school
        else:
            request.school = None
            # Only redirect browser requests, not API requests
            if not is_api_request:
                return redirect('logout')

        response = self.get_response(request)
        return response
