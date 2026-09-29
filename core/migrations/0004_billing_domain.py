# Generated for The Purple Cubby Sprint 4 Billing & Fee Lifecycle
import uuid
import django.db.models.deletion
from django.db import migrations, models
from core.migrations.utils.rls import apply_rls_to_table, drop_rls_from_table


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_attendance_and_health'),
    ]

    operations = [
        migrations.CreateModel(
            name='FeeStructure',
            fields=[
                ('fee_struct_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('grade', models.CharField(max_length=50)),
                ('term', models.CharField(max_length=50)),
                ('components', models.JSONField(blank=True, default=list)),
                ('discount_rules', models.JSONField(blank=True, default=list)),
                ('penalty_rules', models.JSONField(blank=True, default=dict)),
                ('version', models.CharField(default='1.0', max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_fee_structure',
            },
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_fee_structure'),
            reverse_sql=drop_rls_from_table('core_fee_structure')
        ),
        migrations.CreateModel(
            name='Invoice',
            fields=[
                ('invoice_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('invoice_date', models.DateField()),
                ('due_date', models.DateField()),
                ('line_items', models.JSONField(blank=True, default=list)),
                ('total', models.DecimalField(decimal_places=2, max_digits=12)),
                ('status', models.CharField(choices=[('Draft', 'Draft'), ('Issued', 'Issued'), ('Partially_Paid', 'Partially Paid'), ('Paid', 'Paid'), ('Overdue', 'Overdue'), ('Waived', 'Waived'), ('Cancelled', 'Cancelled')], default='Draft', max_length=50)),
                ('invoice_type', models.CharField(default='Tuition', max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('fee_structure', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='invoices', to='core.feestructure')),
                ('parent', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='invoices', to='core.parent')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='invoices', to='core.student')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_invoice',
            },
        ),
        migrations.AddConstraint(
            model_name='invoice',
            constraint=models.CheckConstraint(check=models.Q(('total__gte', 0)), name='chk_invoice_total_non_negative'),
        ),
        migrations.AddConstraint(
            model_name='invoice',
            constraint=models.CheckConstraint(check=models.Q(('due_date__gte', models.F('invoice_date'))), name='chk_invoice_due_date_gte_invoice_date'),
        ),
        migrations.AddConstraint(
            model_name='invoice',
            constraint=models.CheckConstraint(check=models.Q(('status__in', ['Draft', 'Issued', 'Partially_Paid', 'Paid', 'Overdue', 'Waived', 'Cancelled'])), name='chk_invoice_status_enum'),
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_invoice'),
            reverse_sql=drop_rls_from_table('core_invoice')
        ),
        migrations.CreateModel(
            name='Payment',
            fields=[
                ('payment_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('date', models.DateTimeField(auto_now_add=True)),
                ('method', models.CharField(choices=[('Card', 'Credit/Debit Card'), ('UPI', 'UPI'), ('Bank_Transfer', 'Bank Transfer'), ('Cash', 'Cash'), ('Cheque', 'Cheque')], default='Card', max_length=50)),
                ('txn_ref', models.CharField(blank=True, max_length=255)),
                ('status', models.CharField(choices=[('Pending', 'Pending'), ('Completed', 'Completed'), ('Failed', 'Failed'), ('Refunded', 'Refunded')], default='Completed', max_length=50)),
                ('receipt_id', models.CharField(blank=True, max_length=100)),
                ('refund_amount', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('refunded_by', models.UUIDField(blank=True, null=True)),
                ('refund_date', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('invoice', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payments', to='core.invoice')),
                ('parent', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payments', to='core.parent')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_payment',
            },
        ),
        migrations.AddConstraint(
            model_name='payment',
            constraint=models.CheckConstraint(check=models.Q(('amount__gt', 0)), name='chk_payment_amount_positive'),
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_payment'),
            reverse_sql=drop_rls_from_table('core_payment')
        ),
        migrations.CreateModel(
            name='DiscountWaiver',
            fields=[
                ('discount_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('discount_type', models.CharField(choices=[('Sibling', 'Sibling'), ('Early_Bird', 'Early Bird'), ('Financial_Aid', 'Financial Aid'), ('Staff_Child', 'Staff Child'), ('Discretionary', 'Discretionary')], max_length=50)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('reason', models.TextField()),
                ('approved_by', models.UUIDField()),
                ('approval_date', models.DateTimeField(auto_now_add=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('invoice', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='discounts', to='core.invoice')),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='discounts', to='core.student')),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_discount_waiver',
            },
        ),
        migrations.AddConstraint(
            model_name='discountwaiver',
            constraint=models.CheckConstraint(check=models.Q(('amount__gt', 0)), name='chk_discount_amount_positive'),
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_discount_waiver'),
            reverse_sql=drop_rls_from_table('core_discount_waiver')
        ),
        migrations.CreateModel(
            name='Reconciliation',
            fields=[
                ('recon_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('period', models.CharField(max_length=50)),
                ('total_invoiced', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('total_collected', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('total_outstanding', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('adjustments', models.DecimalField(decimal_places=2, default=0.0, max_digits=12)),
                ('discrepancies', models.JSONField(blank=True, default=list)),
                ('status', models.CharField(choices=[('Draft', 'Draft'), ('Pending_Review', 'Pending Review'), ('Finalized', 'Finalized')], default='Draft', max_length=50)),
                ('finalized_by', models.UUIDField(blank=True, null=True)),
                ('finalized_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.UUIDField(blank=True, null=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('tenant', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='core.tenant')),
            ],
            options={
                'db_table': 'core_reconciliation',
            },
        ),
        migrations.AddConstraint(
            model_name='reconciliation',
            constraint=models.UniqueConstraint(fields=('tenant', 'period'), name='uq_reconciliation_tenant_period'),
        ),
        migrations.RunSQL(
            sql=apply_rls_to_table('core_reconciliation'),
            reverse_sql=drop_rls_from_table('core_reconciliation')
        ),
    ]
