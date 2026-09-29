from django.contrib import admin
from .models import (
    Tenant, TenantSequence, Student, Application,
    Parent, EmergencyContact, Document, AuditLog,
    Curriculum, AcademicCalendar, LessonPlan,
    Assignment, Exam, MarksRecord, ReportCard,
    StudentAttendance, StaffAttendance, LeaveRequest,
    AttendanceRoster, StudentHealth, HealthObservation,
    MedicationLog, Incident, SafetyDrill,
    FeeStructure, Invoice, Payment, DiscountWaiver, Reconciliation,
    Staff, Contract, PayrollRun, Appraisal, CPDRecord,
    Vendor, Requisition, PurchaseOrder, DeliveryRecord, VendorInvoice,
    Inventory, AnalyticsSnapshot, CustomReport, ReportSchedule,
    WebhookSubscription, WebhookDeliveryAttempt,
    Event, EventRegistration, EventVolunteer, EventReport,
    Message, NotificationRule,
)

@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ('name', 'subdomain', 'type', 'subscription_tier', 'region', 'created_at')
    search_fields = ('name', 'subdomain')


@admin.register(TenantSequence)
class TenantSequenceAdmin(admin.ModelAdmin):
    list_display = ('tenant', 'sequence_type', 'year', 'last_value')
    list_filter = ('sequence_type', 'year', 'tenant')


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ('student_number', 'name', 'grade', 'status', 'dob', 'enrolled_date', 'tenant')
    list_filter = ('status', 'grade', 'tenant')
    search_fields = ('student_number', 'name')


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('application_id', 'student', 'status', 'applied_date', 'decision_date', 'payment_confirmed', 'tenant')
    list_filter = ('status', 'payment_confirmed', 'tenant')


@admin.register(Parent)
class ParentAdmin(admin.ModelAdmin):
    list_display = ('name', 'relationship', 'email', 'phone', 'student', 'tenant')
    search_fields = ('name', 'email', 'phone')


@admin.register(EmergencyContact)
class EmergencyContactAdmin(admin.ModelAdmin):
    list_display = ('name', 'relationship', 'phone', 'medical_consent', 'student', 'tenant')
    list_filter = ('medical_consent', 'tenant')
    search_fields = ('name', 'phone')


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('document_id', 'doc_type', 'verified', 'verified_at', 'application', 'tenant')
    list_filter = ('verified', 'doc_type', 'tenant')


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'action', 'entity', 'entity_id', 'actor_id', 'tenant')
    list_filter = ('action', 'entity', 'tenant')
    readonly_fields = ('timestamp',)


@admin.register(Curriculum)
class CurriculumAdmin(admin.ModelAdmin):
    list_display = ('grade', 'version', 'tenant', 'created_at')
    list_filter = ('grade', 'version', 'tenant')


@admin.register(AcademicCalendar)
class AcademicCalendarAdmin(admin.ModelAdmin):
    list_display = ('academic_year', 'tenant', 'created_at')
    list_filter = ('academic_year', 'tenant')


@admin.register(LessonPlan)
class LessonPlanAdmin(admin.ModelAdmin):
    list_display = ('topic', 'week', 'status', 'curriculum', 'tenant')
    list_filter = ('status', 'week', 'tenant')


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ('title', 'subject', 'due_date', 'max_marks', 'tenant')
    list_filter = ('subject', 'due_date', 'tenant')


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ('name', 'exam_type', 'date', 'start_time', 'end_time', 'status', 'tenant')
    list_filter = ('exam_type', 'status', 'date', 'tenant')


@admin.register(MarksRecord)
class MarksRecordAdmin(admin.ModelAdmin):
    list_display = ('student', 'exam', 'subject', 'marks', 'max_marks', 'grade', 'locked', 'tenant')
    list_filter = ('subject', 'grade', 'locked', 'tenant')


@admin.register(ReportCard)
class ReportCardAdmin(admin.ModelAdmin):
    list_display = ('student', 'term', 'year', 'overall_grade', 'gpa', 'is_published', 'tenant')
    list_filter = ('term', 'year', 'overall_grade', 'is_published', 'tenant')


