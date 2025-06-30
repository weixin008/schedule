import React, { useState } from 'react';
import { Card, Typography, Space, Button, Row, Col, Tag, Modal } from 'antd';
import { 
  HeartOutlined, 
  WechatOutlined, 
  QrcodeOutlined,
  GiftOutlined
} from '@ant-design/icons';
import { authorConfig } from '../config/author';

const { Title, Paragraph, Text } = Typography;

const About = () => {
  const [showDonation, setShowDonation] = useState(false);

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      {/* 项目标题 */}
      <Card style={{ marginBottom: '24px', textAlign: 'center' }}>
        <HeartOutlined style={{ fontSize: '48px', color: '#ff4d4f', marginBottom: '16px' }} />
        <Title level={2} style={{ marginBottom: '8px' }}>排班管理系统</Title>
        <Text type="secondary" style={{ fontSize: '16px' }}>一个简单实用的排班管理工具</Text>
      </Card>

      <Row gutter={[24, 24]}>
        {/* 开发者信息 */}
        <Col xs={24} md={12}>
          <Card 
            title={
              <span>
                <WechatOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                开发者信息
              </span>
            }
            style={{ height: '100%' }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <Text strong style={{ fontSize: '16px' }}>作者：{authorConfig.name}</Text>
              </div>
              
              <div>
                <div style={{ marginBottom: '8px' }}>
                  <WechatOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                  <Text strong>微信公众号</Text>
                </div>
                <Tag color="green" style={{ fontSize: '14px', padding: '4px 12px' }}>
                  {authorConfig.wechat.publicAccount}
                </Tag>
                <div style={{ marginTop: '8px' }}>
                  <Text type="secondary" style={{ fontSize: '13px' }}>
                    {authorConfig.wechat.description}
                  </Text>
                </div>
              </div>

              {/* GitHub信息暂时注释
              <div>
                <GithubOutlined style={{ color: '#000', marginRight: '8px' }} />
                <Text strong>开源地址：</Text>
                <br />
                <Button 
                  type="link" 
                  size="small"
                  onClick={() => window.open(authorConfig.github.url)}
                >
                  GitHub: {authorConfig.github.username}
                </Button>
              </div>
              */}
            </Space>
          </Card>
        </Col>

        {/* 支持开发者 */}
        <Col xs={24} md={12}>
          <Card 
            title={
              <span>
                <GiftOutlined style={{ marginRight: '8px', color: '#ff4d4f' }} />
                支持开发者
              </span>
            }
            style={{ height: '100%' }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '16px' }}>
                <Text style={{ fontSize: '14px', color: '#666' }}>
                  {authorConfig.donation.message}
                </Text>
              </div>
              
              {/* 赞赏码预览 */}
              <div 
                style={{ 
                  display: 'inline-block',
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  border: '2px solid #f0f0f0',
                  borderRadius: '8px',
                  padding: '8px',
                  background: '#fff'
                }}
                onClick={() => setShowDonation(true)}
                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
              >
                <img 
                  src={`${process.env.PUBLIC_URL || ''}${authorConfig.donation.qrCodePath}`}
                  alt="赞赏码"
                  style={{ 
                    width: '120px', 
                    height: '120px',
                    borderRadius: '4px'
                  }}
                  onError={(e) => {
                    // 如果图片加载失败，显示占位符
                    console.error('图片加载失败:', e.target.src);
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div style={{ 
                  width: '120px', 
                  height: '120px', 
                  border: '2px dashed #d9d9d9',
                  display: 'none',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  background: '#fafafa',
                  flexDirection: 'column'
                }}>
                  <QrcodeOutlined style={{ fontSize: '32px', color: '#999' }} />
                  <Text type="secondary" style={{ fontSize: '12px', marginTop: '8px' }}>
                    赞赏码加载中...
                  </Text>
                </div>
              </div>
              
              <div style={{ marginTop: '12px' }}>
                <Button 
                  type="primary" 
                  size="small"
                  icon={<HeartOutlined />}
                  onClick={() => setShowDonation(true)}
                  style={{ 
                    background: 'linear-gradient(135deg, #ff6b6b, #feca57)',
                    border: 'none'
                  }}
                >
                  点击查看大图
                </Button>
              </div>
              
              <div style={{ marginTop: '8px' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  您的支持是我持续开发的动力！
                </Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
      
      {/* 底部信息 */}
      <div style={{ textAlign: 'center', marginTop: '32px', padding: '16px' }}>
        <Text type="secondary">
          感谢使用排班管理系统 | 
          <WechatOutlined style={{ margin: '0 4px', color: '#1890ff' }} />
          关注公众号获取更多实用工具
        </Text>
      </div>

      {/* 赞赏码大图弹窗 */}
      <Modal
        title={
          <div style={{ textAlign: 'center' }}>
            <HeartOutlined style={{ color: '#ff4d4f', marginRight: '8px' }} />
            感谢您的支持
          </div>
        }
        open={showDonation}
        onCancel={() => setShowDonation(false)}
        footer={null}
        width={350}
        centered
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <img 
            src={`${process.env.PUBLIC_URL || ''}${authorConfig.donation.qrCodePath}`}
            alt="赞赏码"
            style={{ 
              width: '250px', 
              height: '250px',
              borderRadius: '8px',
              border: '1px solid #f0f0f0'
            }}
            onError={(e) => {
              console.error('弹窗图片加载失败:', e.target.src);
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjUwIiBoZWlnaHQ9IjI1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuivt+S4iuS8oOi1nOi1j+eggTwvdGV4dD48L3N2Zz4=';
            }}
          />
          <div style={{ marginTop: '16px' }}>
            <Text style={{ fontSize: '16px', color: '#666' }}>
              {authorConfig.donation.message}
            </Text>
          </div>
          <div style={{ marginTop: '8px' }}>
            <Tag color="blue">微信</Tag>
            <Tag color="green">支付宝</Tag>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default About; 