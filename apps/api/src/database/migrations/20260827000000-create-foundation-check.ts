/**
 * Technical migration - NOT a domain entity.
 *
 * Exists only to make it observable that applying and reverting migrations
 * works. Delete this migration and its table when the first domain migration
 * is introduced. See specs/001-project-foundation/data-model.md
 */
import { DataTypes, type QueryInterface } from 'sequelize';

const TABLE_NAME = '_foundation_check';

export const up = async ({
  context,
}: {
  context: QueryInterface;
}): Promise<void> => {
  await context.createTable(TABLE_NAME, {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });
};

export const down = async ({
  context,
}: {
  context: QueryInterface;
}): Promise<void> => {
  await context.dropTable(TABLE_NAME);
};
