// Run in browser console to check localStorage data
console.log('Checking localStorage...');
const users = JSON.parse(localStorage.getItem('essence_users') || '[]');
console.log('Users:', users);
const activities = JSON.parse(localStorage.getItem('essence_activities') || '[]');
console.log('Activities:', activities);
