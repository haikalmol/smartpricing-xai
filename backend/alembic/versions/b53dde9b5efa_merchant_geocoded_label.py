"""merchant geocoded label

Revision ID: b53dde9b5efa
Revises: 85f0f3f21615
Create Date: 2026-07-13 11:18:20.459223

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b53dde9b5efa'
down_revision: Union[str, Sequence[str], None] = '85f0f3f21615'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('merchant', sa.Column('geocoded_label', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('merchant', 'geocoded_label')
