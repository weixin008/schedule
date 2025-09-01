import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonnelSelectorService } from './personnel-selector.service';
import { Employee } from '../../employee/entities/employee.entity';
import { Group } from '../../group/entities/group.entity';

describe('PersonnelSelectorService', () => {
  let service: PersonnelSelectorService;
  let employeeRepository: Repository<Employee>;
  let groupRepository: Repository<Group>;

  const mockEmployeeRepository = {
    find: jest.fn(),
    findByIds: jest.fn(),
    findOne: jest.fn(),
  };

  const mockGroupRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonnelSelectorService,
        {
          provide: getRepositoryToken(Employee),
          useValue: mockEmployeeRepository,
        },
        {
          provide: getRepositoryToken(Group),
          useValue: mockGroupRepository,
        },
      ],
    }).compile();

    service = module.get<PersonnelSelectorService>(PersonnelSelectorService);
    employeeRepository = module.get<Repository<Employee>>(getRepositoryToken(Employee));
    groupRepository = module.get<Repository<Group>>(getRepositoryToken(Group));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('selectPersonnelForRole', () => {
    const mockEmployees = [
      {
        id: 1,
        name: '张三',
        department: '内科',
        organizationPosition: '医生',
        tags: ['医生', '内科'],
        status: 'AVAILABLE'
      },
      {
        id: 2,
        name: '李四',
        department: '外科',
        organizationPosition: '护士',
        tags: ['护士', '外科'],
        status: 'AVAILABLE'
      },
      {
        id: 3,
        name: '王五',
        department: '内科',
        organizationPosition: '医生',
        tags: ['医生', '内科'],
        status: 'LEAVE'
      }
    ];

    const mockRole = {
      id: 1,
      name: '值班医生',
      selectionCriteria: {
        byTags: ['医生'],
        byDepartment: ['内科'],
        byPosition: []
      },
      assignmentType: 'SINGLE' as const,
      isRequired: true,
      description: '值班医生角色',
      isActive: true,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should select personnel by tags', async () => {
      // Arrange
      mockEmployeeRepository.find.mockResolvedValue(mockEmployees);

      // Act
      const result = await service.selectPersonnelForRole(mockRole, new Date());

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('张三');
      expect(result[0].tags).toContain('医生');
      expect(result[0].department).toBe('内科');
      expect(result[0].status).toBe('AVAILABLE');
    });

    it('should exclude unavailable personnel', async () => {
      // Arrange
      const roleWithoutDepartmentFilter = {
        ...mockRole,
        selectionCriteria: {
          byTags: ['医生'],
          byDepartment: [],
          byPosition: []
        }
      };
      mockEmployeeRepository.find.mockResolvedValue(mockEmployees);

      // Act
      const result = await service.selectPersonnelForRole(roleWithoutDepartmentFilter, new Date());

      // Assert
      expect(result).toHaveLength(1); // 只有张三可用，王五请假了
      expect(result[0].name).toBe('张三');
    });

    it('should exclude specified employee IDs', async () => {
      // Arrange
      mockEmployeeRepository.find.mockResolvedValue(mockEmployees);

      // Act
      const result = await service.selectPersonnelForRole(mockRole, new Date(), [1]);

      // Assert
      expect(result).toHaveLength(0); // 张三被排除了
    });

    it('should return empty array when no personnel match criteria', async () => {
      // Arrange
      const roleWithStrictCriteria = {
        ...mockRole,
        selectionCriteria: {
          byTags: ['不存在的标签'],
          byDepartment: [],
          byPosition: []
        }
      };
      mockEmployeeRepository.find.mockResolvedValue(mockEmployees);

      // Act
      const result = await service.selectPersonnelForRole(roleWithStrictCriteria, new Date());

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('getDetailedPersonnelSelection', () => {
    it('should return detailed selection results', async () => {
      // Arrange
      const mockEmployees = [
        {
          id: 1,
          name: '张三',
          department: '内科',
          organizationPosition: '医生',
          tags: ['医生'],
          status: 'AVAILABLE'
        },
        {
          id: 2,
          name: '李四',
          department: '外科',
          organizationPosition: '护士',
          tags: ['护士'],
          status: 'AVAILABLE'
        }
      ];

      const mockRole = {
        id: 1,
        name: '值班医生',
        selectionCriteria: {
          byTags: ['医生'],
          byDepartment: [],
          byPosition: []
        },
        assignmentType: 'SINGLE' as const,
        isRequired: true,
        description: '值班医生角色',
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockEmployeeRepository.find.mockResolvedValue(mockEmployees);

      // Act
      const result = await service.getDetailedPersonnelSelection(mockRole, new Date());

      // Assert
      expect(result.availablePersonnel).toHaveLength(1);
      expect(result.unavailablePersonnel).toHaveLength(1);
      expect(result.availablePersonnel[0].name).toBe('张三');
      expect(result.unavailablePersonnel[0].employee.name).toBe('李四');
      expect(result.unavailablePersonnel[0].reason).toContain('缺少必需标签');
    });
  });

  describe('sortPersonnelByPriority', () => {
    it('should sort personnel by level', () => {
      // Arrange
      const personnel = [
        { id: 1, name: '张三', level: 3 } as any,
        { id: 2, name: '李四', level: 1 } as any,
        { id: 3, name: '王五', level: 2 } as any
      ];

      // Act
      const result = service.sortPersonnelByPriority(personnel, { sortByLevel: true });

      // Assert
      expect(result[0].name).toBe('李四'); // level 1
      expect(result[1].name).toBe('王五'); // level 2
      expect(result[2].name).toBe('张三'); // level 3
    });

    it('should sort personnel by preferred tags', () => {
      // Arrange
      const personnel = [
        { id: 1, name: '张三', tags: ['护士'], level: 1 } as any,
        { id: 2, name: '李四', tags: ['医生'], level: 1 } as any,
        { id: 3, name: '王五', tags: ['医生', '主任'], level: 1 } as any
      ];

      // Act
      const result = service.sortPersonnelByPriority(personnel, { 
        preferredTags: ['医生'],
        sortByLevel: true 
      });

      // Assert
      expect(result[0].tags).toContain('医生'); // 李四或王五
      expect(result[2].name).toBe('张三'); // 没有医生标签，排在最后
    });
  });
});