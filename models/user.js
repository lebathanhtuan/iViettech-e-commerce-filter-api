import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class User extends Model {
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
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: "users_email_key"
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "user"
    },
    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    avatar: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    reset_password_token_hash: {
      type: DataTypes.STRING(64),
      allowNull: true
    },
    reset_password_expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    reset_password_requested_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    auth_version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'users',
    schema: 'public',
    timestamps: true,
    paranoid: true,
    underscored: true,
    indexes: [
      {
        name: "users_email_key",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "users_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "users_reset_password_token_hash_key",
        unique: true,
        fields: [
          { name: "reset_password_token_hash" },
        ]
      },
    ]
  });
  }
}
