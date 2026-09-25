import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class Category extends Model {
  static init(sequelize, DataTypes) {
  return super.init({
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'categories',
    schema: 'public',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        name: "categories_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
