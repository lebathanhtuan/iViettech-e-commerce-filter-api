import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(
  'e-commerce-filter_db', // database name
  'postgres', // username
  'postgres', // password
  {
    host: 'localhost', // host
    port: 5432, // port
    dialect: 'postgres',
    logging: false,
    define: {
      freezeTableName: true,
      timestamps: false,
    },
  }
);

await sequelize.authenticate();

export default sequelize;
