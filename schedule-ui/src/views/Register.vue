<template>
  <div class="register-container">
    <el-card class="register-card">
      <template #header>
        <div class="card-header">
          <h2>管理员注册</h2>
        </div>
      </template>
      <el-form :model="registerForm" @submit.prevent="handleRegister">
        <el-form-item>
          <el-input v-model="registerForm.name" placeholder="姓名"></el-input>
        </el-form-item>
        <el-form-item>
          <el-input v-model="registerForm.username" placeholder="用户名"></el-input>
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="密码（至少8位，包含字母和数字）"
            show-password
          ></el-input>
        </el-form-item>
        <!-- 角色选择器已隐藏，默认注册为管理员 -->
        <el-form-item>
          <el-button type="primary" native-type="submit" style="width: 100%;" :loading="loading">
            注 册
          </el-button>
        </el-form-item>
         <el-form-item>
          <el-button link @click="$router.push('/login')" style="width: 100%;">
            已有账户？去登录
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/api';
import { ElMessage } from 'element-plus';

const router = useRouter();
const registerForm = reactive({
  name: '',
  username: '',
  password: '',
  role: 'admin' // 默认注册为管理员
});
const loading = ref(false);

const handleRegister = async () => {
  if (!registerForm.name || !registerForm.username || !registerForm.password) {
    ElMessage.error('请填写完整的注册信息');
    return;
  }
  
  // 密码强度验证
  if (registerForm.password.length < 8 || !/\d/.test(registerForm.password) || !/[a-zA-Z]/.test(registerForm.password)) {
    ElMessage.error('密码需至少8位，包含字母和数字');
    return;
  }
  
  loading.value = true;
  try {
    await apiClient.post('/auth/register', registerForm);
    ElMessage.success('注册成功！请登录。');
    router.push('/login');
  } catch (error) {
    ElMessage.error('注册失败，可能是用户名已被占用');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f0f2f5;
}
.register-card {
  width: 400px;
}
.card-header {
  text-align: center;
}
</style> 