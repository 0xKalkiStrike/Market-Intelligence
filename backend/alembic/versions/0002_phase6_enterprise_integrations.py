"""0002_phase6_enterprise_integrations

Revision ID: 0002_phase6
Revises: 0001_phase5
Create Date: 2026-10-14 10:00:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0002_phase6'
down_revision: Union[str, None] = '0001_phase5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. api_keys
    op.create_table(
        'api_keys',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('prefix', sa.String(32), unique=True, nullable=False),
        sa.Column('hashed_key', sa.String(255), nullable=False),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('scopes', sa.Text(), server_default='["intelligence:read"]'),
        sa.Column('rate_limit_per_minute', sa.Integer(), server_default='60'),
        sa.Column('requests_count', sa.Integer(), server_default='0'),
        sa.Column('is_active', sa.Boolean(), server_default='1'),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_api_keys_prefix', 'api_keys', ['prefix'])

    # 2. webhook_subscriptions
    op.create_table(
        'webhook_subscriptions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('target_url', sa.String(500), nullable=False),
        sa.Column('secret_key', sa.String(255), nullable=False),
        sa.Column('event_types', sa.Text(), server_default='["*"]'),
        sa.Column('is_active', sa.Boolean(), server_default='1'),
        sa.Column('created_by', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )

    # 3. webhook_delivery_logs
    op.create_table(
        'webhook_delivery_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('subscription_id', sa.String(36), sa.ForeignKey('webhook_subscriptions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('event_type', sa.String(100), nullable=False),
        sa.Column('event_id', sa.String(100), nullable=True),
        sa.Column('payload_json', sa.Text(), nullable=False),
        sa.Column('http_status', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(50), server_default='PENDING'),
        sa.Column('attempts', sa.Integer(), server_default='1'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('delivered_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_webhook_deliv_sub_status', 'webhook_delivery_logs', ['subscription_id', 'status'])

    # 4. data_imports
    op.create_table(
        'data_imports',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('file_format', sa.String(50), server_default='CSV'),
        sa.Column('entity_type', sa.String(50), server_default='DISPENSARY'),
        sa.Column('status', sa.String(50), server_default='PREVIEW'),
        sa.Column('total_records', sa.Integer(), server_default='0'),
        sa.Column('added_records', sa.Integer(), server_default='0'),
        sa.Column('updated_records', sa.Integer(), server_default='0'),
        sa.Column('duplicate_records', sa.Integer(), server_default='0'),
        sa.Column('error_records', sa.Integer(), server_default='0'),
        sa.Column('validation_report_json', sa.Text(), nullable=True),
        sa.Column('created_by', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )

    # 5. export_jobs
    op.create_table(
        'export_jobs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('export_name', sa.String(255), nullable=False),
        sa.Column('entity_type', sa.String(50), server_default='ALL'),
        sa.Column('format', sa.String(50), server_default='CSV'),
        sa.Column('filters_json', sa.Text(), server_default='{}'),
        sa.Column('fields_json', sa.Text(), server_default='[]'),
        sa.Column('status', sa.String(50), server_default='PENDING'),
        sa.Column('record_count', sa.Integer(), server_default='0'),
        sa.Column('file_path', sa.String(500), nullable=True),
        sa.Column('created_by', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
    )

    # 6. cross_system_entity_links
    op.create_table(
        'cross_system_entity_links',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('canonical_entity_id', sa.String(36), sa.ForeignKey('entities.id', ondelete='CASCADE'), nullable=False),
        sa.Column('system_name', sa.String(100), nullable=False),
        sa.Column('external_system_id', sa.String(255), nullable=False),
        sa.Column('match_confidence', sa.Float(), server_default='1.0'),
        sa.Column('match_reasons', sa.Text(), server_default='[]'),
        sa.Column('review_status', sa.String(50), server_default='CONFIRMED'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
    )
    op.create_index('idx_cross_system_canonical', 'cross_system_entity_links', ['canonical_entity_id', 'system_name'])

    # 7. data_conflicts
    op.create_table(
        'data_conflicts',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('entity_id', sa.String(36), sa.ForeignKey('entities.id', ondelete='CASCADE'), nullable=False),
        sa.Column('field_name', sa.String(100), nullable=False),
        sa.Column('source_a_name', sa.String(100), nullable=False),
        sa.Column('source_a_value', sa.Text(), nullable=False),
        sa.Column('source_a_timestamp', sa.DateTime(), nullable=True),
        sa.Column('source_b_name', sa.String(100), nullable=False),
        sa.Column('source_b_value', sa.Text(), nullable=False),
        sa.Column('source_b_timestamp', sa.DateTime(), nullable=True),
        sa.Column('resolution_status', sa.String(50), server_default='UNRESOLVED'),
        sa.Column('winning_value', sa.Text(), nullable=True),
        sa.Column('resolution_reason', sa.Text(), nullable=True),
        sa.Column('resolved_by', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
    )
    op.create_index('idx_data_conflict_entity', 'data_conflicts', ['entity_id', 'field_name'])

    # 8. collaboration_findings
    op.create_table(
        'collaboration_findings',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('category', sa.String(100), server_default='OPPORTUNITY'),
        sa.Column('entity_id', sa.String(36), sa.ForeignKey('entities.id', ondelete='SET NULL'), nullable=True),
        sa.Column('finding_summary', sa.Text(), nullable=False),
        sa.Column('evidence_sources', sa.Text(), server_default='[]'),
        sa.Column('status', sa.String(50), server_default='DRAFT'),
        sa.Column('assigned_reviewer', sa.String(255), nullable=True),
        sa.Column('follow_up_owner', sa.String(255), nullable=True),
        sa.Column('management_decision', sa.Text(), nullable=True),
        sa.Column('created_by', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )

    # 9. intelligence_notes
    op.create_table(
        'intelligence_notes',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('finding_id', sa.String(36), sa.ForeignKey('collaboration_findings.id', ondelete='CASCADE'), nullable=True),
        sa.Column('entity_id', sa.String(36), sa.ForeignKey('entities.id', ondelete='CASCADE'), nullable=True),
        sa.Column('author_email', sa.String(255), nullable=False),
        sa.Column('note_content', sa.Text(), nullable=False),
        sa.Column('is_internal_only', sa.Boolean(), server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )

    # 10. intelligence_cases
    op.create_table(
        'intelligence_cases',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('case_number', sa.String(50), unique=True, nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('severity', sa.String(50), server_default='MEDIUM'),
        sa.Column('status', sa.String(50), server_default='OPEN'),
        sa.Column('assigned_investigator', sa.String(255), nullable=True),
        sa.Column('assigned_reviewer', sa.String(255), nullable=True),
        sa.Column('evidence_summary', sa.Text(), nullable=False),
        sa.Column('investigation_findings', sa.Text(), nullable=True),
        sa.Column('management_decision', sa.Text(), nullable=True),
        sa.Column('outcome_recorded', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
    )
    op.create_index('idx_case_category_status', 'intelligence_cases', ['category', 'status'])

    # 11. report_distribution_configs
    op.create_table(
        'report_distribution_configs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('report_type', sa.String(100), nullable=False),
        sa.Column('channel', sa.String(50), server_default='IN_APP'),
        sa.Column('recipient_target', sa.String(500), nullable=False),
        sa.Column('schedule_cron', sa.String(100), server_default='0 9 * * 1'),
        sa.Column('is_active', sa.Boolean(), server_default='1'),
        sa.Column('last_distributed_at', sa.DateTime(), nullable=True),
        sa.Column('delivery_status', sa.String(50), server_default='IDLE'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('report_distribution_configs')
    op.drop_table('intelligence_cases')
    op.drop_table('intelligence_notes')
    op.drop_table('collaboration_findings')
    op.drop_table('data_conflicts')
    op.drop_table('cross_system_entity_links')
    op.drop_table('export_jobs')
    op.drop_table('data_imports')
    op.drop_table('webhook_delivery_logs')
    op.drop_table('webhook_subscriptions')
    op.drop_table('api_keys')
