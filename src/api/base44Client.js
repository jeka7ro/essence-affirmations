// PostgreSQL backend API client - data stored online on Render + PostgreSQL

const API_URL = (window.location.hostname.includes('vercel.app') || 
                 window.location.hostname.includes('myessence.ro') ||
                 window.location.hostname.includes('essence-affirmations'))
  ? 'https://essence-affirmations-backend.onrender.com/api'
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

console.log('DEBUG: hostname =', window.location.hostname);
console.log('DEBUG: includes vercel.app =', window.location.hostname.includes('vercel.app'));
console.log('DEBUG: includes myessence.ro =', window.location.hostname.includes('myessence.ro'));
console.log('DEBUG: includes essence-affirmations =', window.location.hostname.includes('essence-affirmations'));
console.log('DEBUG: API_URL =', API_URL);

function createEntityApi(entityName) {
  return {
    async list() {
      console.log(`DEBUG ${entityName}.list(): Fetching from ${API_URL}/${entityName}`);
      try {
        const response = await fetch(`${API_URL}/${entityName}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          mode: 'cors',
          credentials: 'include'
        });
        console.log(`DEBUG ${entityName}.list(): Response status:`, response.status, response.statusText);
        if (!response.ok) {
          const errorText = await response.text();
          console.log(`DEBUG ${entityName}.list(): Error response:`, errorText);
          throw new Error(`Failed to fetch ${entityName}: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log(`DEBUG ${entityName}.list(): Success, got ${data.length} items`);
        return data;
      } catch (error) {
        console.error(`DEBUG ${entityName}.list(): Network error:`, error);
        throw new Error(`Network error fetching ${entityName}: ${error.message}`);
      }
    },
    async get(id) {
      const response = await fetch(`${API_URL}/${entityName}/${id}`);
      if (!response.ok) return null;
      return await response.json();
    },
    async create(data) {
      const response = await fetch(`${API_URL}/${entityName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create');
      return await response.json();
    },
    async update(id, data) {
      const response = await fetch(`${API_URL}/${entityName}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update');
      return await response.json();
    },
    async delete(id) {
      const response = await fetch(`${API_URL}/${entityName}/${id}`, {
        method: 'DELETE'
      });
      return response.ok;
    }
  };
}

export const base44 = {
  entities: {
    User: createEntityApi('users'),
    Group: createEntityApi('groups'),
    Activity: createEntityApi('activities'),
    Message: createEntityApi('messages')
  },
  integrations: {
    Core: {
      async UploadFile({ file }) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ file_url: reader.result });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      },
      async SendEmail() { return { ok: true }; },
      async GenerateImage() { return { url: '' }; },
      async CreateFileSignedUrl() { return { url: '' }; },
      async UploadPrivateFile() { return { file_url: '' }; },
      async InvokeLLM() { return { output: '' }; }
    }
  },
  auth: {
    async me() {
      const storedUserId = localStorage.getItem('essence_user_id');
      let username = localStorage.getItem('essence_username');

      console.log('DEBUG auth.me():', { storedUserId, username });

      // If we don't have a username but we do have a userId, resolve it
      if (!username && storedUserId) {
        try {
          console.log('DEBUG auth.me(): Resolving user by ID:', storedUserId);
          const resp = await fetch(`${API_URL}/users`);
          console.log('DEBUG auth.me(): Response status:', resp.status);
          if (!resp.ok) throw new Error('Failed to fetch users');
          const allUsers = await resp.json();
          console.log('DEBUG auth.me(): All users:', allUsers);
          const byId = allUsers.find(u => String(u.id) === String(storedUserId));
          console.log('DEBUG auth.me(): Found user by ID:', byId);
          if (byId) {
            username = byId.username;
            localStorage.setItem('essence_username', byId.username || '');
            console.log('DEBUG auth.me(): Set username from ID:', byId.username);
          }
        } catch (error) {
          console.error('Error resolving user by ID:', error);
          throw new Error('Not authenticated');
        }
      }

      if (!username) {
        console.log('DEBUG: No username found, throwing Not authenticated');
        throw new Error('Not authenticated');
      }

      // Get user data
      try {
        console.log('DEBUG auth.me(): Fetching user data for username:', username);
        const response = await fetch(`${API_URL}/users`);
        console.log('DEBUG auth.me(): Response status for user data:', response.status);
        if (!response.ok) throw new Error('Failed to fetch users');
        const users = await response.json();
        console.log('DEBUG auth.me(): All users for lookup:', users);
        const user = users.find(u => u.username === username);
        console.log('DEBUG auth.me(): Found user:', user);
        if (!user) {
          console.log('DEBUG: User not found in database:', username);
          throw new Error('Not authenticated');
        }
        console.log('DEBUG: User found:', user.username);
        return { email: user.email, username: user.username };
      } catch (error) {
        console.error('Error fetching user data:', error);
        throw new Error('Not authenticated');
      }
    }
  }
};
