"""merchant geocoding

Revision ID: 85f0f3f21615
Revises: 5fcbb60df5e3
Create Date: 2026-07-13 10:42:59.976266

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '85f0f3f21615'
down_revision: Union[str, Sequence[str], None] = '5fcbb60df5e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Nullable from the start, permanently -- a merchant whose location text
    # fails to geocode must have null lat/lon, never a guessed default (see
    # app/geocoding.py). No backfill here: existing rows get geocoded by the
    # separate one-time backend/scripts/backfill_merchant_geocoding.py script,
    # run once after this migration, not baked into the migration itself.
    op.add_column('merchant', sa.Column('latitude', sa.Float(), nullable=True))
    op.add_column('merchant', sa.Column('longitude', sa.Float(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('merchant', 'longitude')
    op.drop_column('merchant', 'latitude')
