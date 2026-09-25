import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class Order extends Model {
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
    full_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    address: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    total_price: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(8),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'orders',
    schema: 'public',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        name: "orders_code_key",
        unique: true,
        fields: [
          { name: "code" },
        ]
      },
      {
        name: "orders_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
