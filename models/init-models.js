import _sequelize from "sequelize";
const DataTypes = _sequelize.DataTypes;
import _Category from  "./category.js";
import _Product from  "./product.js";
import _User from  "./user.js";

export default function initModels(sequelize) {
  const Category = _Category.init(sequelize, DataTypes);
  const Product = _Product.init(sequelize, DataTypes);
  const User = _User.init(sequelize, DataTypes);

  Product.belongsTo(Category, { as: "category", foreignKey: "category_id"});
  Category.hasMany(Product, { as: "products", foreignKey: "category_id"});

  return {
    Category,
    Product,
    User,
  };
}
