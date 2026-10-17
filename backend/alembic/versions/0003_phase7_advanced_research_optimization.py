"""0003_phase7_advanced_research_optimization

Revision ID: 0003_phase7
Revises: 0002_phase6
Create Date: 2026-10-17 12:00:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0003_phase7'
down_revision: Union[str, None] = '0002_phase6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. research_projects
    op.create_table(
        'research_projects',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), server_default=''),
        sa.Column('status', sa.String(50), server_default='ACTIVE'),
        sa.Column('target_states', sa.Text(), server_default='[]'),
        sa.Column('created_by', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_research_projects_status', 'research_projects', ['status'])

    # 2. research_hypotheses
    op.create_table(
        'research_hypotheses',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('project_id', sa.String(36), sa.ForeignKey('research_projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('hypothesis_statement', sa.Text(), nullable=False),
        sa.Column('geographic_scope', sa.String(100), server_default='NATIONAL'),
        sa.Column('geographic_target', sa.String(100), server_default='ALL'),
        sa.Column('time_period_start', sa.DateTime(), nullable=True),
        sa.Column('time_period_end', sa.DateTime(), nullable=True),
        sa.Column('comparison_groups_json', sa.Text(), server_default='[]'),
        sa.Column('target_metrics_json', sa.Text(), server_default='[]'),
        sa.Column('status', sa.String(50), server_default='DRAFT'),
        sa.Column('confidence_score', sa.Float(), server_default='0.0'),
        sa.Column('methodology_notes', sa.Text(), server_default=''),
        sa.Column('limitations_notes', sa.Text(), server_default=''),
        sa.Column('created_by', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_research_hypotheses_proj', 'research_hypotheses', ['project_id'])
    op.create_index('idx_research_hypotheses_status', 'research_hypotheses', ['status'])

    # 3. research_findings
    op.create_table(
        'research_findings',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('project_id', sa.String(36), sa.ForeignKey('research_projects.id', ondelete='CASCADE'), nullable=False),
        sa.Column('hypothesis_id', sa.String(36), sa.ForeignKey('research_hypotheses.id', ondelete='SET NULL'), nullable=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('statement', sa.Text(), nullable=False),
        sa.Column('category', sa.String(100), server_default='OPPORTUNITY'),
        sa.Column('status', sa.String(50), server_default='DRAFT'),
        sa.Column('calculation_method', sa.String(255), server_default='DESCRIPTIVE_AGGREGATE'),
        sa.Column('sample_size', sa.Integer(), server_default='0'),
        sa.Column('data_coverage_pct', sa.Float(), server_default='100.0'),
        sa.Column('confidence_score', sa.Float(), server_default='0.5'),
        sa.Column('limitations', sa.Text(), server_default=''),
        sa.Column('contradictory_evidence', sa.Text(), server_default=''),
        sa.Column('recommended_next_step', sa.Text(), server_default=''),
        sa.Column('is_active', sa.Boolean(), server_default='1'),
        sa.Column('created_by', sa.String(255), nullable=True),
        sa.Column('reviewer_id', sa.String(255), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_research_findings_proj', 'research_findings', ['project_id'])
    op.create_index('idx_research_findings_status', 'research_findings', ['status'])
    op.create_index('idx_research_findings_cat', 'research_findings', ['category'])

    # 4. evidence_references
    op.create_table(
        'evidence_references',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('finding_id', sa.String(36), sa.ForeignKey('research_findings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('source_type', sa.String(100), server_default='PUBLIC_SURFACE_WEB'),
        sa.Column('source_name', sa.String(255), nullable=False),
        sa.Column('source_uri', sa.String(500), nullable=True),
        sa.Column('observation_date', sa.DateTime(), nullable=True),
        sa.Column('record_id', sa.String(255), nullable=True),
        sa.Column('sample_count', sa.Integer(), server_default='1'),
        sa.Column('confidence_weight', sa.Float(), server_default='1.0'),
        sa.Column('supporting_data_json', sa.Text(), server_default='{}'),
        sa.Column('is_contradictory', sa.Boolean(), server_default='0'),
        sa.Column('verification_status', sa.String(50), server_default='VERIFIED'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_evidence_references_finding', 'evidence_references', ['finding_id'])
    op.create_index('idx_evidence_references_source', 'evidence_references', ['source_type'])

    # 5. research_review_history
    op.create_table(
        'research_review_history',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('finding_id', sa.String(36), sa.ForeignKey('research_findings.id', ondelete='CASCADE'), nullable=False),
        sa.Column('reviewer_email', sa.String(255), nullable=False),
        sa.Column('previous_status', sa.String(50), nullable=False),
        sa.Column('new_status', sa.String(50), nullable=False),
        sa.Column('review_notes', sa.Text(), server_default=''),
        sa.Column('rationale', sa.Text(), server_default=''),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_research_review_finding', 'research_review_history', ['finding_id'])

    # 6. scoring_model_versions
    op.create_table(
        'scoring_model_versions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('version_tag', sa.String(50), unique=True, nullable=False),
        sa.Column('model_name', sa.String(255), nullable=False),
        sa.Column('weights_json', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), server_default=''),
        sa.Column('is_active', sa.Boolean(), server_default='1'),
        sa.Column('created_by', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_scoring_model_tag', 'scoring_model_versions', ['version_tag'])

    # 7. geographic_score_snapshots
    op.create_table(
        'geographic_score_snapshots',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('model_version_id', sa.String(36), sa.ForeignKey('scoring_model_versions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('geographic_level', sa.String(50), server_default='STATE'),
        sa.Column('geographic_id', sa.String(100), nullable=False),
        sa.Column('geographic_name', sa.String(255), server_default=''),
        sa.Column('total_score', sa.Float(), nullable=False),
        sa.Column('component_scores_json', sa.Text(), server_default='{}'),
        sa.Column('factor_contributions_json', sa.Text(), server_default='{}'),
        sa.Column('data_freshness_days', sa.Integer(), server_default='0'),
        sa.Column('missing_inputs_json', sa.Text(), server_default='[]'),
        sa.Column('calculation_date', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_geo_snapshots_model', 'geographic_score_snapshots', ['model_version_id'])
    op.create_index('idx_geo_snapshots_level_id', 'geographic_score_snapshots', ['geographic_level', 'geographic_id'])

    # 8. scenario_definitions
    op.create_table(
        'scenario_definitions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('scenario_type', sa.String(100), server_default='STATE_EXPANSION'),
        sa.Column('target_state', sa.String(50), server_default='FL'),
        sa.Column('baseline_assumptions_json', sa.Text(), server_default='{}'),
        sa.Column('candidate_assumptions_json', sa.Text(), server_default='{}'),
        sa.Column('base_case_projection_json', sa.Text(), server_default='{}'),
        sa.Column('best_case_projection_json', sa.Text(), server_default='{}'),
        sa.Column('downside_case_projection_json', sa.Text(), server_default='{}'),
        sa.Column('sensitivity_matrix_json', sa.Text(), server_default='{}'),
        sa.Column('evidence_quality_score', sa.Float(), server_default='1.0'),
        sa.Column('limitations_json', sa.Text(), server_default='[]'),
        sa.Column('created_by', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_scenario_def_type', 'scenario_definitions', ['scenario_type'])

    # 9. analytical_runs
    op.create_table(
        'analytical_runs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('analysis_type', sa.String(100), nullable=False),
        sa.Column('parameters_json', sa.Text(), server_default='{}'),
        sa.Column('input_sample_size', sa.Integer(), server_default='0'),
        sa.Column('status', sa.String(50), server_default='COMPLETED'),
        sa.Column('results_json', sa.Text(), server_default='{}'),
        sa.Column('confidence_intervals_json', sa.Text(), server_default='{}'),
        sa.Column('assumptions_json', sa.Text(), server_default='[]'),
        sa.Column('limitations_json', sa.Text(), server_default='[]'),
        sa.Column('execution_duration_ms', sa.Integer(), server_default='0'),
        sa.Column('executed_by', sa.String(255), nullable=True),
        sa.Column('executed_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_analytical_runs_type', 'analytical_runs', ['analysis_type'])

    # 10. competitive_pattern_records
    op.create_table(
        'competitive_pattern_records',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('pattern_type', sa.String(100), nullable=False),
        sa.Column('competitor_name', sa.String(255), nullable=False),
        sa.Column('state', sa.String(50), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('observation_count', sa.Integer(), server_default='1'),
        sa.Column('time_horizon_days', sa.Integer(), server_default='30'),
        sa.Column('confidence_score', sa.Float(), server_default='0.8'),
        sa.Column('is_sustained', sa.Boolean(), server_default='1'),
        sa.Column('supporting_records_json', sa.Text(), server_default='[]'),
        sa.Column('is_dismissed', sa.Boolean(), server_default='0'),
        sa.Column('dismissal_reason', sa.Text(), nullable=True),
        sa.Column('dismissed_by', sa.String(255), nullable=True),
        sa.Column('dismissed_at', sa.DateTime(), nullable=True),
        sa.Column('detected_at', sa.DateTime(), nullable=False),
    )
    op.create_index('idx_comp_pattern_type', 'competitive_pattern_records', ['pattern_type'])
    op.create_index('idx_comp_pattern_comp', 'competitive_pattern_records', ['competitor_name'])
    op.create_index('idx_comp_pattern_state', 'competitive_pattern_records', ['state'])
    op.create_index('idx_comp_pattern_dismissed', 'competitive_pattern_records', ['is_dismissed'])


def downgrade() -> None:
    op.drop_table('competitive_pattern_records')
    op.drop_table('analytical_runs')
    op.drop_table('scenario_definitions')
    op.drop_table('geographic_score_snapshots')
    op.drop_table('scoring_model_versions')
    op.drop_table('research_review_history')
    op.drop_table('evidence_references')
    op.drop_table('research_findings')
    op.drop_table('research_hypotheses')
    op.drop_table('research_projects')
