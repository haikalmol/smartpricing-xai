"""merchant auth

Revision ID: 5fcbb60df5e3
Revises: b730ecb35598
Create Date: 2026-07-12 11:27:01.313146

"""
import secrets
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.sql import column, table


# revision identifiers, used by Alembic.
revision: str = '5fcbb60df5e3'
down_revision: Union[str, Sequence[str], None] = 'b730ecb35598'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    import app.auth  # local import: only needed for the backfill below, and
    # alembic/env.py is what puts the backend root on sys.path, not this file.

    op.add_column('merchant', sa.Column('email', sa.String(), nullable=True))
    op.add_column('merchant', sa.Column('password_hash', sa.String(), nullable=True))

    # Backfill any merchant rows that predate this column (real data in
    # Supabase from earlier testing) with a placeholder email + a freshly
    # generated temp password. Never hardcode the password/hash as a literal
    # in this file -- generate + hash it at run time, print the plaintext
    # once so it can be relayed out-of-band, and only the hash ever touches
    # the database.
    connection = op.get_bind()
    merchant_table = table(
        'merchant',
        column('id', sa.Integer),
        column('email', sa.String),
        column('password_hash', sa.String),
    )
    existing_ids = [row[0] for row in connection.execute(sa.select(merchant_table.c.id)).fetchall()]
    for merchant_id in existing_ids:
        temp_password = secrets.token_urlsafe(12)
        placeholder_email = f"merchant{merchant_id}@smartpricing.local"
        connection.execute(
            merchant_table.update()
            .where(merchant_table.c.id == merchant_id)
            .values(email=placeholder_email, password_hash=app.auth.hash_password(temp_password))
        )
        print(
            f"[merchant auth migration] merchant id={merchant_id} "
            f"email={placeholder_email} temp_password={temp_password}"
        )

    # SQLite can't ALTER COLUMN outside batch mode; batch mode works fine on
    # Postgres too, so this is one code path for both databases.
    with op.batch_alter_table('merchant') as batch_op:
        batch_op.alter_column('email', nullable=False)
        batch_op.alter_column('password_hash', nullable=False)

    op.create_index('ix_merchant_email', 'merchant', ['email'], unique=True)

    # server_default so this one (no per-row backfill needed) matches the
    # existing service.is_active pattern exactly.
    op.add_column(
        'merchant',
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('merchant', 'is_active')
    op.drop_index('ix_merchant_email', table_name='merchant')
    op.drop_column('merchant', 'password_hash')
    op.drop_column('merchant', 'email')
