import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class Address extends Model {
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
    label: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ""
    },
    full_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    province_code: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    province_name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    ward_code: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ward_name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    address_line: {
      type: DataTypes.STRING(160),
      allowNull: false
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    tableName: 'addresses',
    schema: 'public',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        name: "addresses_one_default_per_user",
        unique: true,
        fields: [
          { name: "user_id" },
        ]
      },
      {
        name: "addresses_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "addresses_user_id_idx",
        fields: [
          { name: "user_id" },
        ]
      },
    ]
  });
  }
}
