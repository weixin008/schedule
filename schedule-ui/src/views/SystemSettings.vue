<template>
  <div class="page-container">
    <el-card>
      <el-tabs v-model="activeTab">
        <el-tab-pane label="个人信息" name="profile">
          <el-form :model="profileForm" ref="profileFormRef" label-width="120px" v-if="profile">
            <el-form-item label="用户名">
              <el-input v-model="profile.username" disabled></el-input>
            </el-form-item>
            <el-form-item label="姓名" prop="name">
              <el-input v-model="profileForm.name" :disabled="!isEditing"></el-input>
            </el-form-item>
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="profileForm.email" :disabled="!isEditing"></el-input>
            </el-form-item>
            <el-form-item label="电话" prop="phone">
              <el-input v-model="profileForm.phone" :disabled="!isEditing"></el-input>
            </el-form-item>
            <el-form-item label="新密码" prop="password">
              <el-input v-model="profileForm.password" type="password" placeholder="如需修改密码，请输入新密码" :disabled="!isEditing" show-password></el-input>
            </el-form-item>
            <el-form-item label="角色">
              <el-input :value="settingsStore.getRoleDisplayName(profile.role.name)" disabled></el-input>
            </el-form-item>
            <el-form-item label="部门" v-if="profile.department">
              <el-input :value="profile.department.name" disabled></el-input>
            </el-form-item>
            <el-form-item>
              <el-button v-if="!isEditing" type="primary" @click="handleEdit">编辑</el-button>
              <template v-else>
                <el-button type="primary" @click="handleSave">保存</el-button>
                <el-button @click="handleCancel">取消</el-button>
              </template>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="系统配置" name="config">
          <el-form :model="systemForm" label-width="120px">
            <el-form-item label="单位名称">
              <el-input v-model="systemForm.orgName" placeholder="请输入单位名称"></el-input>
            </el-form-item>
            <el-form-item label="系统名称">
              <el-input v-model="systemForm.systemName" placeholder="请输入系统名称"></el-input>
            </el-form-item>
            <el-form-item label="主题色">
              <el-color-picker v-model="systemForm.themeColor" />
            </el-form-item>
            <el-form-item label="关于信息">
              <el-input v-model="systemForm.about" type="textarea" :rows="3" placeholder="请输入关于信息"></el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleSaveSystemSettings">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useSettingsStore } from '../stores/settings';
import { ElMessage } from 'element-plus';
import type { FormInstance } from 'element-plus'
import api from '../api';

const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const profile = computed(() => authStore.user);
const activeTab = ref('profile');
const isEditing = ref(false);
const profileFormRef = ref<FormInstance>()

const profileForm = reactive({
  name: '',
  email: '',
  phone: '',
  password: '',
});

interface SystemSettings {
  orgName: string;
  systemName: string;
  themeColor: string;
  about: string;
}

const systemForm = reactive<SystemSettings>({
  orgName: '',
  systemName: '',
  themeColor: '#1890ff',
  about: '',
});

const fetchSystemSettings = async () => {
  try {
    const response = await api.get('/system-settings');
    systemForm.orgName = response.data.orgName || '';
    systemForm.systemName = response.data.systemName || '';
    systemForm.themeColor = response.data.themeColor || '#1890ff';
    systemForm.about = response.data.about || '';
  } catch (error) {
    ElMessage.error('获取系统设置失败');
  }
};

const handleSaveSystemSettings = async () => {
  try {
    await api.post('/system-settings', systemForm);
    ElMessage.success('系统设置保存成功！');
  } catch (error) {
    ElMessage.error('保存系统设置失败');
  }
};

const resetForm = () => {
  if (authStore.user) {
    profileForm.name = authStore.user.name || '';
    profileForm.email = authStore.user.email || '';
    profileForm.phone = authStore.user.phone || '';
    profileForm.password = '';
  }
}

watch(
  () => authStore.user,
  (newUser) => {
    if (newUser) {
      resetForm();
    }
  },
  { immediate: true }
);

const handleEdit = () => {
  isEditing.value = true;
};

const handleCancel = () => {
  isEditing.value = false;
  resetForm();
};

const handleSave = async () => {
  if (!profileFormRef.value) return;
  profileFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const updateData: { [key: string]: any } = {
            name: profileForm.name,
            email: profileForm.email,
            phone: profileForm.phone,
        };
        if (profileForm.password) {
            updateData.password = profileForm.password;
        }
        
        await authStore.updateProfile(updateData);
        ElMessage.success('个人信息更新成功！');
        isEditing.value = false;
      } catch (error) {
        ElMessage.error('更新失败，请稍后重试。');
      }
    }
  });
};

onMounted(() => {
  if (!authStore.user) {
    authStore.fetchProfile();
  }
  fetchSystemSettings();
});
</script>

<style scoped>
.page-container {
  padding: 20px;
}
</style>