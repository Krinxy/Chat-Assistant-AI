"""add user_id to chat_sessions

Revision ID: bae331af7ba5
Revises: de626bd39ec8
Create Date: 2026-06-28 00:12:31.046842

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bae331af7ba5'
down_revision: Union[str, None] = 'de626bd39ec8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_FK_NAME = "fk_chat_sessions_user_id_users"


def upgrade() -> None:
    with op.batch_alter_table('chat_sessions', schema=None) as batch_op:
        batch_op.add_column(sa.Column('user_id', sa.Integer(), nullable=False))
        batch_op.create_index(batch_op.f('ix_chat_sessions_user_id'), ['user_id'], unique=False)
        batch_op.create_foreign_key(_FK_NAME, 'users', ['user_id'], ['id'])


def downgrade() -> None:
    with op.batch_alter_table('chat_sessions', schema=None) as batch_op:
        batch_op.drop_constraint(_FK_NAME, type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_chat_sessions_user_id'))
        batch_op.drop_column('user_id')
