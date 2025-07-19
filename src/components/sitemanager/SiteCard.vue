<template>
  <div class="card-background">
    <div class="card-title-bar">
      <h5 class="card-title">{{ site.name }}</h5>
    </div>

    <div class="card">
      <div class="details">
        {{ site.host }}:{{ site.port }}
        <div v-if="site.connectionString" class="connection-string">
          <small>{{ site.connectionString }}</small>
        </div>
        
        <div class="features">
          <span v-if="site.acEnabled" class="feature-badge">AC</span>
          <span v-if="site.ansiEnabled" class="feature-badge">ANSI</span>
          <span v-if="site.htmlEnabled" class="feature-badge">HTML</span>
          <span v-if="site.websocketEnabled" class="feature-badge">WS</span>
        </div>
        
        <div class="button-row">
          <button
            @click="$emit('select-site')"
            class="btn btn-primary"
            title="Connect"
          >
            <i class="fas fa-circle-play"></i>&nbsp;Play
          </button>
          <button
            @click="$emit('edit-site')"
            class="btn btn-warning"
            title="Edit"
          >
            <i class="fas fa-pencil"></i>
          </button>
          <button
            @click="$emit('delete-site')"
            class="btn btn-danger"
            title="Delete"
          >
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'SiteCard',
  props: {
    site: {
      type: Object,
      required: true,
    },
  },
  emits: ['select-site', 'edit-site', 'delete-site'],
});
</script>

<style scoped>
.card-background {
  margin-bottom: 20px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-title-bar {
  background: #007acc;
  padding: 10px 15px;
  color: white;
}

.card-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.card {
  background: #2d2d30;
  padding: 15px;
}

.details {
  color: #cccccc;
  font-size: 0.9rem;
}

.connection-string {
  margin-top: 5px;
  color: #999;
}

.features {
  margin: 10px 0;
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.feature-badge {
  background: #007acc;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 500;
}

.button-row {
  display: flex;
  gap: 8px;
  margin-top: 15px;
}

.btn {
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-primary {
  background: #007acc;
  color: white;
}

.btn-primary:hover {
  background: #005a9e;
}

.btn-warning {
  background: #ffa500;
  color: white;
}

.btn-warning:hover {
  background: #e6940a;
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover {
  background: #c82333;
}
</style>
