"""0005_phase9_enterprise_multi_tenancy

Revision ID: 0005_phase9
Revises: 0004_phase8
Create Date: 2026-10-17 17:30:00
"""
from typing import Sequence, Union
from datetime import datetime, timezone, timedelta
import uuid
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0005_phase9'
down_revision: Union[str, None] = '0004_phase8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. organizations
    op.create_table(
        'organizations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(100), unique=True, nullable=False),
        sa.Column('domain', sa.String(255), nullable=True),
        sa.Column('status', sa.String(50), server_default='ACTIVE'),
        sa.Column('plan_tier', sa.String(50), server_default='STARTER'),
        sa.Column('is_demo', sa.Boolean(), server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_org_name', 'organizations', ['name'])
    op.create_index('idx_org_slug', 'organizations', ['slug'])
    op.create_index('idx_org_status', 'organizations', ['status'])
    op.create_index('idx_org_plan', 'organizations', ['plan_tier'])

    # 2. organization_memberships
    op.create_table(
        'organization_memberships',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('organization_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(50), server_default='ANALYST'),
        sa.Column('is_active', sa.Boolean(), server_default='1'),
        sa.Column('joined_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('organization_id', 'user_id', name='uq_org_membership_user')
    )
    op.create_index('idx_org_member_org', 'organization_memberships', ['organization_id'])
    op.create_index('idx_org_member_user', 'organization_memberships', ['user_id'])
    op.create_index('idx_org_member_role', 'organization_memberships', ['role'])

    # 3. organization_invitations
    op.create_table(
        'organization_invitations',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('organization_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('role', sa.String(50), server_default='ANALYST'),
        sa.Column('token', sa.String(255), unique=True, nullable=False),
        sa.Column('invited_by_user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(50), server_default='PENDING'),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_org_inv_org', 'organization_invitations', ['organization_id'])
    op.create_index('idx_org_inv_email', 'organization_invitations', ['email'])
    op.create_index('idx_org_inv_token', 'organization_invitations', ['token'])
    op.create_index('idx_org_inv_status', 'organization_invitations', ['status'])

    # 4. organization_settings
    op.create_table(
        'organization_settings',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('organization_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('permitted_geographic_markets_json', sa.Text(), server_default='["FL"]'),
        sa.Column('monitored_competitors_json', sa.Text(), server_default='[]'),
        sa.Column('custom_opportunity_weights_json', sa.Text(), server_default='{}'),
        sa.Column('alert_thresholds_json', sa.Text(), server_default='{}'),
        sa.Column('notification_email', sa.String(255), nullable=True),
        sa.Column('onboarding_status', sa.String(50), server_default='COMPLETED'),
        sa.Column('onboarding_step', sa.Integer(), server_default='5'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_org_settings_status', 'organization_settings', ['onboarding_status'])

    # 5. organization_subscriptions
    op.create_table(
        'organization_subscriptions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('organization_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('plan_tier', sa.String(50), server_default='STARTER'),
        sa.Column('status', sa.String(50), server_default='ACTIVE'),
        sa.Column('billing_cycle', sa.String(50), server_default='MONTHLY'),
        sa.Column('current_period_start', sa.DateTime(), nullable=False),
        sa.Column('current_period_end', sa.DateTime(), nullable=False),
        sa.Column('cancel_at_period_end', sa.Boolean(), server_default='0'),
        sa.Column('provider_name', sa.String(50), server_default='STRIPE'),
        sa.Column('provider_subscription_id', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_org_sub_tier', 'organization_subscriptions', ['plan_tier'])
    op.create_index('idx_org_sub_status', 'organization_subscriptions', ['status'])

    # 6. billing_customers
    op.create_table(
        'billing_customers',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('organization_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('provider_name', sa.String(50), server_default='STRIPE'),
        sa.Column('provider_customer_id', sa.String(255), unique=True, nullable=False),
        sa.Column('billing_email', sa.String(255), nullable=False),
        sa.Column('currency', sa.String(10), server_default='usd'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_billing_cust_provider_id', 'billing_customers', ['provider_customer_id'])

    # 7. billing_invoices
    op.create_table(
        'billing_invoices',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('organization_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('invoice_number', sa.String(100), unique=True, nullable=False),
        sa.Column('amount_due_usd', sa.Float(), server_default='0.0'),
        sa.Column('amount_paid_usd', sa.Float(), server_default='0.0'),
        sa.Column('status', sa.String(50), server_default='PAID'),
        sa.Column('period_start', sa.DateTime(), nullable=False),
        sa.Column('period_end', sa.DateTime(), nullable=False),
        sa.Column('pdf_url', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_invoice_org', 'billing_invoices', ['organization_id'])
    op.create_index('idx_invoice_num', 'billing_invoices', ['invoice_number'])
    op.create_index('idx_invoice_status', 'billing_invoices', ['status'])

    # 8. billing_webhook_events
    op.create_table(
        'billing_webhook_events',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('provider_name', sa.String(50), server_default='STRIPE'),
        sa.Column('event_id', sa.String(255), unique=True, nullable=False),
        sa.Column('event_type', sa.String(100), nullable=False),
        sa.Column('payload_json', sa.Text(), nullable=False),
        sa.Column('status', sa.String(50), server_default='PROCESSED'),
        sa.Column('processed_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_webhook_prov', 'billing_webhook_events', ['provider_name'])
    op.create_index('idx_webhook_eid', 'billing_webhook_events', ['event_id'])
    op.create_index('idx_webhook_type', 'billing_webhook_events', ['event_type'])

    # 9. tenant_usage_records
    op.create_table(
        'tenant_usage_records',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('organization_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('metric_name', sa.String(100), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('period_key', sa.String(20), nullable=False),
        sa.Column('source_ref', sa.String(255), server_default=''),
        sa.Column('idempotency_key', sa.String(255), unique=True, nullable=True),
        sa.Column('recorded_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_usage_org', 'tenant_usage_records', ['organization_id'])
    op.create_index('idx_usage_metric', 'tenant_usage_records', ['metric_name'])
    op.create_index('idx_usage_period', 'tenant_usage_records', ['period_key'])
    op.create_index('idx_usage_idemp', 'tenant_usage_records', ['idempotency_key'])

    # 10. tenant_audit_logs
    op.create_table(
        'tenant_audit_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('organization_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('actor_user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('actor_email', sa.String(255), nullable=False),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('target_type', sa.String(100), nullable=False),
        sa.Column('target_id', sa.String(255), server_default=''),
        sa.Column('metadata_json', sa.Text(), server_default='{}'),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_audit_org', 'tenant_audit_logs', ['organization_id'])
    op.create_index('idx_audit_action', 'tenant_audit_logs', ['action'])
    op.create_index('idx_audit_time', 'tenant_audit_logs', ['created_at'])

    # 11. tenant_api_keys
    op.create_table(
        'tenant_api_keys',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('organization_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('key_prefix', sa.String(32), nullable=False),
        sa.Column('hashed_key', sa.String(255), nullable=False),
        sa.Column('scopes_json', sa.Text(), server_default='["intelligence:read"]'),
        sa.Column('is_active', sa.Boolean(), server_default='1'),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_api_key_org', 'tenant_api_keys', ['organization_id'])
    op.create_index('idx_api_key_prefix', 'tenant_api_keys', ['key_prefix'])

    # 12. tenant_webhooks
    op.create_table(
        'tenant_webhooks',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('organization_id', sa.String(36), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('target_url', sa.String(500), nullable=False),
        sa.Column('signing_secret', sa.String(255), nullable=False),
        sa.Column('events_json', sa.Text(), server_default='["finding.validated","alert.created"]'),
        sa.Column('is_active', sa.Boolean(), server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_twebhook_org', 'tenant_webhooks', ['organization_id'])

    # 13. Add organization_id column to projects & research_projects if they exist
    bind = op.get_bind()
    insp = sa.inspect(bind)
    table_names = insp.get_table_names()

    if 'projects' in table_names:
        cols = [c['name'] for c in insp.get_columns('projects')]
        if 'organization_id' not in cols:
            with op.batch_alter_table('projects') as batch_op:
                batch_op.add_column(sa.Column('organization_id', sa.String(36), nullable=True))
                batch_op.create_foreign_key('fk_projects_organization', 'organizations', ['organization_id'], ['id'], ondelete='SET NULL')
                batch_op.create_index('idx_projects_org_id', ['organization_id'])

    if 'research_projects' in table_names:
        cols = [c['name'] for c in insp.get_columns('research_projects')]
        if 'organization_id' not in cols:
            with op.batch_alter_table('research_projects') as batch_op:
                batch_op.add_column(sa.Column('organization_id', sa.String(36), nullable=True))
                batch_op.create_foreign_key('fk_research_projects_organization', 'organizations', ['organization_id'], ['id'], ondelete='SET NULL')
                batch_op.create_index('idx_research_projects_org_id', ['organization_id'])

    # 14. Data Migration / Backfill
    bind = op.get_bind()
    now_dt = datetime.now(timezone.utc).replace(tzinfo=None)
    org_id = "e1000000-0000-0000-0000-000000000001"
    settings_id = "e1000000-0000-0000-0000-000000000002"
    sub_id = "e1000000-0000-0000-0000-000000000003"

    # Insert default Enterprise organization if not exists
    res = bind.execute(sa.text("SELECT id FROM organizations WHERE slug = 'mmj-docs-primary'")).fetchone()
    if not res:
        bind.execute(
            sa.text("""
                INSERT INTO organizations (id, name, slug, domain, status, plan_tier, is_demo, created_at, updated_at)
                VALUES (:id, :name, :slug, :domain, :status, :plan_tier, :is_demo, :created_at, :updated_at)
            """),
            {
                "id": org_id,
                "name": "MMJ-DOCS Enterprise Primary",
                "slug": "mmj-docs-primary",
                "domain": "mmj-docs.internal",
                "status": "ACTIVE",
                "plan_tier": "ENTERPRISE",
                "is_demo": 0,
                "created_at": now_dt,
                "updated_at": now_dt,
            }
        )

        bind.execute(
            sa.text("""
                INSERT INTO organization_settings (id, organization_id, permitted_geographic_markets_json, monitored_competitors_json, custom_opportunity_weights_json, alert_thresholds_json, onboarding_status, onboarding_step, created_at, updated_at)
                VALUES (:id, :org_id, :geo, :comp, :weights, :thresholds, :status, :step, :created_at, :updated_at)
            """),
            {
                "id": settings_id,
                "org_id": org_id,
                "geo": '["FL", "OK", "OH", "PA", "MI", "CA", "CO"]',
                "comp": "[]",
                "weights": "{}",
                "thresholds": "{}",
                "status": "COMPLETED",
                "step": 5,
                "created_at": now_dt,
                "updated_at": now_dt,
            }
        )

        bind.execute(
            sa.text("""
                INSERT INTO organization_subscriptions (id, organization_id, plan_tier, status, billing_cycle, current_period_start, current_period_end, cancel_at_period_end, provider_name, created_at, updated_at)
                VALUES (:id, :org_id, :tier, :status, :cycle, :start_dt, :end_dt, :cancel, :provider, :created_at, :updated_at)
            """),
            {
                "id": sub_id,
                "org_id": org_id,
                "tier": "ENTERPRISE",
                "status": "ACTIVE",
                "cycle": "ANNUAL",
                "start_dt": now_dt,
                "end_dt": now_dt + timedelta(days=365),
                "cancel": 0,
                "provider": "SANDBOX",
                "created_at": now_dt,
                "updated_at": now_dt,
            }
        )

        # Attach all existing users as OWNER or ANALYST if users table exists
        if 'users' in table_names:
            users = bind.execute(sa.text("SELECT id, is_superuser FROM users")).fetchall()
            for u in users:
                role = "OWNER" if u[1] else "ANALYST"
                bind.execute(
                    sa.text("""
                        INSERT INTO organization_memberships (id, organization_id, user_id, role, is_active, joined_at, updated_at)
                        VALUES (:id, :org_id, :user_id, :role, 1, :now_dt, :now_dt)
                    """),
                    {
                        "id": str(uuid.uuid4()),
                        "org_id": org_id,
                        "user_id": u[0],
                        "role": role,
                        "now_dt": now_dt,
                    }
                )

        # Backfill projects and research_projects if they exist
        if 'projects' in table_names:
            bind.execute(
                sa.text("UPDATE projects SET organization_id = :org_id WHERE organization_id IS NULL"),
                {"org_id": org_id}
            )
        if 'research_projects' in table_names:
            bind.execute(
                sa.text("UPDATE research_projects SET organization_id = :org_id WHERE organization_id IS NULL"),
                {"org_id": org_id}
            )


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    table_names = insp.get_table_names()

    if 'research_projects' in table_names:
        with op.batch_alter_table('research_projects') as batch_op:
            batch_op.drop_constraint('fk_research_projects_organization', type_='foreignkey')
            batch_op.drop_column('organization_id')

    if 'projects' in table_names:
        with op.batch_alter_table('projects') as batch_op:
            batch_op.drop_constraint('fk_projects_organization', type_='foreignkey')
            batch_op.drop_column('organization_id')

    op.drop_table('tenant_webhooks')
    op.drop_table('tenant_api_keys')
    op.drop_table('tenant_audit_logs')
    op.drop_table('tenant_usage_records')
    op.drop_table('billing_webhook_events')
    op.drop_table('billing_invoices')
    op.drop_table('billing_customers')
    op.drop_table('organization_subscriptions')
    op.drop_table('organization_settings')
    op.drop_table('organization_invitations')
    op.drop_table('organization_memberships')
    op.drop_table('organizations')
