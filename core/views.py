from django.shortcuts import render


def parent_portal(request):
	"""Render the sample parent-facing portal shell.

	The dashboard intentionally uses fixture-like content until the parent
	business object/API is connected in a later sprint.
	"""
	return render(request, 'core/parent_portal.html')
