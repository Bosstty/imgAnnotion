<template>
    <div id="app">
        <router-view></router-view>
    </div>
</template>

<script>
export default {
    name: 'App',
    components: {},
};
</script>

<style scoped>
#app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    /* text-align: center; */
    color: #2c3e50;
}

/* 如果需要全局导航样式，可以在这里添加 */
/* .navbar {
  padding: 10px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.navbar a {
  margin-right: 10px;
  padding: 8px 16px;
  text-decoration: none;
  color: #007bff;
  border-radius: 4px;
}

.navbar a:hover {
  background-color: #e9ecef;
}

.navbar a.router-link-active {
  background-color: #007bff;
  color: white;
} */
</style>
