import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class CartItem extends Model {
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
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    }
  }, {
    sequelize,
    tableName: 'cart_items',
    schema: 'public',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        name: "cart_items_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "cart_items_user_id_product_id_key",
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
