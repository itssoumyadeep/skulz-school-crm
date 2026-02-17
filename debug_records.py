#!/usr/bin/env python
"""
Debug script to check records in the database
Run with: python debug_records.py
"""

import django
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'skubackend.settings')
django.setup()

from skucore.models import Record, StudentOnboardingRequest

print("=" * 80)
print("DEBUG: Checking Records in Database")
print("=" * 80)

# Check all onboarding requests
print("\n1. All Onboarding Requests:")
onboardings = StudentOnboardingRequest.objects.all()
print(f"   Total: {onboardings.count()}")

for onb in onboardings:
    print(f"\n   - ID: {onb.id}, Name: {onb.first_name} {onb.last_name}, Status: {onb.status}")
    
    # Check records for this onboarding
    records = onb.records.all()
    print(f"     Records: {records.count()}")
    
    for rec in records:
        print(f"       - Type: {rec.record_type}, File: {rec.file}, Description: {rec.description}")

# Check all records
print("\n2. All Records (Total):")
all_records = Record.objects.all()
print(f"   Total Records in Database: {all_records.count()}")

for rec in all_records:
    if rec.onboarding_request:
        print(f"   - ID: {rec.id}, Type: {rec.record_type}, OnboardingRequest: {rec.onboarding_request.id}, File: {rec.file}")
    elif rec.student:
        print(f"   - ID: {rec.id}, Type: {rec.record_type}, Student: {rec.student.id}, File: {rec.file}")
    else:
        print(f"   - ID: {rec.id}, Type: {rec.record_type}, File: {rec.file} (ORPHANED)")

print("\n" + "=" * 80)