@admin.register(StudentAttendance)
class StudentAttendanceAdmin(admin.ModelAdmin):
    list_display = ('student', 'class_id', 'date', 'status', 'method', 'notified_parent', 'tenant')
    list_filter = ('status', 'date', 'tenant')


@admin.register(StaffAttendance)
class StaffAttendanceAdmin(admin.ModelAdmin):
    list_display = ('staff_id', 'date', 'status', 'check_in', 'check_out', 'substitute_id', 'tenant')
    list_filter = ('status', 'date', 'tenant')


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ('requester_type', 'leave_type', 'start_date', 'end_date', 'status', 'tenant')
    list_filter = ('status', 'leave_type', 'requester_type', 'tenant')


@admin.register(AttendanceRoster)
class AttendanceRosterAdmin(admin.ModelAdmin):
    list_display = ('class_id', 'date', 'window_start', 'window_end', 'tenant')
    list_filter = ('date', 'tenant')


@admin.register(StudentHealth)
class StudentHealthAdmin(admin.ModelAdmin):
    list_display = ('student', 'doctor_name', 'consent_flag', 'tenant')
    list_filter = ('consent_flag', 'tenant')


@admin.register(HealthObservation)
class HealthObservationAdmin(admin.ModelAdmin):
    list_display = ('student', 'date', 'mood', 'appetite', 'staff_id', 'tenant')
    list_filter = ('mood', 'appetite', 'date', 'tenant')


@admin.register(MedicationLog)
class MedicationLogAdmin(admin.ModelAdmin):
    list_display = ('student', 'medicine_name', 'dose', 'time_administered', 'parent_notified', 'tenant')
    list_filter = ('medicine_name', 'parent_notified', 'tenant')


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = ('incident_type', 'severity', 'date', 'location', 'escalated_to_principal', 'tenant')
    list_filter = ('severity', 'incident_type', 'escalated_to_principal', 'tenant')


@admin.register(SafetyDrill)
class SafetyDrillAdmin(admin.ModelAdmin):
    list_display = ('drill_type', 'scheduled_date', 'participation_rate', 'signed_off', 'tenant')
    list_filter = ('drill_type', 'signed_off', 'tenant')


@admin.register(FeeStructure)
class FeeStructureAdmin(admin.ModelAdmin):
    list_display = ('grade', 'term', 'version', 'tenant')
    list_filter = ('grade', 'term', 'tenant')


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_id', 'student', 'parent', 'status', 'total', 'due_date', 'tenant')
    list_filter = ('status', 'tenant')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('invoice', 'parent', 'amount', 'status', 'date', 'tenant')
    list_filter = ('status', 'tenant')


@admin.register(DiscountWaiver)
class DiscountWaiverAdmin(admin.ModelAdmin):
    list_display = ('student', 'invoice', 'discount_type', 'amount', 'approved_by', 'tenant')
    list_filter = ('discount_type', 'tenant')


@admin.register(Reconciliation)
class ReconciliationAdmin(admin.ModelAdmin):
    list_display = ('period', 'total_invoiced', 'total_collected', 'status', 'tenant')
    list_filter = ('status', 'tenant')


@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = ('name', 'role', 'dept', 'employment_type', 'active', 'tenant')
    list_filter = ('role', 'dept', 'active', 'tenant')
    search_fields = ('name', 'role', 'dept')


@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ('staff_id', 'contract_type', 'start_date', 'end_date', 'tenant')
    list_filter = ('contract_type', 'tenant')


@admin.register(PayrollRun)
class PayrollRunAdmin(admin.ModelAdmin):
    list_display = ('staff_id', 'period', 'base_salary', 'gross', 'net', 'status', 'tenant')
    list_filter = ('status', 'tenant')


@admin.register(Appraisal)
class AppraisalAdmin(admin.ModelAdmin):
    list_display = ('staff_id', 'cycle', 'self_score', 'manager_score', 'status', 'tenant')
    list_filter = ('status', 'tenant')


