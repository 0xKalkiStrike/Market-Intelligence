"""0004_phase8_continuous_improvement_quality

Revision ID: 0004_phase8
Revises: 0003_phase7
Create Date: 2026-10-17 16:30:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0004_phase8'
down_revision: Union[str, None] = '0003_phase7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. quality_metric_snapshots
    op.create_table(
        'quality_metric_snapshots',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('metric_name', sa.String(100), nullable=False),
        sa.Column('metric_category', sa.String(50), server_default='DATA_QUALITY'),
        sa.Column('measured_value', sa.Float(), nullable=False),
        sa.Column('threshold_warning', sa.Float(), server_default='80.0'),
        sa.Column('threshold_critical', sa.Float(), server_default='60.0'),
        sa.Column('status', sa.String(20), server_default='HEALTHY'),
        sa.Column('sample_count', sa.Integer(), server_default='0'),
        sa.Column('coverage_pct', sa.Float(), server_default='100.0'),
        sa.Column('measurement_window_days', sa.Integer(), server_default='30'),
        sa.Column('details_json', sa.Text(), server_default='{}'),
        sa.Column('measured_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_quality_metric_name', 'quality_metric_snapshots', ['metric_name'])
    op.create_index('idx_quality_metric_cat', 'quality_metric_snapshots', ['metric_category'])
    op.create_index('idx_quality_metric_status', 'quality_metric_snapshots', ['status'])

    # 2. quality_remediation_logs
    op.create_table(
        'quality_remediation_logs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('incident_type', sa.String(100), nullable=False),
        sa.Column('target_entity_type', sa.String(100), nullable=False),
        sa.Column('target_entity_id', sa.String(255), nullable=True),
        sa.Column('action_taken', sa.String(100), nullable=False),
        sa.Column('is_automated', sa.Boolean(), server_default='1'),
        sa.Column('triggered_by', sa.String(255), server_default='system'),
        sa.Column('status', sa.String(50), server_default='SUCCESS'),
        sa.Column('result_notes', sa.Text(), server_default=''),
        sa.Column('rollback_instructions', sa.Text(), server_default=''),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_quality_remediation_type', 'quality_remediation_logs', ['incident_type'])
    op.create_index('idx_quality_remediation_status', 'quality_remediation_logs', ['status'])

    # 3. ai_regression_test_cases
    op.create_table(
        'ai_regression_test_cases',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('suite_name', sa.String(100), server_default='CORE_BENCHMARK'),
        sa.Column('test_type', sa.String(50), server_default='FACTUAL'),
        sa.Column('question', sa.Text(), nullable=False),
        sa.Column('expected_answer', sa.Text(), nullable=False),
        sa.Column('expected_citations_json', sa.Text(), server_default='[]'),
        sa.Column('risk_level', sa.String(20), server_default='MEDIUM'),
        sa.Column('is_active', sa.Boolean(), server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_ai_test_suite_type', 'ai_regression_test_cases', ['suite_name', 'test_type'])

    # 4. ai_regression_runs
    op.create_table(
        'ai_regression_runs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('suite_name', sa.String(100), server_default='CORE_BENCHMARK'),
        sa.Column('model_name', sa.String(100), server_default='gpt-4o'),
        sa.Column('prompt_version', sa.String(50), server_default='v7.0'),
        sa.Column('dataset_version', sa.String(50), server_default='v1.0'),
        sa.Column('total_cases', sa.Integer(), server_default='0'),
        sa.Column('passed_cases', sa.Integer(), server_default='0'),
        sa.Column('failed_cases', sa.Integer(), server_default='0'),
        sa.Column('citation_accuracy_pct', sa.Float(), server_default='100.0'),
        sa.Column('numerical_accuracy_pct', sa.Float(), server_default='100.0'),
        sa.Column('injection_resistance_pct', sa.Float(), server_default='100.0'),
        sa.Column('phi_leakage_cases', sa.Integer(), server_default='0'),
        sa.Column('overall_score', sa.Float(), server_default='1.0'),
        sa.Column('is_regression_detected', sa.Boolean(), server_default='0'),
        sa.Column('execution_time_ms', sa.Integer(), server_default='0'),
        sa.Column('results_json', sa.Text(), server_default='[]'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_ai_runs_suite', 'ai_regression_runs', ['suite_name'])

    # 5. forecast_outcome_records
    op.create_table(
        'forecast_outcome_records',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('forecast_id', sa.String(36), sa.ForeignKey('forecasts.id', ondelete='SET NULL'), nullable=True),
        sa.Column('metric_name', sa.String(100), nullable=False),
        sa.Column('target_state', sa.String(50), server_default='FL'),
        sa.Column('prediction_date', sa.DateTime(), nullable=False),
        sa.Column('target_date', sa.DateTime(), nullable=False),
        sa.Column('predicted_value', sa.Float(), nullable=False),
        sa.Column('actual_value', sa.Float(), nullable=True),
        sa.Column('absolute_error', sa.Float(), nullable=True),
        sa.Column('percentage_error', sa.Float(), nullable=True),
        sa.Column('directional_correct', sa.Boolean(), nullable=True),
        sa.Column('verification_source', sa.String(255), server_default='STATE_DOH_REGISTRY'),
        sa.Column('status', sa.String(50), server_default='PENDING'),
        sa.Column('verified_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_forecast_outcomes_metric_state', 'forecast_outcome_records', ['metric_name', 'target_state'])
    op.create_index('idx_forecast_outcomes_status', 'forecast_outcome_records', ['status'])

    # 6. recommendation_outcome_records
    op.create_table(
        'recommendation_outcome_records',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('finding_id', sa.String(36), sa.ForeignKey('research_findings.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('target_state', sa.String(50), server_default='FL'),
        sa.Column('recommendation_type', sa.String(100), server_default='PRICING_ADJUSTMENT'),
        sa.Column('action_recommended', sa.Text(), nullable=False),
        sa.Column('adoption_status', sa.String(50), server_default='PROPOSED'),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('execution_notes', sa.Text(), server_default=''),
        sa.Column('baseline_metric_val', sa.Float(), server_default='0.0'),
        sa.Column('measured_outcome_val', sa.Float(), nullable=True),
        sa.Column('outcome_delta', sa.Float(), nullable=True),
        sa.Column('is_outcome_favorable', sa.Boolean(), nullable=True),
        sa.Column('adopted_by', sa.String(255), nullable=True),
        sa.Column('adopted_at', sa.DateTime(), nullable=True),
        sa.Column('measured_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_rec_outcomes_status', 'recommendation_outcome_records', ['adoption_status'])

    # 7. model_drift_records
    op.create_table(
        'model_drift_records',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('model_or_feature_name', sa.String(100), nullable=False),
        sa.Column('drift_type', sa.String(100), server_default='INPUT_DISTRIBUTION'),
        sa.Column('baseline_period', sa.String(100), nullable=False),
        sa.Column('current_period', sa.String(100), nullable=False),
        sa.Column('psi_score', sa.Float(), server_default='0.0'),
        sa.Column('ks_statistic', sa.Float(), nullable=True),
        sa.Column('p_value', sa.Float(), nullable=True),
        sa.Column('drift_status', sa.String(50), server_default='STABLE'),
        sa.Column('classification', sa.String(100), server_default='MARKET_CONDITION_SHIFT'),
        sa.Column('details_json', sa.Text(), server_default='{}'),
        sa.Column('recommended_action', sa.Text(), server_default=''),
        sa.Column('detected_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_drift_records_name', 'model_drift_records', ['model_or_feature_name'])
    op.create_index('idx_drift_records_status', 'model_drift_records', ['drift_status'])

    # 8. Create intelligence_feedbacks if missing, or add columns with batch_alter_table
    bind = op.get_bind()
    insp = sa.inspect(bind)
    tables = insp.get_table_names()
    if 'intelligence_feedbacks' not in tables:
        op.create_table(
            'intelligence_feedbacks',
            sa.Column('id', sa.String(36), primary_key=True),
            sa.Column('target_type', sa.String(100), nullable=False),
            sa.Column('target_id', sa.String(255), nullable=False),
            sa.Column('feedback', sa.String(50), nullable=False),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('user_email', sa.String(255), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.Column('status', sa.String(50), server_default='PENDING_REVIEW'),
            sa.Column('resolution_notes', sa.Text(), server_default=''),
            sa.Column('resolved_by', sa.String(255), nullable=True),
            sa.Column('resolved_at', sa.DateTime(), nullable=True),
        )
    else:
        columns = [c['name'] for c in insp.get_columns('intelligence_feedbacks')]
        with op.batch_alter_table('intelligence_feedbacks') as batch_op:
            if 'status' not in columns:
                batch_op.add_column(sa.Column('status', sa.String(50), server_default='PENDING_REVIEW'))
            if 'resolution_notes' not in columns:
                batch_op.add_column(sa.Column('resolution_notes', sa.Text(), server_default=''))
            if 'resolved_by' not in columns:
                batch_op.add_column(sa.Column('resolved_by', sa.String(255), nullable=True))
            if 'resolved_at' not in columns:
                batch_op.add_column(sa.Column('resolved_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('intelligence_feedbacks') as batch_op:
        batch_op.drop_column('resolved_at')
        batch_op.drop_column('resolved_by')
        batch_op.drop_column('resolution_notes')
        batch_op.drop_column('status')

    op.drop_table('model_drift_records')
    op.drop_table('recommendation_outcome_records')
    op.drop_table('forecast_outcome_records')
    op.drop_table('ai_regression_runs')
    op.drop_table('ai_regression_test_cases')
    op.drop_table('quality_remediation_logs')
    op.drop_table('quality_metric_snapshots')
