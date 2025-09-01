<template>
  <el-dialog
    :title="group?.id ? '编辑编组' : '创建编组'"
    :model-value="visible"
    width="500px"
    @update:model-value="$emit('close')"
  >
    <el-form :model="form" ref="formRef" label-width="80px">
      <el-form-item
        label="编组名称"
        prop="name"
        :rules="[{ required: true, message: '请输入编组名称' }]"
      >
        <el-input v-model="form.name" placeholder="请输入编组名称" />
      </el-form-item>
      
      <el-form-item label="描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="请输入编组描述"
        />
      </el-form-item>
    </el-form>
    
    <template #footer>
      <el-button @click="$emit('close')">取消</el-button>
      <el-button type="primary" @click="submitForm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue';
import { ElForm } from 'element-plus';

interface GroupForm {
  id?: number;
  name: string;
  description: string;
}

const props = defineProps({
  visible: Boolean,
  group: {
    type: Object as () => GroupForm | null,
    default: null
  }
});

const emit = defineEmits(['close', 'submit']);

const formRef = ref<InstanceType<typeof ElForm> | null>(null);
const form = ref<GroupForm>({
  name: '',
  description: ''
});

watch(() => props.visible, (val) => {
  if (val) {
    // 重置表单
    formRef.value?.resetFields();
    
    // 如果有传入的编组数据，填充表单
    if (props.group) {
      form.value = { ...props.group };
    } else {
      form.value = { name: '', description: '' };
    }
  }
});

const submitForm = () => {
  formRef.value?.validate((valid) => {
    if (valid) {
      emit('submit', form.value);
    }
  });
};
</script>