import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'essence_affirmations',
  user: 'postgres',
  password: 'postgres'
});

// Get data from localStorage in browser context
// Run this in browser console:
/*
const migrateData = async () => {
  const users = JSON.parse(localStorage.getItem('essence_users') || '[]');
  for (const user of users) {
    const response = await fetch('http://localhost:3001/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    console.log(await response.json());
  }
  console.log('Migration complete!');
};
migrateData();
*/

console.log('To migrate data, run the code above in browser console');

