import _sequelize from "sequelize";
const DataTypes = _sequelize.DataTypes;
import _CartItem from  "./cartItem.js";
import _Category from  "./category.js";
import _Favorite from  "./favorite.js";
import _OrderItem from  "./orderItem.js";
import _Order from  "./order.js";
import _Product from  "./product.js";
import _Review from  "./review.js";
import _User from  "./user.js";

export default function initModels(sequelize) {
  const CartItem = _CartItem.init(sequelize, DataTypes);
  const Category = _Category.init(sequelize, DataTypes);
  const Favorite = _Favorite.init(sequelize, DataTypes);
  const OrderItem = _OrderItem.init(sequelize, DataTypes);
  const Order = _Order.init(sequelize, DataTypes);
  const Product = _Product.init(sequelize, DataTypes);
  const Review = _Review.init(sequelize, DataTypes);
  const User = _User.init(sequelize, DataTypes);

  Product.belongsTo(Category, { as: "category", foreignKey: "category_id"});
  Category.hasMany(Product, { as: "products", foreignKey: "category_id"});
  OrderItem.belongsTo(Order, { as: "order", foreignKey: "order_id"});
  Order.hasMany(OrderItem, { as: "order_items", foreignKey: "order_id"});
  CartItem.belongsTo(Product, { as: "product", foreignKey: "product_id"});
  Product.hasMany(CartItem, { as: "cart_items", foreignKey: "product_id"});
  Favorite.belongsTo(Product, { as: "product", foreignKey: "product_id"});
  Product.hasMany(Favorite, { as: "favorites", foreignKey: "product_id"});
  OrderItem.belongsTo(Product, { as: "product", foreignKey: "product_id"});
  Product.hasMany(OrderItem, { as: "order_items", foreignKey: "product_id"});
  Review.belongsTo(Product, { as: "product", foreignKey: "product_id"});
  Product.hasMany(Review, { as: "reviews", foreignKey: "product_id"});
  CartItem.belongsTo(User, { as: "user", foreignKey: "user_id"});
  User.hasMany(CartItem, { as: "cart_items", foreignKey: "user_id"});
  Favorite.belongsTo(User, { as: "user", foreignKey: "user_id"});
  User.hasMany(Favorite, { as: "favorites", foreignKey: "user_id"});
  Order.belongsTo(User, { as: "user", foreignKey: "user_id"});
  User.hasMany(Order, { as: "orders", foreignKey: "user_id"});
  Review.belongsTo(User, { as: "user", foreignKey: "user_id"});
  User.hasMany(Review, { as: "reviews", foreignKey: "user_id"});

  return {
    CartItem,
    Category,
    Favorite,
    OrderItem,
    Order,
    Product,
    Review,
    User,
  };
}