@admin.register(CPDRecord)
class CPDRecordAdmin(admin.ModelAdmin):
    list_display = ('staff_id', 'activity', 'activity_type', 'hours', 'completion_status', 'tenant')
    list_filter = ('completion_status', 'tenant')


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ('name', 'contact_name', 'phone', 'email', 'active', 'tenant')
    list_filter = ('active', 'tenant')
    search_fields = ('name', 'contact_name', 'email')


@admin.register(Requisition)
class RequisitionAdmin(admin.ModelAdmin):
    list_display = ('vendor', 'requester_id', 'item_name', 'quantity', 'amount', 'status', 'tenant')
    list_filter = ('status', 'tenant')


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ('po_number', 'vendor', 'amount', 'status', 'expected_delivery_date', 'tenant')
    list_filter = ('status', 'tenant')


@admin.register(DeliveryRecord)
class DeliveryRecordAdmin(admin.ModelAdmin):
    list_display = ('purchase_order', 'vendor', 'amount', 'delivered_at', 'accepted', 'tenant')
    list_filter = ('accepted', 'tenant')


@admin.register(VendorInvoice)
class VendorInvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'vendor', 'amount', 'status', 'verified', 'tenant')
    list_filter = ('status', 'verified', 'tenant')


@admin.register(Inventory)
class InventoryAdmin(admin.ModelAdmin):
    list_display = ('item_name', 'sku', 'quantity_on_hand', 'reorder_level', 'unit_cost', 'tenant')
    list_filter = ('tenant',)


@admin.register(AnalyticsSnapshot)
class AnalyticsSnapshotAdmin(admin.ModelAdmin):
    list_display = ('snapshot_date', 'role_scope', 'tenant')
    list_filter = ('role_scope', 'tenant')


@admin.register(CustomReport)
class CustomReportAdmin(admin.ModelAdmin):
    list_display = ('name', 'requested_role', 'status', 'generated_at', 'tenant')
    list_filter = ('status', 'tenant')


@admin.register(ReportSchedule)
class ReportScheduleAdmin(admin.ModelAdmin):
    list_display = ('report', 'cron_expression', 'active', 'next_run_at', 'tenant')
    list_filter = ('active', 'tenant')


@admin.register(WebhookSubscription)
class WebhookSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'target_url', 'active', 'retry_limit', 'tenant')
    list_filter = ('active', 'tenant')


@admin.register(WebhookDeliveryAttempt)
class WebhookDeliveryAttemptAdmin(admin.ModelAdmin):
    list_display = ('webhook', 'event_type', 'status', 'attempt_count', 'response_code', 'tenant')
    list_filter = ('status', 'tenant')


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'event_date', 'registration_deadline', 'location', 'status', 'tenant')
    list_filter = ('status', 'tenant')


@admin.register(EventRegistration)
class EventRegistrationAdmin(admin.ModelAdmin):
    list_display = ('event', 'participant_name', 'registration_status', 'payment_status', 'tenant')
    list_filter = ('registration_status', 'payment_status', 'tenant')


@admin.register(EventVolunteer)
class EventVolunteerAdmin(admin.ModelAdmin):
    list_display = ('event', 'volunteer_name', 'role', 'approved', 'tenant')
    list_filter = ('approved', 'tenant')


@admin.register(EventReport)
class EventReportAdmin(admin.ModelAdmin):
    list_display = ('event', 'attendees_count', 'revenue', 'expenses', 'published_at', 'tenant')
    list_filter = ('tenant',)


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('channel', 'subject', 'recipient_id', 'recipient_role', 'delivery_status', 'tenant')
    list_filter = ('channel', 'delivery_status', 'tenant')


@admin.register(NotificationRule)
class NotificationRuleAdmin(admin.ModelAdmin):
    list_display = ('trigger_event', 'channel', 'template_name', 'active', 'priority', 'tenant')
    list_filter = ('active', 'channel', 'tenant')
