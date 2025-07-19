<template>
  <div v-if="visible" class="site-form-overlay" @click.self="$emit('cancel')">
    <div class="site-form">
      <h4>{{ isEditing ? 'Edit Site' : 'Add New Site' }}</h4>
      
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="siteName">Site Name *</label>
          <input
            id="siteName"
            v-model="form.name"
            type="text"
            class="form-control"
            required
          />
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="siteHost">Host *</label>
            <input
              id="siteHost"
              v-model="form.host"
              type="text"
              class="form-control"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="sitePort">Port *</label>
            <input
              id="sitePort"
              v-model="form.port"
              type="number"
              class="form-control"
              required
            />
          </div>
        </div>
        
        <div class="form-group">
          <label for="connectionString">Connection String</label>
          <input
            id="connectionString"
            v-model="form.connectionString"
            type="text"
            class="form-control"
            placeholder="Optional connection string"
          />
        </div>
        
        <div class="form-section">
          <h5>Features</h5>
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input
                v-model="form.acEnabled"
                type="checkbox"
              />
              <span>Auto-Complete Enabled</span>
            </label>
            
            <label class="checkbox-label">
              <input
                v-model="form.ansiEnabled"
                type="checkbox"
              />
              <span>ANSI Colors Enabled</span>
            </label>
            
            <label class="checkbox-label">
              <input
                v-model="form.htmlEnabled"
                type="checkbox"
              />
              <span>HTML Content Enabled</span>
            </label>
            
            <label class="checkbox-label">
              <input
                v-model="form.websocketEnabled"
                type="checkbox"
              />
              <span>WebSocket Enabled</span>
            </label>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="button" @click="$emit('cancel')" class="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary">
            {{ isEditing ? 'Update' : 'Add' }} Site
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'SiteForm',
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    form: {
      type: Object,
      required: true,
    },
    isEditing: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['submit', 'cancel'],
  setup(props, { emit }) {
    const handleSubmit = () => {
      emit('submit');
    };

    return {
      handleSubmit,
    };
  },
});
</script>

<style scoped>
.site-form-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.site-form {
  background: #2d2d30;
  padding: 30px;
  border-radius: 8px;
  width: 500px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  color: #cccccc;
}

.site-form h4 {
  margin-top: 0;
  color: #007acc;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: flex;
  gap: 15px;
}

.form-row .form-group {
  flex: 1;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

.form-control {
  width: 100%;
  padding: 8px 12px;
  background: #3c3c3c;
  border: 1px solid #555;
  border-radius: 4px;
  color: #cccccc;
  font-size: 14px;
}

.form-control:focus {
  outline: none;
  border-color: #007acc;
}

.form-section {
  margin-bottom: 25px;
}

.form-section h5 {
  margin-bottom: 15px;
  color: #007acc;
  font-size: 1rem;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 25px;
}

.btn {
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-primary {
  background: #007acc;
  color: white;
}

.btn-primary:hover {
  background: #005a9e;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}
</style>
