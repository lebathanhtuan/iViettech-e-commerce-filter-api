import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class Review extends Model {
  static init(sequelize, DataTypes) {
  return super.init({
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      }
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'reviews',
    schema: 'public',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        name: "reviews_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "reviews_user_id_product_id_key",
        unique: true,
        fields: [
          { name: "user_id" },
          { name: "product_id" },
        ]
      },
    ]
  });
  }
}
