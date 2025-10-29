// PostgreSQL backend API client - data stored online on Render + PostgreSQL

const API_URL = (window.location.hostname.includes('vercel.app') || 
                 window.location.hostname.includes('myessence.ro') ||
                 window.location.hostname.includes('essence-affirmations'))
  ? 'https://essence-affirmations-backend.onrender.com/api'
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

// Reduced debugging to prevent console spam
console.log('DEBUG: API_URL =', API_URL);

function createEntityApi(entityName) {
  return {
    async list() {
      try {
        const response = await fetch(`${API_URL}/${entityName}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          mode: 'cors',
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch ${entityName}: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.error(`Network error fetching ${entityName}:`, error);
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
    Message: createEntityApi('messages'),
    Course: createEntityApi('courses')
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

      // If we don't have a username but we do have a userId, resolve it
      if (!username && storedUserId) {
        try {
          const resp = await fetch(`${API_URL}/users`);
          if (!resp.ok) throw new Error('Failed to fetch users');
          const allUsers = await resp.json();
          const byId = allUsers.find(u => String(u.id) === String(storedUserId));
          if (byId) {
            username = byId.username;
            localStorage.setItem('essence_username', byId.username || '');
          }
        } catch (error) {
          console.error('Error resolving user by ID:', error);
          throw new Error('Not authenticated');
        }
      }

      if (!username) {
        throw new Error('Not authenticated');
      }

      // Get user data
      try {
        const response = await fetch(`${API_URL}/users`);
        if (!response.ok) throw new Error('Failed to fetch users');
        const users = await response.json();
        const user = users.find(u => u.username === username);
        if (!user) {
          throw new Error('Not authenticated');
        }
        return { email: user.email, username: user.username };
      } catch (error) {
        console.error('Error fetching user data:', error);
        throw new Error('Not authenticated');
      }
    }
  }
};
