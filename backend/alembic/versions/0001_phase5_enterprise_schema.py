"""0001_phase5_enterprise_schema

Revision ID: 0001_phase5
Revises: None
Create Date: 2026-10-13 17:18:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0001_phase5'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create entity_audit_trail if not exists
    op.create_table(
        'entity_audit_trail',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('entity_id', sa.String(36), sa.ForeignKey('entities.id', ondelete='CASCADE'), nullable=False),
        sa.Column('changed_by_user_id', sa.String(255), nullable=True),
        sa.Column('changed_by_email', sa.String(255), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('field_name', sa.String(100), nullable=True),
        sa.Column('old_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_audit_trail_entity', 'entity_audit_trail', ['entity_id'])
    op.create_index('idx_audit_trail_action', 'entity_audit_trail', ['action'])

    # 2. Create incident_records
    op.create_table(
        'incident_records',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('severity', sa.String(50), nullable=False, server_default='MEDIUM'),
        sa.Column('affected_component', sa.String(100), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='OPEN'),
        sa.Column('detection_method', sa.String(100), server_default='AUTOMATED_HEALTH_CHECK'),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('related_logs', sa.Text(), nullable=True),
        sa.Column('impact', sa.Text(), nullable=True),
        sa.Column('assigned_owner', sa.String(255), nullable=True),
        sa.Column('root_cause', sa.Text(), nullable=True),
        sa.Column('corrective_action', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('closed_at', sa.DateTime(), nullable=True),
    )
    op.create_index('idx_incident_status_severity', 'incident_records', ['status', 'severity'])

    # 3. Create integration_connector_statuses
    op.create_table(
        'integration_connector_statuses',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('connector_name', sa.String(100), unique=True, nullable=False),
        sa.Column('connector_type', sa.String(50), nullable=False),
        sa.Column('base_url', sa.String(500), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='HEALTHY'),
        sa.Column('last_successful_request', sa.DateTime(), nullable=True),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('latency_ms', sa.Float(), server_default='0.0'),
        sa.Column('requests_count_24h', sa.Integer(), server_default='0'),
        sa.Column('errors_count_24h', sa.Integer(), server_default='0'),
        sa.Column('quota_remaining', sa.String(100), nullable=True),
        sa.Column('data_freshness_status', sa.String(50), server_default='CURRENT'),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('idx_connector_name', 'integration_connector_statuses', ['connector_name'])

    # 4. Create ai_evaluation_benchmark_runs
    op.create_table(
        'ai_evaluation_benchmark_runs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('prompt_version', sa.String(50), server_default='v5.0'),
        sa.Column('model_name', sa.String(100), nullable=False),
        sa.Column('benchmark_suite_name', sa.String(100), server_default='EXECUTIVE_CORE_6'),
        sa.Column('total_questions', sa.Integer(), server_default='6'),
        sa.Column('passed_questions', sa.Integer(), server_default='0'),
        sa.Column('accuracy_score', sa.Float(), server_default='0.0'),
        sa.Column('groundedness_score', sa.Float(), server_default='0.0'),
        sa.Column('hallucination_rate', sa.Float(), server_default='0.0'),
        sa.Column('results_json', sa.Text(), server_default='[]'),
        sa.Column('executed_at', sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('ai_evaluation_benchmark_runs')
    op.drop_table('integration_connector_statuses')
    op.drop_table('incident_records')
    op.drop_table('entity_audit_trail')
