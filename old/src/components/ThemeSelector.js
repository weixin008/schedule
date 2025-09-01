import React, { useState } from 'react';
import {
  Modal,
  Card,
  Row,
  Col,
  Button,
  Typography,
  Space,
  Tag,
  message,
  Tooltip
} from 'antd';
import {
  BgColorsOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { themes, getCurrentTheme, saveTheme } from '../utils/themes';

const { Title, Text } = Typography;

const ThemeSelector = ({ visible, onClose, onThemeChange }) => {
  const [currentTheme, setCurrentTheme] = useState(getCurrentTheme());

  const handleThemeSelect = (themeKey) => {
    setCurrentTheme(themeKey);
    saveTheme(themeKey);
    onThemeChange(themeKey);
    message.success(`已切换到${themes[themeKey].name}`);
  };

  const ThemePreviewCard = ({ themeKey, theme, isSelected }) => (
    <Card
      hoverable
      style={{
        border: isSelected ? `2px solid ${theme.colors.primary}` : '1px solid #d9d9d9',
        cursor: 'pointer',
        position: 'relative',
        backgroundColor: theme.styles?.cardBg || '#ffffff'
      }}
      onClick={() => handleThemeSelect(themeKey)}
      bodyStyle={{ padding: '16px' }}
    >
      {isSelected && (
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          backgroundColor: theme.colors.primary,
          borderRadius: '50%',
          width: 24,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <CheckOutlined style={{ color: 'white', fontSize: 12 }} />
        </div>
      )}
      
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Title level={5} style={{ margin: 0 }}>
          {theme.name}
        </Title>
        
        <Text type="secondary" style={{ fontSize: 12 }}>
          {theme.description}
        </Text>
        
        {/* 布局预览 */}
        <div style={{
          border: '1px solid #e8e8e8',
          borderRadius: '4px',
          height: '60px',
          display: 'flex',
          overflow: 'hidden',
          marginBottom: '8px'
        }}>
          {/* 侧边栏预览 */}
          <div style={{
            width: '20px',
            backgroundColor: theme.styles?.siderBg || theme.colors.primary,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div style={{
              width: '2px',
              height: '8px',
              backgroundColor: theme.styles?.siderTextColor || '#ffffff',
              marginBottom: '2px',
              borderRadius: '1px'
            }} />
            <div style={{
              width: '2px',
              height: '6px',
              backgroundColor: theme.styles?.siderIconColor || '#ffffff',
              borderRadius: '1px'
            }} />
          </div>
          
          {/* 内容区域预览 */}
          <div style={{
            flex: 1,
            backgroundColor: theme.styles?.contentBg || theme.token?.colorBgLayout || '#f5f5f5',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* 头部预览 */}
            <div style={{
              height: '12px',
              backgroundColor: theme.styles?.headerBg || '#ffffff',
              borderRadius: '2px',
              marginBottom: '2px',
              border: `1px solid ${theme.token?.colorBorderSecondary || '#f0f0f0'}`
            }} />
            
            {/* 卡片预览 */}
            <div style={{
              flex: 1,
              backgroundColor: theme.styles?.cardBg || '#ffffff',
              borderRadius: '2px',
              border: `1px solid ${theme.token?.colorBorder || '#d9d9d9'}`
            }} />
          </div>
        </div>
        
        {/* 颜色预览 */}
        <Space size="small">
          <Tooltip title="主色">
            <div style={{
              width: 16,
              height: 16,
              backgroundColor: theme.colors.primary,
              borderRadius: '50%',
              border: '1px solid #f0f0f0'
            }} />
          </Tooltip>
          <Tooltip title="成功色">
            <div style={{
              width: 16,
              height: 16,
              backgroundColor: theme.colors.success,
              borderRadius: '50%',
              border: '1px solid #f0f0f0'
            }} />
          </Tooltip>
          <Tooltip title="警告色">
            <div style={{
              width: 16,
              height: 16,
              backgroundColor: theme.colors.warning,
              borderRadius: '50%',
              border: '1px solid #f0f0f0'
            }} />
          </Tooltip>
          <Tooltip title="错误色">
            <div style={{
              width: 16,
              height: 16,
              backgroundColor: theme.colors.error,
              borderRadius: '50%',
              border: '1px solid #f0f0f0'
            }} />
          </Tooltip>
        </Space>
        
        {/* 预览按钮 */}
        <Button
          size="small"
          type={isSelected ? "primary" : "default"}
          style={{
            backgroundColor: isSelected ? theme.colors.primary : undefined,
            borderColor: isSelected ? theme.colors.primary : undefined
          }}
          block
        >
          {isSelected ? '当前主题' : '选择此主题'}
        </Button>
      </Space>
    </Card>
  );

  return (
    <Modal
      title={
        <Space>
          <BgColorsOutlined />
          <span>主题设置</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
      width={800}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={4}>选择您喜欢的主题风格</Title>
          <Text type="secondary">
            不同的主题会改变整个系统的配色方案，让界面更符合您的使用偏好。
          </Text>
        </div>

        <Row gutter={[16, 16]}>
          {Object.entries(themes).map(([themeKey, theme]) => (
            <Col span={12} key={themeKey}>
              <ThemePreviewCard
                themeKey={themeKey}
                theme={theme}
                isSelected={currentTheme === themeKey}
              />
            </Col>
          ))}
        </Row>

        <div style={{
          padding: '16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          border: '1px solid #e9ecef'
        }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <strong>说明：</strong>主题设置会立即生效并保存到本地存储。由于个人开发，部分边缘功能可能不够完善，
            后续版本会持续优化和修复。如遇问题请及时反馈。
          </Text>
        </div>
      </Space>
    </Modal>
  );
};

export default ThemeSelector; 