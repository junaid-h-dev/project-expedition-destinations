import { pool } from "@/lib/db";

async function main() {
  const connection = pool();

  await connection.query(`
    create table if not exists destinations (
      id bigint unsigned not null auto_increment primary key,
      name varchar(255) not null,
      country varchar(255) not null,
      region varchar(255) not null,
      cost_level varchar(255) not null,
      activities json not null,
      average_daily_budget int not null,
      annual_visitors int not null,
      created_at timestamp null,
      updated_at timestamp null
    )
  `);

  console.log("Migrated");
  await connection.end();
}

main();
