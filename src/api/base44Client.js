// PostgreSQL backend API client - data stored online on Render + PostgreSQL

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function createEntityApi(entityName) {
  return {
    async list() {
      const response = await fetch(`${API_URL}/${entityName}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return await response.json();
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
      const username = localStorage.getItem('essence_username');
      if (!username) throw new Error('Not authenticated');
      const response = await fetch(`${API_URL}/users`);
      if (!response.ok) throw new Error('Not authenticated');
      const users = await response.json();
      const user = users.find(u => u.username === username);
      if (!user) throw new Error('Not authenticated');
      return { email: user.email, username: user.username };
    }
  }
};
