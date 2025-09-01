-- 添加默认值班角色
INSERT INTO shift_role (name, description, assignmentType, selectionCriteria, isActive, sortOrder, createdAt, updatedAt)
VALUES 
  ('带班领导', '负责带班管理工作', 'SINGLE', '{"byPosition":["院长","副院长","科主任"],"byTags":["领导"]}', true, 1, NOW(), NOW()),
  ('值班员', '负责日常值班工作', 'SINGLE', '{"byPosition":["医生","护士","技师"],"byTags":["值班员"]}', true, 2, NOW(), NOW()),
  ('考勤监督员', '负责考勤监督工作', 'SINGLE', '{"byTags":["考勤监督员"],"byPosition":["行政人员","人事专员"]}', true, 3, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  description = VALUES(description),
  selectionCriteria = VALUES(selectionCriteria),
  updatedAt = NOW();