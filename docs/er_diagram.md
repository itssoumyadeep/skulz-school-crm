# School CRM ER Diagram

This diagram is intentionally kept in Mermaid source format so it can be edited easily in VS Code, GitHub, or any Mermaid-capable viewer.

```mermaid
erDiagram
    TENANT {
        UUID tenant_id PK
        string name
        string subdomain
        string type
        string subscription_tier
        string region
        json config
    }

    TENANT_SEQUENCE {
        UUID sequence_id PK
        UUID tenant_id FK
        string sequence_type
        int year
        int last_value
    }

    STUDENT {
        UUID student_id PK
        UUID tenant_id FK
        string student_number
        UUID class_id
        string name
        date dob
        string grade
        string section
        string class_teacher
        string status
        date enrolled_date
    }

    APPLICATION {
        UUID application_id PK
        UUID tenant_id FK
        UUID student_id FK
        string status
        datetime applied_date
        datetime decision_date
        UUID decided_by
        bool payment_confirmed
        bool notification_dispatched
    }

    PARENT {
        UUID parent_id PK
        UUID tenant_id FK
        UUID student_id FK
        string name
        string relationship
        string phone
        string email
        json notification_prefs
        bool media_consent
    }

    EMERGENCY_CONTACT {
        UUID contact_id PK
        UUID tenant_id FK
        UUID student_id FK
        string name
        string phone
        string relationship
        bool medical_consent
        datetime consent_date
    }

    DOCUMENT {
        UUID document_id PK
        UUID tenant_id FK
        UUID application_id FK
        string doc_type
        string file_path
        bool verified
        UUID verified_by
        datetime verified_at
    }

    AUDIT_LOG {
        UUID log_id PK
        UUID tenant_id FK
        UUID actor_id
        string action
        string entity
        string entity_id
        json old_values
        json new_values
        string ip_address
        datetime timestamp
    }

    CURRICULUM {
        UUID curriculum_id PK
        UUID tenant_id FK
        string grade
        json subjects
        json learning_outcomes
        string version
        UUID approved_by
    }

    ACADEMIC_CALENDAR {
        UUID calendar_id PK
        UUID tenant_id FK
        string academic_year
        json terms
        json holidays
        json exam_weeks
        json blackout_dates
    }

    LESSON_PLAN {
        UUID plan_id PK
        UUID tenant_id FK
        UUID teacher_id
        UUID class_id
        UUID curriculum_id FK
        int week
        string topic
        json learning_outcomes
        string status
        UUID reviewed_by
    }

    ASSIGNMENT {
        UUID assignment_id PK
        UUID tenant_id FK
        UUID teacher_id
        UUID class_id
        string subject
        string title
        string description
        date due_date
        decimal max_marks
        json submission_tracking
    }

    EXAM {
        UUID exam_id PK
        UUID tenant_id FK
        UUID class_id
        UUID calendar_id FK
        string name
        string exam_type
        date date
        string start_time
        string end_time
        int duration_mins
        string room
        UUID invigilator_id
        decimal max_marks
        string status
    }

    MARKS_RECORD {
        UUID marks_id PK
        UUID tenant_id FK
        UUID student_id FK
        UUID exam_id FK
        UUID teacher_id
        string subject
        decimal marks
        decimal max_marks
        string grade
        bool locked
        UUID moderated_by
        datetime moderation_date
    }

    REPORT_CARD {
        UUID report_id PK
        UUID tenant_id FK
        UUID student_id FK
        UUID calendar_id FK
        string term
        int year
        string overall_grade
        decimal gpa
        json subject_grades
        decimal attendance_percentage
        date published_date
        bool is_published
        bool parent_ack
        datetime parent_ack_date
    }

    STUDENT_ATTENDANCE {
        UUID att_id PK
        UUID tenant_id FK
        UUID student_id FK
        UUID class_id
        date date
        string period
        string status
        string method
        UUID marked_by
        bool notified_parent
        bool locked
        datetime locked_at
    }

    STAFF_ATTENDANCE {
        UUID staff_att_id PK
        UUID tenant_id FK
        UUID staff_id
        date date
        string check_in
        string check_out
        string method
        string status
        UUID substitute_id
        float latitude
        float longitude
        bool geofence_verified
    }

    LEAVE_REQUEST {
        UUID leave_id PK
        UUID tenant_id FK
        UUID requester_id
        string requester_type
        string leave_type
        date start_date
        date end_date
        decimal days
        string reason
        string status
        UUID approved_by
        datetime approval_date
        decimal balance_before
        decimal balance_after
    }

    ATTENDANCE_ROSTER {
        UUID roster_id PK
        UUID tenant_id FK
        UUID class_id
        date date
        string window_start
        string window_end
        datetime generated_at
    }

    STUDENT_HEALTH {
        UUID health_id PK
        UUID tenant_id FK
        UUID student_id FK
        json allergies
        json conditions
        json medications
        json vaccinations
        string doctor_name
        string doctor_phone
        bool consent_flag
        datetime consent_date
    }

    HEALTH_OBSERVATION {
        UUID obs_id PK
        UUID tenant_id FK
        UUID student_id FK
        UUID staff_id
        date date
        string mood
        string appetite
        int nap_duration_mins
        text feeding_notes
        text general_notes
    }

    MEDICATION_LOG {
        UUID med_log_id PK
        UUID tenant_id FK
        UUID student_id FK
        UUID staff_id
        string medicine_name
        string dose
        datetime time_administered
        bool parent_notified
        text notes
    }

    INCIDENT {
        UUID incident_id PK
        UUID tenant_id FK
        string incident_type
        string severity
        date date
        string time
        string location
        json students
        json staff
        text description
        text actions_taken
        UUID acknowledged_by
        datetime acknowledged_at
        bool escalated_to_principal
        bool parent_notified
    }

    SAFETY_DRILL {
        UUID drill_id PK
        UUID tenant_id FK
        string drill_type
        date scheduled_date
        int duration_seconds
        decimal participation_rate
        json issues_noted
        UUID completed_by
        bool signed_off
    }

    FEE_STRUCTURE {
        UUID fee_struct_id PK
        UUID tenant_id FK
        string grade
        string term
        json components
        json discount_rules
        json penalty_rules
        string version
    }

    INVOICE {
        UUID invoice_id PK
        UUID tenant_id FK
        UUID student_id FK
        UUID parent_id FK
        UUID fee_structure_id FK
        date invoice_date
        date due_date
        json line_items
        decimal total
        string status
        string invoice_type
    }

    PAYMENT {
        UUID payment_id PK
        UUID tenant_id FK
        UUID invoice_id FK
        UUID parent_id FK
        decimal amount
        datetime date
        string method
        string txn_ref
        string status
        string receipt_id
        decimal refund_amount
        UUID refunded_by
        datetime refund_date
    }

    DISCOUNT_WAIVER {
        UUID discount_id PK
        UUID tenant_id FK
        UUID invoice_id FK
        UUID student_id FK
        string discount_type
        decimal amount
        text reason
        UUID approved_by
        datetime approval_date
    }

    RECONCILIATION {
        UUID recon_id PK
        UUID tenant_id FK
        string period
        decimal total_invoiced
        decimal total_collected
        decimal total_outstanding
        decimal adjustments
        json discrepancies
        string status
        UUID finalized_by
        datetime finalized_at
    }

    STAFF {
        UUID staff_id PK
        UUID tenant_id FK
        string name
        string role
        string dept
        string employment_type
        date start_date
        decimal salary
        json certifications
        string dbs_ref
        date dbs_expiry
        bool active
    }

    CONTRACT {
        UUID contract_id PK
        UUID tenant_id FK
        UUID staff_id
        string contract_type
        date start_date
        date end_date
        datetime esigned_at
        bool renewal_alert_sent
    }

    PAYROLL_RUN {
        UUID payroll_id PK
        UUID tenant_id FK
        UUID staff_id
        string period
        decimal base_salary
        json allowances
        json deductions
        decimal gross
        decimal net
        string status
        UUID approved_by
        datetime approved_at
        decimal leave_deduction
    }

    APPRAISAL {
        UUID appraisal_id PK
        UUID tenant_id FK
        UUID staff_id
        UUID appraiser_id
        string cycle
        decimal self_score
        decimal manager_score
        string outcome
        string status
        text notes
    }

    CPD_RECORD {
        UUID cpd_id PK
        UUID tenant_id FK
        UUID staff_id
        string activity
        string activity_type
        decimal hours
        bool mandatory
        string completion_status
        datetime completed_at
    }

    VENDOR {
        UUID vendor_id PK
        UUID tenant_id FK
        string name
        string contact_name
        string phone
        string email
        string payment_terms
        bool active
    }

    REQUISITION {
        UUID requisition_id PK
        UUID tenant_id FK
        UUID vendor_id FK
        UUID requester_id
        string item_name
        int quantity
        decimal amount
        text reason
        string status
        UUID approved_by
        datetime approved_at
    }

    PURCHASE_ORDER {
        UUID po_id PK
        UUID tenant_id FK
        UUID vendor_id FK
        UUID requisition_id FK
        string po_number
        decimal amount
        date expected_delivery_date
        string status
        UUID approved_by
        datetime approved_at
    }

    DELIVERY_RECORD {
        UUID delivery_id PK
        UUID tenant_id FK
        UUID purchase_order_id FK
        UUID vendor_id FK
        decimal amount
        datetime delivered_at
        UUID received_by
        text notes
        bool accepted
    }

    VENDOR_INVOICE {
        UUID vendor_invoice_id PK
        UUID tenant_id FK
        UUID vendor_id FK
        UUID purchase_order_id FK
        string invoice_number
        decimal amount
        date due_date
        string status
        bool verified
        UUID approved_by
        datetime approved_at
    }

    INVENTORY {
        UUID inventory_id PK
        UUID tenant_id FK
        UUID vendor_id FK
        string item_name
        string sku
        int quantity_on_hand
        int reorder_level
        decimal unit_cost
        date last_restocked
    }

    ANALYTICS_SNAPSHOT {
        UUID snapshot_id PK
        UUID tenant_id FK
        date snapshot_date
        string role_scope
        json metrics
    }

    CUSTOM_REPORT {
        UUID report_id PK
        UUID tenant_id FK
        string name
        UUID requested_by
        string requested_role
        json fields
        json filters
        json group_by
        string status
        json result
        datetime generated_at
    }

    REPORT_SCHEDULE {
        UUID schedule_id PK
        UUID tenant_id FK
        UUID report_id FK
        string cron_expression
        bool active
        string destination
        datetime next_run_at
        datetime last_run_at
    }

    WEBHOOK_SUBSCRIPTION {
        UUID webhook_id PK
        UUID tenant_id FK
        string event_type
        string target_url
        string secret
        bool active
        int retry_limit
    }

    WEBHOOK_DELIVERY_ATTEMPT {
        UUID delivery_id PK
        UUID tenant_id FK
        UUID webhook_id FK
        string event_type
        json payload
        string signature
        string status
        int attempt_count
        int response_code
        text response_body
        datetime next_retry_at
    }

    EVENT {
        UUID event_id PK
        UUID tenant_id FK
        string title
        date event_date
        date registration_deadline
        string location
        text description
        decimal fee_amount
        int capacity
        bool requires_permission_slip
        string status
    }

    EVENT_REGISTRATION {
        UUID registration_id PK
        UUID tenant_id FK
        UUID event_id FK
        string participant_name
        string participant_email
        string participant_phone
        string registration_status
        bool permission_slip_received
        string payment_status
    }

    EVENT_VOLUNTEER {
        UUID volunteer_id PK
        UUID tenant_id FK
        UUID event_id FK
        string volunteer_name
        string role
        string phone
        bool approved
        text notes
    }

    EVENT_REPORT {
        UUID report_id PK
        UUID tenant_id FK
        UUID event_id FK
        int attendees_count
        decimal revenue
        decimal expenses
        text summary
        datetime published_at
    }

    MESSAGE {
        UUID message_id PK
        UUID tenant_id FK
        UUID recipient_id
        string recipient_role
        string channel
        string subject
        text body
        string trigger_event
        json payload
        string delivery_status
        bool opt_out_ignored
        datetime delivery_confirmed_at
    }

    NOTIFICATION_RULE {
        UUID rule_id PK
        UUID tenant_id FK
        string trigger_event
        string channel
        string template_name
        json conditions
        bool active
        int priority
        bool emergency
    }

    TENANT ||--o{ TENANT_SEQUENCE : issues
    TENANT ||--o{ STUDENT : owns
    TENANT ||--o{ APPLICATION : hosts
    TENANT ||--o{ PARENT : manages
    TENANT ||--o{ EMERGENCY_CONTACT : manages
    TENANT ||--o{ DOCUMENT : stores
    TENANT ||--o{ AUDIT_LOG : tracks
    TENANT ||--o{ CURRICULUM : defines
    TENANT ||--o{ ACADEMIC_CALENDAR : maintains
    TENANT ||--o{ LESSON_PLAN : owns
    TENANT ||--o{ ASSIGNMENT : owns
    TENANT ||--o{ EXAM : schedules
    TENANT ||--o{ MARKS_RECORD : tracks
    TENANT ||--o{ REPORT_CARD : publishes
    TENANT ||--o{ STUDENT_ATTENDANCE : records
    TENANT ||--o{ STAFF_ATTENDANCE : records
    TENANT ||--o{ LEAVE_REQUEST : manages
    TENANT ||--o{ ATTENDANCE_ROSTER : defines
    TENANT ||--o{ STUDENT_HEALTH : stores
    TENANT ||--o{ HEALTH_OBSERVATION : logs
    TENANT ||--o{ MEDICATION_LOG : logs
    TENANT ||--o{ INCIDENT : records
    TENANT ||--o{ SAFETY_DRILL : schedules
    TENANT ||--o{ FEE_STRUCTURE : configures
    TENANT ||--o{ INVOICE : bills
    TENANT ||--o{ PAYMENT : settles
    TENANT ||--o{ DISCOUNT_WAIVER : authorizes
    TENANT ||--o{ RECONCILIATION : closes
    TENANT ||--o{ STAFF : employs
    TENANT ||--o{ CONTRACT : manages
    TENANT ||--o{ PAYROLL_RUN : processes
    TENANT ||--o{ APPRAISAL : evaluates
    TENANT ||--o{ CPD_RECORD : logs
    TENANT ||--o{ VENDOR : manages
    TENANT ||--o{ REQUISITION : approves
    TENANT ||--o{ PURCHASE_ORDER : issues
    TENANT ||--o{ DELIVERY_RECORD : tracks
    TENANT ||--o{ VENDOR_INVOICE : verifies
    TENANT ||--o{ INVENTORY : tracks
    TENANT ||--o{ ANALYTICS_SNAPSHOT : aggregates
    TENANT ||--o{ CUSTOM_REPORT : creates
    TENANT ||--o{ REPORT_SCHEDULE : schedules
    TENANT ||--o{ WEBHOOK_SUBSCRIPTION : configures
    TENANT ||--o{ WEBHOOK_DELIVERY_ATTEMPT : monitors
    TENANT ||--o{ EVENT : hosts
    TENANT ||--o{ EVENT_REGISTRATION : tracks
    TENANT ||--o{ EVENT_VOLUNTEER : manages
    TENANT ||--o{ EVENT_REPORT : publishes
    TENANT ||--o{ MESSAGE : sends
    TENANT ||--o{ NOTIFICATION_RULE : configures

    STUDENT ||--o{ APPLICATION : has
    STUDENT ||--o{ PARENT : has
    STUDENT ||--o{ EMERGENCY_CONTACT : has
    STUDENT ||--o{ DOCUMENT : has
    STUDENT ||--o{ STUDENT_ATTENDANCE : attends
    STUDENT ||--o{ MARKS_RECORD : receives
    STUDENT ||--o{ REPORT_CARD : receives
    STUDENT ||--o{ STUDENT_HEALTH : has
    STUDENT ||--o{ HEALTH_OBSERVATION : has
    STUDENT ||--o{ MEDICATION_LOG : receives
    STUDENT ||--o{ INVOICE : receives
    STUDENT ||--o{ DISCOUNT_WAIVER : qualifies_for
    STUDENT ||--o{ EVENT_REGISTRATION : participates_in

    APPLICATION ||--o{ DOCUMENT : includes

    CURRICULUM ||--o{ LESSON_PLAN : powers
    ACADEMIC_CALENDAR ||--o{ EXAM : defines
    ACADEMIC_CALENDAR ||--o{ REPORT_CARD : scopes

    STAFF ||--o{ STAFF_ATTENDANCE : records
    STAFF ||--o{ LEAVE_REQUEST : requests
    STAFF ||--o{ CONTRACT : has
    STAFF ||--o{ PAYROLL_RUN : gets
    STAFF ||--o{ APPRAISAL : receives
    STAFF ||--o{ CPD_RECORD : maintains

    VENDOR ||--o{ REQUISITION : receives
    VENDOR ||--o{ PURCHASE_ORDER : fulfills
    VENDOR ||--o{ DELIVERY_RECORD : ships
    VENDOR ||--o{ VENDOR_INVOICE : invoices
    VENDOR ||--o{ INVENTORY : supplies

    PURCHASE_ORDER ||--o{ DELIVERY_RECORD : has
    PURCHASE_ORDER ||--o{ VENDOR_INVOICE : supports
    REQUISITION ||--o{ PURCHASE_ORDER : generates

    INVOICE ||--o{ PAYMENT : receives
    INVOICE ||--o{ DISCOUNT_WAIVER : applies
    PARENT ||--o{ INVOICE : owns
    PARENT ||--o{ PAYMENT : makes

    EVENT ||--o{ EVENT_REGISTRATION : has
    EVENT ||--o{ EVENT_VOLUNTEER : recruits
    EVENT ||--o{ EVENT_REPORT : summarizes

    WEBHOOK_SUBSCRIPTION ||--o{ WEBHOOK_DELIVERY_ATTEMPT : logs
    CUSTOM_REPORT ||--o{ REPORT_SCHEDULE : schedules
```

## Notes

- This diagram covers the main domain model from [core/models.py](core/models.py).
- Fields are intentionally abbreviated for readability; the Mermaid source remains editable and easy to expand.
- For a more detailed schema view, you can add additional attributes or split the diagram into domain-specific sections such as core enrollment, academics, billing, or HR.
