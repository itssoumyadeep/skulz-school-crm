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
        # Check if URL is exempt
        path = request.path
        if any(path.startswith(url) for url in self.EXEMPT_URLS):
            request.school = None
            return self.get_response(request)
        
        # If user is not authenticated, just continue
        if not request.user.is_authenticated:
            request.school = None
            return self.get_response(request)
        
        # Check if school is in session
        school_id = request.session.get('school_id')
        
        if not school_id:
            # Try to get user's primary school
            user_school = UserSchool.objects.filter(
                user=request.user,
                is_primary=True,
                is_active=True
            ).select_related('school').first()
            
            if user_school:
                request.session['school_id'] = user_school.school.id
                request.session['school_name'] = user_school.school.name
                request.school = user_school.school
            else:
                # Check if user has any schools
                first_school = UserSchool.objects.filter(
                    user=request.user,
                    is_active=True
                ).select_related('school').first()
                
                if first_school:
                    request.session['school_id'] = first_school.school.id
                    request.session['school_name'] = first_school.school.name
                    request.school = first_school.school
                    return redirect('school_selection')
                else:
                    request.school = None
                    return redirect('logout')
        else:
            try:
                request.school = School.objects.get(id=school_id)
            except School.DoesNotExist:
                request.session.flush()
                return redirect('login')
        
        response = self.get_response(request)
        return response
