import mysql from "mysql2/promise";

let connection: mysql.Pool | undefined;

export function pool() {
  if (!connection) {
    connection = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_DATABASE,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
    });
  }

  return connection;
}
